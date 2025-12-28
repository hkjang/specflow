
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
}
