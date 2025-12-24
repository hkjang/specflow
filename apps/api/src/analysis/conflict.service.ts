import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';

@Injectable()
export class ConflictService {
    private readonly logger = new Logger(ConflictService.name);

    constructor(
        private prisma: PrismaService,
        private aiManager: AiProviderManager,
    ) { }

    async detectConflicts(projectId: string, requirementIds: string[]) {
        // Placeholder for deeper conflict analysis (contradictions)
        return [];
    }

    async findDuplicates(content: string, projectId?: string) {
        // Fetch recent requirements to compare against
        // In a real scenario, this should use Vector Search (Embeddings)
        // For now, we compare against the last 20 requirements to catch immediate duplicates
        const candidates = await this.prisma.requirement.findMany({
            where: {
                // projectId: projectId // Uncomment if projectId exists in schema
                status: { not: 'DEPRECATED' }
            },
            select: { id: true, content: true, title: true, code: true },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });

        if (candidates.length === 0) return [];

        const candidatesText = candidates.map(c => `ID: ${c.id}\nCode: ${c.code}\nContent: ${c.content}`).join('\n---\n');

        const prompt = `
            Check if the "New Requirement" is a duplicate of any "Existing Candidates".
            Duplicate means semantically identical or extremely similar intent.
            
            New Requirement:
            "${content}"

            Existing Candidates:
            ${candidatesText}

            Return a JSON object with a key "duplicates" containing an array of objects: { "id": "matched_id", "reason": "why it is a duplicate", "confidence": 0-1 }.
            If no duplicates, return { "duplicates": [] }.
        `;

        try {
            const response = await this.aiManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.0,
            }, 'DUPLICATE_DETECTION');

            const result = JSON.parse(response.content || '{}');

            // Map back to include minimal details
            return (result.duplicates || []).map((d: any) => {
                const original = candidates.find(c => c.id === d.id);
                return {
                    ...d,
                    code: original?.code,
                    title: original?.title
                };
            });

        } catch (error) {
            this.logger.error('Duplicate detection failed', error);
            return [];
        }
    }
}
