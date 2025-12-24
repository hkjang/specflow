
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { TranslationService } from '../src/adaptation/translation.service';
import { PrismaService } from '../src/prisma/prisma.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Global Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const transService = app.get(TranslationService);
    const prisma = app.get(PrismaService);

    // 1. Create Requirement
    console.log('\n--- Setting up Requirement for Global Test ---');
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found in DB');

    const req = await prisma.requirement.create({
        data: {
            code: `REQ-GLOBAL-${Date.now()}`,
            title: 'Global Test Req',
            content: 'Original Korean Content',
            creatorId: user.id
        }
    });

    // 2. Test Translation Service
    console.log('\n--- Testing Translation Service ---');
    const translated = await transService.translateContent(req.content, 'en');
    console.log('Translated:', translated);

    if (translated.includes('[Translated to EN]')) {
        console.log('SUCCESS: Translation Service working.');
    }

    // 3. Test Saving to contentI18n (DB Check)
    console.log('\n--- Testing i18n Storage ---');
    const i18nData = { en: translated };

    await prisma.requirement.update({
        where: { id: req.id },
        data: { contentI18n: i18nData }
    });

    const updatedReq = await prisma.requirement.findUnique({ where: { id: req.id } });
    if (!updatedReq) throw new Error('Req not found');

    console.log('Stored i18n:', updatedReq.contentI18n);

    if (updatedReq.contentI18n && (updatedReq.contentI18n as any).en) {
        console.log('SUCCESS: i18n JSON stored correctly.');
    }

    // Cleanup
    await prisma.requirement.delete({ where: { id: req.id } });
    await app.close();
}

main();
