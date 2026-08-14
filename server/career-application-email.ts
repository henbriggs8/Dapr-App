import { Resend } from "resend";

const NOTIFY_EMAIL = "henry@autodapr.com";
const FROM_EMAIL = "Dapr <notifications@autodapr.com>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface CareerApplicationEmailPayload {
  applicantName: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  submittedAt: string;
}

/**
 * Notify the internal Dapr inbox that a new career application arrived.
 * The resume stays in private application storage — it is never attached.
 * Failures are logged only; the stored application is never affected.
 */
export async function sendCareerApplicationEmail(payload: CareerApplicationEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping career application notification.");
    return;
  }
  const client = new Resend(process.env.RESEND_API_KEY);
  const rows: Array<[string, string]> = [
    ["Applicant", payload.applicantName],
    ["Position", payload.role],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["Location", `${payload.city}, ${payload.state}`],
    ["Submitted", payload.submittedAt],
  ];
  const html = `
    <div style="font-family:sans-serif;max-width:560px">
      <h2 style="color:#8c52ff;margin-bottom:4px">New career application</h2>
      <p style="color:#555;margin-top:0">A new application was submitted on the Dapr careers page. The resume is stored securely in private application storage.</p>
      <table style="border-collapse:collapse;width:100%">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#111">${escapeHtml(value)}</td></tr>`
          )
          .join("")}
      </table>
    </div>`;

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [NOTIFY_EMAIL],
    subject: `New application: ${payload.role} — ${payload.applicantName}`,
    html,
  });
  if (error) {
    console.error("[email] Failed to send career application notification:", error);
  } else {
    console.log(`[email] Career application notification sent (${payload.role})`);
  }
}
