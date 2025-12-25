import { Controller, Post, Body, UploadedFile, UseInterceptors, Get, Param, Delete } from '@nestjs/common';
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
            this.extractionService.startProcessing(source.id);

            return { message: 'File uploaded and processing started', sourceId: source.id };
        } catch (e) {
            console.error('Upload Failed:', e);
            throw e; // Use Filter or let it bubble, but console.error helps if I could read it
            // Better: Return 400/500 with message
            // throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('text')
    async submitText(@Body() body: { text: string; projectId: string }) {
        // TODO: allow direct text input
        return { message: 'Text received' };
    }

    @Get('jobs/:id')
    async getJobStatus(@Param('id') id: string) {
        return this.extractionService.getJobStatus(id);
    }

    @Post('drafts/:id/merge')
    async mergeDraft(@Param('id') id: string, @Body() body: { projectId: string }) {
        return this.extractionService.mergeDraft(id, body.projectId);
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
