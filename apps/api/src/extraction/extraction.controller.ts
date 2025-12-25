import { Controller, Post, Body, UploadedFile, UseInterceptors, Get, Param, Delete, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from './extraction.service';

@Controller('extraction')
export class ExtractionController {
    constructor(private readonly extractionService: ExtractionService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: { projectId: string; perspective?: string }) {
        try {
            if (!file) throw new Error('No file provided');

            // Ingestion
            const source = await this.extractionService.ingestFile(file, body.projectId, body.perspective);

            // Start Processing (Async)
            const job = await this.extractionService.startProcessing(source.id);

            return { message: 'File uploaded and processing started', sourceId: source.id, jobId: job?.id };
        } catch (e) {
            console.error('Upload Failed:', e);
            throw e; // Use Filter or let it bubble, but console.error helps if I could read it
            // Better: Return 400/500 with message
            // throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('text')
    async submitText(@Body() body: { content: string; projectId: string; perspective?: string }) {
        if (!body.content) throw new Error('No content provided');

        // Ingestion
        const source = await this.extractionService.ingestText(body.content, body.projectId, body.perspective);

        // Start Processing (Async)
        const job = await this.extractionService.startProcessing(source.id);

        return { message: 'Text received and processing started', jobId: job?.id, sourceId: source.id };
        // Note: ingestionService.createSource returns source. We might need to fetch the job ID if it's created there?
        // Actually pipelineService creates the job. 
        // Wait, startProcessing returns nothing? 
        // In file upload, we return sourceId. The frontend then polls or redirects.
        // Frontend expects `res.data.jobId`.
        // Let's modify startProcessing to return the job, or wait for it.
        // It's async.
    }

    @Get('jobs/:id')
    async getJobStatus(@Param('id') id: string) {
        return this.extractionService.getJobStatus(id);
    }

    @Post('drafts/:id/merge')
    async mergeDraft(@Param('id') id: string, @Body() body: { projectId: string }) {
        return this.extractionService.mergeDraft(id, body.projectId);
    }

    @Post('jobs/:id/merge')
    async mergeJob(@Param('id') id: string) {
        console.log(`[DEBUG] mergeJob called with id: ${id}`);
        return this.extractionService.mergeJob(id);
    }

    @Post('jobs/:id/batch-approve')
    async batchApprove(@Param('id') jobId: string) {
        return this.extractionService.batchApproveDrafts(jobId);
    }

    @Patch('drafts/:id')
    async updateDraft(@Param('id') id: string, @Body() body: { status?: 'APPROVED' | 'REJECTED' | 'PENDING', title?: string, content?: string, type?: string }) {
        return this.extractionService.updateDraftStatus(id, body);
    }

    @Get('jobs')
    async getAllJobs() {
        return this.extractionService.getAllJobs();
    }

    @Delete('jobs/:id')
    async deleteJob(@Param('id') id: string) {
        return this.extractionService.deleteJob(id);
    }
}
