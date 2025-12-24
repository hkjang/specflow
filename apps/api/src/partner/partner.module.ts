import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

import { PartnerTemplatesController } from './partner-templates.controller';
import { PartnerTemplateService } from './partner-templates.service';

@Module({
    controllers: [ProposalsController, PartnerTemplatesController],
    providers: [ProposalsService, PartnerTemplateService, PrismaService],
})
export class PartnerModule { }
