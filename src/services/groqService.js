const Groq = require('groq-sdk');

class GroqService {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        this.client = new Groq({ apiKey });
        this.model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
        console.log(`Using Groq model: ${this.model}`);
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
    const sections = [];
    
    // Build list of enabled sections (compact)
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
    
    // Custom instructions (only if user provided them)
    const customNotes = [];
    if (ad.setInduction?.custom) customNotes.push(`Set Induction: "${ad.setInduction.custom}"`);
    if (ad.priorKnowledge?.custom) customNotes.push(`Prior Knowledge: "${ad.priorKnowledge.custom}"`);
    if (ad.vocabulary?.custom) customNotes.push(`Vocabulary: "${ad.vocabulary.custom}"`);
    if (ad.instructionalMaterials?.custom) customNotes.push(`Materials: "${ad.instructionalMaterials.custom}"`);
    
    // Shorter, more focused prompt
    return `You are an expert STEM educator. Create a detailed lesson plan.

CONTEXT:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}
- Duration: ${duration} minutes
${term ? `- Term: ${term}` : ''}
${week ? `- Week: ${week}` : ''}
${instructions ? `- Notes: ${instructions}` : ''}

INCLUDE ONLY THESE SECTIONS: ${sections.join(', ')}

${customNotes.length > 0 ? 'CUSTOM CONTENT (use exactly):\n' + customNotes.join('\n') : ''}

Return valid JSON:
{
  "metadata": {"title": "", "subject": "${subject}", "classLevel": "${grade}", "term": "${term || ''}", "week": "${week || ''}", "duration": "${duration} minutes"}${ad.learningObjectives?.enabled ? ',\n  "learningObjectives": ["obj1", "obj2", "obj3"]' : ''}${ad.learningOutcomes?.enabled ? ',\n  "learningOutcomes": ["students will 1", "students will 2"]' : ''}${ad.priorKnowledge?.enabled ? ',\n  "priorKnowledge": ["prereq1", "prereq2"]' : ''}${ad.instructionalMaterials?.enabled ? ',\n  "instructionalMaterials": ["item1", "item2"]' : ''}${ad.setInduction?.enabled ? ',\n  "setInduction": {"analogy": "...", "hook": "...", "duration": 5}' : ''}${ad.teachingActivities?.enabled ? ',\n  "teachingActivities": [{"name": "", "duration": "", "teacherActivity": "", "studentActivity": ""}]' : ''}${ad.formativeAssessment?.enabled ? ',\n  "formativeAssessment": ["checkpoint1", "checkpoint2"]' : ''}${ad.closure?.enabled ? ',\n  "closure": {"recap": "", "exitTicket": "", "preview": "", "duration": 3}' : ''}${ad.differentiation?.enabled ? ',\n  "differentiation": {"advanced": "", "struggling": "", "extension": ""}' : ''}${ad.vocabulary?.enabled ? ',\n  "vocabulary": [{"term": "", "definition": ""}]' : ''}${ad.homework?.enabled ? ',\n  "homework": ["task1", "task2"]' : ''}${ad.realWorldApplication?.enabled ? ',\n  "realWorldApplication": ["app1", "app2"]' : ''}${ad.crossCurricular?.enabled ? ',\n  "crossCurricular": ["link1", "link2"]' : ''}${ad.discussionQuestions?.enabled ? ',\n  "discussionQuestions": ["Q1", "Q2"]' : ''}${ad.safetyProtocols?.enabled ? ',\n  "safetyProtocols": ["rule1", "rule2"]' : ''}${ad.engineeringDesignProcess?.enabled ? ',\n  "engineeringDesignProcess": ["Ask", "Imagine", "Plan", "Create", "Test"]' : ''}
}

Be specific and detailed. Use real examples.`;
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

            const rawContent = completion.choices[0]?.message?.content;
            if (!rawContent) {
                throw new Error('Groq returned an empty response.');
            }

            try {
                return JSON.parse(rawContent);
            } catch (parseError) {
                const cleaned = rawContent
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/\s*```$/i, '')
                    .trim();
                return JSON.parse(cleaned);
            }
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
