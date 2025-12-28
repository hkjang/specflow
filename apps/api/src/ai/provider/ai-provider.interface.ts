
export interface AiRequest {
    model?: string;
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
}

export interface AiResponse {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    modelUsed: string;
}

export interface IAiProvider {
    getName(): string;
    getType(): 'OPENAI' | 'OLLAMA' | 'VLLM';
    isHealthy(): Promise<boolean>;
    chatComplete(request: AiRequest): Promise<AiResponse>;
}

export interface ProviderStatus {
    id: string;
    name: string;
    type: string;
    isHealthy: boolean;
    lastChecked: Date | null;
    lastError: string | null;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    // Token tracking
    totalTokensUsed: number;
    promptTokensUsed: number;
    completionTokensUsed: number;
    estimatedCostUsd: number;
    lastUsed: Date | null;
}

// Cost per 1K tokens (approximate)
export const TOKEN_COSTS: Record<string, { prompt: number; completion: number }> = {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'ollama': { prompt: 0, completion: 0 }, // Local - free
    'vllm': { prompt: 0, completion: 0 }, // Local - free
};
