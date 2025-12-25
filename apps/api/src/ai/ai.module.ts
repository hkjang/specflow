import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiProviderManager } from './provider/ai-provider.manager';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiProviderService } from './ai-provider.service';

@Module({
    imports: [PrismaModule, MarketplaceModule],
    controllers: [AiController],
    providers: [AiService, AiProviderManager, AiProviderService],
    exports: [AiService, AiProviderManager, AiProviderService, MarketplaceModule],
})
export class AiModule { }
