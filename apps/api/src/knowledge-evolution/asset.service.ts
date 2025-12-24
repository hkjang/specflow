import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetService {
    constructor(private prisma: PrismaService) { }

    async trackView(requirementId: string) {
        return this.prisma.assetMetric.upsert({
            where: { requirementId },
            create: { requirementId, views: 1 },
            update: { views: { increment: 1 } },
        });
    }

    async recordAdoption(requirementId: string, projectId: string) {
        // Logic: If a requirement is copied/linked to a project context
        // For now, we increment the adoption count (simulated via adoptionRate as count, or actual rate calculation)
        // Let's treat adoptionRate as "Count of projects using this" for simplicity, or 0-100 ratio
        // If it's a float 0.0, let's treat it as a score.

        // Increment adoption 'score'
        await this.prisma.assetMetric.upsert({
            where: { requirementId },
            create: { requirementId, adoptionRate: 1.0 },
            update: { adoptionRate: { increment: 1.0 } },
        });

        // Also likely update trust grade
    }

    async calculateROI(requirementId: string): Promise<number> {
        const metric = await this.prisma.assetMetric.findUnique({
            where: { requirementId },
        });
        if (!metric) return 0;

        // Dummy ROI Formula: (Adoption * SavedHours * HourlyRate) - MaintenanceCost
        // Simplification: Adoption * 10
        const roi = metric.adoptionRate * 10;

        await this.prisma.assetMetric.update({
            where: { requirementId },
            data: { roiEstimate: roi },
        });

        return roi;
    }
}
