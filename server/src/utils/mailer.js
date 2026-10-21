import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];

  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length) {
    throw new Error(`Missing email configuration: ${missing.join(", ")}`);
  }

  const port = Number(process.env.SMTP_PORT || 587);

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Reset your MediCare Hospital password",

    text: `Reset your MediCare Hospital password using this link:

${resetUrl}

This link expires in 15 minutes and can only be used once.
If you did not request this, ignore this email.`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>MediCare Hospital</h2>
        <h3>Reset your password</h3>
        <p>Use the button below to choose a new password.</p>
        <p>
          <a href="${resetUrl}"
             style="background:#2563eb;color:white;padding:12px 18px;
                    border-radius:6px;text-decoration:none">
            Reset Password
          </a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
