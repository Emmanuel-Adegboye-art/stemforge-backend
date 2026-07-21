const Groq = require('groq-sdk');

class GroqService {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        this.client = new Groq({ apiKey });
        this.model = process.env.GROQ_MODEL;
        if (!this.model) {
            throw new Error('Missing GROQ_MODEL environment variable');
        }
    }
    
    async generateLessonPlan(data) {
        const prompt = this.buildDetailedLessonPlanPrompt(data);
        return await this.callGroq(prompt);
    }
    
    async generateLessonNote(data) {
        const prompt = this.buildLessonNotePrompt(data);
        return await this.callGroq(prompt);
    }
    
    // ⭐ NEW: Build detailed prompt with all sections
    buildDetailedLessonPlanPrompt(data) {
        const { 
            topic, grade, subject, duration, term, week, 
            additionalDetails = {}, instructions 
        } = data;
        
        const ad = additionalDetails;
        const enabledSections = [];
        const customInstructions = [];
        
        // Build list of enabled sections
        if (ad.setInduction?.enabled) enabledSections.push('setInduction');
        if (ad.priorKnowledge?.enabled) enabledSections.push('priorKnowledge');
        if (ad.learningObjectives?.enabled) enabledSections.push('learningObjectives');
        if (ad.learningOutcomes?.enabled) enabledSections.push('learningOutcomes');
        if (ad.teachingActivities?.enabled) enabledSections.push('teachingActivities');
        if (ad.formativeAssessment?.enabled) enabledSections.push('formativeAssessment');
        if (ad.closure?.enabled) enabledSections.push('closure');
        if (ad.differentiation?.enabled) enabledSections.push('differentiation');
        if (ad.instructionalMaterials?.enabled) enabledSections.push('instructionalMaterials');
        if (ad.vocabulary?.enabled) enabledSections.push('vocabulary');
        if (ad.homework?.enabled) enabledSections.push('homework');
        if (ad.realWorldApplication?.enabled) enabledSections.push('realWorldApplication');
        if (ad.crossCurricular?.enabled) enabledSections.push('crossCurricular');
        if (ad.discussionQuestions?.enabled) enabledSections.push('discussionQuestions');
        if (ad.safetyProtocols?.enabled) enabledSections.push('safetyProtocols');
        if (ad.engineeringDesignProcess?.enabled) enabledSections.push('engineeringDesignProcess');
        
        // Add custom instructions for user-provided content
        if (ad.setInduction?.custom) {
            customInstructions.push(`Use this EXACT set induction: "${ad.setInduction.custom}"`);
        }
        if (ad.priorKnowledge?.custom) {
            customInstructions.push(`Use this EXACT prior knowledge list: "${ad.priorKnowledge.custom}"`);
        }
        if (ad.vocabulary?.custom) {
            customInstructions.push(`Include these EXACT vocabulary terms: "${ad.vocabulary.custom}"`);
        }
        if (ad.instructionalMaterials?.custom) {
            customInstructions.push(`Use this EXACT materials list: "${ad.instructionalMaterials.custom}"`);
        }
        
        // Add custom JSON fields
        if (ad.customFields && Object.keys(ad.customFields).length > 0) {
            customInstructions.push(`Also include these custom sections: ${JSON.stringify(ad.customFields)}`);
        }
        
        return `You are an expert STEM educator and curriculum designer with 20+ years of experience. Create a COMPREHENSIVE, DETAILED lesson plan following exact professional standards.

# LESSON CONTEXT
- Subject: ${subject}
- Grade Level: ${grade}
- Term: ${term || 'Not specified'}
- Week: ${week || 'Not specified'}
- Topic: ${topic}
- Duration: ${duration} minutes
${instructions ? `- Teacher Instructions: ${instructions}` : ''}

# SECTIONS TO INCLUDE
Generate ONLY these sections: ${enabledSections.join(', ')}

${customInstructions.length > 0 ? '# CUSTOM REQUIREMENTS\n' + customInstructions.join('\n') : ''}

# CRITICAL REQUIREMENTS
1. Be SPECIFIC and DETAILED - no generic placeholders
2. Use real examples relevant to the topic
3. Include exact timing for activities
4. Make set induction engaging (use analogy, question, or hook)
5. Activities should have BOTH teacher actions AND student actions
6. Closure must include: recap, exit ticket, AND next lesson preview
7. Differentiation must address: advanced, struggling, AND extension

# OUTPUT FORMAT
Return valid JSON with this exact structure (include only enabled sections):

{
  "metadata": {
    "title": "Engaging lesson title",
    "subject": "${subject}",
    "classLevel": "${grade}",
    "term": "${term || ''}",
    "week": "${week || ''}",
    "duration": "${duration} minutes"
  }${ad.learningObjectives?.enabled ? `,
  "learningObjectives": [
    "Specific objective 1 (what teacher will achieve)",
    "Specific objective 2",
    "Specific objective 3"
  ]` : ''}${ad.learningOutcomes?.enabled ? `,
  "learningOutcomes": [
    "Students will be able to [specific skill]",
    "Students will be able to [specific skill]",
    "Students will be able to [specific skill]"
  ]` : ''}${ad.priorKnowledge?.enabled ? `,
  "priorKnowledge": [
    "Specific prerequisite 1",
    "Specific prerequisite 2"
  ]` : ''}${ad.instructionalMaterials?.enabled ? `,
  "instructionalMaterials": [
    "Specific material/tool 1",
    "Specific material/tool 2"
  ]` : ''}${ad.setInduction?.enabled ? `,
  "setInduction": {
    "analogy": "Engaging analogy comparing topic to something familiar",
    "recall": "Question to recall previous learning",
    "hook": "Exciting statement to spark interest",
    "duration": 5
  }` : ''}${ad.teachingActivities?.enabled ? `,
  "teachingActivities": [
    {
      "name": "Activity 1: Descriptive Name",
      "duration": "8 mins",
      "teacherActivity": "Specific actions the teacher will take",
      "studentActivity": "Specific actions students will do"
    },
    {
      "name": "Activity 2: Descriptive Name",
      "duration": "12 mins",
      "teacherActivity": "...",
      "studentActivity": "..."
    }
  ]` : ''}${ad.formativeAssessment?.enabled ? `,
  "formativeAssessment": [
    "Specific checkpoint 1 with question/task",
    "Specific checkpoint 2",
    "Specific checkpoint 3"
  ]` : ''}${ad.closure?.enabled ? `,
  "closure": {
    "recap": "Summary of what was learned",
    "exitTicket": "Question students must answer before leaving",
    "preview": "What will be covered next lesson",
    "duration": 3
  }` : ''}${ad.differentiation?.enabled ? `,
  "differentiation": {
    "advanced": "Challenge for fast learners",
    "struggling": "Support for students who need help",
    "extension": "Optional deeper exploration"
  }` : ''}${ad.vocabulary?.enabled ? `,
  "vocabulary": [
    {"term": "Word", "definition": "Clear definition"},
    {"term": "Word", "definition": "Clear definition"}
  ]` : ''}${ad.homework?.enabled ? `,
  "homework": [
    "Specific task 1",
    "Specific task 2"
  ]` : ''}${ad.realWorldApplication?.enabled ? `,
  "realWorldApplication": [
    "Career/industry connection 1",
    "Career/industry connection 2"
  ]` : ''}${ad.crossCurricular?.enabled ? `,
  "crossCurricular": [
    "Link to Mathematics",
    "Link to Science"
  ]` : ''}${ad.discussionQuestions?.enabled ? `,
  "discussionQuestions": [
    "Thought-provoking question 1",
    "Thought-provoking question 2"
  ]` : ''}${ad.safetyProtocols?.enabled ? `,
  "safetyProtocols": [
    "Specific safety rule 1",
    "Specific safety rule 2"
  ]` : ''}${ad.engineeringDesignProcess?.enabled ? `,
  "engineeringDesignProcess": [
    "Ask: Identify the problem",
    "Imagine: Brainstorm solutions",
    "Plan: Design approach",
    "Create: Build prototype",
    "Test & Improve: Evaluate and refine"
  ]` : ''}
}

IMPORTANT: Be detailed and specific. Use real examples, not generic placeholders.`;
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
    
    async callGroq(prompt) {
        try {
            console.log(`Attempting Groq model: ${this.model}`);
            const completion = await this.client.chat.completions.create({
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert STEM educator. Always return valid, detailed JSON.' 
                    },
                    { role: 'user', content: prompt }
                ],
                model: this.model,
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: 'json_object' }
            });

            return JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            const errMsg = (error.message || '').toLowerCase();
            console.warn(`Groq model ${this.model} failed:`, errMsg || error);

            if (errMsg.includes('invalid_api_key')) {
                throw new Error('AI generation failed: invalid API key.');
            }

            const modelError = new Error(`AI generation failed: Groq model ${this.model} does not exist or is not accessible.`);
            modelError.details = [{ model: this.model, message: errMsg || error.toString() }];
            throw modelError;
        }
    }
}

module.exports = new GroqService();
