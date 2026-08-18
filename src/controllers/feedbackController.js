const { admin } = require('../config/firebase');
const { sendFeedbackNotification, sendFeedbackConfirmation } = require('../services/mailer');

/**
 * POST /api/feedback
 * Public endpoint — no auth required.
 * Saves feedback to Firebase Firestore and sends two emails:
 *   1. Notification to supportstemforge@gmail.com
 *   2. Auto-reply confirmation to the user
 */
async function submitFeedback(req, res) {
    try {
        const { name, email, subject, description } = req.body;

        // Validate
        if (!name || !email || !subject || !description) {
            return res.status(400).json({
                error: { message: "All fields are required (name, email, subject, description)" }
            });
        }

        const feedbackData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            description: description.trim(),
            status: "new",
            createdAt: new Date().toISOString()
        };

        // Save to Firebase Firestore
        try {
            const db = admin.firestore();
            await db.collection('feedbacks').add(feedbackData);
        } catch (dbErr) {
            console.warn('⚠️ Could not write to Firestore (proceeding with emails):', dbErr.message);
        }

        // Send emails (non-blocking)
        try {
            Promise.allSettled([
                sendFeedbackNotification(feedbackData),
                sendFeedbackConfirmation(feedbackData.email, feedbackData.name, feedbackData.subject)
            ]).then(results => {
                results.forEach((r, i) => {
                    if (r.status === "rejected") {
                        console.error(`Feedback email ${i + 1} failed:`, r.reason?.message || r.reason);
                    }
                });
            }).catch(e => console.error('Email dispatch error:', e));
        } catch (e) {
            console.error('Email trigger error:', e);
        }

        return res.status(201).json({
            success: true,
            message: "Feedback received. We will reply within 48 hours."
        });
    } catch (err) {
        console.error("submitFeedback error:", err);
        return res.status(500).json({
            error: { message: "Failed to submit feedback. Please try again." }
        });
    }
}

module.exports = { submitFeedback };

