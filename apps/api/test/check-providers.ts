
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const providers = await prisma.aiProvider.findMany({ where: { isActive: true } });
    console.log('Active AI Providers:', providers);

    if (providers.length === 0) {
        console.log('NO ACTIVE AI PROVIDERS FOUND. AI FEATURES WILL FAIL/FALLBACK.');
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
