import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartnersService } from './partners.service';

@Controller('partner/registry')
export class PartnersController {
    constructor(private readonly partnersService: PartnersService) {}

    @Get()
    findAll() {
        return this.partnersService.findAll();
    }

    @Get('stats')
    getStats() {
        return this.partnersService.getStats();
    }

    @Post()
    create(@Body() body: any) {
        return this.partnersService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.partnersService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.partnersService.remove(id);
    }
}
