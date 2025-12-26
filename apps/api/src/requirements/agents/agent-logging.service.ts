import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentType, AgentResult } from './agent.interface';

@Injectable()
export class AgentLoggingService {
  private readonly logger = new Logger(AgentLoggingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log agent execution to database
   */
  async logExecution(
    sessionId: string,
    agentType: AgentType,
    result: AgentResult,
    userId?: string,
    projectId?: string
  ): Promise<string> {
    try {
      const log = await this.prisma.agentExecutionLog.create({
        data: {
          sessionId,
          agentType,
          input: result.candidates ? { count: result.candidates.length } : undefined,
          output: {
            success: result.success,
            candidateCount: result.candidates?.length || 0,
            metrics: result.metrics
          },
          success: result.success,
          error: result.error,
          executionMs: result.executionTime,
          tokenCount: 0, // TODO: Get from AI response
          userId,
          projectId
        }
      });

      return log.id;
    } catch (error) {
      this.logger.error('Failed to log execution', error);
      return '';
    }
  }

  /**
   * Get execution logs by session
   */
  async getSessionLogs(sessionId: string) {
    return this.prisma.agentExecutionLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(limit = 50) {
    return this.prisma.agentExecutionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string) {
    return this.prisma.agentExecutionLog.findUnique({
      where: { id }
    });
  }
}
