import nodemailer from "nodemailer";

export const SUPPORT_EMAIL = "support@sedhii.com";
export const FROM_ADDRESS = `"Sedhii" <${SUPPORT_EMAIL}>`;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)");
  }

  // Hostinger: 465 = SSL (secure), 587 = STARTTLS
  const useSsl = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure: useSsl,
    requireTLS: !useSsl && port === 587,
    auth: { user, pass },
  });
}

type SendOtpEmailParams = {
  to: string;
  otp: string;
};

export async function sendOtpEmail({ to, otp }: SendOtpEmailParams) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center">
        <h2 style="margin:0 0 8px;font-size:20px;color:#DC2626">Sedhii</h2>
        <p style="margin:0 0 4px;font-size:13px;color:#475569">Your verification code</p>
        <div style="margin:18px 0;padding:18px 12px;background:#fff1f2;border:1px solid #fecaca;border-radius:12px">
          <p style="margin:0;font-size:32px;font-weight:700;color:#0f172a;letter-spacing:8px">${otp}</p>
        </div>
        <p style="margin:0 0 4px;font-size:12px;color:#475569">
          This code expires in 5 minutes. Do not share it with anyone.
        </p>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8">
          If you didn't request this, please ignore this email or reply to
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#DC2626;text-decoration:none">${SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </div>
  `;

  const text = [
    "Sedhii verification code",
    "",
    `Your code: ${otp}`,
    "",
    "This code expires in 5 minutes.",
    `If you didn't request this, reply to ${SUPPORT_EMAIL}.`,
  ].join("\n");

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `Sedhii verification code: ${otp}`,
    html,
    text,
  });
}

type SendClientCredentialsEmailParams = {
  to: string;
  fullName?: string | null;
  clientId: string;
  password: string;
};

export async function sendClientCredentialsEmail({
  to,
  fullName,
  clientId,
  password,
}: SendClientCredentialsEmailParams) {
  const name = fullName?.trim() || "Client";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
        <h2 style="margin:0 0 12px;font-size:24px;color:#DC2626">Sedhii Login Credentials</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">Hello ${name},</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">
          Your trading account has been activated by the Sedhii team. Use the credentials below to sign in to the web or mobile app.
        </p>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:14px"><strong>Client ID:</strong> ${clientId}</p>
          <p style="margin:0;font-size:14px"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
          Please keep these credentials secure. After signing in, you can review your profile, orders, positions, funds, and ledger inside the app.
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#475569">
          If you did not request this account, reply to this email at
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#DC2626;text-decoration:none">${SUPPORT_EMAIL}</a>.
        </p>
        <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center">
          &mdash; Team Sedhii
        </p>
      </div>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    "",
    "Your Sedhii trading account has been activated.",
    `Client ID: ${clientId}`,
    `Password: ${password}`,
    "",
    "Please keep these credentials secure.",
    `Questions? Reply to ${SUPPORT_EMAIL}.`,
    "",
    "— Team Sedhii",
  ].join("\n");

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: "Your Sedhii login credentials",
    html,
    text,
  });
}
