import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
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

    @Get('history')
    getHistory(@Query('crawlerId') crawlerId?: string, @Query('limit') limit?: string) {
        return this.crawlersService.getHistory(crawlerId, limit ? parseInt(limit) : 50);
    }
    
    @Get('history/stats')
    getHistoryStats() {
        return this.crawlersService.getHistoryStats();
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

    @Post(':id/run')
    runCrawler(@Param('id') id: string) {
        return this.crawlersService.runCrawler(id);
    }

    @Post('/crawl')
    crawl(@Body() body: { url: string; name: string }) {
        // Legacy endpoint for manual crawl
        return this.crawlersService.runCrawler(body.url);
    }
}
