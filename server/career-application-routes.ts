import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import multer from "multer";
import { db } from "./db";
import { careerApplications, careerApplicationFieldsSchema } from "@shared/schema";
import { ReplitVerificationMediaObjectStore } from "./verification-media-object-store";
import { sendCareerApplicationEmail } from "./career-application-email";

/** Open roles are the single server-side source of truth for valid positions. */
export const OPEN_ROLES = [
  "Senior Full-Stack Engineer",
  "iOS Engineer (Swift / SwiftUI)",
  "Fleet Sales Manager",
  "Customer Success Lead",
  "Field Operations Manager",
  "Detail Technician",
  "Growth Marketing Manager",
] as const;

const MAX_RESUME_BYTES = 8 * 1024 * 1024; // 8 MiB

/** Allowed resume types: extension derived from the validated MIME type — the
 *  applicant's raw filename is never used for the storage key. */
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function resumeLooksValid(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  // Legacy .doc: OLE compound file signature.
  if (mimeType === "application/msword")
    return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  // .docx: ZIP signature plus OOXML structure markers — a bare ZIP is rejected.
  if (buffer.subarray(0, 2).toString("latin1") !== "PK") return false;
  const haystack = buffer.toString("latin1");
  return haystack.includes("[Content_Types].xml") && haystack.includes("word/");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RESUME_BYTES,
    files: 1,
    fields: 30,
    parts: 32,
    fieldSize: 10 * 1024, // longest free-text answers are well under 10 KB
  },
});

// Simple in-memory rate limit for this public endpoint: max 5 submissions
// per IP per hour (the project has no shared rate-limit middleware).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const submissionLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    submissionLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissionLog.set(ip, recent);
  if (submissionLog.size > 10000) submissionLog.clear(); // bounded memory
  return false;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

export function registerCareerApplicationRoutes(app: Express): void {
  const objectStore = new ReplitVerificationMediaObjectStore();
  const configuredEnvironment = process.env.VERIFICATION_MEDIA_ENVIRONMENT?.trim();
  const environmentPrefix = configuredEnvironment && /^[a-z0-9_-]{1,32}$/i.test(configuredEnvironment)
    ? configuredEnvironment.toLowerCase()
    : (process.env.REPLIT_DEPLOYMENT ? "production" : "development");

  app.post(
    "/api/careers/applications",
    (req: Request, res: Response, next) => {
      // Rate-check BEFORE the multipart body is buffered so abusive clients
      // can't force repeated 8 MB parses.
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (isRateLimited(ip)) {
        return res.status(429).json({ error: "Too many submissions. Please try again later." });
      }
      upload.single("resume")(req, res, (err: unknown) => {
        if (err) {
          const tooBig = typeof err === "object" && err !== null && (err as { code?: string }).code === "LIMIT_FILE_SIZE";
          return res.status(400).json({
            error: tooBig ? "Resume must be 8 MB or smaller." : "Invalid upload.",
          });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const parsed = careerApplicationFieldsSchema.safeParse({
          ...req.body,
          authorizedToWorkUs: parseBoolean(req.body.authorizedToWorkUs),
          requiresSponsorship: parseBoolean(req.body.requiresSponsorship),
        });
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.flatten() });
        }
        if (!(OPEN_ROLES as readonly string[]).includes(parsed.data.role)) {
          return res.status(400).json({ error: "Unknown position." });
        }

        const file = req.file;
        if (!file || !file.buffer?.length) {
          return res.status(400).json({ error: "A resume file is required." });
        }
        const extension = RESUME_TYPES[file.mimetype];
        if (!extension || !resumeLooksValid(file.mimetype, file.buffer)) {
          return res.status(400).json({ error: "Resume must be a PDF, DOC, or DOCX file." });
        }

        // Server-generated storage key inside the existing private bucket —
        // the applicant's filename is stored for display only, never as a path.
        const resumeObjectKey = `${environmentPrefix}/career-applications/${randomUUID()}.${extension}`;
        await objectStore.upload(resumeObjectKey, Readable.from(file.buffer));

        const now = new Date().toISOString();
        try {
          await db
            .insert(careerApplications)
            .values({
              ...parsed.data,
              resumeObjectKey,
              resumeFileName: (file.originalname || `resume.${extension}`).slice(0, 200),
              status: "new",
              createdAt: now,
              updatedAt: now,
            });
        } catch (dbError) {
          // Don't leave an orphaned resume object if the DB insert fails.
          await objectStore.delete(resumeObjectKey).catch(() => {});
          throw dbError;
        }

        console.log(`[careers] New application received for ${parsed.data.role}`);

        // Internal notification is fire-and-forget: a delivery failure never
        // affects the stored application.
        void sendCareerApplicationEmail({
          applicantName: `${parsed.data.firstName} ${parsed.data.lastName}`,
          role: parsed.data.role,
          email: parsed.data.email,
          phone: parsed.data.phone,
          city: parsed.data.city,
          state: parsed.data.state,
          submittedAt: now,
        }).catch(() => {});

        // No internal id or storage path is exposed to the client.
        return res.status(201).json({ success: true });
      } catch (error) {
        console.error("[careers] Failed to store application:", error);
        return res.status(500).json({ error: "We couldn't submit your application. Please try again." });
      }
    }
  );
}
