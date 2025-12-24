import { Module } from '@nestjs/common';
import { ConflictService } from './conflict.service';
import { RecommendationService } from './recommendation.service';
import { AdvancedAnalysisService } from './advanced-analysis.service';
import { LinguisticsService } from './linguistics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

import { AnalysisController } from './analysis.controller';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AnalysisController],
    providers: [ConflictService, RecommendationService, AdvancedAnalysisService, LinguisticsService],
    exports: [ConflictService, RecommendationService, AdvancedAnalysisService, LinguisticsService],
})
export class AnalysisModule { }
