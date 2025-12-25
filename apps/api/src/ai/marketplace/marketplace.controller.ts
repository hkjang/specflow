import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('ai/marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) {}

    @Get()
    findAll() {
        return this.marketplaceService.findAll();
    }

    @Post()
    create(@Body() body: any) {
        return this.marketplaceService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.marketplaceService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.marketplaceService.remove(id);
    }
}
