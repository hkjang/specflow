import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CrawlersService } from './crawlers.service';
import { Prisma } from '@prisma/client';

@Controller('collection/crawlers')
export class CrawlersController {
    constructor(private readonly crawlersService: CrawlersService) { }

    @Post()
    create(@Body() createCrawlerDto: Prisma.CrawlerCreateInput) {
        return this.crawlersService.create(createCrawlerDto);
    }

    @Get()
    findAll() {
        return this.crawlersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.crawlersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCrawlerDto: Prisma.CrawlerUpdateInput) {
        return this.crawlersService.update(id, updateCrawlerDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.crawlersService.remove(id);
    }

    @Post('/crawl')
    crawl(@Body() body: { url: string; name: string }) {
        return this.crawlersService.crawlRegulation(body.url, body.name);
    }
}
