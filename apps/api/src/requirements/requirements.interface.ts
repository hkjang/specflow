/**
 * Requirements Module Interfaces
 */

export interface RequirementStats {
    total: number;
    byStatus: {
        DRAFT: number;
        REVIEW: number;
        APPROVED: number;
        DEPRECATED: number;
    };
    byCategory: CategoryCount[];
    recentActivity: {
        created: number;
        updated: number;
        period: string;
    };
    qualityMetrics: {
        avgTrustScore: number;
        lowQualityCount: number;
    };
}

export interface CategoryCount {
    name: string;
    count: number;
}

export interface RelatedRequirement {
    id: string;
    code: string;
    title: string;
    similarity: number;
    matchType: 'TITLE' | 'CONTENT' | 'COMBINED';
}

export interface ExportOptions {
    format: 'csv' | 'json';
    status?: string;
    category?: string;
    includeMetadata?: boolean;
}

export interface ImportResult {
    success: number;
    failed: number;
    duplicates: number;
    errors: { row: number; error: string }[];
}

export interface TimelineEntry {
    id: string;
    action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ENRICHED' | 'COMMENTED';
    timestamp: Date;
    userId?: string;
    userEmail?: string;
    details?: Record<string, any>;
    previousValue?: string;
    newValue?: string;
}

export interface VersionSnapshot {
    version: number;
    title: string;
    content: string;
    status: string;
    createdAt: Date;
    changedBy?: string;
    changeReason?: string;
}
