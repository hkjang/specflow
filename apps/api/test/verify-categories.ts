
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Categories...');

    const industries = await prisma.category.findMany({ where: { level: 'Industry' } });
    console.log(` Industries found: ${industries.length}`);
    if (industries.length === 0) throw new Error('No Industries found');

    const domains = await prisma.category.findMany({ where: { level: 'Domain' } });
    console.log(` Domains found: ${domains.length}`);
    if (domains.length === 0) throw new Error('No Domains found');

    const functions = await prisma.category.findMany({ where: { level: 'Function' } });
    console.log(` Functions found: ${functions.length}`);
    if (functions.length === 0) throw new Error('No Functions found');

    // Check hierarchy for one example
    const fin = industries.find(i => i.code === 'IND-FIN');
    if (fin) {
        const finDomains = await prisma.category.findMany({ where: { parentId: fin.id } });
        console.log(` Domains under Finance: ${finDomains.length}`);

        if (finDomains.length > 0) {
            const firstDomain = finDomains[0];
            const funcs = await prisma.category.findMany({ where: { parentId: firstDomain.id } });
            console.log(` Functions under ${firstDomain.name}: ${funcs.length}`);
        }
    }

    console.log('Verification Success');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
