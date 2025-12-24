
import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequirementGenerationService {
    constructor(
        private aiService: AiService,
        private prisma: PrismaService
    ) { }

    async summarize(text: string) {
        return this.aiService.summarize(text);
    }

    async improve(text: string) {
        return this.aiService.improve(text);
    }

    // Future: Generate Test Case from Requirement, etc.
}
