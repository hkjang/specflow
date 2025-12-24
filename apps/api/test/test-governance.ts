
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { TrustScoreService } from '../src/governance/trust-score.service';
import { AuditService } from '../src/governance/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Governance Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const trustService = app.get(TrustScoreService);
    const auditService = app.get(AuditService);
    const prisma = app.get(PrismaService);

    // 1. Setup Data
    console.log('Setting up test data...');
    let user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found, creating one...');
        user = await prisma.user.create({
            data: {
                email: `test-gov-${Date.now()}@example.com`,
                name: 'Governance Tester',
                password: 'hashed_password_placeholder', // Should be hashed in real app
            }
        });
    }

    const req = await prisma.requirement.create({
        data: {
            code: `REQ-GOV-${Date.now()}`,
            title: 'Trust Score Test Requirement',
            content: 'Content for evaluation.',
            creatorId: user.id,
            maturity: 'DRAFT' // Enum DRAFT
        }
    });
    console.log('Created Requirement:', req.id);

    // Test 1: Trust Score Calculation
    console.log('\n--- Testing Trust Score ---');
    try {
        const score = await trustService.calculateScore(req.id);
        console.log('Calculated Score:', score);
        if (score && score.totalScore !== undefined) console.log('SUCCESS: Trust Score Calculated.');
    } catch (e) {
        console.error('FAILURE: Trust Score logic', e);
    }

    // Test 2: Audit Logging
    console.log('\n--- Testing Audit Logging ---');
    try {
        await auditService.log({
            action: 'UPDATE',
            resource: 'Requirement',
            resourceId: req.id,
            diff: { old: 'A', new: 'B' },
            actorId: user.id
        });
        console.log('Audit Log Created.');

        const logs = await auditService.getLogs();
        const myLog = logs.find(l => l.resourceId === req.id);
        if (myLog) console.log('SUCCESS: Audit Log retrieved for resource.');

    } catch (e) {
        console.error('FAILURE: Audit Logic', e);
    }

    // Cleanup
    await prisma.trustScore.deleteMany({ where: { requirementId: req.id } });
    await prisma.requirement.delete({ where: { id: req.id } });

    await app.close();
}

main();
