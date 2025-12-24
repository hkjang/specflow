import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { Prisma } from '@prisma/client';

@Controller('partner/proposals')
export class ProposalsController {
    constructor(private readonly proposalsService: ProposalsService) { }

    @Post()
    create(@Body() createDto: Prisma.PartnerProposalCreateInput) {
        return this.proposalsService.create(createDto);
    }

    @Get()
    findAll() {
        return this.proposalsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.proposalsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Prisma.PartnerProposalUpdateInput) {
        return this.proposalsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.proposalsService.remove(id);
    }
}
