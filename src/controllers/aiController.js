const groqService = require('../services/groqService');

async function generateAI(req, res, next) {
    try {
        const { 
            topic, 
            grade, 
            duration, 
            subject, 
            instructions, 
            mode = 'lesson-plan' 
        } = req.body;
        
        // Validation
        if (!topic || !grade) {
            return res.status(400).json({ 
                error: { message: 'Topic and grade are required' } 
            });
        }
        
        if (!['lesson-plan', 'lesson-note'].includes(mode)) {
            return res.status(400).json({ 
                error: { message: 'Invalid mode. Use lesson-plan or lesson-note' } 
            });
        }
        
        const startTime = Date.now();
        let result;
        
        if (mode === 'lesson-note') {
            result = await groqService.generateLessonNote({ 
                topic, grade, duration, subject, instructions 
            });
        } else {
            result = await groqService.generateLessonPlan({ 
                topic, grade, duration, subject, instructions 
            });
        }
        
        res.json({
            data: result,
            source: 'ai',
            mode,
            generationTime: Date.now() - startTime
        });
        
    } catch (error) {
        console.error('AI generation error:', error);
        next(error);
    }
}

module.exports = { generateAI };
