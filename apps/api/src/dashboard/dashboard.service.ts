import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirementStatus } from '@prisma/client';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';

@Injectable()
export class DashboardService {
    constructor(
        private prisma: PrismaService,
        private aiManager: AiProviderManager
    ) { }

    async getOverallStats() {
        const total = await this.prisma.requirement.count();
        const statusCounts = await this.prisma.requirement.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });

        // Transform to map for easier consumption
        const stats: Record<string, number> = {};
        Object.values(RequirementStatus).forEach((status) => {
            stats[status] = 0;
        });

        statusCounts.forEach((item) => {
            stats[item.status] = item._count.id;
        });

        return {
            total,
            byStatus: stats,
        };
    }

    async getUserStats(userId: string) {
        // Stats for a specific practitioner
        const assignedCount = await this.prisma.requirement.count({
            where: {
                 // Use creatorId based on schema
                 creatorId: userId
            }
        });

        const pendingReviewCount = await this.prisma.approvalRequest.count({
            where: {
                reviewerId: userId,
                status: 'PENDING'
            }
        });

        const approvedCount = await this.prisma.requirement.count({
            where: {
                creatorId: userId,
                status: 'APPROVED'
            }
        });

        // "Today's Activity" - simplified as changes made by user today
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const activityCount = await this.prisma.requirementHistory.count({
            where: {
                changerId: userId,
                createdAt: { gte: startOfDay }
            }
        });

        return {
            assigned: assignedCount,
            toDo: pendingReviewCount,
            approved: approvedCount,
            todayActivity: activityCount
        };
    }

    async getQualityMetrics() {
        // Average scores
        const aggregates = await this.prisma.qualityMetric.aggregate({
            _avg: {
                ambiguityScore: true,
                redundancyScore: true,
                completeness: true,
                correctness: true,
                overallScore: true,
            },
        });

        const lowConfidenceCount = await this.prisma.requirement.count({
            where: {
                trustGrade: {
                    lt: 0.7, // Threshold
                },
            },
        });

        return {
            averages: aggregates._avg,
            lowConfidenceCount,
        };
    }

    async getTrends(period: 'daily' | 'weekly' = 'daily') {
        // For simplicity, get last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const created = await this.prisma.requirement.groupBy({
            by: ['createdAt'],
            _count: {
                id: true,
            },
            where: {
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        const trendMap = new Map<string, number>();

        created.forEach(item => {
            const dateKey = item.createdAt.toISOString().split('T')[0];
            const count = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, count + item._count.id);
        });

        return Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));
    }

    async getRisks() {
        // High ambiguity or redundancy
        const riskyRequirements = await this.prisma.qualityMetric.findMany({
            where: {
                OR: [
                    { ambiguityScore: { gt: 80 } },
                    { redundancyScore: { gt: 80 } },
                ],
            },
            include: {
                requirement: {
                    select: {
                        id: true,
                        title: true,
                        code: true,
                    }
                }
            },
            take: 10,
            orderBy: {
                overallScore: 'asc',
            }
        });

        // System Alerts
        const alerts = await this.prisma.adminAlert.findMany({
            where: {
                isRead: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 5,
        });

        return {
            riskyRequirements,
            alerts,
        };
    }

    async getTrendSummary(period: 'daily' | 'weekly' = 'daily') {
        const trends = await this.getTrends(period);

        // Format for AI
        const dataStr = trends.map(t => `${t.date}: ${t.count}`).join('\n');

        const prompt = `
            Analyze the following requirement intake trend data (${period}) and provide a short executive summary (max 2 sentences).
            Highlight any spikes, drops, or consistent growth.
            
            Data:
            ${dataStr}
            
            Output ONLY the summary text in Natural Language.
        `;

        try {
            const response = await this.aiManager.execute({
                messages: [{ role: 'user', content: prompt }],
                maxTokens: 100,
                temperature: 0.2, // Analysis should be stable
            }, 'DASHBOARD_SUMMARY');

            return {
                summary: response.content || 'Unable to generate summary.',
                generatedAt: new Date(),
            };
        } catch (e) {
            console.error('Trend Summary Failed', e);
            return { summary: 'AI Analysis currently unavailable.' };
        }
    }
}
