import { Injectable } from '@nestjs/common';
import { Collector, CollectedData } from './collector.interface';

@Injectable()
export class GithubCollector implements Collector {
    name = 'GitHub';

    async collect(targetUrl: string): Promise<CollectedData[]> {
        // targetUrl expected format: https://github.com/owner/repo or similar
        // We will fallback to raw content fetch for README for simplicity without full API token requirement for now,
        // or use public API.

        try {
            // Convert github.com URL to api.github.com or raw.githubusercontent.com
            // Example: https://github.com/nestjs/nest -> https://api.github.com/repos/nestjs/nest/readme

            const match = targetUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) return [];

            const owner = match[1];
            const repo = match[2];

            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;

            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Specflow-Collector',
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (!response.ok) {
                console.error(`GitHub API failed: ${response.statusText}`);
                return [];
            }

            const rawContent = await response.text();

            return [{
                content: rawContent,
                source: 'GitHub',
                sourceUrl: targetUrl,
                sourceType: 'Repository',
                title: `${owner}/${repo} README`,
                metadata: { owner, repo }
            }];

        } catch (error) {
            console.error(`Failed to collect from ${targetUrl}`, error);
            return [];
        }
    }
}
