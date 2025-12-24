
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
const request = require('supertest');

async function main() {
    console.log('Initializing Context for External API Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const apiKey = 'pk_live_partner_test_001';
    const httpServer = app.getHttpServer();

    // Test 1: Search Requirements
    console.log('\n--- Testing GET /api/v1/product/requirements ---');
    try {
        const res = await request(httpServer)
            .get('/api/v1/product/requirements?limit=5')
            .set('X-API-KEY', apiKey);

        console.log('Status:', res.status);
        console.log('Data Count:', res.body.data?.length);
        if (res.status === 200) console.log('SUCCESS: Requirements fetched.');
        else console.error('FAILURE:', res.body);
    } catch (e) {
        console.error('FAILURE: Network error', e.message);
    }

    // Test 2: Compliance Check
    console.log('\n--- Testing POST /api/v1/product/compliance/check ---');
    try {
        const res = await request(httpServer)
            .post('/api/v1/product/compliance/check')
            .set('X-API-KEY', apiKey)
            .send({ content: "User must provide resident registration number." });

        console.log('Status:', res.status);
        console.log('Compliance:', res.body);
        if (res.status === 201) console.log('SUCCESS: Compliance checked.');
    } catch (e) {
        console.error('FAILURE: Network error', e.message);
    }

    // Test 3: Invalid Key
    console.log('\n--- Testing Invalid Key ---');
    try {
        const res = await request(httpServer)
            .get('/api/v1/product/requirements')
            .set('X-API-KEY', 'invalid_key');

        console.log('Status:', res.status);
        if (res.status === 401) console.log('SUCCESS: Access denied correctly.');
    } catch (e) {
        console.error('FAILURE', e);
    }

    await app.close();
}

main();
