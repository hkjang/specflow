import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return (this.prisma as any).partner.findMany({
            include: { projects: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data: any) {
        return (this.prisma as any).partner.create({
            data: {
                name: data.name,
                type: data.type,
                status: 'Pending',
                description: data.description,
                email: data.email,
                region: data.region,
                projects: data.projectIds ? {
                    connect: data.projectIds.map((id: string) => ({ id }))
                } : undefined
            }
        });
    }

    async update(id: string, data: any) {
        const { projectIds, ...rest } = data;
        return (this.prisma as any).partner.update({
            where: { id },
            data: {
                ...rest,
                projects: projectIds ? {
                    set: projectIds.map((pid: string) => ({ id: pid }))
                } : undefined
            }
        });
    }

    async remove(id: string) {
        return (this.prisma as any).partner.delete({
            where: { id }
        });
    }

    // Stats for dashboard
    async getStats() {
        const total = await (this.prisma as any).partner.count();
        const active = await (this.prisma as any).partner.count({ where: { status: 'Active' } });
        return { total, active };
    }
}
