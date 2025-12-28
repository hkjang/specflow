import { Controller, Post, Get, Body, Param, Query, Put } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ExtractionAgent } from './extraction.agent';
import { RefinerAgent } from './refiner.agent';
import { ClassifierAgent } from './classifier.agent';
import { ExpanderAgent } from './expander.agent';
import { ValidatorAgent } from './validator.agent';
import { RiskDetectorAgent } from './risk-detector.agent';
import { AccuracyHeatmapService } from './accuracy-heatmap.service';
import { AutonomousGeneratorService } from './autonomous-generator.service';
import { AgentMetricsService } from './agent-metrics.service';
import { AgentLoggingService } from './agent-logging.service';
import { AgentType, AgentInput } from './agent.interface';

@Controller('requirements/agents')
export class AgentController {
  constructor(
    private orchestrator: AgentOrchestratorService,
    private extractionAgent: ExtractionAgent,
    private refinerAgent: RefinerAgent,
    private classifierAgent: ClassifierAgent,
    private expanderAgent: ExpanderAgent,
    private validatorAgent: ValidatorAgent,
    private riskDetectorAgent: RiskDetectorAgent,
    private heatmapService: AccuracyHeatmapService,
    private autonomousGenerator: AutonomousGeneratorService,
    private metricsService: AgentMetricsService,
    private loggingService: AgentLoggingService
  ) {
    this.orchestrator.registerAgent(this.extractionAgent);
    this.orchestrator.registerAgent(this.refinerAgent);
    this.orchestrator.registerAgent(this.classifierAgent);
    this.orchestrator.registerAgent(this.expanderAgent);
    this.orchestrator.registerAgent(this.validatorAgent);
    this.orchestrator.registerAgent(this.riskDetectorAgent);
  }

  @Get()
  getAgents() {
    return { agents: this.orchestrator.getRegisteredAgents(), totalAgents: 6 };
  }

  @Post('extract')
  async extract(@Body() body: { content: string }) {
    const input: AgentInput = { type: 'TEXT', content: body.content };
    const context = this.orchestrator.createSession();
    return this.orchestrator.executeAgent(AgentType.EXTRACTOR, input, context);
  }

  @Post('refine')
  async refine(@Body() body: { requirements: any[] }) {
    const input: AgentInput = { type: 'REQUIREMENTS', requirements: body.requirements };
    const context = this.orchestrator.createSession();
    return this.orchestrator.executeAgent(AgentType.REFINER, input, context);
  }

  @Post('classify')
  async classify(@Body() body: { requirements: any[]; industry?: string }) {
    const input: AgentInput = { type: 'REQUIREMENTS', requirements: body.requirements };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    return this.orchestrator.executeAgent(AgentType.CLASSIFIER, input, context);
  }

  @Post('expand')
  async expand(@Body() body: { requirements: any[]; industry?: string; systemType?: string }) {
    const input: AgentInput = { type: 'REQUIREMENTS', requirements: body.requirements };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.systemType = body.systemType as any;
    return this.orchestrator.executeAgent(AgentType.EXPANDER, input, context);
  }

  @Post('validate')
  async validate(@Body() body: { requirements: any[]; industry?: string }) {
    const input: AgentInput = { type: 'REQUIREMENTS', requirements: body.requirements };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    return this.orchestrator.executeAgent(AgentType.VALIDATOR, input, context);
  }

  @Post('detect-risk')
  async detectRisk(@Body() body: { requirements: any[]; industry?: string; regulationLevel?: string }) {
    const input: AgentInput = { type: 'REQUIREMENTS', requirements: body.requirements };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.regulationLevel = body.regulationLevel as any;
    return this.orchestrator.executeAgent(AgentType.RISK_DETECTOR, input, context);
  }

  @Post('pipeline')
  async executePipeline(@Body() body: {
    content: string;
    agents?: AgentType[];
    industry?: string;
    systemType?: string;
    regulationLevel?: string;
  }) {
    const input: AgentInput = { type: 'TEXT', content: body.content };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.systemType = body.systemType as any;
    context.regulationLevel = body.regulationLevel as any;

    const agents = body.agents || [
      AgentType.EXTRACTOR, AgentType.REFINER, AgentType.CLASSIFIER,
      AgentType.EXPANDER, AgentType.VALIDATOR, AgentType.RISK_DETECTOR
    ];

    return this.orchestrator.executePipeline({ agents, stopOnError: false }, input, context);
  }

  // --- Heatmap ---

  @Post('heatmap')
  getHeatmap(@Body() body: { requirements: any[]; industry?: string }) {
    return this.heatmapService.generateHeatmapMatrix(body.requirements, body.industry);
  }

  @Get('benchmarks')
  getBenchmarks(@Query('industry') industry?: string) {
    return { benchmarks: this.heatmapService.getBenchmarks(industry) };
  }

  // --- Autonomous ---

  @Post('autonomous/generate')
  async autonomousGenerate(@Body() config: {
    industry: string;
    systemType: string;
    organizationMaturity: string;
    regulationLevel: string;
    maxRequirements?: number;
  }) {
    return this.autonomousGenerator.generateRequirements(config as any);
  }

  @Get('thinking/:id')
  async getThinkingLog(@Param('id') id: string) {
    return this.autonomousGenerator.getThinkingLog(id);
  }

  // --- Metrics (Phase 7) ---

  @Get('metrics')
  async getMetrics(@Query('days') days?: string) {
    return this.metricsService.getMetrics(days ? parseInt(days) : 7);
  }

  @Get('metrics/:agentType')
  async getAgentMetrics(@Param('agentType') agentType: string, @Query('days') days?: string) {
    return this.metricsService.getAgentTypeMetrics(agentType, days ? parseInt(days) : 7);
  }

  @Get('logs')
  async getExecutionLogs(@Query('limit') limit?: string) {
    return this.loggingService.getRecentExecutions(limit ? parseInt(limit) : 50);
  }

  @Get('logs/:id')
  async getExecutionLog(@Param('id') id: string) {
    return this.loggingService.getExecution(id);
  }

  // --- Config ---

  @Get('config')
  async getAllConfigs() {
    return this.metricsService.getAllConfigs();
  }

  @Get('config/:agentType')
  async getConfig(@Param('agentType') agentType: string) {
    return this.metricsService.getConfig(agentType);
  }

  @Put('config/:agentType')
  async updateConfig(@Param('agentType') agentType: string, @Body() data: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    isEnabled?: boolean;
  }) {
    return this.metricsService.updateConfig(agentType, data);
  }

  // --- Feedback ---

  @Post('feedback')
  async submitFeedback(@Body() data: {
    executionLogId?: string;
    agentType: string;
    rating: number;
    comment?: string;
    isAccurate?: boolean;
    userId: string;
  }) {
    return this.metricsService.submitFeedback(data);
  }

  @Get('feedback/stats')
  async getFeedbackStats() {
    return this.metricsService.getFeedbackStats();
  }

  // --- Phase 8: Advanced Pipeline ---

  /**
   * Parallel pipeline execution
   */
  @Post('pipeline/parallel')
  async executePipelineParallel(@Body() body: {
    content: string;
    agentGroups: string[][];
    industry?: string;
  }) {
    const input: AgentInput = { type: 'TEXT', content: body.content };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;

    const groups = body.agentGroups.map(group =>
      group.map(name => AgentType[name as keyof typeof AgentType])
    );

    return this.orchestrator.executePipelineParallel(groups, input, context);
  }

  /**
   * Quality analysis for requirements
   */
  @Post('quality-analysis')
  async analyzeQuality(@Body() body: { requirements: any[]; industry?: string }) {
    return this.orchestrator.analyzeRequirementQuality(body.requirements, body.industry);
  }

  /**
   * Cache management
   */
  @Get('cache/stats')
  getCacheStats() {
    return this.orchestrator.getCacheStats();
  }

  @Post('cache/clear')
  clearCache() {
    this.orchestrator.clearCache();
    return { message: 'Cache cleared' };
  }

  // --- New Endpoints ---

  /**
   * Agent health status
   */
  @Get('health')
  getHealth() {
    return { agents: this.orchestrator.getAgentHealth() };
  }

  /**
   * Detailed metrics with percentiles
   */
  @Get('metrics/detailed')
  async getDetailedMetrics(@Query('days') days?: string) {
    return this.metricsService.getDetailedMetrics(days ? parseInt(days) : 7);
  }

  /**
   * Hourly trend
   */
  @Get('metrics/hourly')
  async getHourlyTrend() {
    return this.metricsService.getHourlyTrend();
  }

  /**
   * Performance summary
   */
  @Get('metrics/summary')
  async getPerformanceSummary() {
    return this.metricsService.getPerformanceSummary();
  }

  /**
   * Paginated logs
   */
  @Get('logs/paginated')
  async getLogsPaginated(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.loggingService.getLogsPaginated(
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20
    );
  }

  /**
   * Search logs
   */
  @Post('logs/search')
  async searchLogs(@Body() body: {
    agentType?: string;
    success?: boolean;
    fromDate?: string;
    toDate?: string;
    sessionId?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filter = {
      agentType: body.agentType,
      success: body.success,
      sessionId: body.sessionId,
      userId: body.userId,
      fromDate: body.fromDate ? new Date(body.fromDate) : undefined,
      toDate: body.toDate ? new Date(body.toDate) : undefined
    };
    return this.loggingService.searchLogs(filter, body.page || 1, body.pageSize || 20);
  }

  /**
   * Failed executions
   */
  @Get('logs/failed')
  async getFailedExecutions(
    @Query('days') days?: string,
    @Query('limit') limit?: string
  ) {
    return this.loggingService.getFailedExecutions(
      days ? parseInt(days) : 7,
      limit ? parseInt(limit) : 50
    );
  }

  /**
   * Slow executions
   */
  @Get('logs/slow')
  async getSlowExecutions(
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string
  ) {
    return this.loggingService.getSlowExecutions(
      threshold ? parseInt(threshold) : 5000,
      limit ? parseInt(limit) : 50
    );
  }

  /**
   * Circuit breaker states
   */
  @Get('circuit-breakers')
  getCircuitBreakers() {
    return { states: this.orchestrator.getCircuitBreakerStates() };
  }

  /**
   * Reset circuit breaker
   */
  @Post('circuit-breakers/:agentType/reset')
  resetCircuitBreaker(@Param('agentType') agentType: string) {
    const type = AgentType[agentType as keyof typeof AgentType];
    if (type) {
      this.orchestrator.resetCircuitBreaker(type);
      return { message: `Circuit breaker reset for ${agentType}` };
    }
    return { error: 'Invalid agent type' };
  }

  /**
   * Execute with retry
   */
  @Post('execute-retry')
  async executeWithRetry(@Body() body: {
    agentType: string;
    content: string;
    industry?: string;
  }) {
    const type = AgentType[body.agentType as keyof typeof AgentType];
    if (!type) {
      return { error: 'Invalid agent type' };
    }
    const input: AgentInput = { type: 'TEXT', content: body.content };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    return this.orchestrator.executeWithRetry(type, input, context);
  }
}
