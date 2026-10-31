let transporterPromise = null;
let warnedDisabled = false;

export const emailEnabled = () => Boolean(process.env.SMTP_HOST);

/**
 * nodemailer is loaded lazily so the API still boots (and every other feature
 * works) if SMTP isn't configured or the package isn't installed yet.
 */
const getTransporter = () => {
  if (!emailEnabled()) return Promise.resolve(null);
  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then(({ default: nodemailer }) => {
      const port = Number(process.env.SMTP_PORT) || 587;
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    });
  }
  return transporterPromise;
};

/** Returns true if the email was handed to the SMTP server, false otherwise (never throws). */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      if (!warnedDisabled) {
        console.warn("[email] SMTP_HOST is not set, so emails are disabled");
        warnedDisabled = true;
      }
      return false;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err.message);
    return false;
  }
};