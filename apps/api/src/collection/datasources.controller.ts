import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DataSourcesService } from './datasources.service';
import { Prisma } from '@prisma/client';

@Controller('collection/sources')
export class DataSourcesController {
    constructor(private readonly dataSourcesService: DataSourcesService) { }

    @Post()
    create(@Body() createDto: Prisma.DataSourceCreateInput) {
        return this.dataSourcesService.create(createDto);
    }

    @Get()
    findAll() {
        return this.dataSourcesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.dataSourcesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Prisma.DataSourceUpdateInput) {
        return this.dataSourcesService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.dataSourcesService.remove(id);
    }
}
