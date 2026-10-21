export async function sendPasswordResetEmail(to, resetUrl) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.MAIL_FROM;
  const senderName = process.env.MAIL_FROM_NAME || "MediCare Hospital";

  // Validate required environment variables
  const required = {
    BREVO_API_KEY: apiKey,
    MAIL_FROM: senderEmail,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing email configuration: ${missing.join(", ")}`);
  }

  // Send email through Brevo's HTTPS API
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject: "Reset your MediCare Hospital password",

      textContent: `Reset your MediCare Hospital password using this link:

${resetUrl}

This link expires in 15 minutes and can only be used once.
If you did not request this email, ignore it.`,

      htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6">
            <h2>MediCare Hospital</h2>
            <h3>Reset your password</h3>
            <p>Use the button below to choose a new password.</p>
            <p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none">
                Reset Password
              </a>
            </p>
            <p>This link expires in 15 minutes and can only be used once.</p>
            <p>If you did not request this email, ignore it.</p>
          </div>
        `,
    }),
  });

  // Handle Brevo API errors
  if (!response.ok) {
    const details = await response.text();

    console.error(
      "Brevo email API failed:",
      response.status,
      details.slice(0, 500),
    );

    throw new Error(`Brevo email API returned HTTP ${response.status}`);
  }

  const result = await response.json();

  console.log("Password reset email accepted by Brevo.");

  return result;
}
