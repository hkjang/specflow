
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentParserService } from '../src/collection/document-parser.service';
const request = require('supertest');

async function main() {
    console.log('Initializing Context for Collection Pipeline Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const httpServer = app.getHttpServer();

    // Test 1: Crawl Regulation
    console.log('\n--- Testing POST /collection/crawlers/crawl ---');
    try {
        const res = await request(httpServer)
            .post('/collection/crawlers/crawl')
            .send({
                url: "https://www.law.go.kr/lsInfoP.do?lsiSeq=123",
                name: "Personal Information Protection Act"
            });

        console.log('Status:', res.status);
        console.log('Result:', res.body);
        if (res.status === 201) console.log('SUCCESS: Regulation crawled.');
    } catch (e) {
        console.error('FAILURE: Network error', e.message);
    }

    // Test 2: Document Parser Logic (Unit Level)
    console.log('\n--- Testing DocumentParserService ---');
    const parser = app.get(DocumentParserService);
    try {
        // Mock Buffer (Text disguised as PDF buffer for mock test logic or text fallback)
        const mockBuffer = Buffer.from('Article 1\nThis is a test PDF content.\nArticle 2\nSecond provision.');
        const result = await parser.parse(mockBuffer, 'text/plain');
        console.log('Parsed Text:', result.text);

        const provisions = parser.splitProvisions(result.text);
        console.log('Split Provisions:', provisions.length);
        if (provisions.length >= 2) console.log('SUCCESS: Text parsed and split.');

    } catch (e) {
        console.error('FAILURE: Parsing error', e);
    }

    await app.close();
}

main();
