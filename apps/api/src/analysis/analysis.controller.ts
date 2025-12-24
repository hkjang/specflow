import { Controller, Post, Body } from '@nestjs/common';
import { ConflictService } from './conflict.service';
import { RecommendationService } from './recommendation.service';

@Controller('analysis')
export class AnalysisController {
    constructor(
        private conflictService: ConflictService,
        private recommendationService: RecommendationService,
    ) { }

    @Post('conflicts')
    async analyzeConflicts(@Body() body: { projectId: string; requirementIds: string[] }) {
        return this.conflictService.detectConflicts(body.projectId, body.requirementIds);
    }

    @Post('recommend')
    async recommend(@Body() body: { projectId: string }) {
        return this.recommendationService.recommendMissing(body.projectId);
    }

    @Post('duplicates')
    async checkDuplicates(@Body() body: { content: string; projectId?: string }) {
        return this.conflictService.findDuplicates(body.content, body.projectId);
    }

    @Post('api-recommendations')
    async recommendApis(@Body() body: { requirementIds: string[] }) {
        return this.recommendationService.recommendApis(body.requirementIds);
    }
}
