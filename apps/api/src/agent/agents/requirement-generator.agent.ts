
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class RequirementGeneratorAgent {
  private readonly logger = new Logger(RequirementGeneratorAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, goalData: any, contextData: any, type: 'FUNC' | 'NFR' | 'SEC' = 'FUNC', desiredModel?: string) {
    const typeFull = type === 'FUNC' ? 'Functional' : type === 'NFR' ? 'Non-Functional' : 'Security';
    
    const prompt = `
      You are a Senior Requirement Architect specializing in ${typeFull} requirements.
      Generate detailed software requirements based on the Goal and Context.
      
      Goal: ${JSON.stringify(goalData)}
      Context: ${JSON.stringify(contextData)}
      
      Instructions:
      1. Generate 5-10 high-value ${typeFull} requirements ONLY.
      2. Use standard format: "Subject shall Action Condition".
      3. Provide a rationale for each.
      
      Output JSON:
      [
          {
              "category": "FUNC/NFR/SEC",
              "title": "Short Title",
              "content": "Detailed Requirement Statement",
              "rationale": "Why is this needed?",
              "priority": "HIGH/MEDIUM/LOW"
          }
      ]
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object', // Ideally this returns { requirements: [...] } but if it returns array directly, handle it.
            // Some providers might struggle with top-level array in json_object mode.
            // Better to ask for { "requirements": [...] }
        }, 'GENERATION');
        
        const json = JSON.parse(res.content);
        return json.requirements || json; // Handle both wrapper or direct array if possible
    } catch (e) {
        this.logger.error('Generation failed', e);
        return [
            { category: 'FUNC', title: 'Basic Requirement', content: 'System must function according to goal.', rationale: 'Fallback', priority: 'HIGH' }
        ];
    }
  }
}
