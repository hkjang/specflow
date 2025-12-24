import { Module } from '@nestjs/common';
import { ArtifactService } from './artifact.service';
import { RequirementGenerationService } from './requirement-generation.service';
import { DevArtifactService } from './dev-artifact.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

import { GenerationController } from './generation.controller';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [GenerationController],
    providers: [ArtifactService, RequirementGenerationService, DevArtifactService],
    exports: [ArtifactService, RequirementGenerationService, DevArtifactService],
})
export class GenerationModule { }
