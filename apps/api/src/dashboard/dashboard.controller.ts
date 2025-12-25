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

    @Get('mine')
    async getUserStats(@Query('userId') userId: string) {
        // In a real app, userId should be extracted from the JWT token (UserGuard).
        // For this demo/MVP, we accept it as a query param or header, or default to a test user if not provided.
        // Let's assume the frontend sends the ID or we use a fallback for now.
        if (!userId) {
             // Fallback for demo navigation if no auth context
             return { assigned: 0, toDo: 0, approved: 0, todayActivity: 0 };
        }
        return this.dashboardService.getUserStats(userId);
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

    @Get('activities')
    async getRecentActivities(@Query('limit') limit?: string) {
        return this.dashboardService.getRecentActivities(limit ? parseInt(limit) : 10);
    }

    @Get('progress')
    async getProgressStats() {
        return this.dashboardService.getProgressStats();
    }
}
