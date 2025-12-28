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
  RetryConfig,
  CircuitBreakerState,
  AgentHealthStatus,
} from './agent.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// Simple cache for agent results
interface CacheEntry {
  result: AgentResult;
  timestamp: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private agents: Map<AgentType, IRequirementAgent> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private circuitBreakers: Map<AgentType, CircuitBreakerState> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

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

  // --- Circuit Breaker Methods ---

  private isCircuitOpen(agentType: AgentType): boolean {
    const state = this.circuitBreakers.get(agentType);
    if (!state) return false;
    
    if (state.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (state.nextRetryTime && Date.now() >= state.nextRetryTime.getTime()) {
        state.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess(agentType: AgentType): void {
    const state = this.circuitBreakers.get(agentType);
    if (state) {
      state.failureCount = 0;
      state.state = 'CLOSED';
    }
  }

  private recordFailure(agentType: AgentType): void {
    let state = this.circuitBreakers.get(agentType);
    if (!state) {
      state = {
        agentType,
        state: 'CLOSED',
        failureCount: 0
      };
      this.circuitBreakers.set(agentType, state);
    }
    
    state.failureCount++;
    state.lastFailureTime = new Date();
    
    if (state.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'OPEN';
      state.nextRetryTime = new Date(Date.now() + CIRCUIT_BREAKER_RESET_MS);
      this.logger.warn(`Circuit breaker OPEN for ${agentType}`);
    }
  }

  // --- Execute with retry ---

  async executeWithRetry(
    agentType: AgentType,
    input: AgentInput,
    context: AgentContext,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<AgentResult> {
    // Check circuit breaker
    if (this.isCircuitOpen(agentType)) {
      return {
        agentType,
        success: false,
        executionTime: 0,
        error: `Circuit breaker is OPEN for ${agentType}. Try again later.`
      };
    }

    let lastError: Error | null = null;
    let delay = retryConfig.baseDelayMs;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeAgentWithTimeout(agentType, input, context);
        
        if (result.success) {
          this.recordSuccess(agentType);
          return result;
        }
        
        // Non-retryable failure
        if (!this.isRetryableError(result.error)) {
          this.recordFailure(agentType);
          return result;
        }
        
        lastError = new Error(result.error);
      } catch (error: any) {
        lastError = error;
      }

      if (attempt < retryConfig.maxRetries) {
        this.logger.warn(`Retry ${attempt + 1}/${retryConfig.maxRetries} for ${agentType}`);
        await this.sleep(delay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
      }
    }

    this.recordFailure(agentType);
    return {
      agentType,
      success: false,
      executionTime: 0,
      error: lastError?.message || 'Max retries exceeded'
    };
  }

  private async executeAgentWithTimeout(
    agentType: AgentType,
    input: AgentInput,
    context: AgentContext
  ): Promise<AgentResult> {
    const timeoutPromise = new Promise<AgentResult>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), this.DEFAULT_TIMEOUT_MS);
    });

    return Promise.race([
      this.executeAgent(agentType, input, context),
      timeoutPromise
    ]);
  }

  private isRetryableError(error?: string): boolean {
    if (!error) return false;
    const retryablePatterns = ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT', '503', '429'];
    return retryablePatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Health Status ---

  getAgentHealth(): AgentHealthStatus[] {
    return Array.from(this.agents.values()).map(agent => {
      const cbState = this.circuitBreakers.get(agent.type) || {
        agentType: agent.type,
        state: 'CLOSED' as const,
        failureCount: 0
      };

      return {
        agentType: agent.type,
        name: agent.name,
        status: cbState.state === 'OPEN' ? 'UNHEALTHY' : 
                cbState.state === 'HALF_OPEN' ? 'DEGRADED' : 'HEALTHY',
        successRate: 100 - (cbState.failureCount * 10), // Simplified calculation
        avgLatencyMs: 0, // Would need metrics service for actual value
        circuitBreaker: cbState
      };
    });
  }

  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  resetCircuitBreaker(agentType: AgentType): void {
    const state = this.circuitBreakers.get(agentType);
    if (state) {
      state.state = 'CLOSED';
      state.failureCount = 0;
      state.lastFailureTime = undefined;
      state.nextRetryTime = undefined;
      this.logger.log(`Circuit breaker reset for ${agentType}`);
    }
  }

  resetAllCircuitBreakers(): void {
    for (const agentType of this.circuitBreakers.keys()) {
      this.resetCircuitBreaker(agentType);
    }
  }
}
