
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { LinguisticsService } from '../src/analysis/linguistics.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Linguistics Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const lingService = app.get(LinguisticsService);

    // Test 1: Normalization (Colloquial -> Formal)
    console.log('\n--- Testing Sentence Normalization ---');
    const colloquial = "로그인을 할 수 있으면 좋겠어요.";
    const formal = await lingService.normalizeSentence(colloquial);
    console.log(`Input: "${colloquial}"`);
    console.log(`Output: "${formal}"`);

    if (formal.includes('제공해야 한다') || formal.endsWith('다.')) {
        console.log('SUCCESS: Sentence normalized to formal style.');
    } else {
        console.error('FAILURE: Sentence normalization failed.');
    }

    // Test 2: Complexity Decomposition
    console.log('\n--- Testing Sentence Decomposition ---');
    const complex = "사용자는 이메일을 입력하고, 비밀번호를 설정하며, 회원가입을 완료한다.";
    const parts = await lingService.decomposeComplexity(complex);
    console.log(`Input: "${complex}"`);
    console.log(`Parts:`, parts);

    if (parts.length >= 2) {
        console.log('SUCCESS: Complex sentence decomposed.');
    } else {
        console.error('FAILURE: Decomposition failed.');
    }

    await app.close();
}

main();
