
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AgentType } from '@prisma/client';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validatePolicy(jobId: string, actionTypes?: any): Promise<boolean> {
    const job = await this.prisma.agentJob.findUnique({
      where: { id: jobId },
      include: { steps: true }
    });
    
    if (!job) return false;

    // 1. Max Step Limit
    const MAX_STEPS = 50; 
    if (job.steps.length >= MAX_STEPS) {
        this.logger.warn(`Job ${jobId} exceeded max steps (${MAX_STEPS}). Halting.`);
        return false;
    }

    // 2. Token Limit (Mock check, normally we sum usage from AiLogs)
    // const usage = await this.prisma.aiLog.aggregate({ ... });
    // if (usage._sum.totalTokens > 100000) return false;

    // 3. Approval Policy for sensitive actions
    // if (actionTypes === AgentType.VALIDATOR && job.goal.includes('Regulated')) ...

    return true;
  }
}
