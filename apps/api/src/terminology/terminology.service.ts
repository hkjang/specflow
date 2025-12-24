
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TerminologyService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        return this.prisma.terminology.create({ data });
    }

    async findAll() {
        return this.prisma.terminology.findMany();
    }
}
