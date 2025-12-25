import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.project.findMany({
            include: { partners: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.project.findUnique({
            where: { id },
            include: { businesses: true, partners: true }
        });
    }

    async create(data: { name: string; description?: string; organizationId?: string; partnerIds?: string[] }) {
        const { partnerIds, ...rest } = data;
        return this.prisma.project.create({
            data: {
                ...rest,
                partners: partnerIds ? {
                    connect: partnerIds.map(id => ({ id }))
                } : undefined
            }
        });
    }

    async update(id: string, data: { name?: string; description?: string; partnerIds?: string[] }) {
        const { partnerIds, ...rest } = data;
        return this.prisma.project.update({
            where: { id },
            data: {
                ...rest,
                partners: partnerIds ? {
                    set: partnerIds.map(id => ({ id }))
                } : undefined
            }
        });
    }

    async remove(id: string) {
        return this.prisma.project.delete({
            where: { id }
        });
    }
}
