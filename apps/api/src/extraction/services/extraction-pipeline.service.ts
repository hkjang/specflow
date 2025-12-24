import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiInferenceService } from './ai-inference.service';

@Injectable()
export class ExtractionPipelineService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiInferenceService
    ) { }

    async startExtraction(sourceId: string) {
        // 1. Fetch Source
        const source = await this.prisma.extractionSource.findUnique({ where: { id: sourceId } });
        if (!source) return;

        // 2. Create Job
        const job = await this.prisma.extractionJob.create({
            data: {
                sourceId: source.id,
                status: 'PROCESSING',
                progress: 10
            }
        });

        // 3. Run AI Inference (Async)
        // Fetch Project Context
        const metadata = source.metadata as any;
        const projectId = metadata?.projectId;
        const perspective = metadata?.perspective || 'BUSINESS'; // Default to Business
        let context = '';

        if (projectId) {
            // Find Business -> Project relation or however requirements are linked. 
            // Requirements link to Business, Function, Menu.
            // For simplicity, we might need a way to find Requirements by Project ID.
            // Since Schema has Requirement -> Business -> Project, we can query.

            const existingReqs = await this.prisma.requirement.findMany({
                where: {
                    business: { projectId: projectId }
                },
                take: 20, // Limit context window
                orderBy: { createdAt: 'desc' },
                select: { title: true, content: true }
            });

            if (existingReqs.length > 0) {
                context = existingReqs.map(r => `- ${r.title}: ${r.content.substring(0, 50)}...`).join('\n');
            }
        }

        this.processJob(job.id, source.content, context, perspective);
    }

    private async processJob(jobId: string, content: string, context: string, perspective: 'BUSINESS' | 'DEVELOPER') {
        try {
            const result = await this.aiService.extractRequirements(content, context, perspective);

            await this.prisma.extractionJob.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    progress: 100,
                    result: result as any
                }
            });

            // Create Drafts
            if (result.drafts) {
                await this.prisma.requirementDraft.createMany({
                    data: result.drafts.map((d: any) => ({
                        jobId: jobId,
                        sourceId: (d.sourceId) || undefined, // Logic to pass sourceId needed
                        title: d.title,
                        content: d.content,
                        type: d.type,
                        confidence: d.confidence,
                        status: 'PENDING'
                    }))
                });
            }

        } catch (e) {
            await this.prisma.extractionJob.update({
                where: { id: jobId },
                data: { status: 'FAILED', error: String(e) }
            });
        }
    }
}
