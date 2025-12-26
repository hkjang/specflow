import { Module } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ClassificationModule } from '../classification/classification.module';
import { RequirementEnrichmentService } from './requirement-enrichment.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { AgentModule } from './agents/agent.module';

@Module({
  imports: [PrismaModule, AiModule, ClassificationModule, AgentModule],
  controllers: [RequirementsController],
  providers: [RequirementsService, RequirementEnrichmentService, DuplicateDetectionService],
  exports: [RequirementEnrichmentService, DuplicateDetectionService]
})
export class RequirementsModule { }
