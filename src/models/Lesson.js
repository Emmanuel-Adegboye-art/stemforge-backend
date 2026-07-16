const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['lesson-plan', 'lesson-note'], default: 'lesson-plan' },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    metadata: { grade: String, subject: String, topic: String, duration: Number },
    source: { type: String, enum: ['ai', 'local', 'manual'], default: 'ai' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);
