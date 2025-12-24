
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlaMonitorService } from './sla-monitor.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [SlaMonitorService, PrismaService],
    exports: [SlaMonitorService]
})
export class EnterpriseModule { }
