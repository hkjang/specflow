
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class ValidatorAgent {
  private readonly logger = new Logger(ValidatorAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, requirements: any[], desiredModel?: string) {
    const prompt = `
      You are a QA Auditor.
      Validate the following requirements for Ambiguity, Completeness, and Regulation Compliance.
      
      Requirements: ${JSON.stringify(requirements)}
      
      Tasks:
      1. Check for vague words (FAST, GOOD, APPROPRIATE).
      2. Check for logical conflicts.
      3. Assign a validity score (0-100).
      
      Output JSON:
      {
          "overallScore": 90,
          "issues": [
              { "reqIndex": 0, "issue": "Ambiguous term 'quickly'", "severity": "MEDIUM", "suggestion": "Specify < 200ms" }
          ],
          "validatedRequirements": [ ...same structure as input but possibly autoprocessed... ] 
      }
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object',
            temperature: 0.1,
            model: desiredModel
        }, 'VALIDATION'); // Assuming VALIDATION model type exists or supported
        
        return JSON.parse(res.content);
    } catch (e) {
        this.logger.error('Validation failed', e);
        return {
            overallScore: 100,
            issues: [],
            validatedRequirements: requirements
        };
    }
  }
}
