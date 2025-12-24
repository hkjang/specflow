import { Controller, Post, Body, UploadedFile, UseInterceptors, Get, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from './extraction.service';

@Controller('extraction')
export class ExtractionController {
    constructor(private readonly extractionService: ExtractionService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: { projectId: string; perspective?: string }) {
        if (!file) throw new Error('No file provided');

        // Ingestion
        const source = await this.extractionService.ingestFile(file, body.projectId, body.perspective);

        // Start Processing (Async)
        this.extractionService.startProcessing(source.id);

        return { message: 'File uploaded and processing started', sourceId: source.id };
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
}
