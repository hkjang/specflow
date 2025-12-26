import { Injectable, Logger } from '@nestjs/common';
import {
  AgentType,
  AgentContext,
  AgentInput,
  AgentResult,
  AgentPipelineConfig,
  IRequirementAgent,
  RequirementCandidate,
  ThinkingLogEntry,
} from './agent.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// Simple cache for agent results
interface CacheEntry {
  result: AgentResult;
  timestamp: number;
}

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private agents: Map<AgentType, IRequirementAgent> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  registerAgent(agent: IRequirementAgent): void {
    this.agents.set(agent.type, agent);
    this.logger.log(`Agent registered: ${agent.name} (${agent.type})`);
  }

  async executeAgent(
    agentType: AgentType,
    input: AgentInput,
    context: AgentContext,
    useCache = false
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentType);
    
    if (!agent) {
      return {
        agentType,
        success: false,
        executionTime: 0,
        error: `Agent ${agentType} not registered`
      };
    }

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey(agentType, input);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        this.logger.log(`Cache hit for ${agentType}`);
        return { ...cached.result, cached: true };
      }
    }

    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing agent: ${agent.name}`);
      const result = await agent.execute(input, context);
      result.executionTime = Date.now() - startTime;
      
      // Log to DB
      await this.logExecution(context.sessionId || '', agentType, result, context.userId);
      
      // Cache result
      if (useCache) {
        const cacheKey = this.getCacheKey(agentType, input);
        this.cache.set(cacheKey, { result, timestamp: Date.now() });
      }
      
      this.logger.log(`Agent ${agentType} executed: success=${result.success}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Agent ${agentType} failed`, error);
      const result: AgentResult = {
        agentType,
        success: false,
        executionTime: Date.now() - startTime,
        error: error.message
      };
      await this.logExecution(context.sessionId || '', agentType, result, context.userId);
      return result;
    }
  }

  /**
   * Sequential pipeline execution
   */
  async executePipeline(
    config: AgentPipelineConfig,
    initialInput: AgentInput,
    context: AgentContext
  ): Promise<{ results: AgentResult[]; finalCandidates: RequirementCandidate[] }> {
    const results: AgentResult[] = [];
    let currentInput = initialInput;
    context.sessionId = context.sessionId || uuidv4();

    this.logger.log(`Starting sequential pipeline with ${config.agents.length} agents`);

    for (const agentType of config.agents) {
      const result = await this.executeAgent(agentType, currentInput, context);
      results.push(result);

      if (!result.success && config.stopOnError) {
        this.logger.warn(`Pipeline stopped due to error in ${agentType}`);
        break;
      }

      if (result.candidates && result.candidates.length > 0) {
        currentInput = { type: 'REQUIREMENTS', requirements: result.candidates };
      }
      context.previousResults = results;
    }

    const finalCandidates = this.collectFinalCandidates(results);
    return { results, finalCandidates };
  }

  /**
   * Parallel pipeline execution for independent agents
   */
  async executePipelineParallel(
    agentGroups: AgentType[][],
    initialInput: AgentInput,
    context: AgentContext
  ): Promise<{ results: AgentResult[]; finalCandidates: RequirementCandidate[] }> {
    const allResults: AgentResult[] = [];
    let currentInput = initialInput;
    context.sessionId = context.sessionId || uuidv4();

    this.logger.log(`Starting parallel pipeline with ${agentGroups.length} groups`);

    for (const group of agentGroups) {
      // Execute agents in this group in parallel
      const groupResults = await Promise.all(
        group.map(agentType => this.executeAgent(agentType, currentInput, context))
      );
      
      allResults.push(...groupResults);

      // Merge candidates from parallel execution
      const groupCandidates = groupResults
        .filter(r => r.success && r.candidates?.length)
        .flatMap(r => r.candidates || []);

      if (groupCandidates.length > 0) {
        // Deduplicate by title
        const seen = new Set<string>();
        const merged = groupCandidates.filter(c => {
          const key = c.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        currentInput = { type: 'REQUIREMENTS', requirements: merged };
      }
      
      context.previousResults = allResults;
    }

    const finalCandidates = this.collectFinalCandidates(allResults);
    return { results: allResults, finalCandidates };
  }

  /**
   * Auto quality analysis pipeline
   */
  async analyzeRequirementQuality(requirements: RequirementCandidate[], industry?: string): Promise<{
    overallScore: number;
    scores: { metric: string; score: number; weight: number }[];
    suggestions: string[];
    requirements: RequirementCandidate[];
  }> {
    const context = this.createSession();
    context.industry = industry;

    const input: AgentInput = { type: 'REQUIREMENTS', requirements };

    // Run validator
    const validatorResult = await this.executeAgent(AgentType.VALIDATOR, input, context);
    
    // Run risk detector
    const riskResult = await this.executeAgent(AgentType.RISK_DETECTOR, input, context);

    const metrics = validatorResult.metrics || {};
    const scores = [
      { metric: '구조 적합도', score: metrics.structuralScore || 70, weight: 0.25 },
      { metric: '산업 적합도', score: metrics.industryScore || 70, weight: 0.20 },
      { metric: '누락 위험도', score: 100 - (metrics.missingScore || 30), weight: 0.20 },
      { metric: '중복도', score: 100 - (metrics.duplicateScore || 20), weight: 0.15 },
      { metric: '실행 가능성', score: metrics.feasibilityScore || 75, weight: 0.20 }
    ];

    const overallScore = Math.round(scores.reduce((sum, s) => sum + s.score * s.weight, 0));

    const suggestions: string[] = [];
    if (scores[0].score < 70) suggestions.push('요건 문장 구조를 "~해야 한다" 형식으로 표준화하세요.');
    if (scores[1].score < 70) suggestions.push('산업 특화 요건을 추가하세요.');
    if (scores[2].score < 70) suggestions.push('보안, 성능, 인터페이스 요건 누락 여부를 확인하세요.');
    if (scores[3].score < 80) suggestions.push('중복 요건을 통합하세요.');
    if (scores[4].score < 70) suggestions.push('테스트 가능하도록 수치화된 기준을 추가하세요.');

    return {
      overallScore,
      scores,
      suggestions,
      requirements: validatorResult.candidates || requirements
    };
  }

  private collectFinalCandidates(results: AgentResult[]): RequirementCandidate[] {
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].success && results[i].candidates?.length) {
        return results[i].candidates!;
      }
    }
    return [];
  }

  createSession(userId?: string): AgentContext {
    return {
      sessionId: uuidv4(),
      userId,
      previousResults: []
    };
  }

  getRegisteredAgents(): { type: AgentType; name: string; description: string }[] {
    return Array.from(this.agents.values()).map(a => ({
      type: a.type,
      name: a.name,
      description: a.description
    }));
  }

  addThinkingLog(
    candidates: RequirementCandidate[],
    agentType: AgentType,
    reasoning: string,
    confidence: number,
    references?: string[]
  ): RequirementCandidate[] {
    const logEntry: ThinkingLogEntry = {
      timestamp: new Date(),
      agentType,
      reasoning,
      references,
      confidence
    };

    return candidates.map(c => ({
      ...c,
      thinkingLog: [...(c.thinkingLog || []), logEntry]
    }));
  }

  private getCacheKey(agentType: AgentType, input: AgentInput): string {
    const inputStr = JSON.stringify({ type: input.type, content: input.content?.substring(0, 100) });
    return `${agentType}:${inputStr}`;
  }

  private async logExecution(
    sessionId: string,
    agentType: AgentType,
    result: AgentResult,
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.agentExecutionLog.create({
        data: {
          sessionId,
          agentType,
          input: { candidateCount: result.candidates?.length || 0 },
          output: { success: result.success, metrics: result.metrics },
          success: result.success,
          error: result.error,
          executionMs: result.executionTime,
          userId
        }
      });
    } catch (e) {
      this.logger.warn('Failed to log execution');
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

