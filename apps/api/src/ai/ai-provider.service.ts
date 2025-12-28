import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiProviderService {
    constructor(private prisma: PrismaService) { }

    private get db() {
        return (this.prisma as any).aiProvider;
    }

    async findAll() {
        const providers = await this.db.findMany({
            orderBy: { priority: 'desc' },
        });
        return providers.map((p: any) => ({
            ...p,
            apiKey: p.apiKey ? 'sk-****' + p.apiKey.slice(-4) : null
        }));
    }

    async findOne(id: string) {
        const provider = await this.db.findUnique({ where: { id } });
        if (!provider) throw new NotFoundException('Provider not found');
        return provider;
    }

    async create(data: any) {
        return this.db.create({
            data: {
                name: data.name,
                type: data.type,
                endpoint: data.endpoint,
                apiKey: data.apiKey,
                models: data.models,
                timeout: data.timeout || 600,
                maxRetries: data.maxRetries || 3,
                retryDelayMs: data.retryDelayMs || 1000,
                priority: data.priority || 1,
                isActive: data.isActive ?? true
            },
        });
    }

    async update(id: string, data: any) {
        if (data.apiKey && data.apiKey.startsWith('sk-****')) {
            delete data.apiKey;
        }
        return this.db.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return this.db.delete({ where: { id } });
    }

    async findActiveProvider(type?: string) {
        return this.db.findFirst({
            where: {
                isActive: true,
                ...(type ? { type: type as any } : {})
            },
            orderBy: { priority: 'desc' }
        });
    }

    async getLogs(limit = 100) {
        return (this.prisma as any).aiLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    // Get logs statistics
    async getLogStats() {
        const logs = await (this.prisma as any).aiLog.findMany({
            where: {
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        const byProvider: Record<string, { success: number; failed: number; tokens: number }> = {};
        const byModel: Record<string, { count: number; tokens: number }> = {};
        const byDay: Record<string, { success: number; failed: number; tokens: number }> = {};
        const byHour: number[] = new Array(24).fill(0);

        for (const log of logs) {
            // By provider
            if (!byProvider[log.providerName]) {
                byProvider[log.providerName] = { success: 0, failed: 0, tokens: 0 };
            }
            if (log.status === 'SUCCESS') {
                byProvider[log.providerName].success++;
            } else {
                byProvider[log.providerName].failed++;
            }
            byProvider[log.providerName].tokens += log.totalTokens || 0;

            // By model
            if (log.modelUsed) {
                if (!byModel[log.modelUsed]) {
                    byModel[log.modelUsed] = { count: 0, tokens: 0 };
                }
                byModel[log.modelUsed].count++;
                byModel[log.modelUsed].tokens += log.totalTokens || 0;
            }

            // By day
            const day = new Date(log.createdAt).toISOString().split('T')[0];
            if (!byDay[day]) {
                byDay[day] = { success: 0, failed: 0, tokens: 0 };
            }
            if (log.status === 'SUCCESS') {
                byDay[day].success++;
            } else {
                byDay[day].failed++;
            }
            byDay[day].tokens += log.totalTokens || 0;

            // By hour
            const hour = new Date(log.createdAt).getHours();
            byHour[hour]++;
        }

        const totalSuccess = logs.filter((l: any) => l.status === 'SUCCESS').length;
        const totalFailed = logs.filter((l: any) => l.status === 'FAILED').length;
        const totalTokens = logs.reduce((sum: number, l: any) => sum + (l.totalTokens || 0), 0);

        return {
            summary: {
                total: logs.length,
                success: totalSuccess,
                failed: totalFailed,
                successRate: logs.length > 0 ? Math.round((totalSuccess / logs.length) * 100) : 0,
                totalTokens,
            },
            byProvider: Object.entries(byProvider).map(([name, stats]) => ({ name, ...stats })),
            byModel: Object.entries(byModel).map(([name, stats]) => ({ name, ...stats })),
            byDay: Object.entries(byDay).map(([date, stats]) => ({ date, ...stats })).sort((a, b) => a.date.localeCompare(b.date)),
            byHour,
        };
    }

    // Get recent errors
    async getRecentErrors(limit = 10) {
        return (this.prisma as any).aiLog.findMany({
            where: { status: 'FAILED' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                providerName: true,
                modelUsed: true,
                errorMessage: true,
                actionContext: true,
                createdAt: true,
            }
        });
    }
}
