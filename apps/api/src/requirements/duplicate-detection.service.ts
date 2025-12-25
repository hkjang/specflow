import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchType: 'EXACT' | 'SIMILAR' | 'NONE';
    matchedRequirementId?: string;
    matchedRequirementCode?: string;
    similarity?: number;
}

@Injectable()
export class DuplicateDetectionService {
    private readonly logger = new Logger(DuplicateDetectionService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Check if a requirement with similar title or content exists
     * @param title - The title to check
     * @param content - The content to check for deeper similarity
     * @returns DuplicateCheckResult
     */
    async checkDuplicate(title: string, content?: string): Promise<DuplicateCheckResult> {
        // 1. Check for exact title match (case-insensitive)
        const exactMatch = await this.prisma.requirement.findFirst({
            where: {
                title: { equals: title, mode: 'insensitive' }
            },
            select: { id: true, code: true, title: true }
        });

        if (exactMatch) {
            this.logger.debug(`Exact title match found: "${title}"`);
            return {
                isDuplicate: true,
                matchType: 'EXACT',
                matchedRequirementId: exactMatch.id,
                matchedRequirementCode: exactMatch.code,
                similarity: 1.0
            };
        }

        // 2. Get recent requirements for similarity check (limit for performance)
        const recentRequirements = await this.prisma.requirement.findMany({
            take: 500,
            orderBy: { createdAt: 'desc' },
            select: { id: true, code: true, title: true, content: true }
        });

        const normalizedTitle = this.normalizeText(title);
        const normalizedContent = content ? this.normalizeText(content) : '';

        for (const req of recentRequirements) {
            // 3. Check title similarity (threshold: 85%)
            const titleSimilarity = this.calculateSimilarity(normalizedTitle, this.normalizeText(req.title));

            if (titleSimilarity >= 0.85) {
                this.logger.debug(`Similar title (${Math.round(titleSimilarity * 100)}%): "${req.title}"`);
                return {
                    isDuplicate: true,
                    matchType: 'SIMILAR',
                    matchedRequirementId: req.id,
                    matchedRequirementCode: req.code,
                    similarity: titleSimilarity
                };
            }

            // 4. Check content similarity if content provided (threshold: 80%)
            if (content && req.content) {
                const contentSimilarity = this.calculateSimilarity(normalizedContent, this.normalizeText(req.content));

                if (contentSimilarity >= 0.80) {
                    this.logger.debug(`Similar content (${Math.round(contentSimilarity * 100)}%): "${req.code}"`);
                    return {
                        isDuplicate: true,
                        matchType: 'SIMILAR',
                        matchedRequirementId: req.id,
                        matchedRequirementCode: req.code,
                        similarity: contentSimilarity
                    };
                }
            }
        }

        return {
            isDuplicate: false,
            matchType: 'NONE'
        };
    }

    /**
     * Batch check for duplicates
     */
    async batchCheckDuplicates(items: { title: string; content?: string }[]): Promise<Map<number, DuplicateCheckResult>> {
        const results = new Map<number, DuplicateCheckResult>();

        for (let i = 0; i < items.length; i++) {
            const result = await this.checkDuplicate(items[i].title, items[i].content);
            results.set(i, result);
        }

        return results;
    }

    /**
     * Normalize text for comparison
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .replace(/[\s\-_]+/g, ' ') // Normalize whitespace and separators
            .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '') // Remove special characters (keeping Korean)
            .trim();
    }

    /**
     * Calculate Jaccard similarity between two strings
     */
    private calculateSimilarity(a: string, b: string): number {
        const setA = new Set(a.split(' '));
        const setB = new Set(b.split(' '));

        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);

        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }
}
