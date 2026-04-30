import { Resend } from "resend";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
