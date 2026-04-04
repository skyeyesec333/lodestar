import { Resend } from "resend";

// ── Client ─────────────────────────────────────────────────────────────────────

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ── Core send function ─────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (resend) {
    await resend.emails.send({
      from: "Lodestar <notifications@lodestar.app>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } else {
    console.log(`[email mock] To: ${params.to} Subject: ${params.subject}`);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Domain-specific helpers ────────────────────────────────────────────────────

export async function sendLoiOverdueAlert(params: {
  to: string;
  projectName: string;
  loiDate: Date;
  projectSlug: string;
}): Promise<void> {
  const formattedDate = params.loiDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const projectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lodestar.app"}/projects/${params.projectSlug}`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>LOI Target Date Overdue</title>
  </head>
  <body style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 20px; font-weight: 400; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px;">
      LOI Target Date Overdue
    </h1>
    <p style="font-size: 15px; line-height: 1.6;">
      The LOI target date for <strong>${esc(params.projectName)}</strong> was
      <strong>${formattedDate}</strong> and has now passed without a submitted
      Letter of Interest.
    </p>
    <p style="font-size: 15px; line-height: 1.6;">
      Review the project's readiness score and open requirements to determine
      the next steps toward LOI submission.
    </p>
    <a
      href="${projectUrl}"
      style="display: inline-block; margin-top: 16px; padding: 10px 20px;
             background: #1a1a1a; color: #fff; text-decoration: none;
             font-family: monospace; font-size: 13px; letter-spacing: 0.05em;"
    >
      Open Project →
    </a>
    <p style="margin-top: 40px; font-size: 12px; color: #888;">
      Lodestar · EXIM Project Finance Lifecycle Platform
    </p>
  </body>
</html>
  `.trim();

  await sendEmail({
    to: params.to,
    subject: `[Lodestar] LOI target date overdue — ${params.projectName}`,
    html,
  });
}

export async function sendRequirementAssignedEmail(params: {
  to: string;
  projectName: string;
  requirementName: string;
  projectSlug: string;
}): Promise<void> {
  const projectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lodestar.app"}/projects/${params.projectSlug}`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Requirement assigned</title>
  </head>
  <body style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 20px; font-weight: 400; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px;">
      You have been assigned a requirement
    </h1>
    <p style="font-size: 15px; line-height: 1.6;">
      You are now responsible for <strong>${esc(params.requirementName)}</strong> on
      the project <strong>${esc(params.projectName)}</strong>.
    </p>
    <a
      href="${projectUrl}"
      style="display: inline-block; margin-top: 16px; padding: 10px 20px;
             background: #1a1a1a; color: #fff; text-decoration: none;
             font-family: monospace; font-size: 13px; letter-spacing: 0.05em;"
    >
      Open Project →
    </a>
    <p style="margin-top: 40px; font-size: 12px; color: #888;">
      Lodestar · EXIM Project Finance Lifecycle Platform
    </p>
  </body>
</html>
  `.trim();

  await sendEmail({
    to: params.to,
    subject: `[Lodestar] Requirement assigned: ${params.requirementName}`,
    html,
  });
}

// ── Legacy export (keeps existing callers working) ─────────────────────────────

export async function sendConsultationRequestEmail(params: {
  expertId: string;
  expertName: string;
  userId: string;
  context: string;
  timing: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 20px; font-weight: 400;">Consultation Request</h1>
    <p>Expert: ${esc(params.expertName)} (${esc(params.expertId)})</p>
    <p>Requested by: ${esc(params.userId)}</p>
    <p>Context: ${esc(params.context)}</p>
    <p>Timing: ${esc(params.timing)}</p>
  </body>
</html>
  `.trim();

  if (resend) {
    await sendEmail({
      to: "admin@lodestar.app",
      subject: `Consultation request — ${params.expertName}`,
      html,
    });
  } else {
    console.log("[ConsultationRequest]", params);
  }
}
