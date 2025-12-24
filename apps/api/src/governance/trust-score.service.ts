
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirementMaturity } from '@prisma/client';

@Injectable()
export class TrustScoreService {
    constructor(private prisma: PrismaService) { }

    async calculateScore(requirementId: string) {
        // 1. Fetch metrics (Mock logic for Phase 7 MVP)
        // In real system, this would aggregate from multiple sources
        const sources = await this.prisma.extractionSource.count(); // Dummy proxy
        const updates = await this.prisma.requirementHistory.count({ where: { requirementId } });

        // 2. Calculate Factors
        // Source Reliability: More sources (if linked) -> higher
        // For MVP, randomly assign or use fixed heuristic
        const sourceReliability = 0.8;

        // Recency: Updates in last 30 days
        const updateRecency = updates > 0 ? 0.9 : 0.5;

        // Usage: Dummy for now
        const usageFrequency = 0.5;

        // Expert: Check if approved
        const req = await this.prisma.requirement.findUnique({ where: { id: requirementId } });
        const expertValidation = req?.maturity === RequirementMaturity.VERIFIED ? 1.0 : 0.0;

        // 3. Weighted Average
        const totalScore = (sourceReliability * 0.3) + (updateRecency * 0.2) + (usageFrequency * 0.2) + (expertValidation * 0.3);

        // 4. Save/Update
        return this.prisma.trustScore.upsert({
            where: { requirementId },
            create: {
                requirementId,
                sourceReliability,
                updateRecency,
                usageFrequency,
                expertValidation,
                totalScore
            },
            update: {
                sourceReliability,
                updateRecency,
                usageFrequency,
                expertValidation,
                totalScore
            }
        });
    }

    async getScore(requirementId: string) {
        return this.prisma.trustScore.findUnique({ where: { requirementId } });
    }
}
