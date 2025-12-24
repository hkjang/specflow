import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProposalsService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.PartnerProposalCreateInput) {
        return this.prisma.partnerProposal.create({ data });
    }

    findAll() {
        return this.prisma.partnerProposal.findMany();
    }

    findOne(id: string) {
        return this.prisma.partnerProposal.findUnique({ where: { id } });
    }

    update(id: string, data: Prisma.PartnerProposalUpdateInput) {
        return this.prisma.partnerProposal.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.partnerProposal.delete({ where: { id } });
    }
}
