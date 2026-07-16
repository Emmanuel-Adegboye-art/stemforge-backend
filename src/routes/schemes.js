const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Scheme = require('../models/Scheme');

// Get user's schemes
router.get('/api/schemes', authenticate, async (req, res, next) => {
    try {
        const schemes = await Scheme.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(50);
        res.json({ data: schemes });
    } catch (error) {
        next(error);
    }
});

// Save a scheme
router.post('/api/schemes', authenticate, async (req, res, next) => {
    try {
        const { 
            title, gradeRange, components, competitions, 
            economicActivities, content, additionalNotes 
        } = req.body;
        
        const scheme = new Scheme({
            user: req.user.id,
            title,
            gradeRange,
            components,
            competitions,
            economicActivities,
            content,
            additionalNotes
        });
        
        await scheme.save();
        res.status(201).json({ data: scheme });
    } catch (error) {
        next(error);
    }
});

// Delete a scheme
router.delete('/api/schemes/:id', authenticate, async (req, res, next) => {
    try {
        await Scheme.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user.id 
        });
        res.json({ data: { message: 'Scheme deleted' } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
