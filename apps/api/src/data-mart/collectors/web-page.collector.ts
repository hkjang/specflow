import { Injectable } from '@nestjs/common';
import { Collector, CollectedData } from './collector.interface';
import { JSDOM } from 'jsdom';

@Injectable()
export class WebPageCollector implements Collector {
    name = 'WebPage';

    async collect(targetUrl: string): Promise<CollectedData[]> {
        try {
            const response = await fetch(targetUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // Simple heuristic to extract main content or lists
            // In a real implementation, this would be more robust selector logic
            const articles = Array.from(document.querySelectorAll('article, main, .content'));
            const contentCandidates = articles.length > 0 ? articles : [document.body];

            const results: CollectedData[] = [];

            contentCandidates.forEach((element) => {
                // Remove scripts and styles
                const clone = element.cloneNode(true) as Element;
                clone.querySelectorAll('script, style, nav, footer').forEach(e => e.remove());

                const text = clone.textContent?.trim();

                // Naive splitting by paragraphs or list items to find "requirements"
                // Ideally, we pass the whole text to LLM, but let's chunk it a bit if huge.
                if (text && text.length > 100) {
                    results.push({
                        content: text,
                        source: 'WebPage',
                        sourceUrl: targetUrl,
                        sourceType: 'Documentation',
                        title: document.title
                    });
                }
            });

            return results;
        } catch (error) {
            console.error(`Failed to collect from ${targetUrl}`, error);
            return [];
        }
    }
}
