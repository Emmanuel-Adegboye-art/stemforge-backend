const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());

// Import routes
const feedbackRoutes = require('./src/routes/feedback');
const generateRoutes = require('./src/routes/generate');
const aiGenerateRoutes = require('./src/routes/ai-generate');
const studentRoutes = require('./src/routes/students');
const lessonRoutes = require('./src/routes/lessons');
const schemeRoutes = require('./src/routes/schemes');
const authRoutes = require('./src/routes/auth');
const attendanceRoutes = require('./src/routes/attendance');
const subjectRoutes = require('./src/routes/subjects');
const classRoutes = require('./src/routes/classes');
const adminRoutes = require('./src/routes/admin');
const errorHandler = require('./src/middleware/errorHandler');

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'running', 
        service: 'STEM Forge API',
        version: '2.0'
    });
});

// Use routes
app.use(generateRoutes);
app.use(aiGenerateRoutes);
app.use(studentRoutes);
app.use(lessonRoutes);
app.use(schemeRoutes);
app.use(authRoutes);
app.use(attendanceRoutes);
app.use(subjectRoutes);
app.use(feedbackRoutes);
app.use('/api/classes', classRoutes);
app.use(adminRoutes);

// ── DEBUG: email test (remove after confirming email works) ────────
app.get('/api/debug/test-email', async (req, res) => {
    const nodemailer = require('nodemailer');
    const supportUser = process.env.SUPPORT_GMAIL_USER || 'supportstemforge@gmail.com';
    const supportPass = (process.env.SUPPORT_GMAIL_APP_PASS || '').replace(/\s+/g, '').trim();

    const report = {
        SUPPORT_GMAIL_USER: supportUser,
        SUPPORT_GMAIL_APP_PASS_length: supportPass.length,
        SUPPORT_GMAIL_APP_PASS_set: !!supportPass,
    };

    if (!supportPass) {
        return res.status(500).json({ error: 'SUPPORT_GMAIL_APP_PASS not set on Render', report });
    }

    const t = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: supportUser, pass: supportPass }
    });

    try {
        await t.verify();
        const info = await t.sendMail({
            from: `"STEM Forge Debug" <${supportUser}>`,
            to: supportUser,
            subject: '[STEM Forge] Debug Email Test',
            text: 'SMTP is working correctly from Render.'
        });
        res.json({ success: true, messageId: info.messageId, report });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            code: err.code,
            responseCode: err.responseCode,
            command: err.command,
            report
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Endpoint not found' } });
});

// Global error handler (must be last)
app.use(errorHandler);

// Anything registered past the catch-all above is unreachable, so seal the stack:
// a later app.use() throws at startup instead of silently 404ing in production.
app.use = () => {
    throw new Error(
        'Cannot register middleware after the 404 handler — it would be unreachable. ' +
        'Move this app.use() call above the "404 handler" section of server.js.'
    );
};

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
