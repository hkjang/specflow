
import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { UsageTrackingInterceptor } from './usage.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { AdvancedAnalysisService } from '../analysis/advanced-analysis.service';

@Controller('api/v1/product')
@UseGuards(ApiKeyGuard)
@UseInterceptors(UsageTrackingInterceptor)
export class ProductController {
    constructor(
        private prisma: PrismaService,
        private analysisService: AdvancedAnalysisService
    ) { }

    @Get('requirements')
    async searchRequirements(
        @Query('industry') industry?: string,
        @Query('regulation') regulation?: string,
        @Query('limit') limit: string = '10'
    ) {
        const where: any = { status: 'APPROVED' };

        if (industry) {
            // Assuming categories/industries link via classifications relation
            where.classifications = {
                some: {
                    category: {
                        code: { startsWith: industry } // Or exact match depending on data
                    }
                }
            };
        }

        // Simple fetch for MVP
        const results = await this.prisma.requirement.findMany({
            where,
            take: parseInt(limit) > 50 ? 50 : parseInt(limit),
            select: {
                code: true,
                title: true,
                content: true
            }
        });

        // Map response to clean DTO
        return {
            data: results,
            meta: { count: results.length }
        };
    }

    @Post('compliance/check')
    async checkCompliance(@Body() body: { content: string }) {
        // Use existing advanced analysis logic
        const riskReport = await this.analysisService.analyzeRisk(body.content);
        return {
            compliant: riskReport.level === 'LOW',
            details: riskReport
        };
    }
}
