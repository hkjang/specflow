import { Controller, Post, Param, Get, Body } from '@nestjs/common';
import { MaturityService } from './maturity.service';
import { AssetService } from './asset.service';

@Controller('knowledge')
export class KnowledgeEvolutionController {
    constructor(
        private maturityService: MaturityService,
        private assetService: AssetService,
    ) { }

    @Post('maturity/:id/promote')
    async promote(@Param('id') id: string) {
        return this.maturityService.promoteToStandard(id);
    }

    @Post('maturity/:id/verify')
    async verify(@Param('id') id: string) {
        return this.maturityService.verifyStandard(id);
    }

    @Get('assets/:id/metrics')
    async getMetrics(@Param('id') id: string) {
        // Triggers ROI calc
        await this.assetService.calculateROI(id);
        return this.assetService.trackView(id); // Returns updated metric
    }
}
