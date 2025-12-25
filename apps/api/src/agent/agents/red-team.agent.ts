
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class RedTeamAgent {
  private readonly logger = new Logger(RedTeamAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, requirements: any[], desiredModel?: string) {
    const prompt = `
      You are a Red Team Security & Architecture Expert.
      Your goal is to BREAK the system defined by these requirements.
      Find vulnerabilities, scalability bottlenecks, and logical flaws.
      
      Requirements: ${JSON.stringify(requirements)}
      
      Attacks to simulate:
      1. Security: DDOS, SQL Injection potential, PII leak scenarios.
      2. Scale: "What if 10M users hit this API?" -> Database I/O saturation.
      3. Logic: Race conditions, deadlock scenarios.
      
      Output JSON:
      {
          "attacks": [
              {
                  "type": "Security/Scale/Logic",
                  "scenario": "Short attack scenario description",
                  "impact": "High/Medium",
                  "targetReqId": "REQ-001 (if specific)",
                  "defenseSuggested": "How to fix this requirement"
              }
          ]
      }
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object',
            temperature: 0.7, // Higher temp for creative attacks
            model: desiredModel
        }, 'ANALYSIS');
        
        const json = JSON.parse(res.content);
        return json.attacks || [];
    } catch (e) {
        this.logger.error('Red Team attack failed', e);
        return [];
    }
  }
}
