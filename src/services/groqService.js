const Groq = require('groq-sdk');

class GroqService {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        this.client = new Groq({
            apiKey
        });

        this.model = process.env.GROQ_MODEL;
        if (!this.model) {
            throw new Error('Missing GROQ_MODEL environment variable. Set GROQ_MODEL to a valid Groq model name.');
        }
    }
    
    async generateLessonPlan(data) {
        const prompt = this.buildLessonPlanPrompt(data);
        return await this.callGroq(prompt);
    }
    
    async generateLessonNote(data) {
        const prompt = this.buildLessonNotePrompt(data);
        return await this.callGroq(prompt);
    }
    
    buildLessonPlanPrompt({ topic, grade, subject, duration, instructions }) {
        return `You are an expert STEM curriculum designer. Create a comprehensive lesson plan.

Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
${instructions ? `Additional: ${instructions}` : ''}

Return valid JSON with this structure:
{
  "metadata": {"title": "", "classLevel": "", "subject": "", "duration": ""},
  "learningObjectives": ["objective 1", "objective 2"],
  "edpSteps": ["step 1", "step 2"],
  "safetyProtocols": ["protocol 1", "protocol 2"],
  "timeline": [{"phase": "", "duration": "", "description": ""}],
  "experientialActivity": "",
  "materials": ["item 1", "item 2"],
  "assessment": ["method 1", "method 2"]
}`;
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
                        content: 'You are a STEM education expert. Always return valid JSON.' 
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
