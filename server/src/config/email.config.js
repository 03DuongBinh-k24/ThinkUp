import nodemailer from 'nodemailer';

// ─── Transporter Singleton ────────────────────────────────────────────────────

let _transporter = null;

/**
 * Lấy nodemailer transporter (singleton).
 * @returns {nodemailer.Transporter}
 */
export function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

export const EMAIL_FROM = process.env.SMTP_FROM || '"ThinkUp" <noreply@thinkup.vn>';
