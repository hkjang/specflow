
import { Module } from '@nestjs/common';
import { ExplanationService } from './explanation.service';
import { ExplanationController } from './explanation.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [ExplanationController],
    providers: [ExplanationService, PrismaService],
    exports: [ExplanationService],
})
export class ExplanationModule { }
