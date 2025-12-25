import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Requirements...');
    
    const count = await prisma.requirement.count();
    console.log(`Total Requirements: ${count}`);

    const aiSource = await prisma.requirementClassification.count({
        where: { source: 'AI' }
    });
    const humanSource = await prisma.requirementClassification.count({
        where: { source: 'HUMAN' }
    });

    console.log(`Classifications - AI: ${aiSource}, HUMAN: ${humanSource}`);

    const metadataCount = await prisma.aiMetadata.count({
        where: { modelName: { not: null } }
    });
    console.log(`AI Metadata with Model Names: ${metadataCount}`);

    const classModelCount = await prisma.requirementClassification.count({
        where: { model: { not: null } }
    });
    console.log(`Classifications with Model Source: ${classModelCount}`);

    if (count >= 100 && aiSource > 0 && metadataCount > 0 && classModelCount > 0) {
        console.log('SUCCESS: Realistic requirements with Model Source seeded.');
    } else {
        console.error('FAILURE: Model data missing.');
        process.exit(1);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
