// ============================================
// STEM FORGE BACKEND - PRODUCTION READY
// For Render.com Deployment
// ============================================

// Load environment variables (safe for both local and production)
try {
    require('dotenv').config();
} catch (err) {
    console.log('dotenv not installed - using production environment');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
// Use PORT from environment (Render sets this) or default to 3000 for local
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
// GROQ AI CONFIGURATION
// ============================================

// For Node.js < 18, you may need to install node-fetch
let fetch;
if (!globalThis.fetch) {
    fetch = require('node-fetch');
} else {
    fetch = globalThis.fetch;
}

// ============================================
// LESSON GENERATION LOGIC
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
    
    if (currentTime !== duration) {
        const lastPhase = timeline[timeline.length - 1];
        const adjustedDuration = duration - (timeline.length > 1 ? timeline[timeline.length - 2].end : 0);
        lastPhase.duration = `${adjustedDuration} min`;
        lastPhase.end = duration;
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
        'robotics': "🤖 ROBOTICS CHALLENGE: Program your robot to navigate an obstacle course. Test three different sensor thresholds.",
        'electronics': "⚡ CIRCUIT CHALLENGE: Build a circuit that lights an LED when a button is pressed.",
        'programming': "💻 CODING CHALLENGE: Write a program that responds to sensor input.",
        'mechanics': "🔩 MECHANICS CHALLENGE: Build a gear train with three different gear ratios.",
        'physics': "⚛️ PHYSICS CHALLENGE: Design an experiment to test Newton's Second Law.",
        'chemistry': "🧪 CHEMISTRY CHALLENGE: Synthesize a bioplastic sample.",
        'engineering': "🏗️ ENGINEERING CHALLENGE: Complete one full EDP cycle."
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

// Template fallback function for AI
function generateTemplateLesson(topic, grade, duration, subject, instructions) {
    return {
        metadata: {
            title: `📚 ${topic} - Lesson Plan`,
            classLevel: grade,
            duration: `${duration} minutes`,
            subject: subject,
            generatedDate: new Date().toLocaleDateString()
        },
        learningObjectives: [
            `Understand the core concepts of ${topic}`,
            `Apply ${topic} principles in hands-on activities`,
            `Demonstrate proficiency through project work`,
            `Collaborate effectively in team settings`
        ],
        edpSteps: ["Ask", "Imagine", "Plan", "Create", "Test & Improve"],
        safetyProtocols: [
            "Follow all lab safety guidelines",
            "Wear appropriate PPE",
            "Report accidents immediately",
            "Keep workspace clean"
        ],
        timeline: [
            { phase: "Introduction", duration: `${Math.floor(duration * 0.1)} min`, description: "Hook and engage" },
            { phase: "EDP Phases", duration: `${Math.floor(duration * 0.7)} min`, description: "Main activity" },
            { phase: "Reflection", duration: `${Math.floor(duration * 0.2)} min`, description: "Share and assess" }
        ],
        experientialActivity: `🔧 Hands-on challenge related to ${topic}`,
        materials: ["Basic robotics kit", "Sensors", "Microcontroller", "Jumper wires"],
        assessment: ["Observation", "Project completion", "Documentation review"],
        additionalInstructions: instructions || ""
    };
}

// ============================================
// AI LESSON GENERATION WITH GROQ
// ============================================

async function generateWithAI(prompt) {
    if (!GROQ_API_KEY) {
        console.log('No API key found, using template generation');
        return null;
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a robotics curriculum expert for Nigerian secondary schools. Generate detailed, EDP-aligned lesson plans.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        }
        return null;
        
    } catch (error) {
        console.error('AI API error:', error);
        return null;
    }
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'STEM Forge Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        aiEnabled: !!GROQ_API_KEY
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
            'POST /api/ai-generate': 'Generate AI-powered lesson plan',
            'GET /api/subjects': 'Get all available subjects',
            'GET /health': 'Check server status'
        }
    });
});

// Get all subjects
app.get('/api/subjects', (req, res) => {
    const subjects = [
        { id: 'robotics', name: 'Robotics & Automation', icon: '🤖' },
        { id: 'electronics', name: 'Electronics & Circuits', icon: '⚡' },
        { id: 'programming', name: 'Programming for Robotics', icon: '💻' },
        { id: 'mechanics', name: 'Mechanics & Mechanisms', icon: '🔩' },
        { id: 'physics', name: 'Physics (Forces & Motion)', icon: '⚛️' },
        { id: 'chemistry', name: 'Chemistry (Materials Science)', icon: '🧪' },
        { id: 'engineering', name: 'Engineering Design', icon: '🏗️' }
    ];
    
    res.json({
        success: true,
        data: { subjects }
    });
});

// Generate lesson plan endpoint (template-based)
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
        console.error('Generation error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to generate lesson plan' }
        });
    }
});

// AI Generate lesson plan endpoint
app.post('/api/ai-generate', async (req, res) => {
    try {
        const { topic, grade, duration, subject, instructions, enableWebSearch } = req.body;
        
        const prompt = `Generate a complete robotics lesson plan with the following specifications:

Topic: ${topic}
Grade Level: ${grade}
Duration: ${duration} minutes
Subject Area: ${subject}
${instructions ? `Additional Instructions: ${instructions}` : ''}

The lesson plan MUST follow the Engineering Design Process (EDP):
1. Ask (Define Problem)
2. Imagine (Brainstorm Solutions)
3. Plan (Design & Select)
4. Create (Build Prototype)
5. Test & Improve (Iterate)

Please include:
- 4-6 Learning Objectives
- Complete EDP steps with descriptions
- 5-7 Safety Protocols
- Detailed timeline with phases and durations
- A hands-on experiential activity
- Materials list
- Assessment methods

Return ONLY valid JSON, no markdown formatting.`;

        let aiResponse = null;
        if (GROQ_API_KEY) {
            aiResponse = await generateWithAI(prompt);
        }
        
        let lessonPlan;
        if (aiResponse) {
            try {
                const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                lessonPlan = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                lessonPlan = generateTemplateLesson(topic, grade, duration, subject, instructions);
            }
        } else {
            lessonPlan = generateTemplateLesson(topic, grade, duration, subject, instructions);
        }
        
        res.json({
            success: true,
            data: lessonPlan,
            source: aiResponse ? 'AI' : 'Template',
            message: 'Lesson plan generated successfully'
        });
        
    } catch (error) {
        console.error('AI generation error:', error);
        const lessonPlan = generateTemplateLesson(req.body.topic, req.body.grade, 
            req.body.duration, req.body.subject, req.body.instructions);
        res.json({
            success: true,
            data: lessonPlan,
            source: 'Template (Fallback)',
            message: 'Generated using template'
        });
    }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║   🚀 STEM FORGE BACKEND IS RUNNING!                             ║
    ║                                                                  ║
    ║   📡 Port: ${PORT}                                               ║
    ║   🩺 Health: http://localhost:${PORT}/health                     ║
    ║   🤖 AI Enabled: ${!!GROQ_API_KEY}                               ║
    ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}       ║
    ║                                                                  ║
    ║   Press Ctrl+C to stop                                          ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    `);
});
