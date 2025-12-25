
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

@Injectable()
export class GoalManagerAgent {
  private readonly logger = new Logger(GoalManagerAgent.name);

  constructor(private readonly aiManager: AiProviderManager) {}

  async execute(jobId: string, stepId: string) {
    // In a real scenario, we'd fetch the goal from the job. 
    // Assuming it's passed or retrieved here.
    // For now, let's assume the Orchestrator passes the goal string directly, 
    // but the signature was (jobId, stepId). 
    // I'll update the orchestrator to pass the goal or fetch it here.
    // Let's assume we can fetch it via Prisma if injected, or change signature.
    // To keep it simple without circular dependencies (Job -> Agent -> Job), 
    // let's assume the Orchestrator passes the goal text as a 3rd arg or we fetch it.
    
    // Changing signature in Orchestrator is better.
    return {
      intent: 'Generate Requirements',
      domain: 'General',
      constraints: []
    };
  }

  // Updated signature to accept goalText
  async analyze(goalText: string) {
      const prompt = `
        Analyze the following business goal for a software project.
        
        Goal: "${goalText}"
        
        Tasks:
        1. Identify the primary intent (New System, Update, Migration).
        2. Extract the business domain (e.g. Finance, Healthcare, E-commerce).
        3. Identify specific constraints (Regulations, Tech Stack, Time).
        4. Define success criteria.
        
        Output JSON:
        {
            "intent": "string",
            "domain": "string",
            "scope": { "include": [], "exclude": [] },
            "constraints": [],
            "successCriteria": [],
            "priority": "HIGH/MEDIUM/LOW"
        }
      `;

      try {
          const res = await this.aiManager.execute({
              messages: [{ role: 'user', content: prompt }],
              responseFormat: 'json_object',
              temperature: 0.1
          }, 'ANALYSIS'); // Using ANALYSIS model if available, or default
          
          const result = JSON.parse(res.content);
          this.logger.log(`Goal analyzed: ${JSON.stringify(result)}`);
          return result;
      } catch (e) {
          this.logger.error('Goal analysis failed', e);
          // Fallback
          return {
              intent: 'Unknown',
              domain: 'General',
              scope: { include: [goalText], exclude: [] },
              constraints: [],
              successCriteria: [],
              priority: 'MEDIUM'
          };
      }
  }
}
