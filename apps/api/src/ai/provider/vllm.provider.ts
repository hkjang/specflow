import { IAiProvider, AiRequest, AiResponse } from './ai-provider.interface';
import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';

export class VllmProvider implements IAiProvider {
    private openai: OpenAI;
    private readonly logger = new Logger(VllmProvider.name);

    constructor(
        private readonly endpoint: string,
        private readonly apiKey: string,
        private readonly modelName: string,
    ) {
        this.openai = new OpenAI({
            baseURL: this.endpoint,
            apiKey: this.apiKey || 'EMPTY', // vLLM often uses 'EMPTY'
        });
    }

    getName(): string {
        return 'vLLM Provider';
    }

    getType(): 'VLLM' {
        return 'VLLM';
    }

    async isHealthy(): Promise<boolean> {
        try {
            await this.openai.models.list(); // Simple check
            return true;
        } catch (e) {
            this.logger.error(`Health check failed for ${this.endpoint}: ${e.message}`);
            return false;
        }
    }

    async chatComplete(request: AiRequest): Promise<AiResponse> {
        const start = Date.now();
        try {
            const response = await this.openai.chat.completions.create({
                model: request.model || this.modelName,
                messages: request.messages,
                temperature: request.temperature,
                max_tokens: request.maxTokens,
                response_format: request.responseFormat ? { type: request.responseFormat } : undefined,
            });

            const choice = response.choices[0];
            const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

            this.logger.debug(`vLLM Request completed in ${Date.now() - start}ms`);

            return {
                content: choice.message.content || '',
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                },
                modelUsed: response.model,
            };
        } catch (error) {
            this.logger.error(`vLLM Inference Failed: ${error.message}`);
            throw error;
        }
    }
}
