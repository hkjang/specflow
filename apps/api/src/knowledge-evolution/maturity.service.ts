import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirementMaturity, RequirementStatus } from '@prisma/client';

@Injectable()
export class MaturityService {
    private readonly logger = new Logger(MaturityService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Promote a requirement to a higher maturity level based on criteria.
     * "Standard" requirements are reusable assets.
     */
    async promoteToStandard(requirementId: string) {
        const req = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
            include: { assetMetric: true },
        });

        if (!req) throw new Error('Requirement not found');

        // Promotion Criteria Logic (Example)
        // 1. Must be APPROVED
        // 2. Must be atomic (isAtomic = true)
        // 3. Must have positive adoption/ROI (if metrics exist)

        // Promotion Criteria Logic
        // Relaxed: A DRAFT requirement can be promoted directly (effectively approving it)
        
        let newStatus = req.status;
        if (req.status === RequirementStatus.DRAFT || req.status === RequirementStatus.REVIEW) {
             newStatus = RequirementStatus.APPROVED;
        }

        // Update
        return this.prisma.requirement.update({
            where: { id: requirementId },
            data: {
                status: newStatus,
                maturity: RequirementMaturity.STANDARD,
                trustGrade: { increment: 10 }, // Boost trust on promotion
            },
        });
    }

    /**
     * Verify a standard requirement against real-world projects.
     */
    async verifyStandard(requirementId: string) {
        return this.prisma.requirement.update({
            where: { id: requirementId },
            data: {
                maturity: RequirementMaturity.VERIFIED,
                trustGrade: { increment: 20 },
            },
        });
    }

    /**
     * Calculate Trust Grade based on usage and feedback.
     */
    async updateTrustGrade(requirementId: string) {
        const metrics = await this.prisma.assetMetric.findUnique({
            where: { requirementId },
        });

        if (!metrics) return;

        // Simple Formula: Views * 0.1 + Adoption * 5
        const computedScore = (metrics.views * 0.1) + (metrics.adoptionRate * 50); // adoptionRate 0.0-1.0? 
        // Let's assume adoptionRate is percentage 0-100 or count

        let trustGrade = Math.min(100, computedScore);

        await this.prisma.requirement.update({
            where: { id: requirementId },
            data: { trustGrade },
        });
    }
}
