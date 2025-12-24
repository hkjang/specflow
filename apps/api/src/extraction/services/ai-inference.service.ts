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
            const parsed = JSON.parse(rawResult || '{"requirements": []}');

            return { drafts: parsed.requirements || [] };

        } catch (error) {
            this.logger.error('AI Inference Failed:', error);
            // Fallback or rethrow? 
            // Return empty to avoid crashing the job
            return { drafts: [] };
        }
    }
}
