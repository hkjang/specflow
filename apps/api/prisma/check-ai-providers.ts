import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying AI Providers...');

    // Use 'any' to bypass strict type checking if generated client is outdated
    const p = prisma as any;

    if (!p.aiProvider) {
        console.error('Error: aiProvider model not found in Prisma Client. Did you run prisma generate?');
        return;
    }

    const providers = await p.aiProvider.findMany();

    console.log(`Found ${providers.length} AI Providers:`);
    console.table(providers);

    const ollama = providers.find((p: any) => p.type === 'OLLAMA');
    if (ollama && ollama.models.includes('gpt-oss:20b')) {
        console.log('SUCCESS: Ollama provider with gpt-oss:20b found.');
    } else {
        console.error('FAILURE: Ollama provider with gpt-oss:20b NOT found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
