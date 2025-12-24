
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
const request = require('supertest');

async function main() {
    console.log('Initializing Context for Partner Template Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const httpServer = app.getHttpServer();
    let templateId = '';

    // Test 1: Create Template
    console.log('\n--- Testing POST /partner/templates ---');
    try {
        const res = await request(httpServer)
            .post('/partner/templates')
            .send({
                name: "Financial Standard Template",
                industry: "Finance",
                description: "Standard compliance pack for Fintech",
                structure: {
                    defaultStack: ["NestJS", "React", "Terraform"],
                    styleGuide: { indent: 4 }
                }
            });

        console.log('Status:', res.status);
        if (res.status === 201) {
            console.log('SUCCESS: Template created.');
            templateId = res.body.id;
        } else {
            console.error('FAILURE:', res.body);
        }
    } catch (e) {
        console.error('FAILURE: Network error', e.message);
    }

    if (templateId) {
        // Test 2: Instantiate Project
        console.log('\n--- Testing POST /partner/templates/instantiate ---');
        try {
            const res = await request(httpServer)
                .post('/partner/templates/instantiate')
                .send({
                    templateId: templateId,
                    projectName: "My New Fintech Project"
                });

            console.log('Status:', res.status);
            console.log('Message:', res.body.message);
            console.log('Context:', res.body.context);
            if (res.status === 201) console.log('SUCCESS: Project instantiated.');
        } catch (e) {
            console.error('FAILURE: Network error', e.message);
        }
    }

    await app.close();
}

main();
