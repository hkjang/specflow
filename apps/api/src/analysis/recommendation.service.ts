import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';

@Injectable()
export class RecommendationService {
    private readonly logger = new Logger(RecommendationService.name);

    constructor(
        private prisma: PrismaService,
        private aiManager: AiProviderManager,
    ) { }

    async recommendMissing(projectId: string) {
        // Placeholder for missing requirement analysis
        return { recommended: [] };
    }

    async recommendApis(requirementIds: string[]) {
        const reqs = await this.prisma.requirement.findMany({
            where: { id: { in: requirementIds } },
            select: { code: true, content: true }
        });

        if (reqs.length === 0) return { recommendations: [] };

        const context = reqs.map(r => `${r.code}: ${r.content}`).join('\n\n');

        const prompt = `
            Based on the following software requirements, recommend suitable 3rd Party APIs, SDKs, or Libraries that could accelerate development.
            
            Requirements:
            ${context}
            
            Output strictly as a JSON object with a key "recommendations" containing an array of objects.
            Each object should have:
            - "name": Name of the API/Tool
            - "category": e.g. Payment, Auth, Maps
            - "reason": Why it fits the requirements
            - "pros": Short string
            - "cons": Short string
        `;

        try {
            const response = await this.aiManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.2,
            }, 'API_RECOMMENDATION');

            const result = JSON.parse(response.content || '{}');
            return result.recommendations || [];
        } catch (error) {
            this.logger.error('API Recommendation failed', error);
            return [];
        }
    }
}
