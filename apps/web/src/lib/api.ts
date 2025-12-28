import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor for Auth if needed
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const knowledgeApi = {
    // Knowledge Evolution
    promoteRequirement: (id: string) => api.post(`/knowledge/maturity/${id}/promote`),
    verifyRequirement: (id: string) => api.post(`/knowledge/maturity/${id}/verify`),
    getMetrics: (id: string) => api.get(`/knowledge/assets/${id}/metrics`),

    // CRUD
    getAssets: () => api.get('/knowledge/assets'),
    createAsset: (data: any) => api.post('/knowledge/assets', data),
    updateAsset: (id: string, data: any) => api.patch(`/knowledge/assets/${id}`, data),
    deleteAsset: (id: string) => api.delete(`/knowledge/assets/${id}`),

    // Adaptation
    getProjectContext: (projectId: string) => api.get(`/adaptation/context/${projectId}`),
    updateProjectContext: (projectId: string, data: any) => api.post(`/adaptation/context/${projectId}`, data),
    adaptContent: (projectId: string, content: string) => api.post('/adaptation/transform', { projectId, content }),

    // Analysis
    analyzeConflicts: (projectId: string, requirementIds: string[]) => api.post('/analysis/conflicts', { projectId, requirementIds }),
    recommendMissing: (projectId: string) => api.post('/analysis/recommend', { projectId }),

    // Generation
    generateArtifact: (projectId: string, type: 'ARCHITECTURE' | 'UI' | 'API' | 'TEST') => api.post('/generation/artifact', { projectId, type }),
    generateProposal: (requirementIds: string[], partnerName: string) => api.post('/generation/proposal', { requirementIds, partnerName }),
};

export const marketplaceApi = {
    getAll: () => api.get('/ai/marketplace'),
    create: (data: any) => api.post('/ai/marketplace', data),
    update: (id: string, data: any) => api.patch(`/ai/marketplace/${id}`, data),
    delete: (id: string) => api.delete(`/ai/marketplace/${id}`),
};

export const partnerApi = {
    getAll: () => api.get('/partner/registry'),
    getStats: () => api.get('/partner/registry/stats'),
    create: (data: any) => api.post('/partner/registry', data),
    update: (id: string, data: any) => api.patch(`/partner/registry/${id}`, data),
    delete: (id: string) => api.delete(`/partner/registry/${id}`),
};

export const adminApi = {
    getOverallStats: () => api.get('/dashboard/admin/stats'),
    getQualityMetrics: () => api.get('/dashboard/admin/quality'),
    getTrends: (period: 'daily' | 'weekly') => api.get(`/dashboard/admin/trends?period=${period}`),
    getTrendSummary: (period: 'daily' | 'weekly') => api.get(`/dashboard/admin/trend-summary?period=${period}`),
    getRisks: () => api.get('/dashboard/admin/risks'),
    getRecentActivities: (limit?: number) => api.get(`/dashboard/activities${limit ? `?limit=${limit}` : ''}`),
    getProgressStats: () => api.get('/dashboard/progress'),

    // Analysis
    checkDuplicates: (content: string) => api.post('/analysis/duplicates', { content }),
    recommendApis: (requirementIds: string[]) => api.post('/analysis/api-recommendations', { requirementIds }),

    // Classification
    getCategories: () => api.get('/classification/categories'),
    getClassificationStats: () => api.get('/classification/stats'),
    overrideClassification: (requirementId: string, categoryIds: string[]) => api.post('/classification/override', { requirementId, categoryIds }),

    // Data Mart
    getDataMartDatasets: () => api.get('/data-mart/datasets'),

    // Operations
    getOperations: () => api.get('/operations'),
    processOperation: (id: string, action: 'APPROVE' | 'REJECT' | 'RESOLVE', notes?: string) => api.post(`/operations/${id}/process`, { action, notes }),

    // Assets
    getRequirement: (id: string) => api.get(`/requirements/${id}`),
    addComment: (id: string, content: string, userId?: string) => api.post(`/requirements/${id}/comments`, { content, userId }),
    getComments: (id: string) => api.get(`/requirements/${id}/comments`),
    analyzeQuality: (id: string, providerId: string) => api.post(`/requirements/${id}/analyze`, { providerId }),

    // AI Enrichment
    enrichRequirement: (id: string) => api.post(`/requirements/${id}/enrich`),
};

export const aiApi = {
    getProviders: () => api.get('/ai/providers'),
    getProviderStatuses: () => api.get('/ai/providers/status'),
    checkHealth: () => api.post('/ai/providers/health-check'),
    refreshProviders: () => api.post('/ai/providers/refresh'),
    createProvider: (data: any) => api.post('/ai/providers', data),
    updateProvider: (id: string, data: any) => api.patch(`/ai/providers/${id}`, data),
    deleteProvider: (id: string) => api.delete(`/ai/providers/${id}`),

    getLogs: () => api.get('/ai/logs'),
    getLogStats: () => api.get('/ai/logs/stats'),
    getRecentErrors: () => api.get('/ai/logs/errors'),

    testProvider: (message: string, providerId?: string) => api.post('/ai/test', { message, providerId }),
};

export const webhookApi = {
    getAll: () => api.get('/webhooks'),
    create: (data: any) => api.post('/webhooks', data),
    delete: (id: string) => api.delete(`/webhooks/${id}`),
    test: (id: string) => api.post(`/webhooks/${id}/test`),
};

export const extractionApi = {
    upload: (data: FormData) => api.post('/extraction/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }), // providerId is inside FormData
    processText: (data: { content: string; perspective: string; projectId: string; providerId?: string }) => api.post('/extraction/text', data),
    getJob: (id: string) => api.get(`/extraction/jobs/${id}`),
    getAllJobs: () => api.get('/extraction/jobs'),
    deleteJob: (id: string) => api.delete(`/extraction/jobs/${id}`),
    updateDraft: (draftId: string, data: { status?: 'APPROVED' | 'REJECTED' | 'PENDING', title?: string, content?: string, type?: string }) => api.patch(`/extraction/drafts/${draftId}`, data),
    mergeJob: (jobId: string) => api.post(`/extraction/jobs/${jobId}/merge`),
    batchApprove: (jobId: string) => api.post(`/extraction/jobs/${jobId}/batch-approve`),
    batchReject: (jobId: string) => api.post(`/extraction/jobs/${jobId}/batch-reject`),
};

export const classificationApi = {
    getBusiness: (params?: any) => api.get('/classification/business', { params }), // Legacy
    createBusiness: (data: any) => api.post('/classification/business', data), // Legacy
    getCategories: () => api.get('/classification/categories'),
    createCategory: (data: { code: string; name: string; level: string; description?: string }) => api.post('/classification/categories', data),
    updateCategory: (id: string, data: any) => api.patch(`/classification/categories/${id}`, data),
    deleteCategory: (id: string) => api.delete(`/classification/categories/${id}`),
    autoClassify: (data: { projectId: string; providerId: string }) => api.post('/classification/auto', data),
    getStats: () => api.get('/classification/stats'),
};

export const projectApi = {
    getAll: () => api.get('/projects'),
    getOne: (id: string) => api.get(`/projects/${id}`),
    create: (data: any) => api.post('/projects', data),
    update: (id: string, data: any) => api.patch(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
};

export const userApi = {
    getAll: () => api.get('/users'),
    getOne: (id: string) => api.get(`/users/${id}`),
    create: (data: any) => api.post('/users', data),
    update: (id: string, data: any) => api.patch(`/users/${id}`, data),
    delete: (id: string) => api.delete(`/users/${id}`),
    getMyStats: (userId: string) => api.get(`/dashboard/mine?userId=${userId}`),
};

export const settingsApi = {
    getAll: () => api.get('/settings'),
    getOne: (key: string) => api.get(`/settings/${key}`),
    upsert: (data: any) => api.post('/settings', data),
};

// AI Agent System API
export const agentApi = {
    // Agents
    getAgents: () => api.get('/requirements/agents'),
    
    // Individual agent execution
    extract: (content: string) => api.post('/requirements/agents/extract', { content }),
    refine: (requirements: any[]) => api.post('/requirements/agents/refine', { requirements }),
    classify: (requirements: any[], industry?: string) => api.post('/requirements/agents/classify', { requirements, industry }),
    expand: (requirements: any[], industry?: string) => api.post('/requirements/agents/expand', { requirements, industry }),
    validate: (requirements: any[], industry?: string) => api.post('/requirements/agents/validate', { requirements, industry }),
    detectRisk: (requirements: any[], industry?: string) => api.post('/requirements/agents/detect-risk', { requirements, industry }),

    // Pipeline
    executePipeline: (content: string, agents?: string[], industry?: string) => 
        api.post('/requirements/agents/pipeline', { content, agents, industry }),
    executePipelineParallel: (content: string, agentGroups: string[][], industry?: string) =>
        api.post('/requirements/agents/pipeline/parallel', { content, agentGroups, industry }),
    executeWithRetry: (agentType: string, content: string, industry?: string) =>
        api.post('/requirements/agents/execute-retry', { agentType, content, industry }),

    // Heatmap & Analysis
    getHeatmap: (requirements: any[], industry?: string) => api.post('/requirements/agents/heatmap', { requirements, industry }),
    analyzeQuality: (requirements: any[], industry?: string) => api.post('/requirements/agents/quality-analysis', { requirements, industry }),

    // Benchmarks
    getBenchmarks: (industry?: string) => api.get(`/requirements/agents/benchmarks${industry ? `?industry=${industry}` : ''}`),

    // Autonomous Generation
    generateAutonomous: (config: { industry: string; systemType: string; organizationMaturity: string; regulationLevel: string; maxRequirements?: number }) =>
        api.post('/requirements/agents/autonomous/generate', config),
    getThinkingLog: (id: string) => api.get(`/requirements/agents/thinking/${id}`),

    // Health
    getHealth: () => api.get('/requirements/agents/health'),

    // Metrics
    getMetrics: (days?: number) => api.get(`/requirements/agents/metrics${days ? `?days=${days}` : ''}`),
    getAgentMetrics: (agentType: string, days?: number) => api.get(`/requirements/agents/metrics/${agentType}${days ? `?days=${days}` : ''}`),
    getDetailedMetrics: (days?: number) => api.get(`/requirements/agents/metrics/detailed${days ? `?days=${days}` : ''}`),
    getHourlyTrend: () => api.get('/requirements/agents/metrics/hourly'),
    getPerformanceSummary: () => api.get('/requirements/agents/metrics/summary'),

    // Logs
    getLogs: (limit?: number) => api.get(`/requirements/agents/logs${limit ? `?limit=${limit}` : ''}`),
    getLog: (id: string) => api.get(`/requirements/agents/logs/${id}`),
    getLogsPaginated: (page?: number, pageSize?: number) => 
        api.get(`/requirements/agents/logs/paginated?page=${page || 1}&pageSize=${pageSize || 20}`),
    searchLogs: (filter: { agentType?: string; success?: boolean; fromDate?: string; toDate?: string; sessionId?: string; userId?: string; page?: number; pageSize?: number }) =>
        api.post('/requirements/agents/logs/search', filter),
    getFailedLogs: (days?: number, limit?: number) => 
        api.get(`/requirements/agents/logs/failed?days=${days || 7}&limit=${limit || 50}`),
    getSlowLogs: (threshold?: number, limit?: number) => 
        api.get(`/requirements/agents/logs/slow?threshold=${threshold || 5000}&limit=${limit || 50}`),

    // Config
    getAllConfigs: () => api.get('/requirements/agents/config'),
    getConfig: (agentType: string) => api.get(`/requirements/agents/config/${agentType}`),
    updateConfig: (agentType: string, data: { modelName?: string; temperature?: number; maxTokens?: number; isEnabled?: boolean }) =>
        api.put(`/requirements/agents/config/${agentType}`, data),

    // Feedback
    submitFeedback: (data: { agentType: string; rating: number; comment?: string; isAccurate?: boolean; userId: string }) =>
        api.post('/requirements/agents/feedback', data),
    getFeedbackStats: () => api.get('/requirements/agents/feedback/stats'),

    // Cache
    getCacheStats: () => api.get('/requirements/agents/cache/stats'),
    clearCache: () => api.post('/requirements/agents/cache/clear'),

    // Circuit Breaker
    getCircuitBreakers: () => api.get('/requirements/agents/circuit-breakers'),
    resetCircuitBreaker: (agentType: string) => api.post(`/requirements/agents/circuit-breakers/${agentType}/reset`),
};
