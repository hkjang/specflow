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

    async startProcessing(sourceId: string) {
        return this.pipelineService.startExtraction(sourceId);
    }

    async getJobStatus(id: string) {
        const job = await this.prisma.extractionJob.findUnique({
            where: { id },
            include: { drafts: true }
        });

        if (!job) return null;

        // Run dynamic QA on fetch (Optimization: Store in DB later)
        const qaIssues = this.qaService.analyzeDrafts(job.drafts);

        return { ...job, qaIssues };
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
}
