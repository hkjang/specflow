import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { AiProvider } from '@prisma/client'; // Avoid import if types not ready

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
        // Mask API keys for security
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
                priority: data.priority || 1,
                isActive: data.isActive ?? true
            },
        });
    }

    async update(id: string, data: any) {
        // If apiKey is masked or empty, don't update it
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
    async getLogs() {
        return (this.prisma as any).aiLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }
}
