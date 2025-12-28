import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentType } from './agent.interface';

export interface AgentMetrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionMs: number;
  totalTokens: number;
  byAgentType: {
    agentType: string;
    count: number;
    successRate: number;
    avgMs: number;
  }[];
  dailyTrend: {
    date: string;
    count: number;
    successRate: number;
  }[];
}

@Injectable()
export class AgentMetricsService {
  private readonly logger = new Logger(AgentMetricsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get overall agent metrics
   */
  async getMetrics(days = 7): Promise<AgentMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.agentExecutionLog.findMany({
      where: { createdAt: { gte: startDate } }
    });

    const totalExecutions = logs.length;
    const successCount = logs.filter(l => l.success).length;
    const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0;
    
    const avgExecutionMs = totalExecutions > 0 
      ? Math.round(logs.reduce((sum, l) => sum + l.executionMs, 0) / totalExecutions) 
      : 0;
    
    const totalTokens = logs.reduce((sum, l) => sum + l.tokenCount, 0);

    // Group by agent type
    const byType: Record<string, { count: number; successCount: number; totalMs: number }> = {};
    for (const log of logs) {
      if (!byType[log.agentType]) {
        byType[log.agentType] = { count: 0, successCount: 0, totalMs: 0 };
      }
      byType[log.agentType].count++;
      if (log.success) byType[log.agentType].successCount++;
      byType[log.agentType].totalMs += log.executionMs;
    }

    const byAgentType = Object.entries(byType).map(([agentType, data]) => ({
      agentType,
      count: data.count,
      successRate: Math.round((data.successCount / data.count) * 100),
      avgMs: Math.round(data.totalMs / data.count)
    })).sort((a, b) => b.count - a.count);

    // Daily trend
    const byDate: Record<string, { count: number; successCount: number }> = {};
    for (const log of logs) {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { count: 0, successCount: 0 };
      }
      byDate[date].count++;
      if (log.success) byDate[date].successCount++;
    }

    const dailyTrend = Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        count: data.count,
        successRate: Math.round((data.successCount / data.count) * 100)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalExecutions,
      successRate,
      avgExecutionMs,
      totalTokens,
      byAgentType,
      dailyTrend
    };
  }

  /**
   * Get metrics for specific agent type
   */
  async getAgentTypeMetrics(agentType: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.agentExecutionLog.findMany({
      where: { 
        agentType,
        createdAt: { gte: startDate } 
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalExecutions = logs.length;
    const successCount = logs.filter(l => l.success).length;
    const failedLogs = logs.filter(l => !l.success);

    return {
      agentType,
      totalExecutions,
      successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0,
      avgExecutionMs: totalExecutions > 0 
        ? Math.round(logs.reduce((sum, l) => sum + l.executionMs, 0) / totalExecutions) 
        : 0,
      recentErrors: failedLogs.slice(0, 5).map(l => ({
        id: l.id,
        error: l.error,
        createdAt: l.createdAt
      }))
    };
  }

  /**
   * Get agent config
   */
  async getConfig(agentType: string) {
    return this.prisma.agentConfig.findUnique({
      where: { agentType }
    });
  }

  /**
   * Update agent config
   */
  async updateConfig(agentType: string, data: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    promptTemplate?: string;
    systemPrompt?: string;
    isEnabled?: boolean;
  }) {
    return this.prisma.agentConfig.upsert({
      where: { agentType },
      update: data,
      create: { agentType, ...data }
    });
  }

  /**
   * Get all agent configs
   */
  async getAllConfigs() {
    return this.prisma.agentConfig.findMany({
      orderBy: { priority: 'desc' }
    });
  }

  /**
   * Submit feedback for an agent execution
   */
  async submitFeedback(data: {
    executionLogId?: string;
    agentType: string;
    rating: number;
    comment?: string;
    isAccurate?: boolean;
    suggestedFix?: string;
    userId: string;
  }) {
    return this.prisma.agentFeedback.create({ data });
  }

  /**
   * Get feedback stats
   */
  async getFeedbackStats() {
    const feedback = await this.prisma.agentFeedback.findMany();
    
    const byType: Record<string, { count: number; totalRating: number; accurate: number; inaccurate: number }> = {};
    
    for (const fb of feedback) {
      if (!byType[fb.agentType]) {
        byType[fb.agentType] = { count: 0, totalRating: 0, accurate: 0, inaccurate: 0 };
      }
      byType[fb.agentType].count++;
      byType[fb.agentType].totalRating += fb.rating;
      if (fb.isAccurate === true) byType[fb.agentType].accurate++;
      if (fb.isAccurate === false) byType[fb.agentType].inaccurate++;
    }

    return Object.entries(byType).map(([agentType, data]) => ({
      agentType,
      feedbackCount: data.count,
      avgRating: Math.round((data.totalRating / data.count) * 10) / 10,
      accuracyRate: data.accurate + data.inaccurate > 0 
        ? Math.round((data.accurate / (data.accurate + data.inaccurate)) * 100) 
        : null
    }));
  }

  // --- Advanced Metrics ---

  /**
   * Get detailed metrics with percentiles
   */
  async getDetailedMetrics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.agentExecutionLog.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' }
    });

    // Group by agent type
    const byType: Record<string, { times: number[]; successCount: number; tokenSum: number; lastExec?: Date }> = {};
    
    for (const log of logs) {
      if (!byType[log.agentType]) {
        byType[log.agentType] = { times: [], successCount: 0, tokenSum: 0 };
      }
      byType[log.agentType].times.push(log.executionMs);
      if (log.success) byType[log.agentType].successCount++;
      byType[log.agentType].tokenSum += log.tokenCount;
      if (!byType[log.agentType].lastExec) {
        byType[log.agentType].lastExec = log.createdAt;
      }
    }

    return Object.entries(byType).map(([agentType, data]) => {
      const sorted = [...data.times].sort((a, b) => a - b);
      const len = sorted.length;
      
      return {
        agentType,
        totalExecutions: len,
        successRate: len > 0 ? Math.round((data.successCount / len) * 100) : 0,
        avgExecutionMs: len > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / len) : 0,
        p50Ms: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
        p90Ms: len > 0 ? sorted[Math.floor(len * 0.9)] : 0,
        p99Ms: len > 0 ? sorted[Math.floor(len * 0.99)] || sorted[len - 1] : 0,
        totalTokens: data.tokenSum,
        lastExecutionAt: data.lastExec
      };
    });
  }

  /**
   * Get hourly trend for past 24 hours
   */
  async getHourlyTrend() {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);

    const logs = await this.prisma.agentExecutionLog.findMany({
      where: { createdAt: { gte: startDate } }
    });

    const byHour: Record<string, { count: number; successCount: number }> = {};
    
    for (const log of logs) {
      const hour = log.createdAt.toISOString().slice(0, 13) + ':00';
      if (!byHour[hour]) {
        byHour[hour] = { count: 0, successCount: 0 };
      }
      byHour[hour].count++;
      if (log.success) byHour[hour].successCount++;
    }

    return Object.entries(byHour)
      .map(([hour, data]) => ({
        hour,
        count: data.count,
        successRate: Math.round((data.successCount / data.count) * 100)
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary() {
    const [today, week] = await Promise.all([
      this.getMetrics(1),
      this.getMetrics(7)
    ]);

    const avgLatencyChange = week.avgExecutionMs > 0 
      ? Math.round(((today.avgExecutionMs - week.avgExecutionMs) / week.avgExecutionMs) * 100) 
      : 0;

    const successRateChange = week.successRate > 0 
      ? today.successRate - week.successRate 
      : 0;

    return {
      todayExecutions: today.totalExecutions,
      todaySuccessRate: today.successRate,
      weekExecutions: week.totalExecutions,
      weekSuccessRate: week.successRate,
      avgLatencyChange,
      successRateChange,
      topAgents: week.byAgentType.slice(0, 3)
    };
  }
}
