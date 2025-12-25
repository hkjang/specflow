import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return (this.prisma as any).partner.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data: any) {
        return (this.prisma as any).partner.create({
            data: {
                name: data.name,
                type: data.type,
                status: 'Pending',
                projects: 0,
                description: data.description,
                email: data.email,
                region: data.region
            }
        });
    }

    async update(id: string, data: any) {
        return (this.prisma as any).partner.update({
            where: { id },
            data
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
