import { Injectable } from '@nestjs/common';

@Injectable()
export class DataMartService {
    async getDatasets() {
        // Mock data for now, effectively replacing the frontend mock
        return [
            { id: 'v1.2', name: 'Global Requirements v1.2', records: 1250, created: '2023-12-20', status: 'PUBLISHED' },
            { id: 'v1.1', name: 'Global Requirements v1.1', records: 1100, created: '2023-11-15', status: 'ARCHIVED' },
            { id: 'v2.0-beta', name: 'Finance Domain v2.0 Beta', records: 450, created: '2023-12-22', status: 'DRAFT' },
        ];
    }

    async createSnapshot(name: string) {
        return {
            id: `v${Math.floor(Math.random() * 10)}.0`,
            name,
            records: 0,
            created: new Date().toISOString(),
            status: 'DRAFT'
        }
    }
    async collectFromUrl(url: string) {
        // Mock collection logic
        console.log(`[DataMartService] Collecting from ${url}`);
        return Promise.resolve();
    }
}
