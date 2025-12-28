import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IAiProvider, AiRequest, AiResponse, ProviderStatus } from './ai-provider.interface';
import { VllmProvider } from './vllm.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAiProvider } from './openai.provider';
import { AiProviderType } from '@prisma/client';

interface ProviderConfig {
    id: string;
    name: string;
    type: AiProviderType;
    maxRetries: number;
    retryDelayMs: number;
    provider: IAiProvider;
}

@Injectable()
export class AiProviderManager implements OnModuleInit {
    private providerConfigs: ProviderConfig[] = [];
    private providerStatus: Map<string, ProviderStatus> = new Map();
    private readonly logger = new Logger(AiProviderManager.name);

    constructor(private readonly prisma: PrismaService) {}

    async onModuleInit() {
        await this.refreshProviders();
    }

    async refreshProviders() {
        this.logger.log('Refreshing AI Providers from DB...');
        const configs = await this.prisma.aiProvider.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' },
        });

        this.providerConfigs = [];

        for (const config of configs) {
            let provider: IAiProvider | null = null;
            
            if (config.type === AiProviderType.VLLM) {
                provider = new VllmProvider(config.endpoint, config.apiKey || '', config.models, config.timeout || 600);
            } else if (config.type === AiProviderType.OLLAMA) {
                provider = new OllamaProvider(config.endpoint, config.models, config.timeout || 600);
            } else if (config.type === AiProviderType.OPENAI) {
                provider = new OpenAiProvider(config.apiKey || '', config.models, config.timeout || 120);
            }

            if (provider) {
                this.providerConfigs.push({
                    id: config.id,
                    name: config.name,
                    type: config.type,
                    maxRetries: config.maxRetries || 3,
                    retryDelayMs: config.retryDelayMs || 1000,
                    provider,
                });

                // Initialize status
                if (!this.providerStatus.has(config.id)) {
                    this.providerStatus.set(config.id, {
                        id: config.id,
                        name: config.name,
                        type: config.type,
                        isHealthy: true,
                        lastChecked: null,
                        lastError: null,
                        successCount: 0,
                        failureCount: 0,
                        avgLatencyMs: 0,
                        totalTokensUsed: 0,
                        promptTokensUsed: 0,
                        completionTokensUsed: 0,
                        estimatedCostUsd: 0,
                        lastUsed: null,
                    });
                }
            }
        }

        if (this.providerConfigs.length === 0) {
            this.logger.warn('No active AI providers found in DB. Checking ENV for fallback...');
            if (process.env.OPENAI_API_KEY) {
                this.logger.log('Adding default OpenAI provider from ENV');
                this.providerConfigs.push({
                    id: 'env-openai',
                    name: 'OpenAI (ENV)',
                    type: AiProviderType.OPENAI,
                    maxRetries: 3,
                    retryDelayMs: 1000,
                    provider: new OpenAiProvider(process.env.OPENAI_API_KEY),
                });
            }
        }

        this.logger.log(`Loaded ${this.providerConfigs.length} AI Providers.`);
    }

    // Get all provider statuses for monitoring
    getProviderStatuses(): ProviderStatus[] {
        return Array.from(this.providerStatus.values());
    }

    // Health check all providers
    async checkAllHealth(): Promise<ProviderStatus[]> {
        const results: ProviderStatus[] = [];
        
        for (const config of this.providerConfigs) {
            const status = this.providerStatus.get(config.id)!;
            try {
                const isHealthy = await config.provider.isHealthy();
                status.isHealthy = isHealthy;
                status.lastChecked = new Date();
                if (isHealthy) status.lastError = null;
            } catch (e: any) {
                status.isHealthy = false;
                status.lastError = e.message;
                status.lastChecked = new Date();
            }
            results.push(status);
        }
        
        return results;
    }

    async getActiveProvider(): Promise<IAiProvider> {
        if (this.providerConfigs.length === 0) throw new Error('No AI Providers Available');
        return this.providerConfigs[0].provider;
    }

    /**
     * Executes with retry and exponential backoff
     */
    private async executeWithRetry(
        config: ProviderConfig,
        request: AiRequest
    ): Promise<AiResponse> {
        let lastError: any;
        const status = this.providerStatus.get(config.id)!;
        const startTime = Date.now();

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = config.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                    this.logger.debug(`Retry ${attempt}/${config.maxRetries} for ${config.name} after ${delay}ms`);
                    await this.sleep(delay);
                }

                const response = await config.provider.chatComplete(request);
                
                // Update status on success
                const latency = Date.now() - startTime;
                status.successCount++;
                status.avgLatencyMs = Math.round(
                    (status.avgLatencyMs * (status.successCount - 1) + latency) / status.successCount
                );
                status.isHealthy = true;
                status.lastError = null;

                // Track token usage
                status.totalTokensUsed += response.usage.totalTokens;
                status.promptTokensUsed += response.usage.promptTokens;
                status.completionTokensUsed += response.usage.completionTokens;
                status.lastUsed = new Date();

                // Estimate cost (OpenAI pricing)
                if (config.type === 'OPENAI') {
                    const modelKey = response.modelUsed?.includes('gpt-4') ? 
                        (response.modelUsed.includes('turbo') ? 'gpt-4-turbo' : 'gpt-4') : 'gpt-3.5-turbo';
                    const costs = { 'gpt-4': { p: 0.03, c: 0.06 }, 'gpt-4-turbo': { p: 0.01, c: 0.03 }, 'gpt-3.5-turbo': { p: 0.0005, c: 0.0015 } };
                    const cost = costs[modelKey as keyof typeof costs] || { p: 0.01, c: 0.03 };
                    status.estimatedCostUsd += (response.usage.promptTokens * cost.p + response.usage.completionTokens * cost.c) / 1000;
                }

                return response;

            } catch (error: any) {
                lastError = error;
                this.logger.warn(`${config.name} attempt ${attempt + 1} failed: ${error.message}`);
            }
        }

        // All retries failed
        status.failureCount++;
        status.lastError = lastError?.message;
        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Executes a prompt with automatic failover and retry
     */
    async execute(request: AiRequest, context?: string): Promise<AiResponse> {
        let lastError: any;

        // Global settings inheritance
        const globalModel = await this.prisma.systemSetting.findUnique({ where: { key: 'ai.model' } });
        const globalTemp = await this.prisma.systemSetting.findUnique({ where: { key: 'ai.temperature' } });

        if (!request.model && globalModel?.value) {
            request.model = globalModel.value;
        }
        if (request.temperature === undefined && globalTemp?.value) {
            request.temperature = parseFloat(globalTemp.value);
        }

        for (const config of this.providerConfigs) {
            try {
                this.logger.debug(`Attempting execution with ${config.name} (${config.type})`);
                const response = await this.executeWithRetry(config, request);
                await this.logSuccess(config, request, response, context);
                return response;

            } catch (error: any) {
                this.logger.warn(`Provider ${config.name} failed after retries: ${error.message}. Failing over...`);
                lastError = error;
                await this.logFailure(config, request, error, context);
                continue;
            }
        }

        throw new Error(`All AI Providers failed. Last error: ${lastError?.message}`);
    }

    private async logSuccess(config: ProviderConfig, req: AiRequest, res: AiResponse, context?: string) {
        try {
            await this.prisma.aiLog.create({
                data: {
                    providerName: config.name,
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

    private async logFailure(config: ProviderConfig, req: AiRequest, error: any, context?: string) {
        try {
            await this.prisma.aiLog.create({
                data: {
                    providerName: config.name,
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

