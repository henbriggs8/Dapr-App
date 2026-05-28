import { Resend } from "resend";

const NOTIFY_EMAIL = "henry@autodapr.com";
const FROM_EMAIL = "Dapr <notifications@autodapr.com>";

export interface BookingEmailParams {
  bookingId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceLocation: string;
  serviceName?: string;
  totalPrice?: number;
  date?: string | null;
  time?: string | null;
  priceTier?: string | null;
  addOns?: any[];
}

export async function sendNewBookingEmail(params: BookingEmailParams): Promise<void> {
  const addOnsList = params.addOns && params.addOns.length > 0
    ? `<ul style="margin:4px 0 0 16px;padding:0;">${params.addOns.map((a: any) => `<li>${escapeHtml(a.name || a.id || String(a))}</li>`).join("")}</ul>`
    : "<em>None</em>";

  const totalDisplay = params.totalPrice != null
    ? `$${(params.totalPrice / 100).toFixed(2)}`
    : "—";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#8c52ff;padding:20px 28px;">
      <h2 style="margin:0;color:#fff;font-size:20px;">New Booking — Dapr #${params.bookingId}</h2>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:130px;vertical-align:top;">Customer</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(params.customerName)}</td></tr>
        ${params.customerEmail ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(params.customerEmail)}" style="color:#8c52ff;">${escapeHtml(params.customerEmail)}</a></td></tr>` : ""}
        ${params.customerPhone ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Phone</td><td style="padding:8px 0;">${escapeHtml(params.customerPhone)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Service</td><td style="padding:8px 0;">${escapeHtml(params.serviceName || "—")}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Tier</td><td style="padding:8px 0;">${escapeHtml(params.priceTier || "—")}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Add-ons</td><td style="padding:8px 0;">${addOnsList}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Location</td><td style="padding:8px 0;">${escapeHtml(params.serviceLocation)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Date / Time</td><td style="padding:8px 0;">${[params.date, params.time].filter(Boolean).map(s => escapeHtml(s!)).join(" at ") || "—"}</td></tr>
        <tr style="border-top:1px solid #e5e7eb;"><td style="padding:12px 0;color:#6b7280;vertical-align:top;">Total</td><td style="padding:12px 0;font-weight:700;font-size:20px;color:#8c52ff;">${totalDisplay}</td></tr>
      </table>
    </div>
    <div style="padding:14px 28px;background:#f9fafb;font-size:12px;color:#9ca3af;text-align:center;">
      Sent automatically by Dapr — do not reply to this email.
    </div>
  </div>
</body>
</html>`;

  const client = getResendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping booking notification email.");
    return;
  }

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [NOTIFY_EMAIL],
    subject: `New Booking #${params.bookingId} — ${params.customerName}`,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send booking notification #${params.bookingId}:`, error);
  } else {
    console.log(`[email] Booking notification sent for #${params.bookingId}`);
  }
}

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface SupportEmailPayload {
  name: string;
  email: string;
  message: string;
  requestCallback: boolean;
  submittedAt: string;
}

export async function sendSupportNotificationEmail(payload: SupportEmailPayload): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY is not configured — skipping support email notification.");
    return;
  }

  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    console.warn("[email] SUPPORT_EMAIL is not configured — skipping support email notification.");
    return;
  }

  const fromEmail = process.env.SUPPORT_FROM_EMAIL || "noreply@dapper-pros.com";

  const callbackFlag = payload.requestCallback
    ? "⚠️ CALLBACK REQUESTED"
    : "No callback requested";

  const subject = payload.requestCallback
    ? `[CALLBACK REQUESTED] New Support Message from ${payload.name}`
    : `New Support Message from ${payload.name}`;

  const formattedDate = new Date(payload.submittedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; }
    .badge-callback { background: #ff4444; color: #fff; }
    .badge-normal { background: #444; color: #fff; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 4px; }
    .field p { margin: 0; font-size: 15px; line-height: 1.6; }
    .message-box { background: #f5f5f5; border-left: 4px solid #1a1a2e; padding: 16px; border-radius: 4px; white-space: pre-wrap; font-size: 15px; line-height: 1.6; }
    .footer { padding: 16px 32px; background: #f0f0f0; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Support Message — Dapper Pros</h1>
      <span class="badge ${payload.requestCallback ? "badge-callback" : "badge-normal"}">${callbackFlag}</span>
    </div>
    <div class="body">
      <div class="field">
        <label>Customer Name</label>
        <p>${escapeHtml(payload.name)}</p>
      </div>
      <div class="field">
        <label>Customer Email</label>
        <p><a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></p>
      </div>
      <div class="field">
        <label>Submitted At</label>
        <p>${formattedDate}</p>
      </div>
      <div class="field">
        <label>Message</label>
        <div class="message-box">${escapeHtml(payload.message)}</div>
      </div>
    </div>
    <div class="footer">This notification was sent automatically by the Dapper Pros platform.</div>
  </div>
</body>
</html>
`;

  const textBody = `
New Support Message — Dapper Pros
${callbackFlag}

Name: ${payload.name}
Email: ${payload.email}
Submitted At: ${formattedDate}

Message:
${payload.message}
`.trim();

  const { error } = await client.emails.send({
    from: fromEmail,
    to: [supportEmail],
    subject,
    html: htmlBody,
    text: textBody,
    replyTo: payload.email,
  });

  if (error) {
    console.error("[email] Failed to send support notification email:", error);
  } else {
    console.log(`[email] Support notification sent to ${supportEmail} for message from ${payload.name}`);
  }
}

export async function sendSupportConfirmationEmail(payload: SupportEmailPayload): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY is not configured — skipping support confirmation email.");
    return;
  }

  const fromEmail = process.env.SUPPORT_FROM_EMAIL || "noreply@dapper-pros.com";

  const formattedDate = new Date(payload.submittedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = "We received your message — Dapper Pros Support";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #ccc; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 4px; }
    .message-box { background: #f5f5f5; border-left: 4px solid #1a1a2e; padding: 16px; border-radius: 4px; white-space: pre-wrap; font-size: 15px; line-height: 1.6; }
    .notice { background: #eef4ff; border: 1px solid #c7d9f8; border-radius: 6px; padding: 16px; font-size: 14px; color: #444; margin-top: 24px; }
    .footer { padding: 16px 32px; background: #f0f0f0; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We got your message, ${escapeHtml(payload.name.split(" ")[0])}!</h1>
      <p>Dapper Pros Support</p>
    </div>
    <div class="body">
      <p>Thanks for reaching out. Our support team has received your request and will get back to you within <strong>1–2 business days</strong>.</p>
      <div class="field">
        <label>Your Message (submitted ${formattedDate})</label>
        <div class="message-box">${escapeHtml(payload.message)}</div>
      </div>
      ${payload.requestCallback ? `<div class="notice">You requested a callback — a team member will try to reach you by phone as soon as possible.</div>` : ""}
      <p style="margin-top: 24px;">Need to add something? Submit a new support request from the app and reference your original message.</p>
    </div>
    <div class="footer">© Dapper Pros · This is an automated message — please do not reply to this email.</div>
  </div>
</body>
</html>
`;

  const textBody = `
Hi ${payload.name.split(" ")[0]},

Thanks for reaching out to Dapper Pros Support. We've received your message and will get back to you within 1–2 business days.

Your message (submitted ${formattedDate}):
${payload.message}
${payload.requestCallback ? "\nYou requested a callback — a team member will try to reach you by phone as soon as possible.\n" : ""}
Need to add something? Submit a new support request from the app and reference your original message.

— The Dapper Pros Team
This is an automated message — please do not reply to this email.
`.trim();

  const { error } = await client.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject,
    html: htmlBody,
    text: textBody,
  });

  if (error) {
    console.error("[email] Failed to send support confirmation email:", error);
  } else {
    console.log(`[email] Support confirmation sent to ${payload.email}`);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
