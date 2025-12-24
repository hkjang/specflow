
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustScoreService } from './trust-score.service';
import { AuditService } from './audit.service';
import { GovernanceController } from './governance.controller';

@Module({
    controllers: [GovernanceController],
    providers: [TrustScoreService, AuditService, PrismaService],
    exports: [TrustScoreService, AuditService]
})
export class GovernanceModule { }
