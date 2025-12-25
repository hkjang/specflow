import { Module } from '@nestjs/common';
import { PartnerTemplateService } from './partner-templates.service';
import { PartnerTemplatesController } from './partner-templates.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PartnerTemplatesController, ProposalsController, PartnersController],
    providers: [PartnerTemplateService, ProposalsService, PartnersService],
    exports: [PartnerTemplateService, ProposalsService, PartnersService],
})
export class PartnerModule {}
