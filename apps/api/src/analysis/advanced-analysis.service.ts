
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AdvancedAnalysisService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService
    ) { }

    async analyzeRisk(text: string) {
        // 1. Fetch High Risk Regulations
        const regulations = await this.prisma.regulation.findMany({
            where: { riskLevel: 'HIGH' }
        });

        const issues = [];

        for (const reg of regulations) {
            // Simple keyword match for now. In real app, use Embeddings/LLM.
            const keywords = [reg.name, 'Privacy', 'Personal Data', 'RRN', 'Account Number'];

            const hit = keywords.some(k => text.includes(k));
            if (hit) {
                issues.push({
                    regulation: reg.code,
                    message: `Potential violation of ${reg.name} (${reg.article})`,
                    severity: 'HIGH'
                });
            }
        }

        return {
            level: issues.length > 0 ? 'HIGH' : 'LOW',
            issues
        };
    }

    async analyzeGap(industryCode: string, requirementIds: string[]) {
        // 1. Find Standard Requirements for this Industry
        const standardFunctions = await this.prisma.category.findMany({
            where: {
                level: 'Function',
                parent: {
                    parent: { code: industryCode }
                }
            },
            include: { parent: true }
        });

        // 2. Check coverage
        const currentreqs = await this.prisma.requirement.findMany({
            where: { id: { in: requirementIds } },
            include: { categories: true }
        });

        const coveredFunctionCodes = new Set<string>();
        currentreqs.forEach(r => {
            r.categories.forEach(c => {
                if (c.level === 'Function') coveredFunctionCodes.add(c.code!);
            });
        });

        const missing = standardFunctions
            .filter(f => !coveredFunctionCodes.has(f.code!))
            .map(f => ({
                code: f.code,
                name: f.name,
                domain: f.parent?.name
            }));

        const coverage = standardFunctions.length > 0 ? (coveredFunctionCodes.size / standardFunctions.length) * 100 : 0;

        return {
            missing: missing.slice(0, 5), // Top 5 missing
            totalMissing: missing.length,
            coverage: Math.round(coverage)
        };
    }
}
