import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DataSourcesService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.DataSourceCreateInput) {
        return this.prisma.dataSource.create({ data });
    }

    findAll() {
        return this.prisma.dataSource.findMany();
    }

    findOne(id: string) {
        return this.prisma.dataSource.findUnique({ where: { id } });
    }

    update(id: string, data: Prisma.DataSourceUpdateInput) {
        return this.prisma.dataSource.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.dataSource.delete({ where: { id } });
    }
}
