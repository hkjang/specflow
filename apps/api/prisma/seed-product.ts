
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding API Product Keys...');

    // Create a Partner Key
    const key = await prisma.apiProductKey.upsert({
        where: { key: 'pk_live_partner_test_001' },
        update: {},
        create: {
            key: 'pk_live_partner_test_001',
            partnerName: 'Test Partner Inc.',
            plan: 'ENTERPRISE',
            isActive: true
        }
    });

    console.log('Created API Key:', key.key);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
