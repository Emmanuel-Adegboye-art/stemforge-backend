// ============================================
// STEM FORGE BACKEND - RENDER READY
// SIMPLIFIED VERSION FOR DEPLOYMENT
// ============================================

// Safe dotenv loading - won't crash if missing
try {
    require('dotenv').config();
} catch (err) {
    console.log('Note: dotenv not installed (this is fine on Render)');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable middleware
app.use(helmet({
    contentSecurityPolicy: false, // Simplify for deployment
}));
app.use(cors());
app.use(express.json());

// Simple in-memory storage for API key (will be set via environment)
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;

console.log(`Starting STEM Forge Backend...`);
console.log(`Port: ${PORT}`);
console.log(`AI Enabled: ${!!GROQ_API_KEY}`);

// ============================================
// MAPPING DICTIONARIES
// ============================================

const classLevelMap = {
    'grade-7': 'Grade 7 (Ages 12-13)',
    'grade-8': 'Grade 8 (Ages 13-14)',
    'grade-9': 'Grade 9 (Ages 14-15)',
    'grade-10': 'Grade 10 (Ages 15-16)',
    'grade-11': 'Grade 11 (Ages 16-17)',
    'grade-12': 'Grade 12 (Ages 17-18)'
};

const termMap = {
    'term-1': 'Term 1 (Fall)',
    'term-2': 'Term 2 (Winter)',
    'term-3': 'Term 3 (Spring)',
    'term-4': 'Term 4 (Summer)'
};

const subjectMap = {
    'robotics': { icon: '🤖', name: 'Robotics & Automation' },
    'electronics': { icon: '⚡', name: 'Electronics & Circuits' },
    'programming': { icon: '💻', name: 'Programming for Robotics' },
    'mechanics': { icon: '🔩', name: 'Mechanics & Mechanisms' },
    'physics': { icon: '⚛️', name: 'Physics (Forces & Motion)' },
    'chemistry': { icon: '🧪', name: 'Chemistry (Materials Science)' },
    'engineering': { icon: '🏗️', name: 'Engineering Design' }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLearningObjectives(subject, topic) {
    const base = [
        "Apply the Engineering Design Process to solve a real-world problem",
        "Demonstrate understanding through hands-on prototyping",
        "Collaborate effectively in teams to iterate designs"
    ];
    
    const specific = {
        'robotics': [`Program a microcontroller to respond to sensor commands`, "Troubleshoot hardware-software integration"],
        'electronics': ["Construct functional circuits", "Measure voltage and current using multimeters"],
        'programming': ["Write and debug conditional statements", "Translate pseudocode into working code"],
        'mechanics': ["Calculate mechanical advantage", "Build mechanisms that convert motion"],
        'physics': ["Apply Newton's Laws to predict motion", "Collect and analyze force/motion data"],
        'chemistry': ["Explain polymerization", "Conduct safe experiments with polymers"],
        'engineering': ["Document complete EDP cycle", "Present design iterations with justification"]
    };
    
    return [...base, ...(specific[subject] || specific['engineering'])];
}

function getSafetyProtocols(subject) {
    const common = [
        "Follow all school laboratory safety guidelines",
        "Wear appropriate personal protective equipment (PPE)",
        "Report any accidents immediately to instructor"
    ];
    
    const specific = {
        'robotics': ["Disconnect power before adjusting wiring", "Keep fingers away from moving gears"],
        'electronics': ["Never connect to high-voltage sources", "Use ESD-safe mats"],
        'chemistry': ["Wear gloves and goggles", "Work in ventilated area"]
    };
    
    return [...common, ...(specific[subject] || specific['robotics'])];
}

function generateTimeline(duration) {
    const phases = [
        { name: "Engage & Introduce", percent: 0.12 },
        { name: "EDP - Ask & Imagine", percent: 0.15 },
        { name: "Plan & Design", percent: 0.15 },
        { name: "Create & Build", percent: 0.35 },
        { name: "Test & Iterate", percent: 0.15 },
        { name: "Reflect & Share", percent: 0.08 }
    ];
    
    let currentTime = 0;
    const timeline = [];
    
    for (const phase of phases) {
        const phaseDuration = Math.round(duration * phase.percent);
        timeline.push({
            phase: phase.name,
            duration: `${phaseDuration} min`,
            start: currentTime,
            end: currentTime + phaseDuration,
            description: getPhaseDescription(phase.name)
        });
        currentTime += phaseDuration;
    }
    
    return timeline;
}

function getPhaseDescription(phase) {
    const descriptions = {
        "Engage & Introduce": "Hook students with a real-world problem.",
        "EDP - Ask & Imagine": "Students define the problem and brainstorm solutions.",
        "Plan & Design": "Teams select best solution and sketch designs.",
        "Create & Build": "Hands-on prototyping phase.",
        "Test & Iterate": "Test prototypes and make improvements.",
        "Reflect & Share": "Teams present their design process."
    };
    return descriptions[phase] || "Active student-centered learning.";
}

function getMaterials(subject) {
    const materials = {
        'robotics': ["Microcontroller board", "Sensors", "Motor driver", "DC motors", "Jumper wires", "Battery pack"],
        'electronics': ["Breadboard", "LEDs", "Resistors", "Push buttons", "Multimeter", "Jumper wires"],
        'programming': ["Computer with IDE", "Example code snippets", "Debugging checklist"],
        'mechanics': ["Gear sets", "Cardboard", "Hot glue guns", "Rulers"],
        'physics': ["Balloons", "Straws", "Tape", "Cardboard", "Stopwatch"],
        'chemistry': ["Cornstarch", "Water", "Glycerin", "Hot plate", "Molds"],
        'engineering': ["Prototyping materials", "Measurement tools", "Engineering notebooks"]
    };
    return materials[subject] || materials['engineering'];
}

function getExperientialActivity(subject) {
    const activities = {
        'robotics': "🤖 CHALLENGE: Program your robot to navigate an obstacle course.",
        'electronics': "⚡ CHALLENGE: Build a circuit that lights an LED when a button is pressed.",
        'programming': "💻 CHALLENGE: Write a program that responds to sensor input.",
        'mechanics': "🔩 CHALLENGE: Build a gear train and calculate mechanical advantage.",
        'physics': "⚛️ CHALLENGE: Design an experiment to test Newton's Second Law.",
        'chemistry': "🧪 CHALLENCHALLENGE: Synthesize a bioplastic sample.",
        'engineering': "🏗️ CHALLENGE: Complete one full EDP cycle."
    };
    return activities[subject] || activities['engineering'];
}

function getDefaultTopic(subject) {
    const topics = {
        'robotics': "Introduction to Autonomous Systems",
        'electronics': "Basic Circuit Design",
        'programming': "Conditional Logic for Sensors",
        'mechanics': "Gear Ratios and Torque",
        'physics': "Newton's Laws of Motion",
        'chemistry': "Polymer Properties",
        'engineering': "The Engineering Design Process"
    };
    return topics[subject] || "STEM Exploration";
}

function generateLessonPlan(data) {
    const { classLevel, term, subject, duration = 90, topic = "", additionalNotes = "" } = data;
    
    const className = classLevelMap[classLevel] || 'Grade 9-12';
    const termName = termMap[term] || 'Current Term';
    const subjectInfo = subjectMap[subject] || subjectMap['engineering'];
    const displayTopic = topic || getDefaultTopic(subject);
    
    return {
        metadata: {
            title: `${subjectInfo.icon} ${displayTopic}`,
            classLevel: className,
            term: termName,
            subject: subjectInfo.name,
            duration: `${duration} minutes`,
            generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        },
        learningObjectives: getLearningObjectives(subject, displayTopic),
        edpSteps: [
            "Ask: Define the Problem",
            "Imagine: Brainstorm Solutions",
            "Plan: Design & Select",
            "Create: Build Prototype",
            "Test & Improve: Iterate"
        ],
        safetyProtocols: getSafetyProtocols(subject),
        timeline: generateTimeline(duration),
        experientialActivity: getExperientialActivity(subject),
        materials: getMaterials(subject),
        assessment: [
            "Formative: Observation during build phase",
            "Performance: Functionality of prototype",
            "Summative: Engineering notebook documentation",
            "Reflection: Exit ticket on iterations"
        ],
        additionalNotes: additionalNotes || ""
    };
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'STEM Forge Backend is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'STEM Forge API is running!',
        version: '2.0.0',
        endpoints: {
            'POST /api/generate': 'Generate a lesson plan',
            'GET /api/subjects': 'Get all subjects',
            'GET /health': 'Check server status'
        }
    });
});

// Get subjects
app.get('/api/subjects', (req, res) => {
    const subjects = Object.keys(subjectMap).map(key => ({
        id: key,
        name: subjectMap[key].name,
        icon: subjectMap[key].icon
    }));
    
    res.json({
        success: true,
        data: { subjects }
    });
});

// Generate lesson plan
app.post('/api/generate', (req, res) => {
    try {
        const { classLevel, term, subject, duration, topic, additionalNotes } = req.body;
        
        if (!classLevel || !term || !subject) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing required fields: classLevel, term, subject' }
            });
        }
        
        const startTime = Date.now();
        const lessonPlan = generateLessonPlan(req.body);
        const generationTime = Date.now() - startTime;
        
        res.json({
            success: true,
            data: lessonPlan,
            message: 'Lesson plan generated successfully',
            generationTimeMs: generationTime
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to generate lesson plan' }
        });
    }
});

// AI Generate endpoint (simple version)
app.post('/api/ai-generate', async (req, res) => {
    try {
        // For now, use template generation
        const { topic, grade, duration, subject, instructions } = req.body;
        const lessonPlan = generateLessonPlan({
            classLevel: grade?.toLowerCase().replace(' ', '-') || 'grade-9',
            term: 'term-1',
            subject: subject?.toLowerCase() || 'robotics',
            duration: parseInt(duration) || 90,
            topic: topic,
            additionalNotes: instructions
        });
        
        res.json({
            success: true,
            data: lessonPlan,
            source: 'Template',
            message: 'Lesson plan generated successfully'
        });
        
    } catch (error) {
        console.error('AI error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to generate lesson plan' }
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║   🚀 STEM FORGE BACKEND IS RUNNING!                             ║
    ║                                                                  ║
    ║   📡 Port: ${PORT}                                               ║
    ║   🩺 Health: /health                                            ║
    ║   🔧 Environment: ${process.env.NODE_ENV || 'development'}       ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    `);
});
