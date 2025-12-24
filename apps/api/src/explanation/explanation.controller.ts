
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ExplanationService } from './explanation.service';
import { Prisma } from '@prisma/client';

@Controller('explanations')
export class ExplanationController {
    constructor(private readonly explanationService: ExplanationService) { }

    @Post()
    create(@Body() createExplanationDto: Prisma.ExplanationCreateInput) {
        return this.explanationService.create(createExplanationDto);
    }

    @Get()
    findAll(@Query('category') category?: string) {
        return this.explanationService.findAll(category);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.explanationService.findOne(id);
    }

    @Get('key/:key')
    findByKey(@Param('key') key: string) {
        return this.explanationService.findByKey(key);
    }

    @Post('generate')
    generate(@Body() body: { key: string, category: string, context?: string }) {
        return this.explanationService.generate(body.key, body.category, body.context);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateExplanationDto: Prisma.ExplanationUpdateInput) {
        return this.explanationService.update(id, updateExplanationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.explanationService.remove(id);
    }
}
