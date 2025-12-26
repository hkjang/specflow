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

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private agents: Map<AgentType, IRequirementAgent> = new Map();

  constructor(private prisma: PrismaService) {}

  registerAgent(agent: IRequirementAgent): void {
    this.agents.set(agent.type, agent);
    this.logger.log(`Agent registered: ${agent.name} (${agent.type})`);
  }

  async executeAgent(
    agentType: AgentType,
    input: AgentInput,
    context: AgentContext
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

    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing agent: ${agent.name}`);
      const result = await agent.execute(input, context);
      result.executionTime = Date.now() - startTime;
      this.logger.log(`Agent ${agentType} executed: success=${result.success}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Agent ${agentType} failed`, error);
      return {
        agentType,
        success: false,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async executePipeline(
    config: AgentPipelineConfig,
    initialInput: AgentInput,
    context: AgentContext
  ): Promise<{ results: AgentResult[]; finalCandidates: RequirementCandidate[] }> {
    const results: AgentResult[] = [];
    let currentInput = initialInput;
    context.sessionId = context.sessionId || uuidv4();

    this.logger.log(`Starting pipeline with ${config.agents.length} agents`);

    for (const agentType of config.agents) {
      const result = await this.executeAgent(agentType, currentInput, context);
      results.push(result);

      if (!result.success && config.stopOnError) {
        this.logger.warn(`Pipeline stopped due to error in ${agentType}`);
        break;
      }

      if (result.candidates && result.candidates.length > 0) {
        currentInput = {
          type: 'REQUIREMENTS',
          requirements: result.candidates
        };
      }
      context.previousResults = results;
    }

    const finalCandidates = this.collectFinalCandidates(results);
    return { results, finalCandidates };
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
}
