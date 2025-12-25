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

    const ollamaGpt = providers.find((p: any) => p.name === 'Ollama (gpt-oss:20b)');
    const ollamaQwen = providers.find((p: any) => p.name === 'Ollama (qwen3:8b)');

    if (ollamaGpt && ollamaQwen) {
        console.log('SUCCESS: Separate Ollama providers found.');
    } else {
        console.error('FAILURE: Separate Ollama providers NOT found.');
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
