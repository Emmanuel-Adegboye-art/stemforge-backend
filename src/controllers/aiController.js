// Back-End/src/controllers/aiController.js

// ============================================
// ONLY ONE DECLARATION AT THE TOP
// ============================================
const groqService = require('../services/groqService');

// ============================================
// GENERATE AI FUNCTION
// ============================================

async function generateAI(req, res, next) {
    try {
        const { 
            // Lesson fields
            topic, grade, duration, subject, instructions, 
            mode = 'lesson-plan', term, week, additionalDetails,
            // Scheme fields
            branch, branchName, startGrade, endGrade,
            subjects, competitions, industries,
            weeksPerTerm, periodsPerWeek, additionalNotes
        } = req.body;
        
        // ============================================
        // VALIDATION
        // ============================================
        
        if (!['lesson-plan', 'lesson-note', 'scheme'].includes(mode)) {
            return res.status(400).json({ 
                error: { message: 'Invalid mode. Use lesson-plan, lesson-note, or scheme' } 
            });
        }
        
        if (mode === 'scheme') {
            if (!branch || !startGrade || !endGrade) {
                return res.status(400).json({ 
                    error: { message: 'Branch, startGrade, and endGrade are required for scheme generation' } 
                });
            }
        } else {
            if (!topic || !grade) {
                return res.status(400).json({ 
                    error: { message: 'Topic and grade are required' } 
                });
            }
        }
        
        // ============================================
        // GENERATE
        // ============================================
        
        const startTime = Date.now();
        let result;
        
        if (mode === 'scheme') {
            result = await groqService.generateScheme({ 
                branch, branchName, startGrade, endGrade,
                subjects, competitions, industries,
                weeksPerTerm, periodsPerWeek, additionalNotes
            });
        } else if (mode === 'lesson-note') {
            result = await groqService.generateLessonNote({ 
                topic, grade, duration, subject, instructions, term, week, additionalDetails
            });
        } else {
            result = await groqService.generateLessonPlan({ 
                topic, grade, duration, subject, instructions, term, week, additionalDetails
            });
        }
        
        res.json({
            success: true,
            data: result,
            source: 'ai',
            mode: mode,
            generationTime: Date.now() - startTime
        });
        
    } catch (error) {
        console.error('AI generation error:', error);
        next(error);
    }
}

// ============================================
// EXPORT
// ============================================

module.exports = { generateAI };