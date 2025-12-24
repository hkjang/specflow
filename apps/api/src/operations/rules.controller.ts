import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RulesService } from './rules.service';
import { Prisma } from '@prisma/client';

@Controller('operations/rules')
export class RulesController {
    constructor(private readonly rulesService: RulesService) { }

    @Post()
    create(@Body() createDto: Prisma.OperationRuleCreateInput) {
        return this.rulesService.create(createDto);
    }

    @Get()
    findAll() {
        return this.rulesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.rulesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Prisma.OperationRuleUpdateInput) {
        return this.rulesService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.rulesService.remove(id);
    }
}
