
import { Module } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [RegulationService],
    exports: [RegulationService],
})
export class RegulationModule { }
