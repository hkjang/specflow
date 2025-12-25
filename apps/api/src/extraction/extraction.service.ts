import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from './services/ingestion.service';
import { ExtractionPipelineService } from './services/extraction-pipeline.service';
import { QualityAssuranceService } from './services/quality-assurance.service';

@Injectable()
export class ExtractionService {
    constructor(
        private prisma: PrismaService,
        private ingestionService: IngestionService,
        private pipelineService: ExtractionPipelineService,
        private qaService: QualityAssuranceService
    ) { }

    async checkDrafts(drafts: any[]) {
        return this.qaService.analyzeDrafts(drafts);
    }

    async ingestFile(file: Express.Multer.File, projectId: string, perspective?: string) {
        return this.ingestionService.createSource('FILE', file.buffer, {
            filename: file.originalname,
            mimetype: file.mimetype,
            projectId,
            perspective: perspective || 'BUSINESS'
        });
    }

    async ingestText(content: string, projectId: string, perspective?: string) {
        return this.ingestionService.createSource('TEXT', content, {
            projectId,
            perspective: perspective || 'BUSINESS'
        });
    }

    async startProcessing(sourceId: string) {
        return this.pipelineService.startExtraction(sourceId);
    }

    async getJobStatus(id: string) {
        const job = await this.prisma.extractionJob.findUnique({
            where: { id },
            include: { 
                drafts: true,
                source: true // Include source to get content
            }
        });

        if (!job) return null;

        // Run dynamic QA on fetch (Optimization: Store in DB later)
        const qaIssues = this.qaService.analyzeDrafts(job.drafts);

        return { 
            ...job, 
            sourceText: job.source.content, // Map for frontend
            qaIssues 
        };
    }

    async mergeDraft(draftId: string, projectId: string) {
        const draft = await this.prisma.requirementDraft.findUnique({
            where: { id: draftId },
        });

        if (!draft) {
            throw new Error('Draft not found');
        }

        // Create the actual requirement
        // TODO: Determine code generation strategy (e.g. REQ-SEQ) or business logic
        const requirement = await this.prisma.requirement.create({
            data: {
                code: `REQ-${Date.now()}`, // Temporary code generation
                title: draft.title || 'Untitled',
                content: draft.content || '',
                creatorId: 'mock-user-id', // TODO: Context user
                sourceId: draft.sourceId,
                // Default classifications if any
            }
        });

        // Update draft status
        await this.prisma.requirementDraft.update({
            where: { id: draftId },
            data: { status: 'MERGED' }
        });

        return requirement;
    }

    async mergeJob(jobId: string) {
        // 1. Get job info (for AI model name)
        const job = await this.prisma.extractionJob.findUnique({
            where: { id: jobId },
            include: { source: true }
        });
        
        // Get AI provider info from the job result (stored during extraction)
        let modelName = 'AI Extraction';
        if (job?.result) {
            const result = job.result as any;
            modelName = result.modelName || 'AI Extraction';
        }

        // 2. Get all APPROVED drafts for this job
        const drafts = await this.prisma.requirementDraft.findMany({
            where: { jobId, status: 'APPROVED' }
        });

        if (drafts.length === 0) {
            throw new Error('No approved drafts to merge');
        }

        // Ensure a valid creatorId exists
        let creatorId = 'mock-user-id';
        const systemUser = await this.prisma.user.findFirst();
        if (systemUser) {
            creatorId = systemUser.id;
        } else {
            // Create a default system user if none exists (Dev environment fallback)
            const newUser = await this.prisma.user.create({
                data: {
                    email: 'system@specflow.io',
                    name: 'System Admin',
                    password: 'system_password_placeholder', 
                    role: 'ADMIN'
                }
            });
            creatorId = newUser.id;
        }

        const createdRequirements = [];

        // 3. Convert to Requirements
        for (const draft of drafts) {
            // Lookup category by code (draft.type might be "Functional", "Non-Functional", etc.)
            let categoryId: string | null = null;
            if (draft.type) {
                const category = await this.prisma.category.findFirst({
                    where: { 
                        OR: [
                            { code: draft.type },
                            { name: { contains: draft.type, mode: 'insensitive' } }
                        ]
                    }
                });
                if (category) {
                    categoryId = category.id;
                }
            }

            const req = await this.prisma.requirement.create({
                data: {
                    code: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Unique code
                    title: draft.title || 'Untitled',
                    content: draft.content || '',
                    creatorId: creatorId, 
                    sourceId: draft.sourceId,
                    status: 'DRAFT', // Initial status
                    classifications: categoryId ? {
                        create: [{ 
                            categoryId: categoryId,
                            source: 'AI',
                            confidence: draft.confidence || 0.8,
                            model: modelName
                        }]
                    } : undefined,
                    // Create AI Metadata
                    aiMetadata: {
                        create: {
                            modelName: modelName,
                            reasoning: 'Extracted from document via AI'
                        }
                    }
                }
            });
            createdRequirements.push(req);

            // 4. Mark draft as MERGED
            await this.prisma.requirementDraft.update({
                where: { id: draft.id },
                data: { status: 'MERGED' }
            });
        }

        return { message: `Merged ${createdRequirements.length} requirements`, requirements: createdRequirements };
    }

    async updateDraftStatus(id: string, data: { status?: 'APPROVED' | 'REJECTED' | 'PENDING', title?: string, content?: string, type?: string }) {
        return this.prisma.requirementDraft.update({
            where: { id },
            data
        });
    }

    async batchApproveDrafts(jobId: string) {
        const result = await this.prisma.requirementDraft.updateMany({
            where: { jobId, status: 'PENDING' },
            data: { status: 'APPROVED' }
        });
        return { message: `Approved ${result.count} drafts`, count: result.count };
    }

    async batchRejectDrafts(jobId: string) {
        const result = await this.prisma.requirementDraft.updateMany({
            where: { jobId, status: 'PENDING' },
            data: { status: 'REJECTED' }
        });
        return { message: `Rejected ${result.count} drafts`, count: result.count };
    }

    async getJobDrafts(jobId: string) {
        return this.prisma.requirementDraft.findMany({
            where: { jobId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAllJobs() {
        // Fetch all extraction jobs with necessary relations for dashboard
        return this.prisma.extractionJob.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                source: {
                    select: {
                        id: true,
                        type: true,
                        metadata: true
                    }
                },
                drafts: {
                    select: {
                        id: true,
                        status: true,
                        confidence: true
                    }
                }
            }
        });
    }

    async deleteJob(id: string) {
        // Delete related drafts first (or rely on cascade if configured, but safe side here)
        // Prisma schema might not have cascade on all, so let's check
        // Assuming cascade delete is set on Schema or we delete manually.
        
        // Manual cleanup to ensure everything is gone
        const job = await this.prisma.extractionJob.findUnique({ where: { id } });
        if (!job) throw new Error('Job not found');

        // Delete drafts
        await this.prisma.requirementDraft.deleteMany({ where: { jobId: id } });
        
        // Delete job
        await this.prisma.extractionJob.delete({ where: { id } });
        
        // Optionally delete source if not shared? 
        // For now, let's keep source or delete it if 1:1. 
        // ExtractionSource -> ExtractionJob is 1:N potentially, but usually 1:1 in this flow.
        // Let's safe-delete source if no other jobs (optional logic, skipping for simplicity)
        
        return { message: 'Job deleted successfully' };
    }
}
