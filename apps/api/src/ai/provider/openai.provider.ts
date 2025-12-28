import { IAiProvider, AiRequest, AiResponse } from './ai-provider.interface';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';

export class OpenAiProvider implements IAiProvider {
    private openai: OpenAI;
    private readonly logger = new Logger(OpenAiProvider.name);

    constructor(
        private readonly apiKey: string,
        private readonly modelName: string = 'gpt-4-turbo',
        private readonly timeoutSeconds: number = 120, // 2 minutes default for cloud
    ) {
        this.openai = new OpenAI({
            apiKey: this.apiKey,
            timeout: this.timeoutSeconds * 1000,
        });
        this.logger.log(`OpenAI Provider initialized with ${this.timeoutSeconds}s timeout`);
    }

    getName(): string {
        return 'OpenAI Cloud';
    }

    getType(): 'OPENAI' {
        return 'OPENAI';
    }

    async isHealthy(): Promise<boolean> {
        try {
            // Minimal cost check e.g. list models
            await this.openai.models.list();
            return true;
        } catch (e) {
            return false;
        }
    }

    async chatComplete(request: AiRequest): Promise<AiResponse> {
        try {
            const response = await this.openai.chat.completions.create({
                model: request.model || this.modelName,
                messages: request.messages,
                temperature: request.temperature,
                response_format: request.responseFormat ? { type: request.responseFormat } : undefined,
            });

            const choice = response.choices[0];
            const usage = response.usage;

            return {
                content: choice.message.content || '',
                usage: {
                    promptTokens: usage?.prompt_tokens || 0,
                    completionTokens: usage?.completion_tokens || 0,
                    totalTokens: usage?.total_tokens || 0,
                },
                modelUsed: response.model,
            };
        } catch (error) {
            this.logger.error(`OpenAI Error: ${error.message}`);
            throw error;
        }
    }
}
