
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SlaMonitorService } from '../src/enterprise/sla-monitor.service';
import { PrismaService } from '../src/prisma/prisma.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Enterprise Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const slaService = app.get(SlaMonitorService);
    const prisma = app.get(PrismaService);

    // 1. Create Organization
    console.log('\n--- Setting up Organization ---');
    const org = await prisma.organization.create({
        data: {
            name: 'Acme Corp',
            domain: `acme-${Date.now()}.com`,
            plan: 'ENTERPRISE'
        }
    });
    console.log('Created Org:', org.id);

    // 2. Test SLA Calculation
    console.log('\n--- Testing SLA Logic ---');
    try {
        const result = await slaService.calculateAndSaveMetrics(org.id);
        console.log('Metrics Calculated:', result);

        const metrics = await slaService.getMetrics(org.id);
        console.log('Metrics Retrieved:', metrics.length);

        if (metrics.length >= 2) console.log('SUCCESS: SLA Metrics generated and retrieved.');

    } catch (e) {
        console.error('FAILURE: SLA Logic', e);
    }

    // Cleanup
    await prisma.slaMetric.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });

    await app.close();
}

main();
