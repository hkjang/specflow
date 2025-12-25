
import { Module } from '@nestjs/common';
import { AgentOrchestrator } from './agent.orchestrator';
import { AgentController } from './agent.controller';
import { GovernanceService } from './governance.service';
import { GoalManagerAgent } from './agents/goal-manager.agent';
import { ContextAnalyzerAgent } from './agents/context-analyzer.agent';
import { RequirementGeneratorAgent } from './agents/requirement-generator.agent';
import { ValidatorAgent } from './agents/validator.agent';
import { LearningAgent } from './agents/learning.agent';
import { RefinerAgent } from './agents/refiner.agent';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';

import { RedTeamAgent } from './agents/red-team.agent';
import { PrototyperAgent } from './agents/prototyper.agent';

@Module({
  controllers: [AgentController],
  imports: [AiModule], 
  providers: [
    AgentOrchestrator,
    GovernanceService,
    GoalManagerAgent,
    ContextAnalyzerAgent,
    RequirementGeneratorAgent,
    ValidatorAgent,
    RefinerAgent,
    RedTeamAgent, // New
    PrototyperAgent, // New
    LearningAgent,
    PrismaService
  ],
  exports: [AgentOrchestrator],
})
export class AgentModule {}
