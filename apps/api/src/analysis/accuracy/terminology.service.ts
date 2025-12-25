import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TerminologyService {
  private readonly logger = new Logger(TerminologyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addTerm(data: { term: string; definition: string; industry?: string }) {
    this.logger.log(`Adding term: ${data.term} for industry: ${data.industry}`);
    return this.prisma.terminology.create({
      data: {
        term: data.term,
        definition: data.definition,
        industry: data.industry,
      },
    });
  }

  async getTerms(industry?: string) {
    return this.prisma.terminology.findMany({
      where: { industry },
      orderBy: { createdAt: 'desc' },
    });
  }
}
