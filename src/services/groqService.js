// src/services/groqService.js
const Groq = require('groq-sdk');

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

class GroqService {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        this.client = new Groq({ apiKey });
        this.model = process.env.GROQ_MODEL || DEFAULT_MODEL;
        console.log(`Using Groq model: ${this.model}`);
    }
    
    // ============================================
    // MAIN GENERATION METHODS
    // ============================================
    
    async generateLessonPlan(data) {
        const prompt = this.buildDetailedLessonPlanPrompt(data);
        return await this.callGroq(prompt);
    }
    
    async generateLessonNote(data) {
        const prompt = this.buildLessonNotePrompt(data);
        return await this.callGroq(prompt);
    }
    
    async generateScheme(data) {
        const prompt = this.buildSchemePrompt(data);
        return await this.callGroq(prompt);
    }
    
    // ============================================
    // PROMPT BUILDERS
    // ============================================
    
    buildDetailedLessonPlanPrompt(data) {
        const { 
            topic, grade, subject, duration, term, week, 
            additionalDetails = {}, instructions 
        } = data;
        
        const ad = additionalDetails;
        const sections = [];
        
        // Build list of enabled sections
        if (ad.setInduction?.enabled) sections.push('setInduction');
        if (ad.priorKnowledge?.enabled) sections.push('priorKnowledge');
        if (ad.learningObjectives?.enabled) sections.push('learningObjectives');
        if (ad.learningOutcomes?.enabled) sections.push('learningOutcomes');
        if (ad.teachingActivities?.enabled) sections.push('teachingActivities');
        if (ad.formativeAssessment?.enabled) sections.push('formativeAssessment');
        if (ad.closure?.enabled) sections.push('closure');
        if (ad.differentiation?.enabled) sections.push('differentiation');
        if (ad.instructionalMaterials?.enabled) sections.push('instructionalMaterials');
        if (ad.vocabulary?.enabled) sections.push('vocabulary');
        if (ad.homework?.enabled) sections.push('homework');
        if (ad.realWorldApplication?.enabled) sections.push('realWorldApplication');
        if (ad.crossCurricular?.enabled) sections.push('crossCurricular');
        if (ad.discussionQuestions?.enabled) sections.push('discussionQuestions');
        if (ad.safetyProtocols?.enabled) sections.push('safetyProtocols');
        if (ad.engineeringDesignProcess?.enabled) sections.push('engineeringDesignProcess');
        
        // Custom instructions
        const customNotes = [];
        if (ad.setInduction?.custom) customNotes.push(`Set Induction: "${ad.setInduction.custom}"`);
        if (ad.priorKnowledge?.custom) customNotes.push(`Prior Knowledge: "${ad.priorKnowledge.custom}"`);
        if (ad.vocabulary?.custom) customNotes.push(`Vocabulary: "${ad.vocabulary.custom}"`);
        if (ad.instructionalMaterials?.custom) customNotes.push(`Materials: "${ad.instructionalMaterials.custom}"`);
        
        // Build the prompt
        let prompt = `You are an expert STEM educator. Create a detailed lesson plan.

CONTEXT:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}
- Duration: ${duration} minutes`;
        
        if (term) prompt += `\n- Term: ${term}`;
        if (week) prompt += `\n- Week: ${week}`;
        if (instructions) prompt += `\n- Notes: ${instructions}`;
        
        prompt += `\n\nINCLUDE ONLY THESE SECTIONS: ${sections.join(', ')}`;
        
        if (customNotes.length > 0) {
            prompt += `\n\nCUSTOM CONTENT (use exactly):\n${customNotes.join('\n')}`;
        }
        
        // Build the JSON structure
        let jsonStructure = `{
  "metadata": {
    "title": "${topic} - Lesson Plan",
    "subject": "${subject}",
    "classLevel": "${grade}",
    "term": "${term || ''}",
    "week": "${week || ''}",
    "duration": "${duration} minutes"
  }`;
        
        if (ad.learningObjectives?.enabled) {
            jsonStructure += `,\n  "learningObjectives": ["obj1", "obj2", "obj3"]`;
        }
        if (ad.learningOutcomes?.enabled) {
            jsonStructure += `,\n  "learningOutcomes": ["students will 1", "students will 2"]`;
        }
        if (ad.priorKnowledge?.enabled) {
            jsonStructure += `,\n  "priorKnowledge": ["prereq1", "prereq2"]`;
        }
        if (ad.instructionalMaterials?.enabled) {
            jsonStructure += `,\n  "instructionalMaterials": ["item1", "item2"]`;
        }
        if (ad.setInduction?.enabled) {
            jsonStructure += `,\n  "setInduction": {"analogy": "...", "hook": "...", "duration": 5}`;
        }
        if (ad.teachingActivities?.enabled) {
            jsonStructure += `,\n  "teachingActivities": [{"name": "", "duration": "", "teacherActivity": "", "studentActivity": ""}]`;
        }
        if (ad.formativeAssessment?.enabled) {
            jsonStructure += `,\n  "formativeAssessment": ["checkpoint1", "checkpoint2"]`;
        }
        if (ad.closure?.enabled) {
            jsonStructure += `,\n  "closure": {"recap": "", "exitTicket": "", "preview": "", "duration": 3}`;
        }
        if (ad.differentiation?.enabled) {
            jsonStructure += `,\n  "differentiation": {"advanced": "", "struggling": "", "extension": ""}`;
        }
        if (ad.vocabulary?.enabled) {
            jsonStructure += `,\n  "vocabulary": [{"term": "", "definition": ""}]`;
        }
        if (ad.homework?.enabled) {
            jsonStructure += `,\n  "homework": ["task1", "task2"]`;
        }
        if (ad.realWorldApplication?.enabled) {
            jsonStructure += `,\n  "realWorldApplication": ["app1", "app2"]`;
        }
        if (ad.crossCurricular?.enabled) {
            jsonStructure += `,\n  "crossCurricular": ["link1", "link2"]`;
        }
        if (ad.discussionQuestions?.enabled) {
            jsonStructure += `,\n  "discussionQuestions": ["Q1", "Q2"]`;
        }
        if (ad.safetyProtocols?.enabled) {
            jsonStructure += `,\n  "safetyProtocols": ["rule1", "rule2"]`;
        }
        if (ad.engineeringDesignProcess?.enabled) {
            jsonStructure += `,\n  "engineeringDesignProcess": ["Ask", "Imagine", "Plan", "Create", "Test"]`;
        }
        
        jsonStructure += `\n}`;
        
        prompt += `\n\nReturn valid JSON with this structure:\n${jsonStructure}`;
        prompt += `\n\nBe specific and detailed. Use real examples.`;
        
        return prompt;
    }
    
    buildLessonNotePrompt({ topic, grade, subject, duration, instructions }) {
        return `You are an expert STEM educator. Create a detailed lesson note.

Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
${instructions ? `Additional: ${instructions}` : ''}

Return valid JSON with this structure:
{
  "metadata": {"title": "", "classLevel": "", "subject": ""},
  "introduction": {"text": "", "duration": ""},
  "definitions": [{"term": "", "definition": "", "suggestedImagePrompt": ""}],
  "keyConcepts": ["concept 1", "concept 2"],
  "videoSuggestions": [{"topic": "", "searchQuery": "", "suggestedSources": []}],
  "imageSuggestions": [{"location": "", "description": "", "sources": []}],
  "materialsList": [{"item": "", "quantity": "", "source": ""}],
  "activities": [{"name": "", "duration": "", "description": ""}]
}

IMPORTANT: Only suggest search terms and sources. Do NOT generate actual images/videos.`;
    }
    
    buildSchemePrompt(data) {
        const { 
            branch, branchName, startGrade, endGrade, 
            subjects = [], competitions = [], industries = [],
            weeksPerTerm = 10, periodsPerWeek = 2, additionalNotes 
        } = data;
        
        let prompt = `You are an expert STEM curriculum designer. Create a comprehensive multi-grade scheme of work.

# CONTEXT
- Branch: ${branchName} (${branch})
- Grade Range: ${startGrade} to ${endGrade}
- Duration: ${weeksPerTerm} weeks per term, 3 terms per year
- Periods: ${periodsPerWeek} per week

# SUBJECT AREAS TO COVER
`;
        subjects.forEach((s, i) => {
            prompt += `${i + 1}. ${s}\n`;
        });
        
        if (competitions.length > 0) {
            prompt += `\n# COMPETITIONS TO PREPARE FOR\n`;
            competitions.forEach((c, i) => {
                prompt += `${i + 1}. ${c}\n`;
            });
        }
        
        if (industries.length > 0) {
            prompt += `\n# INDUSTRY APPLICATIONS\n`;
            industries.forEach((i, idx) => {
                prompt += `${idx + 1}. ${i}\n`;
            });
        }
        
        if (additionalNotes) {
            prompt += `\n# ADDITIONAL NOTES\n${additionalNotes}\n`;
        }
        
        prompt += `
# REQUIREMENTS
1. Generate 3 terms per grade (First, Second, Third)
2. Each term should have ${weeksPerTerm} weeks
3. Topics should progress from foundational to advanced
4. Include specific hands-on activities appropriate for the branch
5. Make activities age-appropriate for each grade level
6. Reference competitions and industry applications where relevant
7. Include assessment methods for each week

Return valid JSON:
{
  "metadata": {
    "title": "${branchName} Scheme of Work (Grades ${startGrade}-${endGrade})",
    "overview": "A brief 2-3 sentence overview of the program"
  },
  "terms": [
    {
      "grade": "Grade ${startGrade}",
      "term": "First Term",
      "weeks": [
        {
          "week": "1",
          "topic": "Specific topic relevant to ${branchName}",
          "objective": "What students will learn",
          "activity": "Hands-on project or exercise",
          "assessment": "How understanding will be evaluated"
        }
      ]
    }
  ],
  "equipment": ["item 1", "item 2", "item 3"],
  "careerPathways": ["Career 1", "Career 2", "Career 3"],
  "assessmentStrategy": "Overall approach to evaluating student progress"
}

Generate ALL terms for grades ${startGrade} through ${endGrade}. Be specific and practical.`;
        
        return prompt;
    }
    
    // ============================================
    // GROQ API CALL
    // ============================================
    
   async callGroq(prompt) {
    // Try the primary model first
    try {
        return await this.callGroqWithModel(prompt, this.model);
    } catch (error) {
        // If primary model fails, try fallbacks
        const fallbackModels = FALLBACK_MODELS;
        
        for (const fallbackModel of fallbackModels) {
            if (fallbackModel === this.model) continue; // Skip the one that already failed
            
            try {
                console.log(`Primary model failed, trying ${fallbackModel}...`);
                return await this.callGroqWithModel(prompt, fallbackModel);
            } catch (fallbackError) {
                continue; // Try next fallback
            }

        }
        
        // All models failed
        throw new Error('All Groq models failed. Please check your API key and try again.');
    }
}

async callGroqWithModel(prompt, modelName) {
    const requestBody = {
        messages: [
            { role: 'system', content: 'You are an expert STEM educator. Always return valid, detailed JSON.' },
            { role: 'user', content: prompt }
        ],
        model: modelName,
        temperature: 0.7,
        max_tokens: 4000
    };

    if (modelName.includes('llama') || modelName.includes('mixtral')) {
        requestBody.response_format = { type: 'json_object' };
    }
    
    
    const completion = await this.client.chat.completions.create(requestBody);
    const rawContent = completion.choices[0]?.message?.content;
    
    if (!rawContent) throw new Error('Empty response');
    
    try {
        return JSON.parse(rawContent);
    } catch (e) {
        const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(cleaned);
    }
}
}

// Export a single instance
module.exports = new GroqService();