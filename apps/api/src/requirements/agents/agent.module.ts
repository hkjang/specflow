import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ExtractionAgent } from './extraction.agent';
import { RefinerAgent } from './refiner.agent';
import { ClassifierAgent } from './classifier.agent';
import { ExpanderAgent } from './expander.agent';
import { ValidatorAgent } from './validator.agent';
import { RiskDetectorAgent } from './risk-detector.agent';
import { AccuracyHeatmapService } from './accuracy-heatmap.service';
import { AutonomousGeneratorService } from './autonomous-generator.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [AgentController],
  providers: [
    AgentOrchestratorService,
    ExtractionAgent,
    RefinerAgent,
    ClassifierAgent,
    ExpanderAgent,
    ValidatorAgent,
    RiskDetectorAgent,
    AccuracyHeatmapService,
    AutonomousGeneratorService,
  ],
  exports: [
    AgentOrchestratorService,
    AccuracyHeatmapService,
    AutonomousGeneratorService,
  ],
})
export class AgentModule {}
