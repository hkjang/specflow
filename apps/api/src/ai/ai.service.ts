import { Injectable } from '@nestjs/common';
import { AiProviderManager } from './provider/ai-provider.manager';

@Injectable()
export class AiService {

    constructor(private readonly providerManager: AiProviderManager) { }

    async translateToKorean(text: string): Promise<string> {
        const prompt = `
            Translate the following software requirement text into natural, professional Korean.
            Maintain technical terms in English if they are industry standards (e.g. API, REST, SSO).
            
            Input Text: "${text}"
            
            Output ONLY the translated text.
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            }, 'TRANSLATION');

            return response.content.trim();
        } catch (e) {
            console.error('Translation failed', e);
            return text;
        }
    }

    async standardizeRequirement(text: string): Promise<string> {
        const prompt = `
            Rewrite the following Korean software requirement to follow standard requirement syntax.
            
            Rules:
            1. Use the sentence structure: "subject" + "must/should" + "action".
            2. End the sentence with "~해야 한다" (must).
            3. Use present tense.
            4. Remove vague words like "appropriately", "possibly".
            
            Input: "${text}"
            
            Output ONLY the rewritten text.
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            }, 'STANDARDIZATION');

            return response.content.trim();
        } catch (e) {
            console.error('Standardization failed', e);
            return text;
        }
    }

    async classifyRequirement(text: string, categoriesContext: any[]): Promise<{ categoryCodes: string[], confidence: number, reasoning: string }> {
        const categoriesList = categoriesContext.map(c => `${c.code} (${c.level}): ${c.name} - ${c.description}`).join('\n');

        const prompt = `
      You are a Senior Requirement Analyst.
      Classify the following software requirement into the provided categories.
      
      Input Requirement: "${text}"
      
      Categories Hierarchy:
      ${categoriesList}

      Instructions:
      1. Select the most specific LEAF categories if possible.
      2. If a requirement implies multiple domains (e.g., "Login speed" -> Security + Performance), select both.
      3. Assign a confidence score (0.0 - 1.0) based on how clearly the text matches the category description.
      
      Respond ONLY in JSON format:
      {
        "categoryCodes": ["CODE1", "CODE2"],
        "confidence": 0.95,
        "reasoning": "Explain why these categories were chosen."
      }
    `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0,
            }, 'CLASSIFICATION');

            return JSON.parse(response.content || '{}');
        } catch (error) {
            console.error('AI Classification Failed', error);
            // Partial fallback if parsing fails but content exists? rarely happens with json_object mode
            return { categoryCodes: [], confidence: 0, reasoning: 'AI Error: ' + error.message };
        }
    }
    async generateExplanation(key: string, category: string, context?: string): Promise<{ title: string, content: string, examples: string }> {
        const prompt = `
            You are a UX writer for a Korean enterprise software.
            Generate a helpful explanation for a UI element.
            
            Context:
            - Key: ${key} (This indicates the location/type of the element)
            - Category: ${category} (MENU, SCREEN, FIELD, etc.)
            - Additional Context: ${context || 'N/A'}
            
            Language: Korean (Natural, Professional, Friendly)
            
            Output JSON:
            {
                "title": "Short descriptive title (max 5 words)",
                "content": "Clear explanation of what this is and why it's used (1-2 sentences)",
                "examples": "Practical example of value or usage (optional)"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.7,
            }, 'GENERATION');

            if (!response.content) {
                throw new Error('Empty response from AI provider');
            }

            return JSON.parse(response.content);
        } catch (e) {
            console.error('Explanation generation failed', e);
            throw new Error(`Failed to generate explanation: ${e.message}`);
        }
    }

    async summarize(text: string): Promise<{ summary: string; points: string[] }> {
        const prompt = `
            Analyze the following requirement text and provide a concise summary.
            
            Text: "${text}"
            
            Language: Korean
            Output JSON:
            {
                "summary": "One line summary of the requirement",
                "points": ["Key point 1", "Key point 2"]
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.3,
            }, 'GENERATION');

            return JSON.parse(response.content || '{}');
        } catch (e) {
            console.error('Summary generation failed', e);
            throw new Error('Failed to generate summary');
        }
    }

    async improve(text: string): Promise<{ suggestion: string; reason: string }> {
        const prompt = `
            Review the following requirement text and suggest improvements for clarity, professionalism, and standard format (System must...).
            
            Text: "${text}"
            
            Language: Korean
            Output JSON:
            {
                "suggestion": "Rewritten text",
                "reason": "Why this is better (e.g. removed ambiguity, standardized format)"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.5,
            }, 'GENERATION');

            return JSON.parse(response.content || '{}');
        } catch (e) {
            console.error('Improvement generation failed', e);
            throw new Error('Failed to generate improvement');
        }
    }
}
