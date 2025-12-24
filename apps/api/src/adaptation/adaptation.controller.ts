import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ProjectContextService } from './project-context.service';
import { AdapterService } from './adapter.service';

@Controller('adaptation')
export class AdaptationController {
    constructor(
        private contextService: ProjectContextService,
        private adapterService: AdapterService,
    ) { }

    @Get('context/:projectId')
    async getContext(@Param('projectId') projectId: string) {
        return this.contextService.getContext(projectId);
    }

    @Post('context/:projectId')
    async updateContext(@Param('projectId') projectId: string, @Body() data: any) {
        return this.contextService.updateContext(projectId, data);
    }

    @Post('transform')
    async transform(@Body() body: { projectId: string; content: string }) {
        return {
            result: await this.adapterService.adaptRequirement(body.projectId, body.content)
        };
    }
}
