const Lesson = require('../models/Lesson');

exports.getLessons = async (req, res, next) => {
    try {
        const lessons = await Lesson.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(50);
        res.json({ data: lessons });
    } catch (error) {
        next(error);
    }
};

exports.saveLesson = async (req, res, next) => {
    try {
        const { title, type, content, metadata, source } = req.body;
        
        const lesson = new Lesson({
            user: req.user.id,
            title,
            type: type || 'lesson-plan',
            content,
            metadata,
            source: source || 'manual'
        });
        
        await lesson.save();
        res.status(201).json({ data: lesson });
    } catch (error) {
        next(error);
    }
};

exports.deleteLesson = async (req, res, next) => {
    try {
        await Lesson.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user.id 
        });
        res.json({ data: { message: 'Lesson deleted' } });
    } catch (error) {
        next(error);
    }
};
