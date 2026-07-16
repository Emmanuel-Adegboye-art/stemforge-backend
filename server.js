const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());

// Import routes
const generateRoutes = require('./src/routes/generate');
const aiGenerateRoutes = require('./src/routes/ai-generate');
const studentRoutes = require('./src/routes/students');
const lessonRoutes = require('./src/routes/lessons');
const schemeRoutes = require('./src/routes/schemes');
const authRoutes = require('./src/routes/auth');
const attendanceRoutes = require('./src/routes/attendance');
const subjectRoutes = require('./src/routes/subjects');
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Endpoint not found' } });
});

// Global error handler (must be last)
app.use(errorHandler);

// Connect to DB and start server
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    console.error('❌ Missing MONGODB_URI environment variable.');
    console.error('   Set MONGODB_URI in Render environment settings or provide it in a .env file for local development.');
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ DB connection failed:', err);
        process.exit(1);
    });

module.exports = app;
