/**
 * Resend-based mailer for STEM Forge.
 *
 * ── Env vars required on Render ──────────────────────────────────
 *   RESEND_API_KEY   – API key from https://resend.com/api-keys
 *   SUPPORT_EMAIL    – inbox to receive feedback (e.g. supportstemforge@gmail.com)
 *   ADMIN_EMAIL      – inbox to receive password resets (e.g. stemforgetechnical@gmail.com)
 *   FRONTEND_URL     – e.g. https://stem-forge-frontend.vercel.app
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender address — Resend free tier sends from onboarding@resend.dev
// When you add a custom domain on Resend, change this to e.g. support@stemforge.com
const FROM_SUPPORT = 'STEM Forge Support <onboarding@resend.dev>';
const FROM_ADMIN   = 'STEM Forge <onboarding@resend.dev>';

// Delivery targets — read from env or fall back to hard-coded addresses
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL
    || process.env.SUPPORT_GMAIL_USER
    || 'supportstemforge@gmail.com';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
    || process.env.ADMIN_GMAIL_USER
    || 'stemforgetechnical@gmail.com';

// ── Generic send helper ───────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
    const { data, error } = await resend.emails.send({
        from:    FROM_SUPPORT,
        to:      Array.isArray(to) ? to : [to],
        subject,
        html:    html  || `<p>${text}</p>`,
        text:    text  || subject,
    });
    if (error) {
        console.error('❌ Resend sendEmail error:', error);
        throw new Error(error.message);
    }
    console.log(`📧 Email sent to ${to} (id: ${data.id})`);
    return data;
}

// ── PASSWORD RESET ────────────────────────────────────────────────

/**
 * Send a password-reset link to the user.
 *
 * @param {string} userEmail – the user's registered email address
 * @param {string} userName  – the user's display name
 * @param {string} resetLink – the full reset URL with token
 */
async function sendPasswordResetEmail(userEmail, userName, resetLink) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#F59E0B;padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">🔑 Reset your STEM Forge password</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#374151;font-size:15px;margin:0 0 16px">Hi <strong>${userName || 'there'}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin:0 0 24px">
          We received a request to reset your password. Click the button below — the link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${resetLink}" style="background:#F59E0B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block">
            Reset My Password
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px">Or copy this link into your browser:</p>
        <p style="color:#2563EB;font-size:13px;word-break:break-all;margin:0 0 24px">${resetLink}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;margin:0">
          If you didn't request this, you can safely ignore this email. Your password will not change.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">STEM Forge · stemforgetechnical@gmail.com</p>
      </div>
    </div>`;

    const { data, error } = await resend.emails.send({
        from:    FROM_ADMIN,
        to:      [userEmail],
        cc:      [ADMIN_EMAIL],
        subject: '🔑 Reset your STEM Forge password',
        html,
        text:    `Reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
    });
    if (error) {
        console.error('❌ Resend sendPasswordResetEmail error:', error);
        throw new Error(error.message);
    }
    console.log(`📧 Password reset email sent to ${userEmail} (id: ${data.id})`);
    return data;
}

// ── FEEDBACK ──────────────────────────────────────────────────────

/**
 * Notify the support team of a new feedback submission.
 *
 * @param {{ name, email, subject, description }} feedback
 */
async function sendFeedbackNotification(feedback) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#0F172A;padding:28px 32px">
        <h1 style="color:#F59E0B;margin:0;font-size:20px;font-weight:700">💬 New Feedback Received</h1>
      </div>
      <div style="padding:32px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="color:#6b7280;padding:8px 0;width:100px"><strong>From</strong></td><td style="color:#111827">${feedback.name} &lt;${feedback.email}&gt;</td></tr>
          <tr><td style="color:#6b7280;padding:8px 0"><strong>Subject</strong></td><td style="color:#111827">${feedback.subject}</td></tr>
          <tr><td style="color:#6b7280;padding:8px 0;vertical-align:top"><strong>Message</strong></td><td style="color:#111827;white-space:pre-wrap">${feedback.description}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#6b7280;font-size:13px;margin:0">Reply directly to <strong>${feedback.email}</strong> to respond to this user.</p>
      </div>
    </div>`;

    const { data, error } = await resend.emails.send({
        from:     FROM_SUPPORT,
        to:       [SUPPORT_EMAIL],
        cc:       [ADMIN_EMAIL],
        reply_to: feedback.email,
        subject:  `📬 New Feedback: ${feedback.subject}`,
        html,
        text: `New feedback from ${feedback.name} (${feedback.email})\n\nSubject: ${feedback.subject}\n\n${feedback.description}`
    });
    if (error) {
        console.error('❌ Resend sendFeedbackNotification error:', error);
        throw new Error(error.message);
    }
    console.log(`📧 Feedback notification sent (id: ${data.id})`);
    return data;
}

/**
 * Send an auto-reply confirmation to the user who submitted feedback.
 *
 * @param {string} toEmail  – user's email address
 * @param {string} toName   – user's name
 * @param {string} subject  – their feedback subject (for context)
 */
async function sendFeedbackConfirmation(toEmail, toName, subject) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#F59E0B;padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">✅ We got your feedback!</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#374151;font-size:15px;margin:0 0 16px">Hi <strong>${toName}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin:0 0 16px">
          Thank you for reaching out! We've received your message about <strong>"${subject}"</strong>.
        </p>
        <p style="color:#374151;font-size:15px;margin:0 0 24px">
          Our team will review it and get back to you within <strong>48 hours</strong>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;margin:0">
          If you have an urgent issue, reply to this email or contact us at
          <a href="mailto:supportstemforge@gmail.com" style="color:#2563EB">supportstemforge@gmail.com</a>.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">STEM Forge Support · supportstemforge@gmail.com</p>
      </div>
    </div>`;

    const { data, error } = await resend.emails.send({
        from:    FROM_SUPPORT,
        to:      [toEmail],
        subject: `✅ We received your feedback: "${subject}"`,
        html,
        text: `Hi ${toName},\n\nThank you for your feedback about "${subject}".\nWe'll reply within 48 hours.\n\n— STEM Forge Support`
    });
    if (error) {
        console.error('❌ Resend sendFeedbackConfirmation error:', error);
        throw new Error(error.message);
    }
    console.log(`📧 Confirmation sent to ${toEmail} (id: ${data.id})`);
    return data;
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendFeedbackNotification,
    sendFeedbackConfirmation
};



