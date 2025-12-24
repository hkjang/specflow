import { IAiProvider, AiRequest, AiResponse } from './ai-provider.interface';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';

export class OllamaProvider implements IAiProvider {
    private openai: OpenAI;
    private readonly logger = new Logger(OllamaProvider.name);

    constructor(
        private readonly endpoint: string,
        private readonly modelName: string,
    ) {
        // Ollama compatible endpoint usually /v1
        const baseUrl = this.endpoint.endsWith('/v1') ? this.endpoint : `${this.endpoint}/v1`;

        this.openai = new OpenAI({
            baseURL: baseUrl, // e.g., http://localhost:11434/v1
            apiKey: 'ollama', // key not required but SDK needs one
        });
    }

    getName(): string {
        return 'Ollama Provider';
    }

    getType(): 'OLLAMA' {
        return 'OLLAMA';
    }

    async isHealthy(): Promise<boolean> {
        try {
            await this.openai.models.list();
            return true;
        } catch (e) {
            this.logger.warn(`Health check failed: ${e.message}`);
            return false;
        }
    }

    async chatComplete(request: AiRequest): Promise<AiResponse> {
        try {
            const response = await this.openai.chat.completions.create({
                model: request.model || this.modelName,
                messages: request.messages,
                temperature: request.temperature,
                // response_format: request.responseFormat  <-- Ollama support varies, best to handle manually or depend on version
                // We'll pass it if it's simple json, but Ollama often needs 'format: json' in body not response_format
                response_format: request.responseFormat ? { type: request.responseFormat } : undefined,
            });

            const choice = response.choices[0];
            const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

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
            this.logger.error(`Ollama Inference Failed: ${error.message}`);
            throw error;
        }
    }
}
