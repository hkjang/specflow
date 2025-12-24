import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrawlersService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.CrawlerCreateInput) {
        return this.prisma.crawler.create({ data });
    }

    findAll() {
        return this.prisma.crawler.findMany();
    }

    findOne(id: string) {
        return this.prisma.crawler.findUnique({ where: { id } });
    }

    update(id: string, data: Prisma.CrawlerUpdateInput) {
        return this.prisma.crawler.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.crawler.delete({ where: { id } });
    }

    // --- Phase 2: Crawler Logic ---
    async crawlRegulation(url: string, name: string) {
        // Mocking Request
        console.log(`Crawling ${url}...`);

        // Simulated Content from "National Law Information Center"
        const mockHtmlContent = `
            <html>
                <body>
                    <h1>${name}</h1>
                    <div class="article">
                        <h3>Article 1 (Purpose)</h3>
                        <p>The purpose of this Act is to protect the privacy of users.</p>
                    </div>
                    <div class="article">
                        <h3>Article 2 (Definition)</h3>
                        <p>The term "User" means a person who uses the service.</p>
                    </div>
                </body>
            </html>
        `;

        // Save as ExtractionSource
        const source = await this.prisma.extractionSource.create({
            data: {
                type: 'URL',
                content: mockHtmlContent,
                metadata: { url, crawledAt: new Date() }
            }
        });

        // Trigger Extraction Job (Mock)
        // In real flow, this would push to a queue. 
        // Here we just acknowledge.
        return {
            success: true,
            sourceId: source.id,
            message: "Crawled and saved source."
        };
    }
}
