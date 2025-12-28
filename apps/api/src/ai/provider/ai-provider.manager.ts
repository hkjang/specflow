import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Adjust import based on actual location
import { IAiProvider, AiRequest, AiResponse } from './ai-provider.interface';
import { VllmProvider } from './vllm.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAiProvider } from './openai.provider';
import { AiProviderType } from '@prisma/client';

@Injectable()
export class AiProviderManager implements OnModuleInit {
    private providers: IAiProvider[] = [];
    private readonly logger = new Logger(AiProviderManager.name);

    // Inject SettingsService to fetch global configs
    constructor(
        private readonly prisma: PrismaService,
        // @Inject(forwardRef(() => SettingsService)) // Might need forwardRef if circular dependency exists, but likely not here
        // Actually, AiProviderManager is a provider, SettingsService is a provider. 
        // We need to import SettingsService in module.
        // For simplicity, let's query Prisma directly for settings to avoid module circularity issues with SettingsModule.
    ) { }

    async onModuleInit() {
        await this.refreshProviders();
    }

    async refreshProviders() {
        this.logger.log('Refreshing AI Providers from DB...');
        const configs = await this.prisma.aiProvider.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' },
        });

        this.providers = [];

        for (const config of configs) {
            if (config.type === AiProviderType.VLLM) {
                this.providers.push(new VllmProvider(config.endpoint, config.apiKey || '', config.models, config.timeout || 600));
            } else if (config.type === AiProviderType.OLLAMA) {
                this.providers.push(new OllamaProvider(config.endpoint, config.models, config.timeout || 600));
            } else if (config.type === AiProviderType.OPENAI) {
                this.providers.push(new OpenAiProvider(config.apiKey || '', config.models, config.timeout || 120));
            }
        }

        if (this.providers.length === 0) {
            this.logger.warn('No active AI providers found in DB. Checking ENV for fallback...');
            // Fallback to Env if DB is empty
            if (process.env.OPENAI_API_KEY) {
                this.logger.log('Adding specific default OpenAI provider from ENV');
                this.providers.push(new OpenAiProvider(process.env.OPENAI_API_KEY));
            }
        }

        this.logger.log(`Loaded ${this.providers.length} AI Providers.`);
    }

    async getActiveProvider(): Promise<IAiProvider> {
        // Simple Failover Logic: iterate through sorted providers, check health (or just try-catch execution)
        // Checking health on every request might be slow, so we assume they are healthy and handle errors in execution
        // But for "getActiveProvider", let's return the first one.
        if (this.providers.length === 0) throw new Error('No AI Providers Available');
        return this.providers[0];
    }

    /**
     * Executes a prompt with automatic failover
     */
    async execute(request: AiRequest, context?: string): Promise<AiResponse> {
        let lastError: any;

        // --- GLOBAL SETTINGS INHERITANCE ---
        // Fetch global settings to override defaults
        const globalModel = await this.prisma.systemSetting.findUnique({ where: { key: 'ai.model' } });
        const globalTemp = await this.prisma.systemSetting.findUnique({ where: { key: 'ai.temperature' } });

        // Apply overrides if request doesn't explicitly specify them (or force them?)
        // Strategy: User request > Global Setting > Default
        // BUT user said "AI Settings should inherit". Usually means IF NOT SPECIFIED.
        if (!request.model && globalModel?.value) {
            request.model = globalModel.value;
        }

        if (request.temperature === undefined && globalTemp?.value) {
            request.temperature = parseFloat(globalTemp.value);
        }
        // ------------------------------------

        for (const provider of this.providers) {
            try {
                this.logger.debug(`Attempting execution with ${provider.getName()} (${provider.getType()})`);
                const response = await provider.chatComplete(request);

                await this.logSuccess(provider, request, response, context);
                return response;

            } catch (error) {
                this.logger.warn(`Provider ${provider.getName()} failed: ${error.message}. Failing over...`);
                lastError = error;
                await this.logFailure(provider, request, error, context);
                continue;
            }
        }

        throw new Error(`All AI Providers failed. Last error: ${lastError?.message}`);
    }

    private async logSuccess(provider: IAiProvider, req: AiRequest, res: AiResponse, context?: string) {
        try {
            await this.prisma.aiLog.create({
                data: {
                    providerName: provider.getName(),
                    modelUsed: res.modelUsed,
                    promptTokens: res.usage.promptTokens,
                    completionTokens: res.usage.completionTokens,
                    totalTokens: res.usage.totalTokens,
                    status: 'SUCCESS',
                    actionContext: context,
                }
            });
        } catch (e) {
            this.logger.error('Failed to save AI Log', e);
        }
    }

    private async logFailure(provider: IAiProvider, req: AiRequest, error: any, context?: string) {
        try {
            await this.prisma.aiLog.create({
                data: {
                    providerName: provider.getName(),
                    modelUsed: req.model || 'unknown',
                    status: 'FAILED',
                    errorMessage: error.message,
                    actionContext: context,
                }
            });
        } catch (e) {
            this.logger.error('Failed to save AI Log', e);
        }
    }
}
