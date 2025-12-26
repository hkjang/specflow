import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ExtractionAgent } from './extraction.agent';
import { RefinerAgent } from './refiner.agent';
import { ClassifierAgent } from './classifier.agent';
import { ExpanderAgent } from './expander.agent';
import { ValidatorAgent } from './validator.agent';
import { RiskDetectorAgent } from './risk-detector.agent';
import { AccuracyHeatmapService } from './accuracy-heatmap.service';
import { AutonomousGeneratorService } from './autonomous-generator.service';
import { 
  AgentType, 
  AgentInput, 
  AgentContext,
  AutonomousGenerationConfig 
} from './agent.interface';

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
    private autonomousGenerator: AutonomousGeneratorService
  ) {
    // Register all agents
    this.orchestrator.registerAgent(this.extractionAgent);
    this.orchestrator.registerAgent(this.refinerAgent);
    this.orchestrator.registerAgent(this.classifierAgent);
    this.orchestrator.registerAgent(this.expanderAgent);
    this.orchestrator.registerAgent(this.validatorAgent);
    this.orchestrator.registerAgent(this.riskDetectorAgent);
  }

  /**
   * Get registered agents
   */
  @Get()
  getAgents() {
    return {
      agents: this.orchestrator.getRegisteredAgents(),
      totalAgents: 6
    };
  }

  /**
   * Extract requirements from document
   */
  @Post('extract')
  async extract(@Body() body: { content: string; type?: string }) {
    const input: AgentInput = {
      type: 'TEXT',
      content: body.content
    };
    const context = this.orchestrator.createSession();
    return this.orchestrator.executeAgent(AgentType.EXTRACTOR, input, context);
  }

  /**
   * Refine requirements
   */
  @Post('refine')
  async refine(@Body() body: { requirements: any[] }) {
    const input: AgentInput = {
      type: 'REQUIREMENTS',
      requirements: body.requirements
    };
    const context = this.orchestrator.createSession();
    return this.orchestrator.executeAgent(AgentType.REFINER, input, context);
  }

  /**
   * Classify requirements
   */
  @Post('classify')
  async classify(@Body() body: { requirements: any[]; industry?: string }) {
    const input: AgentInput = {
      type: 'REQUIREMENTS',
      requirements: body.requirements
    };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    return this.orchestrator.executeAgent(AgentType.CLASSIFIER, input, context);
  }

  /**
   * Expand requirements (suggest missing)
   */
  @Post('expand')
  async expand(@Body() body: { 
    requirements: any[]; 
    industry?: string;
    systemType?: string;
  }) {
    const input: AgentInput = {
      type: 'REQUIREMENTS',
      requirements: body.requirements
    };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.systemType = body.systemType as any;
    return this.orchestrator.executeAgent(AgentType.EXPANDER, input, context);
  }

  /**
   * Validate requirements
   */
  @Post('validate')
  async validate(@Body() body: { requirements: any[]; industry?: string }) {
    const input: AgentInput = {
      type: 'REQUIREMENTS',
      requirements: body.requirements
    };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    return this.orchestrator.executeAgent(AgentType.VALIDATOR, input, context);
  }

  /**
   * Detect risks
   */
  @Post('detect-risk')
  async detectRisk(@Body() body: { 
    requirements: any[]; 
    industry?: string;
    regulationLevel?: string;
  }) {
    const input: AgentInput = {
      type: 'REQUIREMENTS',
      requirements: body.requirements
    };
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.regulationLevel = body.regulationLevel as any;
    return this.orchestrator.executeAgent(AgentType.RISK_DETECTOR, input, context);
  }

  /**
   * Execute full pipeline
   */
  @Post('pipeline')
  async executePipeline(@Body() body: {
    content: string;
    agents?: AgentType[];
    industry?: string;
    systemType?: string;
    regulationLevel?: string;
  }) {
    const input: AgentInput = {
      type: 'TEXT',
      content: body.content
    };
    
    const context = this.orchestrator.createSession();
    context.industry = body.industry;
    context.systemType = body.systemType as any;
    context.regulationLevel = body.regulationLevel as any;

    const agents = body.agents || [
      AgentType.EXTRACTOR,
      AgentType.REFINER,
      AgentType.CLASSIFIER,
      AgentType.EXPANDER,
      AgentType.VALIDATOR,
      AgentType.RISK_DETECTOR
    ];

    return this.orchestrator.executePipeline(
      { agents, stopOnError: false },
      input,
      context
    );
  }

  // --- Accuracy Heatmap ---

  /**
   * Get accuracy heatmap for requirements
   */
  @Post('heatmap')
  getHeatmap(@Body() body: { requirements: any[]; industry?: string }) {
    return this.heatmapService.generateHeatmapMatrix(body.requirements, body.industry);
  }

  /**
   * Get industry benchmarks
   */
  @Get('benchmarks')
  getBenchmarks(@Query('industry') industry?: string) {
    return {
      benchmarks: this.heatmapService.getBenchmarks(industry),
      description: '산업별 정확도 벤치마크 데이터'
    };
  }

  // --- Autonomous Generation ---

  /**
   * Autonomous requirement generation
   */
  @Post('autonomous/generate')
  async autonomousGenerate(@Body() config: {
    industry: string;
    systemType: 'SAAS' | 'INTERNAL' | 'B2C' | 'B2B';
    organizationMaturity: 'STARTUP' | 'MID' | 'ENTERPRISE';
    regulationLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    maxRequirements?: number;
    includeNonFunctional?: boolean;
    includeSecurityRequirements?: boolean;
  }) {
    return this.autonomousGenerator.generateRequirements(config);
  }

  /**
   * Get thinking log for a requirement
   */
  @Get('thinking/:id')
  async getThinkingLog(@Param('id') id: string) {
    return this.autonomousGenerator.getThinkingLog(id);
  }
}
