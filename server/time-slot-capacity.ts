import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { timeSlots, type TimeSlot } from "@shared/schema";

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD format.")
  .refine(value => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  }, "date must be a real calendar date.");

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "time must use 24-hour HH:MM format.");

const capacityWindowShape = {
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  slotDurationMinutes: z.number().int().positive().max(24 * 60),
};

function minutesSinceMidnight(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateCapacityWindow(
  input: { startTime: string; endTime: string; slotDurationMinutes: number },
  context: z.RefinementCtx,
) {
  const start = minutesSinceMidnight(input.startTime);
  const end = minutesSinceMidnight(input.endTime);
  if (end <= start) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "endTime must be later than startTime on the same day." });
    return;
  }
  if ((end - start) % input.slotDurationMinutes !== 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["slotDurationMinutes"],
      message: "The time range must divide evenly into slotDurationMinutes.",
    });
  }
}

export const publishCapacityRequestSchema = z.object({
  ...capacityWindowShape,
  maxBookings: z.number().int().positive(),
}).strict().superRefine(validateCapacityWindow);

export const unpublishCapacityRequestSchema = z.object(capacityWindowShape)
  .strict()
  .superRefine(validateCapacityWindow);

type CapacityWindowRequest = z.infer<typeof unpublishCapacityRequestSchema>;

export type CapacitySlotWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

export class TimeSlotCapacityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeSlotCapacityConflictError";
  }
}

function formattedTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function buildCapacitySlotWindows(input: CapacityWindowRequest): CapacitySlotWindow[] {
  const start = minutesSinceMidnight(input.startTime);
  const end = minutesSinceMidnight(input.endTime);
  const windows: CapacitySlotWindow[] = [];
  for (let cursor = start; cursor < end; cursor += input.slotDurationMinutes) {
    windows.push({
      date: input.date,
      startTime: formattedTime(cursor),
      endTime: formattedTime(cursor + input.slotDurationMinutes),
    });
  }
  return windows;
}

async function findSlotAtStart(tx: any, window: CapacitySlotWindow): Promise<TimeSlot[]> {
  return tx.select().from(timeSlots).where(and(
    eq(timeSlots.date, window.date),
    eq(timeSlots.startTime, window.startTime),
  )).orderBy(asc(timeSlots.id));
}

function requireUnambiguousSlot(existing: TimeSlot[], window: CapacitySlotWindow): TimeSlot | undefined {
  if (existing.length > 1) {
    throw new TimeSlotCapacityConflictError(`Multiple slots already start at ${window.date} ${window.startTime}; resolve duplicates before publishing capacity.`);
  }
  const slot = existing[0];
  if (slot && slot.endTime !== window.endTime) {
    throw new TimeSlotCapacityConflictError(
      `The existing ${window.date} ${window.startTime} slot ends at ${slot.endTime}, not ${window.endTime}.`,
    );
  }
  return slot;
}

export async function publishTimeSlotCapacity(raw: unknown) {
  const input = publishCapacityRequestSchema.parse(raw);
  const windows = buildCapacitySlotWindows(input);
  const { db } = await import("./db");
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`time-slot-capacity:${input.date}`}))`);
    const published: TimeSlot[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const window of windows) {
      const current = requireUnambiguousSlot(await findSlotAtStart(tx, window), window);
      if (current) {
        const [updated] = await tx.update(timeSlots).set({
          isPublished: true,
          isAvailable: true,
          maxBookings: sql<number>`greatest(${timeSlots.currentBookings}, ${input.maxBookings})`,
        }).where(eq(timeSlots.id, current.id)).returning();
        published.push(updated);
        updatedCount += 1;
      } else {
        const [created] = await tx.insert(timeSlots).values({
          ...window,
          isPublished: true,
          isAvailable: true,
          maxBookings: input.maxBookings,
          currentBookings: 0,
        }).returning();
        published.push(created);
        createdCount += 1;
      }
    }

    return { date: input.date, createdCount, updatedCount, slots: published };
  });
}

export async function unpublishTimeSlotCapacity(raw: unknown) {
  const input = unpublishCapacityRequestSchema.parse(raw);
  const windows = buildCapacitySlotWindows(input);
  const { db } = await import("./db");
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`time-slot-capacity:${input.date}`}))`);
    const unpublished: TimeSlot[] = [];

    for (const window of windows) {
      const current = requireUnambiguousSlot(await findSlotAtStart(tx, window), window);
      if (!current) continue;
      const [updated] = await tx.update(timeSlots)
        .set({ isPublished: false })
        .where(eq(timeSlots.id, current.id))
        .returning();
      unpublished.push(updated);
    }

    return {
      date: input.date,
      unpublishedCount: unpublished.length,
      notFoundCount: windows.length - unpublished.length,
      slots: unpublished,
    };
  });
}
