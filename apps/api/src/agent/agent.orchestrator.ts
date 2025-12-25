
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AgentJobStatus, AgentStepStatus, AgentType } from '@prisma/client';
import { GovernanceService } from './governance.service';
import { GoalManagerAgent } from './agents/goal-manager.agent';
import { ContextAnalyzerAgent } from './agents/context-analyzer.agent';
import { RequirementGeneratorAgent } from './agents/requirement-generator.agent';
import { ValidatorAgent } from './agents/validator.agent';
import { RefinerAgent } from './agents/refiner.agent';

import { RedTeamAgent } from './agents/red-team.agent';
import { PrototyperAgent } from './agents/prototyper.agent';

@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly governance: GovernanceService,
    private readonly goalManager: GoalManagerAgent,
    private readonly contextAnalyzer: ContextAnalyzerAgent,
    private readonly generator: RequirementGeneratorAgent,
    private readonly validator: ValidatorAgent,
    private readonly refiner: RefinerAgent,
    private readonly redTeam: RedTeamAgent,
    private readonly prototyper: PrototyperAgent,
    private readonly learning: LearningAgent,
  ) {}

  async createJob(goal: string, userId: string) {
    this.logger.log(`Creating new agent job for goal: ${goal}`);
    return this.prisma.agentJob.create({
      data: {
        goal,
        status: AgentJobStatus.PENDING,
        creatorId: userId,
      },
    });
  }

  async startJob(jobId: string) {
    const job = await this.prisma.agentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    await this.prisma.agentJob.update({
      where: { id: jobId },
      data: { status: AgentJobStatus.RUNNING, startedAt: new Date() },
    });

    this.runPipeline(jobId).catch(err => {
        this.logger.error(`Pipeline error for job ${jobId}`, err);
        this.prisma.agentJob.update({
            where: { id: jobId },
            data: { status: AgentJobStatus.FAILED }
        });
    });
  }

  private async runPipeline(jobId: string) {
    const job = await this.prisma.agentJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    // 1. Goal Manager
    const goalStep = await this.createStep(jobId, AgentType.GOAL_MANAGER, 1, 'Analyze Goal');
    const goalResult = await this.goalManager.analyze(job.goal); // Use analyze() with job.goal
    await this.completeStep(goalStep.id, goalResult);

    // 2. Context Analyzer
    const contextStep = await this.createStep(jobId, AgentType.CONTEXT_ANALYZER, 2, 'Analyze Context');
    const contextResult = await this.contextAnalyzer.execute(jobId, contextStep.id, goalResult);
    await this.completeStep(contextStep.id, contextResult);
    
    // Save Context
    await this.prisma.agentJob.update({ where: { id: jobId }, data: { context: contextResult } });


    // 3. Parallel Generation (Func, NFR, Sec)
    const genStepFunc = await this.createStep(jobId, AgentType.GENERATOR, 3, 'Generate Functional Req');
    const genStepNfr = await this.createStep(jobId, AgentType.GENERATOR, 3, 'Generate Non-Functional Req');
    const genStepSec = await this.createStep(jobId, AgentType.GENERATOR, 3, 'Generate Security Req');

    const [funcRes, nfrRes, secRes] = await Promise.all([
        this.generator.execute(jobId, genStepFunc.id, goalResult, contextResult, 'FUNC'),
        this.generator.execute(jobId, genStepNfr.id, goalResult, contextResult, 'NFR'),
        this.generator.execute(jobId, genStepSec.id, goalResult, contextResult, 'SEC')
    ]);

    await this.completeStep(genStepFunc.id, funcRes);
    await this.completeStep(genStepNfr.id, nfrRes);
    await this.completeStep(genStepSec.id, secRes);

    let allRequirements = [...(funcRes || []), ...(nfrRes || []), ...(secRes || [])];

    // 4. Recursive Validation & Refinement Loop
    let loopCount = 0;
    const MAX_LOOPS = 3;
    let isValid = false;

    while (loopCount < MAX_LOOPS && !isValid) {
        loopCount++;
        
        // Validate
        const valStep = await this.createStep(jobId, AgentType.VALIDATOR, 4, `Validate Requirements (Loop ${loopCount})`);
        const valResult = await this.validator.execute(jobId, valStep.id, allRequirements);
        await this.completeStep(valStep.id, valResult);

        if (valResult.overallScore >= 90) {
            isValid = true;
            allRequirements = valResult.validatedRequirements;
            break;
        }

        // Refine (Self-Correction)
        const refStep = await this.createStep(jobId, AgentType.REFINER, 5, `Refine & Fix Issues (Loop ${loopCount})`);
        const refResult = await this.refiner.execute(jobId, refStep.id, valResult);
        await this.completeStep(refStep.id, refResult);
        
        allRequirements = refResult; // Use refined requirements for next validation
    }


    // 5. Red Team Attack (The Critic)
    const redStep = await this.createStep(jobId, AgentType.VALIDATOR, 6, 'Red Team Attack Simulation');
    const redResult = await this.redTeam.execute(jobId, redStep.id, allRequirements);
    await this.completeStep(redStep.id, redResult);

    // 6. Prototyper (The Builder)
    // Only if reliable requirement set is found
    const protoStep = await this.createStep(jobId, AgentType.GENERATOR, 7, 'Instant Prototyping (Schema & UI)');
    const protoResult = await this.prototyper.execute(jobId, protoStep.id, allRequirements);
    await this.completeStep(protoStep.id, protoResult);

    // 7. Learning
    // await this.learning.processFeedback(jobId, ...); 

    await this.prisma.agentJob.update({
        where: { id: jobId },
        data: { 
            status: AgentJobStatus.COMPLETED, 
            completedAt: new Date(),
            result: {
                requirements: allRequirements,
                attacks: redResult,
                prototype: protoResult
            }
        }
    });
  }

  private async createStep(jobId: string, type: AgentType, order: number, action: string) {
    return this.prisma.agentStep.create({
      data: {
        jobId,
        agentType: type,
        order,
        action,
        status: AgentStepStatus.RUNNING,
        startedAt: new Date()
      }
    });
  }

  private async completeStep(stepId: string, output: any) {
    return this.prisma.agentStep.update({
      where: { id: stepId },
      data: {
        status: AgentStepStatus.SUCCESS,
        output,
        completedAt: new Date()
      }
    });
  }
}
