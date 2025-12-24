
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdvancedAnalysisService } from '../src/analysis/advanced-analysis.service';

async function main() {
    console.log('Initializing Context for Analysis Test...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const analysisService = app.get(AdvancedAnalysisService);

    // Test 1: Risk Analysis
    console.log('\n--- Testing Risk Analysis ---');
    const riskyText = "User must provide RRN for identification.";
    const riskResult = await analysisService.analyzeRisk(riskyText);
    console.log(`Input: "${riskyText}"`);
    console.log('Result:', JSON.stringify(riskResult, null, 2));

    if (riskResult.level === 'HIGH') {
        console.log('SUCCESS: High risk detected.');
    } else {
        console.error('FAILURE: Risk not detected.');
    }

    // Test 2: Gap Analysis
    // Need a requirement ID. We can use one from previous tests or create one, but let's assume one exists or just check zero case.
    console.log('\n--- Testing Gap Analysis ---');
    // Pass empty list just to see it run without crashing
    const gapResult = await analysisService.analyzeGap('IND-FIN', []);
    console.log('Gap Analysis (Empty Run):', JSON.stringify(gapResult, null, 2));

    if (gapResult.coverage === 0 && gapResult.missing.length > 0) {
        console.log('SUCCESS: Missing functions identified.');
    }

    await app.close();
}

main();
