import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrawlersService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.CrawlerCreateInput) {
        return this.prisma.crawler.create({ data });
    }

    findAll() {
        return this.prisma.crawler.findMany({
            include: {
                history: {
                    take: 5,
                    orderBy: { startedAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    findOne(id: string) {
        return this.prisma.crawler.findUnique({ 
            where: { id },
            include: {
                history: {
                    take: 10,
                    orderBy: { startedAt: 'desc' }
                }
            }
        });
    }

    update(id: string, data: Prisma.CrawlerUpdateInput) {
        return this.prisma.crawler.update({ where: { id }, data });
    }

    async remove(id: string) {
        // Delete history first, then crawler
        await this.prisma.crawlHistory.deleteMany({ where: { crawlerId: id }});
        return this.prisma.crawler.delete({ where: { id } });
    }
    
    // --- History API ---
    async getHistory(crawlerId?: string, limit = 50) {
        return this.prisma.crawlHistory.findMany({
            where: crawlerId ? { crawlerId } : {},
            include: {
                crawler: {
                    select: { id: true, name: true, url: true, category: true }
                }
            },
            orderBy: { startedAt: 'desc' },
            take: limit
        });
    }
    
    async getHistoryStats() {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const [todayRuns, weeklyRuns, totalSuccess, totalFailed] = await Promise.all([
            this.prisma.crawlHistory.count({ where: { startedAt: { gte: oneDayAgo } } }),
            this.prisma.crawlHistory.count({ where: { startedAt: { gte: oneWeekAgo } } }),
            this.prisma.crawlHistory.count({ where: { status: 'SUCCESS' } }),
            this.prisma.crawlHistory.count({ where: { status: 'FAILED' } })
        ]);
        
        // Get recent success rate
        const recentRuns = await this.prisma.crawlHistory.findMany({
            where: { startedAt: { gte: oneWeekAgo } },
            select: { status: true }
        });
        const successRate = recentRuns.length > 0 
            ? Math.round((recentRuns.filter(r => r.status === 'SUCCESS').length / recentRuns.length) * 100)
            : 0;
        
        return {
            todayRuns,
            weeklyRuns,
            totalSuccess,
            totalFailed,
            successRate
        };
    }
    
    // --- Collected Data API ---
    async getCollectedData(limit = 50) {
        return this.prisma.extractionSource.findMany({
            where: { type: 'URL' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                type: true,
                metadata: true,
                createdAt: true,
                content: false // Exclude content for list view
            }
        });
    }
    
    async getCollectedDataById(id: string) {
        return this.prisma.extractionSource.findUnique({
            where: { id },
            include: {
                jobs: { take: 5 },
                drafts: { take: 10 }
            }
        });
    }

    // --- Run Crawler (with History Recording) ---
    async runCrawler(id: string) {
        const crawler = await this.prisma.crawler.findUnique({ where: { id } });
        if (!crawler) throw new NotFoundException('Crawler not found');
        
        const startTime = new Date();
        let status = 'SUCCESS';
        let pagesFound = 0;
        let itemsExtracted = 0;
        let errorMessage: string | null = null;
        let duration = 0;
        
        try {
            console.log(`[CRAWL] Starting: ${crawler.name} @ ${crawler.url}`);
            
            // Simulate crawling with random results
            const crawlDuration = 2000 + Math.floor(Math.random() * 3000);
            await new Promise(resolve => setTimeout(resolve, crawlDuration));
            
            // Random success/failure (90% success rate)
            const isSuccess = Math.random() > 0.1;
            
            if (isSuccess) {
                pagesFound = 5 + Math.floor(Math.random() * 20);
                itemsExtracted = 1 + Math.floor(Math.random() * 10);
                
                // Create ExtractionSource with crawled content
                const mockContent = this.generateMockContent(crawler.name, crawler.url);
                await this.prisma.extractionSource.create({
                    data: {
                        type: 'URL',
                        content: mockContent,
                        metadata: { 
                            url: crawler.url, 
                            crawlerName: crawler.name,
                            crawledAt: new Date().toISOString(),
                            pagesFound,
                            itemsExtracted
                        }
                    }
                });
                
                status = 'SUCCESS';
            } else {
                status = 'FAILED';
                errorMessage = this.getRandomError();
            }
            
            duration = Date.now() - startTime.getTime();
            
        } catch (err: any) {
            status = 'FAILED';
            errorMessage = err.message || 'Unknown error';
            duration = Date.now() - startTime.getTime();
        }
        
        // Create history record
        const history = await this.prisma.crawlHistory.create({
            data: {
                crawlerId: id,
                status,
                duration,
                pagesFound,
                itemsExtracted,
                errorMessage,
                startedAt: startTime,
                completedAt: new Date()
            }
        });
        
        // Update crawler stats
        await this.prisma.crawler.update({
            where: { id },
            data: {
                lastRunAt: new Date(),
                successCount: status === 'SUCCESS' 
                    ? { increment: 1 } 
                    : undefined,
                errorCount: status === 'FAILED' 
                    ? { increment: 1 } 
                    : undefined
            }
        });
        
        console.log(`[CRAWL] Completed: ${crawler.name} - ${status} (${duration}ms, ${itemsExtracted} items)`);
        
        return {
            success: status === 'SUCCESS',
            historyId: history.id,
            duration,
            pagesFound,
            itemsExtracted,
            errorMessage,
            message: status === 'SUCCESS' 
                ? `${crawler.name} 수집 완료: ${itemsExtracted}건 추출` 
                : `${crawler.name} 수집 실패: ${errorMessage}`
        };
    }
    
    private generateMockContent(name: string, url: string): string {
        const articleTitles = [
            '제1조 (목적)',
            '제2조 (정의)',
            '제3조 (적용범위)',
            '제4조 (기본원칙)',
            '제5조 (의무사항)'
        ];
        
        const contents = articleTitles.slice(0, 2 + Math.floor(Math.random() * 3)).map(title => `
            <div class="article">
                <h3>${title}</h3>
                <p>${name}에 관한 규정 내용입니다. 본 조항은 ${url}에서 수집되었습니다.</p>
            </div>
        `).join('');
        
        return `
            <html>
                <head><title>${name}</title></head>
                <body>
                    <h1>${name}</h1>
                    <p class="source">출처: ${url}</p>
                    <p class="crawled-at">수집일시: ${new Date().toLocaleString('ko-KR')}</p>
                    ${contents}
                </body>
            </html>
        `;
    }
    
    private getRandomError(): string {
        const errors = [
            'Connection timeout after 30 seconds',
            'HTTP 503 Service Unavailable',
            'SSL certificate verification failed',
            'Rate limit exceeded (429)',
            'Page structure changed - selectors not found'
        ];
        return errors[Math.floor(Math.random() * errors.length)];
    }
}
