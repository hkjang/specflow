import { Module } from '@nestjs/common';
import { ProjectContextService } from './project-context.service';
import { AdapterService } from './adapter.service';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

import { AdaptationController } from './adaptation.controller';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AdaptationController],
    providers: [ProjectContextService, AdapterService, TranslationService],
    exports: [ProjectContextService, AdapterService, TranslationService],
})
export class AdaptationModule { }
