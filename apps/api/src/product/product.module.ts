
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';

import { PrismaModule as PM } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
    imports: [PM, AnalysisModule],
    controllers: [ProductController],
    providers: []
})
export class ExternalApiModule { }
