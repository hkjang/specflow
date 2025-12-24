
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RegulationService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        // Requires Prisma Client update
        return this.prisma.regulation.create({ data });
    }

    async findAll() {
        return this.prisma.regulation.findMany();
    }
}
