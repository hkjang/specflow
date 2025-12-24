import { Controller, Post, Body } from '@nestjs/common';
import { ArtifactService } from './artifact.service';
import { RequirementGenerationService } from './requirement-generation.service';

@Controller('generation')
export class GenerationController {
    constructor(
        private artifactService: ArtifactService,
        private requirementGenerationService: RequirementGenerationService
    ) { }

    @Post('artifact')
    async generate(@Body() body: { projectId: string; type: 'ARCHITECTURE' | 'UI' | 'API' | 'TEST' }) {
        return this.artifactService.generateArtifact(body.projectId, body.type);
    }

    @Post('proposal')
    async generateProposal(@Body() body: { requirementIds: string[]; partnerName: string }) {
        return this.artifactService.generateProposal(body.requirementIds, body.partnerName);
    }

    @Post('summary')
    async summarize(@Body() body: { text: string }) {
        return this.requirementGenerationService.summarize(body.text);
    }

    @Post('improve')
    async improve(@Body() body: { text: string }) {
        return this.requirementGenerationService.improve(body.text);
    }
}
