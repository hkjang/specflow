import { Controller, Post, Body, Get, Patch, Param, Delete } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiProviderManager } from './provider/ai-provider.manager';

@Controller('ai')
export class AiController {
    constructor(
        private readonly providerService: AiProviderService,
        private readonly providerManager: AiProviderManager,
    ) { }

    // --- Provider Management Endpoints ---

    @Get('logs')
    async getLogs() {
        return this.providerService.getLogs();
    }

    @Get('logs/stats')
    async getLogStats() {
        return this.providerService.getLogStats();
    }

    @Get('logs/errors')
    async getRecentErrors() {
        return this.providerService.getRecentErrors();
    }

    @Get('providers')
    async getProviders() {
        return this.providerService.findAll();
    }

    @Get('providers/status')
    async getProviderStatuses() {
        return this.providerManager.getProviderStatuses();
    }

    @Post('providers/health-check')
    async checkProviderHealth() {
        return this.providerManager.checkAllHealth();
    }

    @Post('providers/refresh')
    async refreshProviders() {
        await this.providerManager.refreshProviders();
        return { success: true, message: 'Providers refreshed' };
    }

    @Post('providers')
    async createProvider(@Body() body: any) {
        const result = await this.providerService.create(body);
        await this.providerManager.refreshProviders();
        return result;
    }

    @Patch('providers/:id')
    async updateProvider(@Param('id') id: string, @Body() body: any) {
        const result = await this.providerService.update(id, body);
        await this.providerManager.refreshProviders();
        return result;
    }

    @Delete('providers/:id')
    async deleteProvider(@Param('id') id: string) {
        const result = await this.providerService.delete(id);
        await this.providerManager.refreshProviders();
        return result;
    }

    @Post('test')
    async testProvider(@Body() body: { message: string, providerId?: string }) {
        const startTime = Date.now();
        try {
            const provider = await this.providerManager.getActiveProvider();
            const response = await provider.chatComplete({
                messages: [{ role: 'user', content: body.message }],
            });
            return {
                status: 'SUCCESS',
                message: 'Provider is working',
                latency: Date.now() - startTime,
                response: response.content.substring(0, 100),
                model: response.modelUsed,
                tokens: response.usage.totalTokens,
            };
        } catch (e: any) {
            return {
                status: 'FAILED',
                message: e.message,
                latency: Date.now() - startTime,
            };
        }
    }
}
