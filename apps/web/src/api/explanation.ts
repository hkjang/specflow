
import { api } from '@/lib/api';

export interface Explanation {
    id: string;
    category: string;
    key: string;
    title?: string;
    content: string;
    examples?: string;
}

export const explanationApi = {
    getAll: async (category?: string) => {
        const response = await api.get<Explanation[]>('/explanations', { params: { category } });
        return response.data;
    },

    getByKey: async (key: string) => {
        const response = await api.get<Explanation>(`/explanations/key/${key}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post<Explanation>('/explanations', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.patch<Explanation>(`/explanations/${id}`, data);
        return response.data;
    }
};
