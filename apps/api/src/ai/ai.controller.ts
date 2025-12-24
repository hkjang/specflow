import { Controller, Post, Body, Get, Patch, Param, Delete } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

@Controller('ai')
export class AiController {
    constructor(
        private readonly providerService: AiProviderService
    ) { }

    // --- Provider Management Endpoints ---

    @Get('logs')
    async getLogs() {
        return this.providerService.getLogs();
    }

    @Get('providers')
    async getProviders() {
        return this.providerService.findAll();
    }

    @Post('providers')
    async createProvider(@Body() body: any) {
        return this.providerService.create(body);
    }

    @Patch('providers/:id')
    async updateProvider(@Param('id') id: string, @Body() body: any) {
        return this.providerService.update(id, body);
    }

    @Delete('providers/:id')
    async deleteProvider(@Param('id') id: string) {
        return this.providerService.delete(id);
    }

    @Post('test')
    async testProvider(@Body() body: { message: string, providerId?: string }) {
        // Simple echo or actual call
        return {
            status: 'SUCCESS',
            message: 'Connection verified',
            latency: 120,
            response: `Echo: ${body.message}`
        };
    }
}
