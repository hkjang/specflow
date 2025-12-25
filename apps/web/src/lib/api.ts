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

export const adminApi = {
    getOverallStats: () => api.get('/dashboard/admin/stats'),
    getQualityMetrics: () => api.get('/dashboard/admin/quality'),
    getTrends: (period: 'daily' | 'weekly') => api.get(`/dashboard/admin/trends?period=${period}`),
    getTrendSummary: (period: 'daily' | 'weekly') => api.get(`/dashboard/admin/trend-summary?period=${period}`),
    getRisks: () => api.get('/dashboard/admin/risks'),

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
};

export const aiApi = {
    getProviders: () => api.get('/ai/providers'),
    createProvider: (data: any) => api.post('/ai/providers', data),
    updateProvider: (id: string, data: any) => api.patch(`/ai/providers/${id}`, data),
    deleteProvider: (id: string) => api.delete(`/ai/providers/${id}`),

    getLogs: () => api.get('/ai/logs'),

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
    updateDraft: (draftId: string, status: 'APPROVED' | 'REJECTED') => api.patch(`/extraction/drafts/${draftId}`, { status }),
    mergeJob: (jobId: string) => api.post(`/extraction/jobs/${jobId}/merge`),
};

export const classificationApi = {
    getBusiness: (params?: any) => api.get('/classification/business', { params }),
    createBusiness: (data: any) => api.post('/classification/business', data),
    getCategories: () => api.get('/classification/categories'),
    autoClassify: (data: { projectId: string; providerId: string }) => api.post('/classification/auto', data),
    getStats: () => api.get('/classification/stats'),
};
