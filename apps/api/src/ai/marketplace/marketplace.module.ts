import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MarketplaceController],
    providers: [MarketplaceService],
    exports: [MarketplaceService],
})
export class MarketplaceModule {}
