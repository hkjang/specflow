import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class AiInferenceService {
    private readonly logger = new Logger(AiInferenceService.name);

    constructor(private readonly providerManager: AiProviderManager) { }

    async extractRequirements(content: string, context?: string, perspective: 'BUSINESS' | 'DEVELOPER' = 'BUSINESS') {
        const roleInstruction = perspective === 'DEVELOPER'
            ? 'Focus on technical feasibility, security, performance limits, and system architecture constraints. Identify implicit non-functional requirements.'
            : 'Focus on user value, business goals, user flows, and accepting criteria. Identify high-level functional requirements.';

        const prompt = `
            Analyze the following text and extract software requirements.
            Format the output as a JSON array of objects with keys: title, content, type (Functional, Non-Functional, Security), confidence (0-1).
            
            IMPORTANT: The 'title' and 'content' fields MUST be written in Korean.
            
            Perspective: ${perspective}
            Instruction: ${roleInstruction}
            
            Context (Existing Requirements / Project Info):
            ${context || 'No prior context.'}

            Text to Analyze:
            ${content}
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.1, // Low temp for more deterministic extraction
            }, 'REQUIREMENT_EXTRACTION');

            const rawResult = response.content;
            this.logger.debug(`Raw AI Response: ${rawResult}`);

            const parsed = JSON.parse(rawResult || '{"requirements": []}');
            this.logger.debug(`Parsed Requirements: ${JSON.stringify(parsed)}`);

            // Handle potential schema mismatch (some LLMs might wrap it in 'data' or top-level array)
            // Also handle case where AI returns a single object instead of an array
            let drafts: any[] = [];
            if (Array.isArray(parsed)) {
                drafts = parsed;
            } else if (parsed.requirements && Array.isArray(parsed.requirements)) {
                drafts = parsed.requirements;
            } else if (parsed.drafts && Array.isArray(parsed.drafts)) {
                drafts = parsed.drafts;
            } else if (parsed.title && parsed.content) {
                // Single object fallback
                drafts = [parsed];
            }

            // Include model name from response
            const modelName = response.modelUsed || 'AI Model';
            return { drafts, modelName };

        } catch (error) {
            this.logger.error('AI Inference Failed:', error);
            // Fallback or rethrow? 
            // Return empty to avoid crashing the job
            return { drafts: [], modelName: 'Unknown' };
        }
    }
}
