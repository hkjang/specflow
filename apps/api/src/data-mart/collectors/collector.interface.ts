export interface CollectedData {
    content: string;
    source: string;
    sourceUrl: string;
    sourceType: string;
    metadata?: any;
    title?: string;
}

export interface Collector {
    name: string;
    collect(targetUrl: string): Promise<CollectedData[]>;
}
