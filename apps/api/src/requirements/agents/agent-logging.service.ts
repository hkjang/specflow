import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentType, AgentResult } from './agent.interface';

export interface LogSearchFilter {
  agentType?: string;
  success?: boolean;
  fromDate?: Date;
  toDate?: Date;
  sessionId?: string;
  userId?: string;
  minExecutionMs?: number;
  maxExecutionMs?: number;
}

export interface PaginatedLogs {
  logs: any[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@Injectable()
export class AgentLoggingService {
  private readonly logger = new Logger(AgentLoggingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log agent execution to database with token tracking
   */
  async logExecution(
    sessionId: string,
    agentType: AgentType,
    result: AgentResult,
    userId?: string,
    projectId?: string,
    tokenCount?: number
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
          tokenCount: tokenCount || 0,
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

  // --- Advanced Logging Features ---

  /**
   * Get paginated logs
   */
  async getLogsPaginated(page = 1, pageSize = 20): Promise<PaginatedLogs> {
    const skip = (page - 1) * pageSize;
    
    const [logs, total] = await Promise.all([
      this.prisma.agentExecutionLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.agentExecutionLog.count()
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      hasMore: skip + logs.length < total
    };
  }

  /**
   * Search logs with filters
   */
  async searchLogs(filter: LogSearchFilter, page = 1, pageSize = 20): Promise<PaginatedLogs> {
    const where: any = {};

    if (filter.agentType) where.agentType = filter.agentType;
    if (filter.success !== undefined) where.success = filter.success;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.userId) where.userId = filter.userId;

    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = filter.fromDate;
      if (filter.toDate) where.createdAt.lte = filter.toDate;
    }

    if (filter.minExecutionMs !== undefined || filter.maxExecutionMs !== undefined) {
      where.executionMs = {};
      if (filter.minExecutionMs !== undefined) where.executionMs.gte = filter.minExecutionMs;
      if (filter.maxExecutionMs !== undefined) where.executionMs.lte = filter.maxExecutionMs;
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.agentExecutionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.agentExecutionLog.count({ where })
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      hasMore: skip + logs.length < total
    };
  }

  /**
   * Get logs by user
   */
  async getLogsByUser(userId: string, limit = 50) {
    return this.prisma.agentExecutionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(days = 7, limit = 50) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.agentExecutionLog.findMany({
      where: {
        success: false,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get slow executions
   */
  async getSlowExecutions(thresholdMs = 5000, limit = 50) {
    return this.prisma.agentExecutionLog.findMany({
      where: {
        executionMs: { gte: thresholdMs }
      },
      orderBy: { executionMs: 'desc' },
      take: limit
    });
  }

  /**
   * Delete old logs
   */
  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.agentExecutionLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    this.logger.log(`Cleaned up ${result.count} old logs`);
    return result.count;
  }
}
