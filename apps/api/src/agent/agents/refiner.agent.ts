
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class RefinerAgent {
  private readonly logger = new Logger(RefinerAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, validationResult: any, desiredModel?: string) {
    const data = validationResult.validatedRequirements || [];
    
    // If there were issues, potentially fix them.
    // For now, let's just "Polish" the text.
    
    const prompt = `
      Refine the following requirements to be 'Developer Ready'.
      
      Input: ${JSON.stringify(data)}
      
      Instructions:
      1. Ensure consistent terminology.
      2. Format as professional Software Requirement Specifications (SRS).
      3. Translate any non-Korean parts to Korean if the context implies Korean output (Goal was Korean).
      
      Output JSON:
      {
          "refinedRequirements": [ ... ]
      }
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object',
            temperature: 0.2,
            model: desiredModel
        }, 'GENERATION');
        
        const json = JSON.parse(res.content);
        let refined = json.refinedRequirements || data; // Use data if missing
        
        if (Array.isArray(refined) && refined.length > 0) {
            // Validate items
            const validRefined = refined.filter((item: any) => item && item.title && item.content);
            if (validRefined.length > 0) {
                return validRefined;
            }
        }
        
        return data; // Fallback to original if refinement failed or produced garbage
    } catch (e) {
        this.logger.error('Refinement failed', e);
        return data;  
    }
  }
}
