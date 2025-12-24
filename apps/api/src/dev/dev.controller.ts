import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Controller('dev')
export class DevController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('seed')
    async seed() {
        const p = this.prisma as any;
        console.log('API Seeding Started');

        // 1. Crawlers
        const crawlers = [
            { name: 'TechCrunch Bot', url: 'https://techcrunch.com', schedule: '0 0 * * *', status: 'ACTIVE' },
            { name: 'HackerNews Bot', url: 'https://news.ycombinator.com', schedule: '0 */4 * * *', status: 'PAUSED' },
            { name: 'Internal Wiki', url: 'https://wiki.internal.acme.com', schedule: '0 0 * * 1', status: 'ACTIVE' }
        ];
        for (const c of crawlers) { await p.crawler.create({ data: c }).catch((e: any) => console.log('Skipping crawler')); }

        // 2. Data Sources
        const sources = [
            { name: 'Legacy ERP Docs', type: 'FILE', url: 's3://bucket/docs/erp_v1.pdf', status: 'SYNCED' },
            { name: 'Regulatory PDF', type: 'FILE', url: 's3://bucket/compliance/2024_reg.pdf', status: 'PENDING' },
            { name: 'Competitor API', type: 'URL', url: 'https://api.competitor.com/v1/docs', status: 'ERROR' }
        ];
        for (const s of sources) { await p.dataSource.create({ data: s }).catch((e: any) => console.log('Skipping source')); }

        // 3. Rules
        const rules = [
            { name: 'Auto-Approve Low Risk', condition: 'risk_score < 0.2', action: 'APPROVE', isActive: true },
            { name: 'Escalate High Value', condition: 'value > 1000000', action: 'NOTIFY_ADMIN', isActive: true },
            { name: 'Archive Old Req', condition: 'days_since_update > 365', action: 'ARCHIVE', isActive: false }
        ];
        for (const r of rules) { await p.operationRule.create({ data: r }).catch((e: any) => console.log('Skipping rule')); }

        // 4. Proposals
        const proposals = [
            { title: 'AI Module Integration', partner: 'DeepMind', status: 'DRAFT', content: 'Proposal for integration...' },
            { title: 'Cloud Migration Strategy', partner: 'AWS Professional Services', status: 'SENT', content: 'Initial strategy doc...' }
        ];
        for (const prop of proposals) { await p.partnerProposal.create({ data: prop }).catch((e: any) => console.log('Skipping proposal')); }

        // 5. System Settings
        const settings = [
            { key: 'system.name', value: 'SpecFlow Enterprise', category: 'GENERAL' },
            { key: 'system.email', value: 'admin@specflow.io', category: 'GENERAL' },
            { key: 'security.mfa_enforced', value: 'true', category: 'SECURITY' },
            { key: 'logging.level', value: 'INFO', category: 'LOGGING' }
        ];
        for (const s of settings) {
            await p.systemSetting.upsert({
                where: { key: s.key },
                update: { value: s.value },
                create: s
            }).catch((e: any) => console.log('Skipping setting'));
        }

        // 6. Users (Adding some mock users)
        const users = [
            { name: 'Alice Johnson', email: 'alice@acme.com', role: Role.ADMIN, password: 'password' },
            { name: 'Bob Smith', email: 'bob@acme.com', role: Role.PLANNER, password: 'password' }
        ];
        for (const u of users) {
            await this.prisma.user.create({ data: u }).catch((e: any) => console.log('Skipping user ' + u.email));
        }

        return { message: 'Seeding completed' };
    }
}
