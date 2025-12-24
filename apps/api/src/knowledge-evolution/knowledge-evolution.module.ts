import { Module } from '@nestjs/common';
import { MaturityService } from './maturity.service';
import { AssetService } from './asset.service';
import { PrismaModule } from '../prisma/prisma.module';

import { KnowledgeEvolutionController } from './knowledge-evolution.controller';

@Module({
    imports: [PrismaModule],
    controllers: [KnowledgeEvolutionController],
    providers: [MaturityService, AssetService],
    exports: [MaturityService, AssetService],
})
export class KnowledgeEvolutionModule { }
