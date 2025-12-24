import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';

@Injectable()
export class ArtifactService {
    private readonly logger = new Logger(ArtifactService.name);

    constructor(
        private prisma: PrismaService,
        private aiManager: AiProviderManager,
    ) { }

    async generateArtifact(projectId: string, artifactType: 'ARCHITECTURE' | 'UI' | 'API' | 'TEST') {
        const reqs = await this.prisma.requirement.findMany({
            // where: { projectId }, // Assuming project support exists or we fetch all non-deleted
            where: { status: { not: 'DEPRECATED' } },
            take: 20
        });

        const context = reqs.map(r => `${r.code}: ${r.title}\n${r.content}`).join('\n\n');

        const prompt = `
            Generate a ${artifactType} artifact based on the following requirements:
            
            ${context}
            
            Output should be in Markdown format.
        `;

        const response = await this.aiManager.execute({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
        }, 'ARTIFACT_GENERATION');

        return { content: response.content };
    }

    async generateProposal(requirementIds: string[], partnerName: string) {
        // Fetch specific requirements
        const reqs = await this.prisma.requirement.findMany({
            where: { id: { in: requirementIds } }
        });

        if (reqs.length === 0) {
            throw new Error('No requirements found for proposal generation.');
        }

        const requirementsText = reqs.map(r => `Requirement ${r.code}: ${r.title}\n${r.content}`).join('\n---\n');

        const prompt = `
            You are a professional Solution Architect. 
            Generate a Project Proposal for the partner "${partnerName}" based on the following specific requirements.
            
            Scope of Work:
            ${requirementsText}

            The proposal should include:
            1. Executive Summary
            2. Proposed Solution (Technical High-level)
            3. Scope of Work (referencing the requirements)
            4. Rough Timeline Estimate (based on complexity)
            5. Conclusion

            Format the output in clean Markdown.
        `;

        try {
            const response = await this.aiManager.execute({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4, // Balanced creativity and precision
            }, 'PROPOSAL_GENERATION');

            return {
                proposal: response.content,
                generatedAt: new Date(),
                requirementCount: reqs.length
            };
        } catch (error) {
            this.logger.error('Proposal generation failed', error);
            throw new Error('Failed to generate proposal due to AI service error.');
        }
    }
}
