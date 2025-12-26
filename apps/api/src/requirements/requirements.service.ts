import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';
import { ClassificationService } from '../classification/classification.service';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private prisma: PrismaService,
    private aiManager: AiProviderManager,
    private aiService: AiService,
    private classificationService: ClassificationService
  ) { }

  async create(data: any) {
    // 1. Standardize Content & Title (AI)
    const standardizedTitle = await this.aiService.translateToKorean(data.title); // Ensure Korean
    const standardizedContent = await this.aiService.standardizeRequirement(data.content);

    // 2. Auto-Classify (AI)
    // Combine title and content for better context
    const classificationResult = await this.classificationService.classifyRequirement(`${standardizedTitle}\n${standardizedContent}`);

    // Connect categories
    const categoryConnect = classificationResult.suggestedCategories.map(c => ({ id: c.id }));

    // 3. Create Requirement
    // Extract explicitly to avoid Prisma error with unknown fields like 'userId'
    const { userId, code, businessId, functionId, menuId, parentId, sourceId, ...otherData } = data;

    const requirement = await this.prisma.requirement.create({
      data: {
        code: code || `REQ-${Date.now()}`, // Ensure code exists
        title: standardizedTitle,
        content: standardizedContent,
        status: 'DRAFT',
        version: 1,

        // Optional Relations
        businessId: businessId || undefined,
        functionId: functionId || undefined,
        menuId: menuId || undefined,
        parentId: parentId || undefined,
        sourceId: sourceId || undefined,

        // categories: { // DEPRECATED
        //   connect: categoryConnect
        // },
        classifications: {
          create: categoryConnect.map(c => ({
            categoryId: c.id,
            source: 'AI', // Default for auto-creation
            confidence: classificationResult.confidence
          }))
        },
        trustGrade: classificationResult.confidence,
        aiMetadata: {
          create: {
            reasoning: classificationResult.reasoning,
            biasScore: 0 // Mock
          }
        },
        // creatorId needs to be handled via Auth context usually, defaulting or passed in data
        creator: { connect: { id: userId || 'system' } } // Fallback for now
      }
    });

    // Trigger operational checks asynchronously
    this.checkTriggers(requirement.id);

    return requirement;
  }

  async checkTriggers(requirementId: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { qualityMetric: true }
    });

    if (!req) return;

    // Trigger 1: Low Confidence / Quality -> Review
    if (req.trustGrade < 0.8 || (req.qualityMetric && req.qualityMetric.overallScore < 70)) {
      await this.prisma.operationQueue.create({
        data: {
          type: 'REVIEW',
          status: 'PENDING',
          priority: 1, // Medium
          targetId: req.id,
          targetType: 'Requirement',
          reason: 'Low confidence score detected'
        }
      });
    }

    // Trigger 2: Duplicate Detection (Simulated)
    // In real app, check vector DB or title similarity
    const existing = await this.prisma.requirement.findFirst({
      where: {
        title: req.title,
        id: { not: req.id }
      }
    });

    if (existing) {
      await this.prisma.operationQueue.create({
        data: {
          type: 'CONFLICT_RESOLUTION',
          status: 'PENDING',
          priority: 2, // High
          targetId: req.id,
          targetType: 'Requirement',
          reason: `Potential duplicate of ${existing.code}`
        }
      });
    }
  }

  async findAll(params: { 
    status?: string, 
    search?: string, 
    category?: string, 
    page: number, 
    limit: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    dateFrom?: string,
    dateTo?: string,
    trustMin?: number,
    businessId?: string,
  } = { page: 1, limit: 100 }) {
    const { status, search, category, page, limit, sortBy, sortOrder, dateFrom, dateTo, trustMin, businessId } = params;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by category (via classifications relation)
    if (category) {
      where.classifications = {
        some: {
          category: {
            name: { contains: category, mode: 'insensitive' }
          }
        }
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Trust grade filter
    if (trustMin !== undefined) {
      where.trustGrade = { gte: trustMin };
    }

    // Business filter
    if (businessId) {
      where.businessId = businessId;
    }

    // Dynamic sorting
    const orderByField = sortBy || 'updatedAt';
    const orderByDirection = sortOrder || 'desc';
    const orderBy: any = {};
    
    // Support nested sorting (e.g., trustGrade, code)
    if (['code', 'title', 'status', 'trustGrade', 'createdAt', 'updatedAt', 'version'].includes(orderByField)) {
      orderBy[orderByField] = orderByDirection;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.requirement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          business: true,
          function: true,
          menu: true,
          // categories: true, // DEPRECATED
          classifications: {
            include: { category: true }
          },
          aiMetadata: true,
          qualityMetric: true,
        }
      }),
      this.prisma.requirement.count({ where })
    ]);

    return { 
      data, 
      total, 
      page, 
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async findOne(id: string) {
    return this.prisma.requirement.findUnique({
      where: { id },
      include: {
        business: true,
        function: true,
        menu: true,
        classifications: {
          include: { category: true }
        },
        history: {
          include: { changer: { select: { email: true } } }
        },
        qualityMetric: true,
        aiMetadata: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { email: true, id: true } } }
        }
      }
    });
  }

  async update(id: string, data: any) {
    // In a real app, we would create a history entry here
    // For now, simple update
    return this.prisma.requirement.update({
      where: { id },
      data
    });
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    return this.prisma.requirement.updateMany({
      where: { id: { in: ids } },
      data: { status: status as any }
    });
  }

  async bulkDelete(ids: string[]) {
    // Delete related records first
    await this.prisma.aiMetadata.deleteMany({ where: { requirementId: { in: ids } } });
    await this.prisma.requirementHistory.deleteMany({ where: { requirementId: { in: ids } } });
    await this.prisma.qualityMetric.deleteMany({ where: { requirementId: { in: ids } } });
    await this.prisma.comment.deleteMany({ where: { requirementId: { in: ids } } });

    const result = await this.prisma.requirement.deleteMany({
      where: { id: { in: ids } }
    });

    return { deleted: result.count };
  }

  // --- Clone & Import ---

  /**
   * Clone an existing requirement with a new code
   */
  async cloneRequirement(id: string, options: { newCode?: string; includeComments?: boolean } = {}) {
    const original = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        business: true,
        function: true,
        menu: true,
      }
    });

    if (!original) {
      throw new Error('Requirement not found');
    }

    const newCode = options.newCode || `${original.code}-COPY-${Date.now()}`;

    // Create cloned requirement
    const cloned = await this.prisma.requirement.create({
      data: {
        code: newCode,
        title: `[복제] ${original.title}`,
        content: original.content,
        status: 'DRAFT',
        version: 1,
        businessId: original.businessId,
        functionId: original.functionId,
        menuId: original.menuId,
        parentId: original.parentId,
        creatorId: original.creatorId,
        trustGrade: original.trustGrade,
        maturity: 'DRAFT',
        isAtomic: original.isAtomic,
        hasCondition: original.hasCondition,
        isTestable: original.isTestable,
      }
    });

    return {
      originalId: id,
      clonedId: cloned.id,
      clonedCode: cloned.code,
      message: `요건이 성공적으로 복제되었습니다.`
    };
  }

  /**
   * Bulk import requirements from parsed CSV data
   */
  async bulkImport(items: { title: string; content: string; status?: string; businessName?: string }[], creatorId: string) {
    const results: { success: number; failed: number; errors: { row: number; error: string }[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Basic validation
        if (!item.title || item.title.length < 2) {
          throw new Error('제목은 최소 2자 이상이어야 합니다.');
        }
        if (!item.content || item.content.length < 10) {
          throw new Error('내용은 최소 10자 이상이어야 합니다.');
        }

        // Find business by name if provided
        let businessId: string | undefined;
        if (item.businessName) {
          const business = await this.prisma.business.findFirst({
            where: { name: { contains: item.businessName, mode: 'insensitive' } }
          });
          if (business) businessId = business.id;
        }

        // Create requirement
        await this.prisma.requirement.create({
          data: {
            code: `REQ-IMP-${Date.now()}-${i}`,
            title: item.title,
            content: item.content,
            status: (item.status as any) || 'DRAFT',
            version: 1,
            businessId,
            creatorId,
            trustGrade: 0.5,
            maturity: 'DRAFT',
          }
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ row: i + 1, error: error.message || String(error) });
      }
    }

    return {
      ...results,
      message: `${results.success}건 가져오기 성공, ${results.failed}건 실패`
    };
  }

  /**
   * Bulk assign category to multiple requirements
   */
  async bulkAssignCategory(ids: string[], categoryId: string) {
    const results = { success: 0, failed: 0 };

    for (const id of ids) {
      try {
        // Check if classification already exists
        const existing = await this.prisma.requirementClassification.findFirst({
          where: { requirementId: id, categoryId }
        });

        if (!existing) {
          await this.prisma.requirementClassification.create({
            data: {
              requirementId: id,
              categoryId,
              source: 'HUMAN',
              confidence: 1.0
            }
          });
          results.success++;
        } else {
          results.success++; // Already exists, count as success
        }
      } catch {
        results.failed++;
      }
    }

    return {
      ...results,
      message: `${results.success}건 분류 할당 완료`
    };
  }

  // --- Comments & Sentiment ---

  async addComment(requirementId: string, content: string, userId: string) {
    // 1. Analyze Sentiment
    let sentiment = 'NEUTRAL';
    let sentimentScore = 0.5;

    try {
      const response = await this.aiManager.execute({
        messages: [{
          role: 'user',
          content: `Analyze the sentiment of this comment. Return strictly JSON: { "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "score": 0.0-1.0 }. Comment: "${content}"`
        }],
        responseFormat: 'json_object',
        temperature: 0,
      }, 'SENTIMENT_ANALYSIS');

      const result = JSON.parse(response.content || '{}');
      sentiment = result.sentiment || 'NEUTRAL';
      sentimentScore = result.score || 0.5;

    } catch (e) {
      this.logger.error('Sentiment Analysis failed', e);
    }

    // 2. Resolve Author (Handle 'system' or missing ID)
    let authorId = userId;
    if (!authorId || authorId === 'system') {
      const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (admin) {
        authorId = admin.id;
      } else {
        const anyUser = await this.prisma.user.findFirst();
        if (anyUser) {
          authorId = anyUser.id;
        } else {
          const systemUser = await this.prisma.user.create({
            data: {
              email: 'system-comment@specflow.ai',
              name: 'System Agent',
              password: 'hashed_placeholder',
              role: 'ADMIN'
            }
          });
          authorId = systemUser.id;
        }
      }
    }

    // 3. Save Comment
    return this.prisma.comment.create({
      data: {
        content,
        requirementId,
        authorId: authorId,
        sentiment,
        sentimentScore
      },
      include: { author: { select: { email: true } } }
    });
  }

  async getComments(requirementId: string) {
    return this.prisma.comment.findMany({
      where: { requirementId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { email: true } } }
    });
  }
  async remove(id: string) {
    // Delete related records first to avoid FK constraint errors
    await this.prisma.aiMetadata.deleteMany({ where: { requirementId: id } });
    await this.prisma.requirementHistory.deleteMany({ where: { requirementId: id } });
    await this.prisma.qualityMetric.deleteMany({ where: { requirementId: id } });
    await this.prisma.comment.deleteMany({ where: { requirementId: id } });

    return this.prisma.requirement.delete({
      where: { id }
    });
  }

  /**
   * Get AI-powered improvement suggestions for requirement content
   */
  async getAiImprovement(content: string) {
    const prompt = `당신은 요건 정의 문서 전문가입니다. 다음 요건을 분석하고 개선된 버전을 제안해주세요.

원문:
${content}

다음 형식으로 JSON을 반환해주세요:
{
  "improved": "개선된 요건 내용 (표준어휘 사용, 모호성 제거, 예외 처리 명시)",
  "reason": "개선 이유 설명 (1-2문장)",
  "changes": ["변경사항1", "변경사항2"]
}

개선 시 고려사항:
1. '해야 한다' → '하여야 한다' 등 표준 표현 사용
2. 모호한 표현 구체화
3. 예외 상황 처리 조항 추가
4. 측정 가능한 기준 명시

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 0.3
      }, 'REQUIREMENT_IMPROVEMENT');

      // Parse JSON response
      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if no JSON found
      return {
        improved: text,
        reason: 'AI가 개선 제안을 생성했습니다.',
        changes: []
      };
    } catch (error) {
      this.logger.error('AI improvement failed', error);
      throw error;
    }
  }

  // --- Statistics ---

  /**
   * Get comprehensive statistics for requirements dashboard
   */
  async getStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get counts by status
    const statusCounts = await this.prisma.requirement.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const byStatus = {
      DRAFT: 0,
      REVIEW: 0,
      APPROVED: 0,
      DEPRECATED: 0
    };

    for (const item of statusCounts) {
      if (item.status in byStatus) {
        byStatus[item.status as keyof typeof byStatus] = item._count.id;
      }
    }

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    // Get counts by category (via classifications)
    const categoryStats = await this.prisma.requirementClassification.groupBy({
      by: ['categoryId'],
      _count: { requirementId: true }
    });

    const categoryIds = categoryStats.map(s => s.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });

    const byCategory = categoryStats.map(stat => {
      const cat = categories.find(c => c.id === stat.categoryId);
      return {
        name: cat?.name || 'Unknown',
        count: stat._count.requirementId
      };
    }).sort((a, b) => b.count - a.count);

    // Recent activity (last 7 days)
    const [recentCreated, recentUpdated] = await Promise.all([
      this.prisma.requirement.count({
        where: { createdAt: { gte: sevenDaysAgo } }
      }),
      this.prisma.requirement.count({
        where: {
          updatedAt: { gte: sevenDaysAgo },
          createdAt: { lt: sevenDaysAgo }
        }
      })
    ]);

    // Quality metrics
    const qualityData = await this.prisma.requirement.aggregate({
      _avg: { trustGrade: true },
      _count: { id: true }
    });

    const lowQualityCount = await this.prisma.requirement.count({
      where: { trustGrade: { lt: 0.7 } }
    });

    return {
      total,
      byStatus,
      byCategory,
      recentActivity: {
        created: recentCreated,
        updated: recentUpdated,
        period: 'last7days'
      },
      qualityMetrics: {
        avgTrustScore: qualityData._avg.trustGrade || 0,
        lowQualityCount
      }
    };
  }

  // --- Related Requirements ---

  /**
   * Find related requirements based on similarity
   */
  async getRelatedRequirements(id: string, limit = 5, threshold = 0.6) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, title: true, content: true }
    });

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    // Get all other requirements
    const others = await this.prisma.requirement.findMany({
      where: { id: { not: id } },
      select: { id: true, code: true, title: true, content: true },
      take: 200,
      orderBy: { updatedAt: 'desc' }
    });

    const normalizedTitle = this.normalizeText(requirement.title);
    const normalizedContent = this.normalizeText(requirement.content);

    const scored = others.map(other => {
      const titleSim = this.calculateSimilarity(normalizedTitle, this.normalizeText(other.title));
      const contentSim = this.calculateSimilarity(normalizedContent, this.normalizeText(other.content));

      // Weight: title 60%, content 40%
      const combined = titleSim * 0.6 + contentSim * 0.4;

      return {
        id: other.id,
        code: other.code,
        title: other.title,
        similarity: Math.round(combined * 100) / 100,
        matchType: titleSim > contentSim ? 'TITLE' as const : 'CONTENT' as const
      };
    });

    return scored
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // --- Timeline ---

  /**
   * Get timeline of changes for a requirement
   */
  async getTimeline(id: string) {
    const [requirement, history, comments] = await Promise.all([
      this.prisma.requirement.findUnique({
        where: { id },
        select: { createdAt: true, creator: { select: { email: true } } }
      }),
      this.prisma.requirementHistory.findMany({
        where: { requirementId: id },
        orderBy: { createdAt: 'desc' },
        include: { changer: { select: { email: true } } }
      }),
      this.prisma.comment.findMany({
        where: { requirementId: id },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { email: true } } }
      })
    ]);

    const timeline: any[] = [];

    // Creation event
    if (requirement) {
      timeline.push({
        action: 'CREATED',
        timestamp: requirement.createdAt,
        userEmail: requirement.creator?.email || 'system',
        details: {}
      });
    }

    // History events
    for (const h of history) {
      timeline.push({
        id: h.id,
        action: 'UPDATED',
        timestamp: h.createdAt,
        userEmail: h.changer?.email || 'system',
        details: { field: h.field },
        previousValue: h.oldValue,
        newValue: h.newValue
      });
    }

    // Comment events
    for (const c of comments) {
      timeline.push({
        action: 'COMMENTED',
        timestamp: c.createdAt,
        userEmail: c.author?.email || 'anonymous',
        details: { content: c.content.substring(0, 100) }
      });
    }

    // Sort by timestamp desc
    return timeline.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // --- Export ---

  /**
   * Export requirements to CSV format
   */
  async exportToCsv(params: { status?: string; category?: string } = {}) {
    const where: any = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.category) {
      where.classifications = {
        some: {
          category: { name: { contains: params.category, mode: 'insensitive' } }
        }
      };
    }

    const requirements = await this.prisma.requirement.findMany({
      where,
      include: {
        business: true,
        classifications: { include: { category: true } }
      },
      orderBy: { code: 'asc' }
    });

    // Build CSV
    const headers = ['code', 'title', 'content', 'status', 'trustGrade', 'business', 'categories', 'createdAt', 'updatedAt'];
    const rows = requirements.map(req => [
      req.code,
      `"${req.title.replace(/"/g, '""')}"`,
      `"${req.content.replace(/"/g, '""').substring(0, 500)}"`,
      req.status,
      req.trustGrade?.toFixed(2) || '0',
      req.business?.name || '',
      req.classifications.map(c => c.category.name).join(';'),
      req.createdAt.toISOString(),
      req.updatedAt.toISOString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return {
      data: csv,
      filename: `requirements_export_${new Date().toISOString().split('T')[0]}.csv`,
      count: requirements.length
    };
  }

  // --- Helper Methods ---

  private normalizeText(text: string): string {
    return text
      ?.toLowerCase()
      .replace(/[\s\-_]+/g, ' ')
      .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '')
      .trim() || '';
  }

  private calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1.0;

    // Jaccard similarity (word-level)
    const setA = new Set(a.split(' ').filter(w => w.length > 0));
    const setB = new Set(b.split(' ').filter(w => w.length > 0));

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
}
