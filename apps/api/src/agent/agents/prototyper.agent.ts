
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class PrototyperAgent {
  private readonly logger = new Logger(PrototyperAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string, requirements: any[], desiredModel?: string) {
    const prompt = `
      You are an Elite Full-Stack Developer.
      Instantly convert these requirements into "Simulated Code Snippets".
      
      Requirements: ${JSON.stringify(requirements)}
      
      Tasks:
      1. Generate a Prisma Schema snippet for the core entities.
      2. Generate a React Component (Next.js/Tailwind) for the main UI.
      
      Output JSON:
      {
          "prisma": "model User { ... }",
          "react": "export default function Component() { ... }"
      }
    `;

    try {
        const res = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json_object',
            temperature: 0.1,
            model: desiredModel
        }, 'GENERATION');
        
        return JSON.parse(res.content);
    } catch (e) {
        this.logger.error('Prototyping failed', e);
        return { prisma: '// Error generating schema', react: '// Error generating component' };
    }
  }
}
