
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SnapshotService } from '../src/operations/snapshot.service';
import { PrismaService } from '../src/prisma/prisma.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Productivity Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const snapshotService = app.get(SnapshotService);
    const prisma = app.get(PrismaService);

    // 1. Setup Req with History
    console.log('\n--- Setting up Req with History ---');
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');

    const req = await prisma.requirement.create({
        data: {
            code: `REQ-PROD-${Date.now()}`,
            title: 'Snapshot Test Req',
            content: 'Version 2 Content (Current)',
            creatorId: user.id,
            version: 2
        }
    });

    // Create History for V1
    await prisma.requirementHistory.create({
        data: {
            requirementId: req.id,
            changerId: user.id,
            field: 'content',
            oldValue: 'Version 0 Content',
            newValue: 'Version 1 Content', // This is what we want to restore
            version: 1
        }
    });

    // 2. Test Restore
    console.log('\n--- Testing Snapshot Restore ---');
    try {
        await snapshotService.restoreSnapshot(req.id, 1);

        const restoredReq = await prisma.requirement.findUnique({ where: { id: req.id } });
        if (!restoredReq) throw new Error('Req not found');

        console.log('Restored Content:', restoredReq.content);

        if (restoredReq.content === 'Version 1 Content') {
            console.log('SUCCESS: Snapshot Restored.');
        } else {
            console.error('FAILURE: Content mismatch.');
        }

    } catch (e) {
        console.error('FAILURE: Snapshot Logic', e);
    }

    // Cleanup
    await prisma.requirementHistory.deleteMany({ where: { requirementId: req.id } });
    await prisma.requirement.delete({ where: { id: req.id } });

    await app.close();
}

main();
