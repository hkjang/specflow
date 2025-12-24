import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionService } from './services/ingestion.service';
import { PreprocessingService } from './services/preprocessing.service';
import { AiInferenceService } from './services/ai-inference.service';
import { ExtractionPipelineService } from './services/extraction-pipeline.service';
import { QualityAssuranceService } from './services/quality-assurance.service';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [ExtractionController],
    providers: [
        ExtractionService,
        IngestionService,
        PreprocessingService,
        AiInferenceService,
        ExtractionPipelineService,
        QualityAssuranceService,
    ],
    exports: [ExtractionService],
})
export class ExtractionModule { }
