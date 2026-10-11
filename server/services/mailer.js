import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Send the password reset link. If SMTP is not configured the link is printed to the
 * server console instead (handy in development).
 */
export async function sendPasswordResetEmail(to, link) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[password reset] SMTP is not configured. Reset link for ${to}:\n  ${link}\n`);
    return;
  }
  await t.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Reset your AI Career Copilot password',
    text: `We received a request to reset your password.\n\nOpen this link to choose a new one (valid for 1 hour):\n${link}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a> (valid for 1 hour).</p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
