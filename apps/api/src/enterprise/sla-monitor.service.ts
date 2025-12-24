
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SlaMonitorService {
    private readonly logger = new Logger(SlaMonitorService.name);

    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_HOUR)
    async checkSlaCompliance() {
        this.logger.log('Starting SLA Compliance Check...');
        const organizations = await this.prisma.organization.findMany();

        for (const org of organizations) {
            await this.calculateAndSaveMetrics(org.id);
        }
    }

    async calculateAndSaveMetrics(organizationId: string) {
        // 1. Calculate Average Latency (Mock logic: In real, aggregate ApiUsageLog linked to Org users)
        // Since we don't have Org ID on ApiUsageLog directly, we'd need to join User -> ApiKey -> UsageLog
        // For MVP Phase 8, we will simulate metrics.

        const randomLatency = Math.floor(Math.random() * 200) + 50; // 50-250ms
        const uptime = 99.99; // Mock uptime

        // 2. Save Metric
        await this.prisma.slaMetric.create({
            data: {
                organizationId,
                metricType: 'API_LATENCY',
                value: randomLatency
            }
        });

        await this.prisma.slaMetric.create({
            data: {
                organizationId,
                metricType: 'UPTIME',
                value: uptime
            }
        });

        // 3. Alerting (Mock)
        if (randomLatency > 200) {
            this.logger.warn(`SLA Breach: Latency high for Org ${organizationId}`);
        }

        return { latency: randomLatency, uptime };
    }

    async getMetrics(organizationId: string) {
        return this.prisma.slaMetric.findMany({
            where: { organizationId },
            orderBy: { timestamp: 'desc' },
            take: 20
        });
    }
}
