import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlersController } from './crawlers.controller';
import { CrawlersService } from './crawlers.service';
import { DataSourcesController } from './datasources.controller';
import { DataSourcesService } from './datasources.service';

import { DocumentParserService } from './document-parser.service';

@Module({
    controllers: [CrawlersController, DataSourcesController],
    providers: [CrawlersService, DataSourcesService, PrismaService, DocumentParserService],
})
export class CollectionModule { }
