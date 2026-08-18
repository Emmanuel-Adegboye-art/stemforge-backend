const { admin } = require('../config/firebase');
const { sendFeedbackNotification, sendFeedbackConfirmation } = require('../services/mailer');

/**
 * POST /api/feedback
 * Public endpoint — no auth required.
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
            read: false,
            createdAt: new Date().toISOString()
        };

        console.log('📝 Feedback received from:', feedbackData.email);

        // Save to Firebase Firestore
        try {
            const db = admin.firestore();
            await db.collection('feedbacks').add(feedbackData);
            console.log('✅ Feedback saved to Firestore');
        } catch (dbErr) {
            console.warn('⚠️ Firestore write failed:', dbErr.message);
        }

        // Respond immediately so client doesn't wait
        res.status(201).json({
            success: true,
            message: "Feedback received. We will reply within 48 hours."
        });

        // Send notification email AFTER responding (fire-and-forget with logging)
        console.log('📧 Sending feedback notification email...');
        try {
            const result = await sendFeedbackNotification(feedbackData);
            console.log('✅ Notification email sent:', result?.id || JSON.stringify(result));
        } catch (emailErr) {
            console.error('❌ Notification email FAILED:', emailErr.message);
        }

        // Send confirmation to user (skipped on free tier for non-registered emails)
        try {
            await sendFeedbackConfirmation(feedbackData.email, feedbackData.name, feedbackData.subject);
        } catch (confirmErr) {
            console.warn('⚠️ Confirmation email skipped/failed:', confirmErr.message);
        }

    } catch (err) {
        console.error("submitFeedback error:", err);
        if (!res.headersSent) {
            return res.status(500).json({
                error: { message: "Failed to submit feedback. Please try again." }
            });
        }
    }
}

module.exports = { submitFeedback };

