import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return (this.prisma as any).marketplaceItem.findMany({
            orderBy: { downloads: 'desc' }
        });
    }

    async create(data: any) {
        return (this.prisma as any).marketplaceItem.create({
            data: {
                name: data.name,
                provider: data.provider || 'My Organization',
                type: data.type,
                description: data.description,
                price: data.price,
                image: data.image || Math.random().toString(36).substring(7),
            }
        });
    }

    async update(id: string, data: any) {
        return (this.prisma as any).marketplaceItem.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        return (this.prisma as any).marketplaceItem.delete({
            where: { id }
        });
    }
}
