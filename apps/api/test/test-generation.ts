
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { GenerationController } from '../src/generation/generation.controller';
import { RequirementGenerationService } from '../src/generation/requirement-generation.service';

async function main() {
    console.log('Initializing Context for Generation Test...');
    const app = await NestFactory.createApplicationContext(AppModule);

    // Directly test the service to avoid needing full HTTP request setup in this simple script
    // But verifying Controller DI is also good.
    const service = app.get(RequirementGenerationService);
    const controller = app.get(GenerationController);

    const text = "The system should allow users to log in using their email and password. It must be secure.";

    // Test 1: Summary
    console.log('\n--- Testing Summary ---');
    try {
        const summary = await controller.summarize({ text });
        console.log('Summary Result:', JSON.stringify(summary, null, 2));
        if (summary.summary) console.log('SUCCESS: Summary generated.');
    } catch (e) {
        console.error('FAILURE: Summary generation failed', e.message);
    }

    // Test 2: Improvement
    console.log('\n--- Testing Improvement ---');
    try {
        const improvement = await controller.improve({ text });
        console.log('Improvement Result:', JSON.stringify(improvement, null, 2));
        if (improvement.suggestion) console.log('SUCCESS: Improvement generated.');
    } catch (e) {
        console.error('FAILURE: Improvement generation failed', e.message);
    }

    await app.close();
}

main();
