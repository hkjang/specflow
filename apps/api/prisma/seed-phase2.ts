
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REGULATIONS = [
    {
        code: 'REG-PRIV-01',
        name: 'Personal Information Protection Act',
        authority: 'Government',
        article: 'Article 21',
        description: 'Must destroy personal information when purpose is achieved.',
        riskLevel: 'HIGH',
        industries: ['IND-FIN', 'IND-MED', 'IND-RET']
    },
    {
        code: 'REG-FIN-01',
        name: 'Electronic Financial Transactions Act',
        authority: 'FSS',
        article: 'Article 9',
        description: 'Must ensure safety of electronic transmission.',
        riskLevel: 'HIGH',
        industries: ['IND-FIN']
    }
];

const TERMS = [
    {
        term: 'RRN',
        definition: 'Resident Registration Number. Highly sensitive personal data.',
        industry: 'IND-FIN',
        synonyms: ['Resident ID', 'Social Security Number'],
        forbidden: false
    },
    {
        term: 'Customer',
        definition: 'Individual who uses the service.',
        industry: 'IND-FIN',
        synonyms: ['User', 'Client'],
        forbidden: false
    },
    {
        term: 'Account Num',
        definition: 'Non-standard term for Account Number.',
        industry: 'IND-FIN',
        synonyms: [],
        forbidden: true,
        replacement: 'Account Number'
    }
];

async function main() {
    console.log('Seeding Phase 2 Data...');

    // 1. Seed Regulations
    for (const reg of REGULATIONS) {
        // Requires Prisma Client update to work fully.
        // Casting to any to avoid TS errors in IDE before generation.
        await (prisma as any).regulation.upsert({
            where: { code: reg.code },
            update: {},
            create: reg
        });
        console.log(`Upserted Regulation: ${reg.name}`);
    }

    // 2. Seed Terminology
    for (const term of TERMS) {
        await (prisma as any).terminology.upsert({
            where: { term_industry: { term: term.term, industry: term.industry } },
            update: {},
            create: term
        });
        console.log(`Upserted Term: ${term.term}`);
    }

    console.log('Phase 2 Seeding Completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
