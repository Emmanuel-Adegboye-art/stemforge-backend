/**
 * Gmail SMTP mailer using Nodemailer.
 *
 * ── Setup (one‑time) ──────────────────────────────────────────────
 * 1. Enable 2‑Step Verification on EACH Gmail account
 * 2. Create an App Password per account at:
 *    https://myaccount.google.com/apppasswords
 *
 * ── Env vars required on Render ──────────────────────────────────
 *   SUPPORT_GMAIL_USER        – supportstemforge@gmail.com
 *   SUPPORT_GMAIL_APP_PASS    – 16‑digit App Password for support account
 *   ADMIN_GMAIL_USER          – stemforgetechnical@gmail.com
 *   ADMIN_GMAIL_APP_PASS      – 16‑digit App Password for admin account
 *   FRONTEND_URL              – e.g. https://stem-forge.vercel.app
 */

const nodemailer = require('nodemailer');

// ── Transporter factory ───────────────────────────────────────────

function makeTransporter(user, pass) {
    if (!user || !pass) {
        console.warn(`⚠️  Mailer: missing credentials for ${user || 'unknown'} – email skipped`);
        return null;
    }
    const cleanUser = String(user).trim();
    const cleanPass = String(pass).replace(/\s+/g, '').trim();

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: cleanUser,
            pass: cleanPass
        }
    });
}

// Lazy singletons
let _supportTransport = null;
let _adminTransport   = null;

function supportTransport() {
    if (_supportTransport) return _supportTransport;
    const user = process.env.SUPPORT_GMAIL_USER || process.env.GMAIL_USER || 'supportstemforge@gmail.com';
    const pass = process.env.SUPPORT_GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD;
    _supportTransport = makeTransporter(user, pass);
    return _supportTransport;
}

function adminTransport() {
    if (_adminTransport) return _adminTransport;
    const user = process.env.ADMIN_GMAIL_USER || process.env.GMAIL_USER || 'stemforgetechnical@gmail.com';
    const pass = process.env.ADMIN_GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD;
    _adminTransport = makeTransporter(user, pass);
    return _adminTransport;
}

// ── Generic send helper ───────────────────────────────────────────

async function send(transport, mail) {
    if (!transport) {
        console.warn('⚠️  Mailer: skipped send (no transport available)');
        return { skipped: true };
    }
    try {
        const info = await transport.sendMail(mail);
        console.log(`📧 Email delivered to ${mail.to} (id: ${info.messageId})`);
        return info;
    } catch (err) {
        console.error(`❌ Mailer delivery failed to ${mail.to}:`, err.message);
        throw err;
    }
}

// ── Generic email (kept for backwards compatibility) ──────────────

async function sendEmail({ to, from, subject, html, text, replyTo }) {
    const t = supportTransport();
    if (!t) return { skipped: true };
    return t.sendMail({
        from: from || `"STEM Forge Support" <${process.env.SUPPORT_GMAIL_USER}>`,
        to, subject, html,
        text: text || subject,
        replyTo
    });
}

// ── PASSWORD RESET ────────────────────────────────────────────────

/**
 * Send a password-reset link to the user.
 * The admin account (stemforgetechnical@gmail.com) is CC'd for audit.
 *
 * @param {string} userEmail – the user's registered email address
 * @param {string} userName  – the user's display name
 * @param {string} resetLink – the full reset URL with token
 */
async function sendPasswordResetEmail(userEmail, userName, resetLink) {
    const t = adminTransport();
    const adminEmail = process.env.ADMIN_GMAIL_USER || process.env.GMAIL_USER || 'stemforgetechnical@gmail.com';
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

    return send(t, {
        from:    `"STEM Forge" <${adminEmail}>`,
        to:      userEmail,
        cc:      adminEmail,
        subject: '🔑 Reset your STEM Forge password',
        html,
        text: `Reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
    });
}

// ── FEEDBACK ──────────────────────────────────────────────────────

/**
 * Notify the support team of a new feedback submission.
 * Sent FROM supportstemforge@gmail.com TO supportstemforge@gmail.com (inbox notification).
 *
 * @param {{ name, email, subject, description }} feedback
 */
async function sendFeedbackNotification(feedback) {
    const t = supportTransport();
    const supportEmail = process.env.SUPPORT_GMAIL_USER || process.env.GMAIL_USER || 'supportstemforge@gmail.com';
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

    const adminEmail = process.env.ADMIN_GMAIL_USER || 'stemforgetechnical@gmail.com';

    return send(t, {
        from:    `"STEM Forge Feedback" <${supportEmail}>`,
        to:      supportEmail,
        cc:      adminEmail,
        replyTo: feedback.email,
        subject: `📬 New Feedback: ${feedback.subject}`,
        html,
        text: `New feedback from ${feedback.name} (${feedback.email})\n\nSubject: ${feedback.subject}\n\n${feedback.description}`
    });
}

/**
 * Send an auto-reply confirmation to the user who submitted feedback.
 *
 * @param {string} toEmail  – user's email address
 * @param {string} toName   – user's name
 * @param {string} subject  – their feedback subject (for context)
 */
async function sendFeedbackConfirmation(toEmail, toName, subject) {
    const t = supportTransport();
    const supportEmail = process.env.SUPPORT_GMAIL_USER || process.env.GMAIL_USER || 'supportstemforge@gmail.com';
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

    return send(t, {
        from:    `"STEM Forge Support" <${supportEmail}>`,
        to:      toEmail,
        subject: `✅ We received your feedback: "${subject}"`,
        html,
        text: `Hi ${toName},\n\nThank you for your feedback about "${subject}".\nWe'll reply within 48 hours.\n\n— STEM Forge Support`
    });
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendFeedbackNotification,
    sendFeedbackConfirmation
};

