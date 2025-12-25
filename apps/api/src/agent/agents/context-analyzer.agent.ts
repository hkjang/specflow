
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class ContextAnalyzerAgent {
  private readonly logger = new Logger(ContextAnalyzerAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, goalData: any) {
    // Using the goal analysis result to find context
    const domain = goalData.domain || 'General';
    
    const prompt = `
      You are an expert Context Analyzer for Software Requirements.
      Based on the domain "${domain}" and the goal analysis below, identify the necessary context.
      
      Goal Analysis: ${JSON.stringify(goalData)}
      
      Tasks:
      1. List relevant regulations (Korean & Global standard).
      2. Suggest standard functional modules for this domain.
      3. Identify potential risks.
      
      Output JSON:
      {
          "industry": "${domain}",
          "regulations": ["Reg 1", "Reg 2"],
          "standardFunctions": ["Func 1", "Func 2"],
          "risks": ["Risk 1"],
          "similarCases": ["Case 1"]
      }
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object',
            temperature: 0.2
        }, 'ANALYSIS');
        
        return JSON.parse(res.content);
    } catch (e) {
        this.logger.error('Context analysis failed', e);
        return {
            industry: domain,
            regulations: ['Standard Data Privacy'],
            standardFunctions: ['User Management'],
            risks: [],
            similarCases: []
        };
    }
  }
}
