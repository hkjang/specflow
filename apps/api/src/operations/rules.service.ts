import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RulesService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.OperationRuleCreateInput) {
        return this.prisma.operationRule.create({ data });
    }

    findAll() {
        return this.prisma.operationRule.findMany();
    }

    findOne(id: string) {
        return this.prisma.operationRule.findUnique({ where: { id } });
    }

    update(id: string, data: Prisma.OperationRuleUpdateInput) {
        return this.prisma.operationRule.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.operationRule.delete({ where: { id } });
    }
}
