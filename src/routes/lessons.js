const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Lesson = require('../models/Lesson');

// Get user's lessons
router.get('/api/lessons', authenticate, async (req, res, next) => {
    try {
        const lessons = await Lesson.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(50);
        res.json({ data: lessons });
    } catch (error) {
        next(error);
    }
});

// Save a lesson
router.post('/api/lessons', authenticate, async (req, res, next) => {
    try {
        const { title, type, content, metadata, source } = req.body;
        
        const lesson = new Lesson({
            user: req.user.id,
            title,
            type: type || 'lesson-plan',
            content,
            metadata,
            source: source || 'ai'
        });
        
        await lesson.save();
        res.status(201).json({ data: lesson });
    } catch (error) {
        next(error);
    }
});

// Delete a lesson
router.delete('/api/lessons/:id', authenticate, async (req, res, next) => {
    try {
        await Lesson.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user.id 
        });
        res.json({ data: { message: 'Lesson deleted' } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
