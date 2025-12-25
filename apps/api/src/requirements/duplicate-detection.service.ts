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
     * Scan existing requirements for duplicates and optionally deprecate them
     * @param deprecate - If true, mark duplicates as DEPRECATED
     * @returns Summary of duplicates found and actions taken
     */
    async scanExistingDuplicates(deprecate: boolean = false) {
        const requirements = await this.prisma.requirement.findMany({
            where: { status: { not: 'DEPRECATED' } },
            orderBy: { createdAt: 'asc' }, // Keep earliest, deprecate later ones
            select: { id: true, code: true, title: true, content: true, createdAt: true }
        });

        const duplicateGroups: {
            originalId: string;
            originalCode: string;
            duplicates: { id: string; code: string; similarity: number }[]
        }[] = [];

        const processedIds = new Set<string>();
        let deprecatedCount = 0;

        for (let i = 0; i < requirements.length; i++) {
            const original = requirements[i];
            if (processedIds.has(original.id)) continue;

            const duplicatesForThis: { id: string; code: string; similarity: number }[] = [];
            const normalizedOriginalTitle = this.normalizeText(original.title);
            const normalizedOriginalContent = this.normalizeText(original.content);

            for (let j = i + 1; j < requirements.length; j++) {
                const candidate = requirements[j];
                if (processedIds.has(candidate.id)) continue;

                // Check title similarity
                const titleSim = this.calculateSimilarity(normalizedOriginalTitle, this.normalizeText(candidate.title));
                if (titleSim >= 0.85) {
                    duplicatesForThis.push({ id: candidate.id, code: candidate.code, similarity: titleSim });
                    processedIds.add(candidate.id);
                    continue;
                }

                // Check content similarity
                const contentSim = this.calculateSimilarity(normalizedOriginalContent, this.normalizeText(candidate.content));
                if (contentSim >= 0.80) {
                    duplicatesForThis.push({ id: candidate.id, code: candidate.code, similarity: contentSim });
                    processedIds.add(candidate.id);
                }
            }

            if (duplicatesForThis.length > 0) {
                duplicateGroups.push({
                    originalId: original.id,
                    originalCode: original.code,
                    duplicates: duplicatesForThis
                });

                // Deprecate the duplicates if requested
                if (deprecate) {
                    for (const dup of duplicatesForThis) {
                        await this.prisma.requirement.update({
                            where: { id: dup.id },
                            data: { status: 'DEPRECATED' }
                        });
                        deprecatedCount++;
                    }
                }
            }

            processedIds.add(original.id);
        }

        const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
        return {
            message: deprecate
                ? `${totalDuplicates}건 중복 발견, ${deprecatedCount}건 폐기됨`
                : `${totalDuplicates}건 중복 발견 (${duplicateGroups.length}개 그룹)`,
            totalDuplicates,
            deprecatedCount,
            groups: duplicateGroups
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
     * Calculate combined similarity score using multiple algorithms
     * @returns weighted average of Jaccard, Levenshtein, and N-gram scores
     */
    private calculateSimilarity(a: string, b: string): number {
        if (!a || !b) return 0;
        if (a === b) return 1.0;

        // 1. Jaccard similarity (word-level)
        const jaccardScore = this.jaccardSimilarity(a, b);

        // 2. Levenshtein similarity (character-level edit distance)
        const levenshteinScore = this.levenshteinSimilarity(a, b);

        // 3. N-gram similarity (character n-grams for fuzzy matching)
        const ngramScore = this.ngramSimilarity(a, b, 3);

        // Weighted average: Jaccard 40%, Levenshtein 30%, N-gram 30%
        const combinedScore = (jaccardScore * 0.4) + (levenshteinScore * 0.3) + (ngramScore * 0.3);

        return combinedScore;
    }

    /**
     * Jaccard similarity (word-level overlap)
     */
    private jaccardSimilarity(a: string, b: string): number {
        const setA = new Set(a.split(' ').filter(w => w.length > 0));
        const setB = new Set(b.split(' ').filter(w => w.length > 0));

        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);

        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }

    /**
     * Levenshtein similarity (edit distance based)
     */
    private levenshteinSimilarity(a: string, b: string): number {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1.0;

        const distance = this.levenshteinDistance(a, b);
        return 1 - (distance / maxLen);
    }

    /**
     * Calculate Levenshtein edit distance
     */
    private levenshteinDistance(a: string, b: string): number {
        // Truncate for performance (limit to first 500 chars)
        const s1 = a.slice(0, 500);
        const s2 = b.slice(0, 500);

        const m = s1.length;
        const n = s2.length;

        // Use only two rows for space efficiency
        let prev = Array(n + 1).fill(0).map((_, i) => i);
        let curr = Array(n + 1).fill(0);

        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            for (let j = 1; j <= n; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                curr[j] = Math.min(
                    prev[j] + 1,      // deletion
                    curr[j - 1] + 1,  // insertion
                    prev[j - 1] + cost // substitution
                );
            }
            [prev, curr] = [curr, prev];
        }

        return prev[n];
    }

    /**
     * N-gram similarity (character-level)
     */
    private ngramSimilarity(a: string, b: string, n: number = 3): number {
        const ngramsA = this.getNgrams(a, n);
        const ngramsB = this.getNgrams(b, n);

        if (ngramsA.size === 0 || ngramsB.size === 0) return 0;

        const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
        const union = new Set([...ngramsA, ...ngramsB]);

        return intersection.size / union.size;
    }

    /**
     * Generate n-grams from text
     */
    private getNgrams(text: string, n: number): Set<string> {
        const ngrams = new Set<string>();
        const cleaned = text.replace(/\s+/g, ''); // Remove spaces for character-level ngrams

        for (let i = 0; i <= cleaned.length - n; i++) {
            ngrams.add(cleaned.slice(i, i + n));
        }

        return ngrams;
    }

    /**
     * Get detailed similarity breakdown for debugging/display
     */
    async getSimilarityDetails(reqId1: string, reqId2: string) {
        const [req1, req2] = await Promise.all([
            this.prisma.requirement.findUnique({ where: { id: reqId1 }, select: { title: true, content: true } }),
            this.prisma.requirement.findUnique({ where: { id: reqId2 }, select: { title: true, content: true } })
        ]);

        if (!req1 || !req2) return null;

        const normTitle1 = this.normalizeText(req1.title);
        const normTitle2 = this.normalizeText(req2.title);
        const normContent1 = this.normalizeText(req1.content);
        const normContent2 = this.normalizeText(req2.content);

        return {
            title: {
                jaccard: this.jaccardSimilarity(normTitle1, normTitle2),
                levenshtein: this.levenshteinSimilarity(normTitle1, normTitle2),
                ngram: this.ngramSimilarity(normTitle1, normTitle2, 3),
                combined: this.calculateSimilarity(normTitle1, normTitle2)
            },
            content: {
                jaccard: this.jaccardSimilarity(normContent1, normContent2),
                levenshtein: this.levenshteinSimilarity(normContent1, normContent2),
                ngram: this.ngramSimilarity(normContent1, normContent2, 3),
                combined: this.calculateSimilarity(normContent1, normContent2)
            }
        };
    }
}
