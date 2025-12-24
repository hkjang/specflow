
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { AuditService } from './audit.service';

@Controller('governance')
export class GovernanceController {
    constructor(
        private readonly trustService: TrustScoreService,
        private readonly auditService: AuditService
    ) { }

    @Post('trust-score/:reqId')
    async calculateTrust(@Param('reqId') reqId: string) {
        return this.trustService.calculateScore(reqId);
    }

    @Get('trust-score/:reqId')
    async getTrust(@Param('reqId') reqId: string) {
        return this.trustService.getScore(reqId);
    }

    @Get('audit-logs')
    async getAuditLogs() {
        return this.auditService.getLogs();
    }
}
