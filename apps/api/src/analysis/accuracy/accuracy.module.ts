import { Module } from '@nestjs/common';
import { AccuracyController } from './accuracy.controller';
import { AccuracyService } from './accuracy.service';
import { TerminologyService } from './terminology.service';
import { PredictionService } from './prediction.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccuracyController],
  providers: [AccuracyService, TerminologyService, PredictionService],
  exports: [AccuracyService, PredictionService], // Export PredictionService if needed elsewhere
})
export class AccuracyModule {}
