import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
// import { RolesGuard } from '../auth/guards/roles.guard'; // Assuming this exists or similar
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('admin/stats')
    // @Roles(Role.ADMIN, Role.PM)
    // @UseGuards(RolesGuard)
    async getOverallStats() {
        return this.dashboardService.getOverallStats();
    }

    @Get('admin/quality')
    async getQualityMetrics() {
        return this.dashboardService.getQualityMetrics();
    }

    @Get('admin/trends')
    async getTrends(@Query('period') period: 'daily' | 'weekly') {
        return this.dashboardService.getTrends(period);
    }

    @Get('admin/risks')
    async getRisks() {
        return this.dashboardService.getRisks();
    }
    @Get('admin/trend-summary')
    async getTrendSummary(@Query('period') period: 'daily' | 'weekly') {
        return this.dashboardService.getTrendSummary(period);
    }
}
