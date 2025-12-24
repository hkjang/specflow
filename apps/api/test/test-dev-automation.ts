
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DevArtifactService } from '../src/generation/dev-artifact.service';

const request = require('supertest');

async function main() {
    console.log('Initializing Context for Dev Automation Test...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter());
    await app.init();

    const devService = app.get(DevArtifactService);

    const reqTitle = "User Login";
    const reqContent = "System must allow user to login with email and password.";

    // Test 1: Generate API Spec
    console.log('\n--- Testing API Spec Generation ---');
    const apiSpec = await devService.generateApiSpec(reqTitle, reqContent);
    console.log('Generated Spec snippet:\n', apiSpec.substring(0, 50) + '...');

    if (apiSpec.includes('openapi:') && apiSpec.includes('paths:')) {
        console.log('SUCCESS: API Spec generated.');
    } else {
        console.error('FAILURE: API Spec generation failed.');
    }

    // Test 2: Generate Gherkin
    console.log('\n--- Testing Gherkin Generation ---');
    const gherkin = await devService.generateGherkin(reqTitle, reqContent);
    console.log('Generated Gherkin snippet:\n', gherkin.substring(0, 50) + '...');

    if (gherkin.includes('Feature:') && gherkin.includes('Scenario:')) {
        console.log('SUCCESS: Gherkin generated.');
    } else {
        console.error('FAILURE: Gherkin generation failed.');
    }

    await app.close();
}

main();
