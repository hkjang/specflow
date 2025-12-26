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
        // classifications: { // TODO: Add RequirementClassification model to Prisma
        //   create: categoryConnect.map(c => ({
        //     categoryId: c.id,
        //     source: 'AI',
        //     confidence: classificationResult.confidence
        //   }))
        // },
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
          // classifications: { // TODO: Add RequirementClassification model
          //   include: { category: true }
          // },
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
   * Bulk assign category to multiple requirements (stub - requires RequirementClassification model)
   */
  async bulkAssignCategory(ids: string[], categoryId: string) {
    // TODO: Uncomment when RequirementClassification model is added to Prisma
    // const results = { success: 0, failed: 0 };
    // for (const id of ids) {
    //   const existing = await this.prisma.requirementClassification.findFirst({...});
    //   if (!existing) await this.prisma.requirementClassification.create({...});
    // }
    return {
      success: ids.length,
      failed: 0,
      message: `카테고리 할당 기능은 Prisma 스키마 업데이트 후 활성화됩니다.`,
      categoryId
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

    // Get counts by category (stub - requires RequirementClassification model)
    // TODO: Uncomment when RequirementClassification model is added
    // const categoryStats = await this.prisma.requirementClassification.groupBy({...});
    const byCategory: { name: string; count: number }[] = [];

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

  // --- Advanced Features ---

  /**
   * AI-powered comprehensive quality analysis
   */
  async analyzeQuality(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, code: true }
    });

    if (!req) throw new Error('Requirement not found');

    const prompt = `당신은 요건 품질 분석 전문가입니다. 다음 요건을 분석해주세요.

제목: ${req.title}
내용: ${req.content}

다음 JSON 형식으로 분석 결과를 반환하세요:
{
  "scores": {
    "clarity": 0-100,        // 명확성: 애매모호한 표현 없음
    "completeness": 0-100,   // 완전성: 필요한 정보 모두 포함
    "testability": 0-100,    // 테스트가능성: 검증 가능한 기준 제시
    "consistency": 0-100,    // 일관성: 용어와 표현의 일관성
    "atomicity": 0-100       // 원자성: 단일 요건으로 분리 가능
  },
  "overallScore": 0-100,
  "issues": ["이슈1", "이슈2"],
  "suggestions": ["개선제안1", "개선제안2"],
  "keywords": ["주요키워드1", "주요키워드2"]
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 0.2
      }, 'QUALITY_ANALYSIS');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Update quality metric in DB
        await this.prisma.qualityMetric.upsert({
          where: { requirementId: id },
          create: {
            requirementId: id,
            ambiguityScore: 100 - (analysis.scores?.clarity || 0),
            completeness: analysis.scores?.completeness || 0,
            overallScore: analysis.overallScore || 0,
          },
          update: {
            ambiguityScore: 100 - (analysis.scores?.clarity || 0),
            completeness: analysis.scores?.completeness || 0,
            overallScore: analysis.overallScore || 0,
          }
        });

        return { requirementId: id, code: req.code, ...analysis };
      }

      return { requirementId: id, error: 'Failed to parse AI response' };
    } catch (error) {
      this.logger.error('Quality analysis failed', error);
      throw error;
    }
  }

  /**
   * Compare two requirements side-by-side with diff
   */
  async compareRequirements(id1: string, id2: string) {
    const [req1, req2] = await Promise.all([
      this.prisma.requirement.findUnique({
        where: { id: id1 },
        select: { id: true, code: true, title: true, content: true, status: true, trustGrade: true, version: true }
      }),
      this.prisma.requirement.findUnique({
        where: { id: id2 },
        select: { id: true, code: true, title: true, content: true, status: true, trustGrade: true, version: true }
      })
    ]);

    if (!req1 || !req2) throw new Error('One or both requirements not found');

    // Calculate similarity
    const titleSimilarity = this.calculateSimilarity(
      this.normalizeText(req1.title),
      this.normalizeText(req2.title)
    );
    const contentSimilarity = this.calculateSimilarity(
      this.normalizeText(req1.content),
      this.normalizeText(req2.content)
    );

    // Simple word-level diff
    const words1 = req1.content.split(/\s+/);
    const words2 = req2.content.split(/\s+/);
    const wordsSet1 = new Set(words1);
    const wordsSet2 = new Set(words2);
    
    const onlyIn1 = words1.filter(w => !wordsSet2.has(w));
    const onlyIn2 = words2.filter(w => !wordsSet1.has(w));
    const common = words1.filter(w => wordsSet2.has(w));

    return {
      requirement1: req1,
      requirement2: req2,
      similarity: {
        title: Math.round(titleSimilarity * 100),
        content: Math.round(contentSimilarity * 100),
        overall: Math.round((titleSimilarity * 0.4 + contentSimilarity * 0.6) * 100)
      },
      diff: {
        uniqueTo1Count: onlyIn1.length,
        uniqueTo2Count: onlyIn2.length,
        commonCount: common.length,
        uniqueTo1: onlyIn1.slice(0, 20), // Limit for readability
        uniqueTo2: onlyIn2.slice(0, 20)
      }
    };
  }

  /**
   * Merge two requirements into one
   */
  async mergeRequirements(sourceId: string, targetId: string, options: { 
    strategy: 'KEEP_TARGET' | 'KEEP_SOURCE' | 'COMBINE';
    deprecateSource?: boolean;
  } = { strategy: 'COMBINE', deprecateSource: true }) {
    const [source, target] = await Promise.all([
      this.prisma.requirement.findUnique({ where: { id: sourceId } }),
      this.prisma.requirement.findUnique({ where: { id: targetId } })
    ]);

    if (!source || !target) throw new Error('One or both requirements not found');

    let mergedContent: string;
    let mergedTitle: string;

    switch (options.strategy) {
      case 'KEEP_TARGET':
        mergedContent = target.content;
        mergedTitle = target.title;
        break;
      case 'KEEP_SOURCE':
        mergedContent = source.content;
        mergedTitle = source.title;
        break;
      case 'COMBINE':
      default:
        mergedTitle = target.title;
        mergedContent = `${target.content}\n\n--- 병합됨 (${source.code}) ---\n\n${source.content}`;
    }

    // Update target with merged content
    const updated = await this.prisma.requirement.update({
      where: { id: targetId },
      data: {
        content: mergedContent,
        title: mergedTitle,
        version: target.version + 1,
      }
    });

    // Optionally deprecate source
    if (options.deprecateSource) {
      await this.prisma.requirement.update({
        where: { id: sourceId },
        data: { status: 'DEPRECATED' }
      });
    }

    // Create relation
    await this.prisma.requirementRelation.create({
      data: {
        sourceId: sourceId,
        targetId: targetId,
        type: 'DERIVED_FROM',
        reason: `Merged from ${source.code}`
      }
    });

    return {
      mergedId: targetId,
      sourceId: sourceId,
      strategy: options.strategy,
      message: `${source.code}가 ${target.code}에 병합되었습니다.`
    };
  }

  /**
   * Request approval for a requirement
   */
  async requestApproval(id: string, requesterId: string, reviewerId?: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, code: true, status: true }
    });

    if (!req) throw new Error('Requirement not found');

    // Create approval request
    const approval = await this.prisma.approvalRequest.create({
      data: {
        requirementId: id,
        requesterId,
        reviewerId,
        status: 'PENDING'
      }
    });

    // Update requirement status to REVIEW
    await this.prisma.requirement.update({
      where: { id },
      data: { status: 'REVIEW' }
    });

    return {
      approvalId: approval.id,
      requirementCode: req.code,
      status: 'PENDING',
      message: '승인 요청이 생성되었습니다.'
    };
  }

  /**
   * Process approval decision
   */
  async processApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalId },
      include: { requirement: true }
    });

    if (!approval) throw new Error('Approval request not found');

    // Update approval
    await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { 
        status: decision,
        comments: comment
      }
    });

    // Update requirement status
    const newStatus = decision === 'APPROVED' ? 'APPROVED' : 'DRAFT';
    await this.prisma.requirement.update({
      where: { id: approval.requirementId },
      data: { status: newStatus }
    });

    return {
      approvalId,
      decision,
      requirementCode: approval.requirement.code,
      newStatus,
      message: decision === 'APPROVED' ? '요건이 승인되었습니다.' : '요건이 반려되었습니다.'
    };
  }

  /**
   * Batch validate requirements
   */
  async batchValidate(ids: string[]) {
    const results: { id: string; code: string; valid: boolean; issues: string[] }[] = [];

    for (const id of ids) {
      const req = await this.prisma.requirement.findUnique({
        where: { id },
        select: { id: true, code: true, title: true, content: true }
      });

      if (!req) continue;

      const issues: string[] = [];

      // Validation rules
      if (req.title.length < 5) issues.push('제목이 너무 짧습니다 (최소 5자)');
      if (req.content.length < 20) issues.push('내용이 너무 짧습니다 (최소 20자)');
      if (!/[하여야|해야|한다|않는다]/.test(req.content)) issues.push('요건 표현이 명확하지 않습니다');
      if (req.content.includes('등') || req.content.includes('기타')) issues.push('모호한 표현 포함 (등, 기타)');

      results.push({
        id: req.id,
        code: req.code,
        valid: issues.length === 0,
        issues
      });
    }

    const validCount = results.filter(r => r.valid).length;
    return {
      total: results.length,
      valid: validCount,
      invalid: results.length - validCount,
      results
    };
  }

  // --- UX Enhancement Features ---

  /**
   * Get requirement templates by category
   */
  async getTemplates(category?: string) {
    const templates = [
      {
        id: 'func-user',
        category: '기능요건',
        name: '사용자 관리',
        title: '[기능] 사용자 {행위} 기능',
        content: '시스템은 사용자가 {조건}인 경우, {행위}를 수행할 수 있어야 한다.\n\n[예외처리]\n- {예외상황} 시 {대응}을 수행한다.\n\n[제약조건]\n- {제약사항}',
        tags: ['사용자', '기능']
      },
      {
        id: 'func-data',
        category: '기능요건',
        name: '데이터 처리',
        title: '[기능] {데이터} 처리 기능',
        content: '시스템은 {데이터}를 {처리방식}으로 처리하여야 한다.\n\n[입력]\n- {입력데이터}\n\n[출력]\n- {출력데이터}\n\n[성능기준]\n- 처리시간: {N}초 이내',
        tags: ['데이터', '처리']
      },
      {
        id: 'nfr-security',
        category: '비기능요건',
        name: '보안',
        title: '[보안] {보안항목} 요건',
        content: '시스템은 {보안대상}에 대해 {보안수준}의 보안을 제공하여야 한다.\n\n[인증방식]\n- {인증방법}\n\n[암호화]\n- {암호화알고리즘}\n\n[접근통제]\n- {접근통제정책}',
        tags: ['보안', '비기능']
      },
      {
        id: 'nfr-performance',
        category: '비기능요건',
        name: '성능',
        title: '[성능] {성능항목} 요건',
        content: '시스템은 {조건}에서 다음 성능 기준을 만족하여야 한다.\n\n[응답시간]\n- 평균: {N}ms 이내\n- 최대: {M}ms 이내\n\n[처리량]\n- {TPS} TPS 이상\n\n[동시사용자]\n- {동시사용자수}명',
        tags: ['성능', '비기능']
      },
      {
        id: 'interface',
        category: '인터페이스',
        name: 'API 연계',
        title: '[인터페이스] {시스템} 연계',
        content: '시스템은 {외부시스템}과 다음과 같이 연계하여야 한다.\n\n[프로토콜]\n- {프로토콜} (예: REST API, SOAP)\n\n[데이터형식]\n- {데이터형식} (예: JSON, XML)\n\n[연계주기]\n- {연계주기} (예: 실시간, 배치)',
        tags: ['인터페이스', '연계']
      }
    ];

    if (category) {
      return templates.filter(t => t.category.includes(category));
    }
    return templates;
  }

  /**
   * Create requirement from template
   */
  async createFromTemplate(templateId: string, replacements: Record<string, string>, creatorId: string) {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) throw new Error('Template not found');

    let title = template.title;
    let content = template.content;

    // Replace placeholders
    for (const [key, value] of Object.entries(replacements)) {
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      title = title.replace(pattern, value);
      content = content.replace(pattern, value);
    }

    return this.prisma.requirement.create({
      data: {
        code: `REQ-TPL-${Date.now()}`,
        title,
        content,
        status: 'DRAFT',
        version: 1,
        creatorId,
        trustGrade: 0.7,
        maturity: 'DRAFT',
      }
    });
  }

  /**
   * Get version history for a requirement
   */
  async getVersionHistory(id: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, code: true, version: true, title: true, content: true, updatedAt: true }
    });

    if (!requirement) throw new Error('Requirement not found');

    const history = await this.prisma.requirementHistory.findMany({
      where: { requirementId: id },
      orderBy: { version: 'desc' },
      include: { changer: { select: { email: true, name: true } } }
    });

    return {
      current: requirement,
      totalVersions: requirement.version,
      history: history.map(h => ({
        version: h.version,
        field: h.field,
        oldValue: h.oldValue?.substring(0, 200),
        newValue: h.newValue?.substring(0, 200),
        changedAt: h.createdAt,
        changedBy: h.changer?.email
      }))
    };
  }

  /**
   * Get search suggestions based on existing requirements
   */
  async getSearchSuggestions(query: string, limit = 10) {
    if (!query || query.length < 2) return [];

    const requirements = await this.prisma.requirement.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: { id: true, code: true, title: true },
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    return requirements.map(r => ({
      id: r.id,
      code: r.code,
      title: r.title,
      display: `${r.code}: ${r.title.substring(0, 50)}`
    }));
  }

  /**
   * Get recent activity across all requirements
   */
  async getRecentActivity(limit = 20) {
    const [recentRequirements, recentComments, recentApprovals] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: limit
      }),
      this.prisma.comment.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true, content: true, createdAt: true, requirement: { select: { code: true } }, author: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      this.prisma.approvalRequest.findMany({
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true, status: true, updatedAt: true, requirement: { select: { code: true } } },
        orderBy: { updatedAt: 'desc' },
        take: limit
      })
    ]);

    const activities: any[] = [];

    for (const r of recentRequirements) {
      activities.push({
        type: 'REQUIREMENT_UPDATED',
        timestamp: r.updatedAt,
        code: r.code,
        title: r.title,
        status: r.status
      });
    }

    for (const c of recentComments) {
      activities.push({
        type: 'COMMENT_ADDED',
        timestamp: c.createdAt,
        code: c.requirement.code,
        content: c.content.substring(0, 50),
        author: c.author.email
      });
    }

    for (const a of recentApprovals) {
      activities.push({
        type: 'APPROVAL_UPDATE',
        timestamp: a.updatedAt,
        code: a.requirement.code,
        status: a.status
      });
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Auto-extract tags from requirement content
   */
  async extractTags(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { title: true, content: true }
    });

    if (!req) throw new Error('Requirement not found');

    const prompt = `다음 요건에서 주요 키워드/태그를 추출하세요.

제목: ${req.title}
내용: ${req.content}

JSON 형식으로 반환:
{ "tags": ["태그1", "태그2", "태그3"], "category": "기능요건|비기능요건|인터페이스", "domain": "도메인명" }

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 300,
        temperature: 0.1
      }, 'TAG_EXTRACTION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return { requirementId: id, ...JSON.parse(jsonMatch[0]) };
      }
      return { requirementId: id, tags: [], category: 'Unknown', domain: 'Unknown' };
    } catch (error) {
      this.logger.error('Tag extraction failed', error);
      return { requirementId: id, tags: [], error: 'Failed to extract tags' };
    }
  }

  /**
   * Generate executive summary for multiple requirements
   */
  async generateSummary(ids: string[]) {
    const requirements = await this.prisma.requirement.findMany({
      where: { id: { in: ids } },
      select: { code: true, title: true, content: true, status: true }
    });

    if (requirements.length === 0) return { error: 'No requirements found' };

    const reqList = requirements.map(r => `[${r.code}] ${r.title}: ${r.content.substring(0, 200)}`).join('\n');

    const prompt = `다음 요건들의 요약 보고서를 작성하세요.

${reqList}

JSON 형식으로 반환:
{
  "totalCount": ${requirements.length},
  "summary": "전체 요건에 대한 2-3문장 요약",
  "mainThemes": ["주요 테마1", "주요 테마2"],
  "recommendations": ["권고사항1", "권고사항2"]
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.3
      }, 'SUMMARY_GENERATION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { totalCount: requirements.length, summary: 'Summary generation failed' };
    } catch (error) {
      this.logger.error('Summary generation failed', error);
      throw error;
    }
  }

  /**
   * Batch AI enrichment with progress tracking
   */
  async batchEnrichWithProgress(ids: string[]) {
    const results: { id: string; code: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < ids.length; i++) {
      try {
        const req = await this.prisma.requirement.findUnique({
          where: { id: ids[i] },
          select: { id: true, code: true, title: true, content: true }
        });

        if (!req) {
          results.push({ id: ids[i], code: 'N/A', success: false, error: 'Not found' });
          continue;
        }

        // Extract tags and analyze
        await this.extractTags(ids[i]);
        
        results.push({ id: req.id, code: req.code, success: true });
      } catch (error: any) {
        results.push({ id: ids[i], code: 'N/A', success: false, error: error.message });
      }
    }

    return {
      total: ids.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // --- Relation Management ---

  /**
   * Add relation between two requirements
   */
  async addRelation(sourceId: string, targetId: string, type: string, reason?: string) {
    // Validate both exist
    const [source, target] = await Promise.all([
      this.prisma.requirement.findUnique({ where: { id: sourceId }, select: { code: true } }),
      this.prisma.requirement.findUnique({ where: { id: targetId }, select: { code: true } })
    ]);

    if (!source || !target) throw new Error('Source or target requirement not found');

    // Check for existing relation
    const existing = await this.prisma.requirementRelation.findFirst({
      where: { sourceId, targetId }
    });

    if (existing) {
      return { message: 'Relation already exists', relationId: existing.id };
    }

    const relation = await this.prisma.requirementRelation.create({
      data: {
        sourceId,
        targetId,
        type: type as any,
        reason
      }
    });

    return {
      relationId: relation.id,
      source: source.code,
      target: target.code,
      type,
      message: '관계가 생성되었습니다.'
    };
  }

  /**
   * Get all relations for a requirement
   */
  async getRelations(id: string) {
    const [outgoing, incoming] = await Promise.all([
      this.prisma.requirementRelation.findMany({
        where: { sourceId: id },
        include: { target: { select: { id: true, code: true, title: true } } }
      }),
      this.prisma.requirementRelation.findMany({
        where: { targetId: id },
        include: { source: { select: { id: true, code: true, title: true } } }
      })
    ]);

    return {
      outgoing: outgoing.map(r => ({
        relationId: r.id,
        type: r.type,
        target: r.target,
        reason: r.reason
      })),
      incoming: incoming.map(r => ({
        relationId: r.id,
        type: r.type,
        source: r.source,
        reason: r.reason
      })),
      totalRelations: outgoing.length + incoming.length
    };
  }

  /**
   * Remove a relation
   */
  async removeRelation(relationId: string) {
    await this.prisma.requirementRelation.delete({
      where: { id: relationId }
    });
    return { message: '관계가 삭제되었습니다.', relationId };
  }

  // --- Audit & Logging ---

  /**
   * Log an audit event
   */
  async logAudit(action: string, resourceId: string, actorId?: string, diff?: any) {
    return this.prisma.auditLog.create({
      data: {
        action,
        resource: 'Requirement',
        resourceId,
        actorId,
        diff
      }
    });
  }

  /**
   * Get audit logs for a requirement
   */
  async getAuditLogs(id: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { resourceId: id, resource: 'Requirement' },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // --- Health & Stats ---

  /**
   * Get health statistics for requirements module
   */
  async getHealthStats() {
    const [total, byStatus, recentCreated, avgQuality] = await Promise.all([
      this.prisma.requirement.count(),
      this.prisma.requirement.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      this.prisma.requirement.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.requirement.aggregate({
        _avg: { trustGrade: true }
      })
    ]);

    return {
      health: 'OK',
      timestamp: new Date().toISOString(),
      stats: {
        totalRequirements: total,
        createdLast24h: recentCreated,
        avgTrustGrade: (avgQuality._avg.trustGrade || 0).toFixed(2),
        byStatus: byStatus.reduce((acc, s) => {
          acc[s.status] = s._count.id;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }

  // --- Dependency Check ---

  /**
   * Check if requirement can be safely deleted (no dependencies)
   */
  async checkDependencies(id: string) {
    const [relations, children, comments] = await Promise.all([
      this.prisma.requirementRelation.count({
        where: { OR: [{ sourceId: id }, { targetId: id }] }
      }),
      this.prisma.requirement.count({ where: { parentId: id } }),
      this.prisma.comment.count({ where: { requirementId: id } })
    ]);

    const canDelete = relations === 0 && children === 0;

    return {
      requirementId: id,
      canDelete,
      dependencies: {
        relations,
        children,
        comments
      },
      message: canDelete ? '삭제 가능합니다.' : '의존 관계가 있어 삭제할 수 없습니다.'
    };
  }

  // --- Archive & Restore ---

  /**
   * Bulk archive requirements (set to DEPRECATED)
   */
  async bulkArchive(ids: string[]) {
    const result = await this.prisma.requirement.updateMany({
      where: { id: { in: ids } },
      data: { status: 'DEPRECATED' }
    });

    return {
      archived: result.count,
      message: `${result.count}개 요건이 보관되었습니다.`
    };
  }

  /**
   * Restore archived requirement
   */
  async restore(id: string) {
    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'DRAFT' }
    });

    return {
      id: updated.id,
      code: updated.code,
      newStatus: 'DRAFT',
      message: '요건이 복원되었습니다.'
    };
  }

  // --- AI Translation ---

  /**
   * Translate requirement to another language
   */
  async translateRequirement(id: string, targetLang: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { title: true, content: true }
    });

    if (!req) throw new Error('Requirement not found');

    const langNames: Record<string, string> = {
      'en': 'English',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean'
    };

    const prompt = `다음 요건을 ${langNames[targetLang] || targetLang}로 번역하세요.

제목: ${req.title}
내용: ${req.content}

JSON 형식으로 반환:
{ "title": "번역된 제목", "content": "번역된 내용" }

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
        temperature: 0.2
      }, 'TRANSLATION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const translated = JSON.parse(jsonMatch[0]);
        
        // Update contentI18n
        const currentI18n = await this.prisma.requirement.findUnique({
          where: { id },
          select: { contentI18n: true }
        });

        const newI18n = {
          ...(currentI18n?.contentI18n as object || {}),
          [targetLang]: translated
        };

        await this.prisma.requirement.update({
          where: { id },
          data: { contentI18n: newI18n }
        });

        return {
          requirementId: id,
          targetLang,
          ...translated
        };
      }

      return { error: 'Translation failed' };
    } catch (error) {
      this.logger.error('Translation failed', error);
      throw error;
    }
  }

  /**
   * Get word count and complexity metrics
   */
  async getComplexityMetrics(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { title: true, content: true }
    });

    if (!req) throw new Error('Requirement not found');

    const words = req.content.split(/\s+/).filter(w => w.length > 0);
    const sentences = req.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = req.content.split(/\n\n+/).filter(p => p.trim().length > 0);

    // Count special patterns
    const conditionals = (req.content.match(/경우|만약|때|면|이면/g) || []).length;
    const exceptions = (req.content.match(/예외|제외|않|못|불가/g) || []).length;
    const references = (req.content.match(/참조|관련|연계|연동/g) || []).length;

    // Complexity score (simple heuristic)
    const complexityScore = Math.min(100, 
      words.length * 0.1 + 
      conditionals * 5 + 
      exceptions * 3 + 
      sentences.length * 2
    );

    return {
      requirementId: id,
      metrics: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgWordsPerSentence: sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0
      },
      patterns: {
        conditionals,
        exceptions,
        references
      },
      complexityScore: Math.round(complexityScore),
      complexityLevel: complexityScore < 30 ? 'LOW' : complexityScore < 60 ? 'MEDIUM' : 'HIGH'
    };
  }

  // --- Report Generation ---

  /**
   * Generate comprehensive PDF-ready report data
   */
  async generateReport(params: { 
    ids?: string[]; 
    status?: string; 
    format?: 'summary' | 'detailed' | 'executive' 
  }) {
    const where: any = {};
    if (params.ids?.length) where.id = { in: params.ids };
    if (params.status) where.status = params.status;

    const requirements = await this.prisma.requirement.findMany({
      where,
      include: {
        business: true,
        function: true,
        creator: { select: { email: true, name: true } },
        qualityMetric: true
      },
      orderBy: { code: 'asc' }
    });

    const stats = {
      total: requirements.length,
      byStatus: {} as Record<string, number>,
      avgQuality: 0,
      highRiskCount: 0
    };

    let totalQuality = 0;
    for (const r of requirements) {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      if (r.qualityMetric) {
        totalQuality += r.qualityMetric.overallScore || 0;
        if (r.qualityMetric.overallScore < 50) stats.highRiskCount++;
      }
    }
    stats.avgQuality = requirements.length > 0 ? Math.round(totalQuality / requirements.length) : 0;

    return {
      generatedAt: new Date().toISOString(),
      format: params.format || 'summary',
      statistics: stats,
      requirements: requirements.map(r => ({
        code: r.code,
        title: r.title,
        content: params.format === 'detailed' ? r.content : r.content.substring(0, 200),
        status: r.status,
        business: r.business?.name,
        function: r.function?.name,
        creator: r.creator?.name || r.creator?.email,
        trustGrade: r.trustGrade,
        qualityScore: r.qualityMetric?.overallScore
      }))
    };
  }

  /**
   * Get graph data for visualization (nodes + edges)
   */
  async getGraphData() {
    const [requirements, relations] = await Promise.all([
      this.prisma.requirement.findMany({
        select: { id: true, code: true, title: true, status: true, trustGrade: true },
        where: { status: { not: 'DEPRECATED' } }
      }),
      this.prisma.requirementRelation.findMany({
        select: { id: true, sourceId: true, targetId: true, type: true }
      })
    ]);

    const nodes = requirements.map(r => ({
      id: r.id,
      label: r.code,
      title: r.title,
      group: r.status,
      value: Math.round((r.trustGrade || 0.5) * 10)
    }));

    const edges = relations.map(r => ({
      id: r.id,
      from: r.sourceId,
      to: r.targetId,
      label: r.type,
      arrows: 'to'
    }));

    return {
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        isolated: nodes.filter(n => 
          !edges.some(e => e.from === n.id || e.to === n.id)
        ).length
      }
    };
  }

  /**
   * Risk analysis across requirements
   */
  async analyzeRisk() {
    const requirements = await this.prisma.requirement.findMany({
      where: { status: { not: 'DEPRECATED' } },
      include: { qualityMetric: true }
    });

    const riskItems: { id: string; code: string; riskLevel: string; reasons: string[] }[] = [];

    for (const r of requirements) {
      const reasons: string[] = [];
      
      if (!r.qualityMetric) reasons.push('품질 분석 미수행');
      else if (r.qualityMetric.overallScore < 50) reasons.push('품질 점수 낮음');
      
      if (r.trustGrade && r.trustGrade < 0.5) reasons.push('신뢰도 낮음');
      if (r.content.length < 50) reasons.push('내용 불충분');
      if (r.status === 'DRAFT' && this.daysSince(r.createdAt) > 30) reasons.push('장기 미처리');

      if (reasons.length > 0) {
        riskItems.push({
          id: r.id,
          code: r.code,
          riskLevel: reasons.length >= 3 ? 'HIGH' : reasons.length >= 2 ? 'MEDIUM' : 'LOW',
          reasons
        });
      }
    }

    return {
      analyzedAt: new Date().toISOString(),
      totalAnalyzed: requirements.length,
      riskSummary: {
        high: riskItems.filter(r => r.riskLevel === 'HIGH').length,
        medium: riskItems.filter(r => r.riskLevel === 'MEDIUM').length,
        low: riskItems.filter(r => r.riskLevel === 'LOW').length
      },
      riskItems: riskItems.sort((a, b) => 
        a.riskLevel === 'HIGH' ? -1 : b.riskLevel === 'HIGH' ? 1 : 0
      )
    };
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Coverage matrix: requirements vs business functions
   */
  async getCoverageMatrix() {
    const [businesses, functions, requirements] = await Promise.all([
      this.prisma.business.findMany({ select: { id: true, name: true } }),
      this.prisma.function.findMany({ select: { id: true, name: true, businessId: true } }),
      this.prisma.requirement.findMany({
        where: { status: { not: 'DEPRECATED' } },
        select: { businessId: true, functionId: true }
      })
    ]);

    const matrix: Record<string, Record<string, number>> = {};

    for (const b of businesses) {
      matrix[b.name] = {};
      const bizFunctions = functions.filter(f => f.businessId === b.id);
      for (const f of bizFunctions) {
        const count = requirements.filter(r => r.functionId === f.id).length;
        matrix[b.name][f.name] = count;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      businesses: businesses.map(b => b.name),
      functions: functions.map(f => f.name),
      matrix,
      uncovered: functions
        .filter(f => !requirements.some(r => r.functionId === f.id))
        .map(f => f.name)
    };
  }

  /**
   * AI-powered smart split for complex requirements
   */
  async smartSplit(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, content: true }
    });

    if (!req) throw new Error('Requirement not found');

    const prompt = `다음 요건이 복잡하다면 단일 요건들로 분할하세요.

제목: ${req.title}
내용: ${req.content}

JSON 형식으로 반환:
{
  "shouldSplit": true/false,
  "reason": "분할 이유",
  "splitRequirements": [
    { "title": "분할된 요건1 제목", "content": "분할된 요건1 내용" },
    { "title": "분할된 요건2 제목", "content": "분할된 요건2 내용" }
  ]
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
        temperature: 0.3
      }, 'SMART_SPLIT');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return { originalId: id, originalCode: req.code, ...JSON.parse(jsonMatch[0]) };
      }
      return { originalId: id, shouldSplit: false, reason: 'AI 분석 실패' };
    } catch (error) {
      this.logger.error('Smart split failed', error);
      throw error;
    }
  }

  /**
   * Auto-prioritize requirements based on multiple factors
   */
  async autoPrioritize(ids: string[]) {
    const requirements = await this.prisma.requirement.findMany({
      where: { id: { in: ids } },
      include: { qualityMetric: true, business: true }
    });

    const prioritized = requirements.map(r => {
      let score = 50; // Base score

      // Quality factor
      if (r.qualityMetric?.overallScore) score += (r.qualityMetric.overallScore - 50) * 0.3;
      
      // Trust factor
      if (r.trustGrade) score += (r.trustGrade - 0.5) * 20;
      
      // Status factor
      if (r.status === 'REVIEW') score += 10;
      if (r.status === 'APPROVED') score -= 5;
      
      // Age factor (older = higher priority)
      const age = this.daysSince(r.createdAt);
      if (age > 30) score += 10;
      if (age > 60) score += 10;

      return {
        id: r.id,
        code: r.code,
        title: r.title,
        priorityScore: Math.round(Math.max(0, Math.min(100, score))),
        factors: {
          quality: r.qualityMetric?.overallScore || 0,
          trust: r.trustGrade || 0,
          age,
          status: r.status
        }
      };
    });

    return {
      prioritized: prioritized.sort((a, b) => b.priorityScore - a.priorityScore),
      highPriority: prioritized.filter(p => p.priorityScore >= 70).length,
      mediumPriority: prioritized.filter(p => p.priorityScore >= 40 && p.priorityScore < 70).length,
      lowPriority: prioritized.filter(p => p.priorityScore < 40).length
    };
  }

  /**
   * Generate changelog for a date range
   */
  async getChangelog(dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59);

    const [created, updated, history] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { code: true, title: true, createdAt: true, status: true }
      }),
      this.prisma.requirement.findMany({
        where: { 
          updatedAt: { gte: from, lte: to },
          createdAt: { lt: from }
        },
        select: { code: true, title: true, updatedAt: true, status: true }
      }),
      this.prisma.requirementHistory.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { requirement: { select: { code: true } }, changer: { select: { email: true } } }
      })
    ]);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        created: created.length,
        updated: updated.length,
        changes: history.length
      },
      created: created.map(r => ({ code: r.code, title: r.title, date: r.createdAt })),
      updated: updated.map(r => ({ code: r.code, title: r.title, date: r.updatedAt })),
      recentChanges: history.slice(0, 50).map(h => ({
        code: h.requirement.code,
        field: h.field,
        changedBy: h.changer.email,
        date: h.createdAt
      }))
    };
  }

  /**
   * Compliance check against standard rules
   */
  async checkCompliance(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, content: true, status: true }
    });

    if (!req) throw new Error('Requirement not found');

    const rules = [
      { id: 'REQ-001', name: '제목 길이', check: () => req.title.length >= 5 && req.title.length <= 200 },
      { id: 'REQ-002', name: '내용 최소 길이', check: () => req.content.length >= 20 },
      { id: 'REQ-003', name: '표준 표현 사용', check: () => /하여야|해야|한다/.test(req.content) },
      { id: 'REQ-004', name: '모호한 표현 없음', check: () => !/등|기타|약간|적절히/.test(req.content) },
      { id: 'REQ-005', name: '측정 가능', check: () => /초|분|%|개|건/.test(req.content) },
      { id: 'REQ-006', name: '코드 규칙', check: () => /^REQ-/.test(req.code) },
      { id: 'REQ-007', name: '예외 처리 명시', check: () => /예외|오류|에러|실패/.test(req.content) },
    ];

    const results = rules.map(r => ({
      ruleId: r.id,
      ruleName: r.name,
      passed: r.check()
    }));

    const passedCount = results.filter(r => r.passed).length;

    return {
      requirementId: id,
      code: req.code,
      complianceScore: Math.round((passedCount / rules.length) * 100),
      passed: passedCount,
      failed: rules.length - passedCount,
      results,
      status: passedCount === rules.length ? 'COMPLIANT' : passedCount >= 5 ? 'PARTIAL' : 'NON_COMPLIANT'
    };
  }

  // --- Collaboration & Bookmarks ---

  /**
   * Add bookmark for a user (stub - requires Bookmark model in Prisma)
   */
  async addBookmark(userId: string, requirementId: string) {
    // TODO: Uncomment when Bookmark model is added to Prisma schema
    // const existing = await this.prisma.bookmark.findFirst({ where: { userId, requirementId } });
    // if (existing) return { message: '이미 북마크되어 있습니다.', bookmarkId: existing.id };
    // const bookmark = await this.prisma.bookmark.create({ data: { userId, requirementId } });
    return {
      bookmarkId: `bm-${Date.now()}`,
      message: '북마크 기능은 Prisma 스키마 업데이트 후 활성화됩니다.',
      requirementId
    };
  }

  /**
   * Get user's bookmarks (stub)
   */
  async getBookmarks(userId: string, limit = 50) {
    // TODO: Uncomment when Bookmark model is added
    return {
      count: 0,
      bookmarks: [],
      message: '북마크 기능은 Prisma 스키마 업데이트 후 활성화됩니다.'
    };
  }

  /**
   * Remove bookmark (stub)
   */
  async removeBookmark(bookmarkId: string) {
    return { message: '북마크 삭제 기능은 스키마 업데이트 후 활성화됩니다.', bookmarkId };
  }

  /**
   * Add watcher to requirement (stub - requires RequirementWatcher model)
   */
  async addWatcher(requirementId: string, userId: string) {
    // TODO: Uncomment when RequirementWatcher model is added
    return {
      watcherId: `wt-${Date.now()}`,
      message: '구독 기능은 Prisma 스키마 업데이트 후 활성화됩니다.',
      requirementId
    };
  }

  /**
   * Get watchers for a requirement (stub)
   */
  async getWatchers(requirementId: string) {
    return {
      count: 0,
      watchers: [],
      message: '구독자 조회 기능은 스키마 업데이트 후 활성화됩니다.'
    };
  }

  // --- AI Advanced ---

  /**
   * AI-powered comparison of two requirements
   */
  async aiCompare(id1: string, id2: string) {
    const [req1, req2] = await Promise.all([
      this.prisma.requirement.findUnique({ where: { id: id1 }, select: { code: true, title: true, content: true } }),
      this.prisma.requirement.findUnique({ where: { id: id2 }, select: { code: true, title: true, content: true } })
    ]);

    if (!req1 || !req2) throw new Error('Requirements not found');

    const prompt = `두 요건을 분석하고 비교하세요.

요건1 (${req1.code}):
제목: ${req1.title}
내용: ${req1.content}

요건2 (${req2.code}):
제목: ${req2.title}
내용: ${req2.content}

JSON 형식으로 반환:
{
  "similarity": 0-100,
  "relationship": "DUPLICATE|SIMILAR|RELATED|INDEPENDENT|CONFLICTING",
  "commonPoints": ["공통점1", "공통점2"],
  "differences": ["차이점1", "차이점2"],
  "recommendation": "권장사항"
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 800,
        temperature: 0.2
      }, 'AI_COMPARE');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return {
          requirement1: { code: req1.code, title: req1.title },
          requirement2: { code: req2.code, title: req2.title },
          ...JSON.parse(jsonMatch[0])
        };
      }
      return { error: 'AI 분석 실패' };
    } catch (error) {
      this.logger.error('AI compare failed', error);
      throw error;
    }
  }

  /**
   * Keyword-based semantic search
   */
  async semanticSearch(query: string, limit = 20) {
    // Split query into keywords
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length >= 2);
    
    if (keywords.length === 0) return { results: [], count: 0 };

    // Build OR conditions for each keyword
    const orConditions = keywords.flatMap(k => [
      { title: { contains: k, mode: 'insensitive' as const } },
      { content: { contains: k, mode: 'insensitive' as const } }
    ]);

    const requirements = await this.prisma.requirement.findMany({
      where: { OR: orConditions, status: { not: 'DEPRECATED' } },
      select: { id: true, code: true, title: true, content: true, status: true },
      take: limit * 2
    });

    // Score results by keyword matches
    const scored = requirements.map(r => {
      const text = `${r.title} ${r.content}`.toLowerCase();
      const matchCount = keywords.filter(k => text.includes(k)).length;
      const score = (matchCount / keywords.length) * 100;
      return { ...r, score: Math.round(score), matchedKeywords: matchCount };
    });

    // Sort by score and limit
    const sorted = scored.sort((a, b) => b.score - a.score).slice(0, limit);

    return {
      query,
      keywords,
      count: sorted.length,
      results: sorted.map(r => ({
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        relevanceScore: r.score,
        matchedKeywords: r.matchedKeywords,
        snippet: r.content.substring(0, 150)
      }))
    };
  }

  /**
   * Bulk approve with conditions
   */
  async bulkApprove(ids: string[], approverId: string, minQualityScore = 70) {
    const requirements = await this.prisma.requirement.findMany({
      where: { id: { in: ids }, status: 'REVIEW' },
      include: { qualityMetric: true }
    });

    const results: { id: string; code: string; approved: boolean; reason?: string }[] = [];

    for (const r of requirements) {
      const qualityScore = r.qualityMetric?.overallScore || 0;
      
      if (qualityScore >= minQualityScore) {
        await this.prisma.requirement.update({
          where: { id: r.id },
          data: { status: 'APPROVED' }
        });
        results.push({ id: r.id, code: r.code, approved: true });
      } else {
        results.push({ 
          id: r.id, 
          code: r.code, 
          approved: false, 
          reason: `품질 점수 ${qualityScore}점 < 최소 ${minQualityScore}점` 
        });
      }
    }

    return {
      processed: results.length,
      approved: results.filter(r => r.approved).length,
      rejected: results.filter(r => !r.approved).length,
      results
    };
  }

  /**
   * Get history diff between two versions
   */
  async getHistoryDiff(id: string, version1: number, version2: number) {
    const histories = await this.prisma.requirementHistory.findMany({
      where: { 
        requirementId: id,
        version: { in: [version1, version2] }
      },
      orderBy: { version: 'asc' }
    });

    if (histories.length < 2) {
      return { error: '두 버전을 찾을 수 없습니다.' };
    }

    const [h1, h2] = histories;

    return {
      requirementId: id,
      comparison: {
        version1: { version: h1.version, field: h1.field, value: h1.newValue },
        version2: { version: h2.version, field: h2.field, value: h2.newValue }
      },
      changedFields: [...new Set([h1.field, h2.field])]
    };
  }

  /**
   * Trend analysis over time
   */
  async getTrendAnalysis(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [created, approved, deprecated] = await Promise.all([
      this.prisma.requirement.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      this.prisma.requirement.count({
        where: { status: 'APPROVED', updatedAt: { gte: startDate } }
      }),
      this.prisma.requirement.count({
        where: { status: 'DEPRECATED', updatedAt: { gte: startDate } }
      })
    ]);

    const dailyCreation: Record<string, number> = {};
    const reqs = await this.prisma.requirement.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    for (const r of reqs) {
      const day = r.createdAt.toISOString().split('T')[0];
      dailyCreation[day] = (dailyCreation[day] || 0) + 1;
    }

    return {
      period: `Last ${days} days`,
      summary: {
        totalCreated: reqs.length,
        approved,
        deprecated,
        byStatus: created.reduce((acc, s) => {
          acc[s.status] = s._count.id;
          return acc;
        }, {} as Record<string, number>)
      },
      dailyTrend: Object.entries(dailyCreation).map(([date, count]) => ({ date, count })),
      avgPerDay: (reqs.length / days).toFixed(1)
    };
  }

  /**
   * Get reusable blocks/patterns from existing requirements
   */
  async getReusableBlocks() {
    const requirements = await this.prisma.requirement.findMany({
      where: { status: 'APPROVED' },
      select: { content: true },
      take: 100
    });

    // Extract common patterns
    const patterns: Record<string, number> = {};
    const blocks: string[] = [];

    for (const r of requirements) {
      // Extract sections in brackets
      const matches = r.content.match(/\[([^\]]+)\]/g) || [];
      for (const m of matches) {
        patterns[m] = (patterns[m] || 0) + 1;
      }

      // Extract bullet points
      const bullets = r.content.match(/^[-•]\s*.+$/gm) || [];
      for (const b of bullets) {
        if (b.length > 10 && b.length < 100) {
          blocks.push(b.trim());
        }
      }
    }

    // Get top patterns
    const topPatterns = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pattern, count]) => ({ pattern, count }));

    // Get unique blocks
    const uniqueBlocks = [...new Set(blocks)].slice(0, 20);

    return {
      analyzedCount: requirements.length,
      commonPatterns: topPatterns,
      reusableBlocks: uniqueBlocks
    };
  }

  /**
   * Trigger webhook for external integration
   */
  async triggerWebhook(event: string, payload: any, webhookUrl?: string) {
    const url = webhookUrl || process.env.REQUIREMENTS_WEBHOOK_URL;
    
    if (!url) {
      return { triggered: false, reason: 'Webhook URL not configured' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          payload
        })
      });

      return {
        triggered: true,
        event,
        status: response.status,
        success: response.ok
      };
    } catch (error: any) {
      return {
        triggered: false,
        event,
        error: error.message
      };
    }
  }

  // --- Phase 8: Final Advanced Features ---

  /**
   * AI auto-suggest next actions for a requirement
   */
  async aiAutoSuggest(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      include: { qualityMetric: true }
    });

    if (!req) throw new Error('Requirement not found');

    const suggestions: { action: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string }[] = [];

    // Quality-based suggestions
    if (!req.qualityMetric) {
      suggestions.push({ action: 'ANALYZE_QUALITY', priority: 'HIGH', reason: '품질 분석이 필요합니다.' });
    } else if (req.qualityMetric.overallScore < 60) {
      suggestions.push({ action: 'IMPROVE_QUALITY', priority: 'HIGH', reason: `품질 점수가 ${req.qualityMetric.overallScore}점으로 낮습니다.` });
    }

    // Status-based suggestions
    if (req.status === 'DRAFT' && this.daysSince(req.createdAt) > 7) {
      suggestions.push({ action: 'REVIEW', priority: 'MEDIUM', reason: '초안 상태로 7일 이상 방치되었습니다.' });
    }
    if (req.status === 'REVIEW' && this.daysSince(req.updatedAt) > 3) {
      suggestions.push({ action: 'APPROVE_OR_REJECT', priority: 'HIGH', reason: '검토 대기 3일 이상입니다.' });
    }

    // Content-based suggestions
    if (req.content.length < 100) {
      suggestions.push({ action: 'ADD_DETAILS', priority: 'MEDIUM', reason: '내용이 너무 짧습니다.' });
    }
    if (!req.businessId) {
      suggestions.push({ action: 'ASSIGN_BUSINESS', priority: 'LOW', reason: '비즈니스 영역이 지정되지 않았습니다.' });
    }

    return {
      requirementId: id,
      code: req.code,
      currentStatus: req.status,
      suggestions: suggestions.sort((a, b) => 
        a.priority === 'HIGH' ? -1 : b.priority === 'HIGH' ? 1 : 0
      )
    };
  }

  /**
   * Batch quality analysis for multiple requirements
   */
  async batchQualityAnalysis(ids: string[]) {
    const results: { id: string; code: string; score: number | null; needsImprovement: boolean }[] = [];

    for (const id of ids) {
      const req = await this.prisma.requirement.findUnique({
        where: { id },
        include: { qualityMetric: true }
      });

      if (!req) continue;

      const qm = (req as any).qualityMetric;
      results.push({
        id: req.id,
        code: req.code,
        score: qm?.overallScore || null,
        needsImprovement: !qm || qm.overallScore < 70
      });
    }

    const analyzed = results.filter(r => r.score !== null);
    const avgScore = analyzed.length > 0 
      ? Math.round(analyzed.reduce((sum, r) => sum + (r.score || 0), 0) / analyzed.length) 
      : 0;

    return {
      total: results.length,
      analyzed: analyzed.length,
      notAnalyzed: results.length - analyzed.length,
      needsImprovement: results.filter(r => r.needsImprovement).length,
      avgScore,
      results
    };
  }

  /**
   * Impact analysis: what depends on this requirement
   */
  async analyzeImpact(id: string) {
    const [requirement, outgoing, incoming, children] = await Promise.all([
      this.prisma.requirement.findUnique({ 
        where: { id }, 
        select: { code: true, title: true, status: true } 
      }),
      this.prisma.requirementRelation.findMany({
        where: { sourceId: id },
        include: { target: { select: { id: true, code: true, title: true, status: true } } }
      }),
      this.prisma.requirementRelation.findMany({
        where: { targetId: id },
        include: { source: { select: { id: true, code: true, title: true, status: true } } }
      }),
      this.prisma.requirement.findMany({
        where: { parentId: id },
        select: { id: true, code: true, title: true, status: true }
      })
    ]);

    if (!requirement) throw new Error('Requirement not found');

    const impactedCount = outgoing.length + incoming.length + children.length;

    return {
      requirementId: id,
      code: requirement.code,
      title: requirement.title,
      impactLevel: impactedCount > 5 ? 'HIGH' : impactedCount > 2 ? 'MEDIUM' : 'LOW',
      summary: {
        dependsOn: incoming.length,
        impacts: outgoing.length,
        children: children.length,
        totalImpacted: impactedCount
      },
      details: {
        dependsOn: incoming.map(r => ({ ...r.source, relationType: r.type })),
        impacts: outgoing.map(r => ({ ...r.target, relationType: r.type })),
        children
      }
    };
  }

  /**
   * Find orphan requirements (no relations, no parent, no category)
   */
  async findOrphans() {
    const requirements = await this.prisma.requirement.findMany({
      where: { 
        status: { not: 'DEPRECATED' },
        parentId: null,
        businessId: null
      },
      select: { id: true, code: true, title: true, status: true, createdAt: true }
    });

    // Filter those with no relations
    const orphans = [];
    for (const r of requirements) {
      const relationCount = await this.prisma.requirementRelation.count({
        where: { OR: [{ sourceId: r.id }, { targetId: r.id }] }
      });
      if (relationCount === 0) {
        orphans.push({
          ...r,
          ageInDays: this.daysSince(r.createdAt)
        });
      }
    }

    return {
      count: orphans.length,
      orphans: orphans.sort((a, b) => b.ageInDays - a.ageInDays)
    };
  }

  /**
   * Export traceability matrix
   */
  async exportTraceabilityMatrix() {
    const [requirements, relations, businesses, functions] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { status: { not: 'DEPRECATED' } },
        select: { id: true, code: true, title: true, businessId: true, functionId: true }
      }),
      this.prisma.requirementRelation.findMany({
        select: { sourceId: true, targetId: true, type: true }
      }),
      this.prisma.business.findMany({ select: { id: true, name: true } }),
      this.prisma.function.findMany({ select: { id: true, name: true } })
    ]);

    const matrix: any[] = [];

    for (const req of requirements) {
      const business = businesses.find(b => b.id === req.businessId);
      const func = functions.find(f => f.id === req.functionId);
      const related = relations
        .filter(r => r.sourceId === req.id || r.targetId === req.id)
        .map(r => r.sourceId === req.id ? r.targetId : r.sourceId);

      matrix.push({
        code: req.code,
        title: req.title,
        business: business?.name || '-',
        function: func?.name || '-',
        relatedCount: related.length,
        relatedCodes: requirements
          .filter(r => related.includes(r.id))
          .map(r => r.code)
          .join('; ')
      });
    }

    const headers = 'Code,Title,Business,Function,RelatedCount,RelatedCodes';
    const rows = matrix.map(m => 
      `${m.code},"${m.title.replace(/"/g, '""')}",${m.business},${m.function},${m.relatedCount},"${m.relatedCodes}"`
    );

    return {
      format: 'CSV',
      rowCount: matrix.length,
      data: [headers, ...rows].join('\n')
    };
  }

  /**
   * Check overall completeness
   */
  async checkCompleteness() {
    const [total, withBusiness, withFunction, withQuality, approved, draft] = await Promise.all([
      this.prisma.requirement.count({ where: { status: { not: 'DEPRECATED' } } }),
      this.prisma.requirement.count({ where: { status: { not: 'DEPRECATED' }, businessId: { not: null } } }),
      this.prisma.requirement.count({ where: { status: { not: 'DEPRECATED' }, functionId: { not: null } } }),
      this.prisma.qualityMetric.count(),
      this.prisma.requirement.count({ where: { status: 'APPROVED' } }),
      this.prisma.requirement.count({ where: { status: 'DRAFT' } })
    ]);

    const completeness = {
      businessAssignment: total > 0 ? Math.round((withBusiness / total) * 100) : 0,
      functionAssignment: total > 0 ? Math.round((withFunction / total) * 100) : 0,
      qualityAnalyzed: total > 0 ? Math.round((withQuality / total) * 100) : 0,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    };

    const overallScore = Math.round(
      (completeness.businessAssignment + completeness.functionAssignment + 
       completeness.qualityAnalyzed + completeness.approvalRate) / 4
    );

    return {
      total,
      byStatus: { approved, draft, other: total - approved - draft },
      completeness,
      overallScore,
      status: overallScore >= 80 ? 'GOOD' : overallScore >= 50 ? 'NEEDS_WORK' : 'POOR'
    };
  }

  /**
   * Auto-link related requirements based on content similarity
   */
  async autoLink(id: string, threshold = 0.6) {
    const source = await this.prisma.requirement.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, content: true }
    });

    if (!source) throw new Error('Requirement not found');

    const others = await this.prisma.requirement.findMany({
      where: { id: { not: id }, status: { not: 'DEPRECATED' } },
      select: { id: true, code: true, title: true, content: true }
    });

    const sourceText = this.normalizeText(`${source.title} ${source.content}`);
    const suggestions: { id: string; code: string; title: string; similarity: number }[] = [];

    for (const other of others) {
      const otherText = this.normalizeText(`${other.title} ${other.content}`);
      const similarity = this.calculateSimilarity(sourceText, otherText);
      
      if (similarity >= threshold) {
        suggestions.push({
          id: other.id,
          code: other.code,
          title: other.title,
          similarity: Math.round(similarity * 100)
        });
      }
    }

    return {
      sourceId: id,
      sourceCode: source.code,
      threshold: Math.round(threshold * 100),
      suggestedLinks: suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 10)
    };
  }

  /**
   * Bulk translate to multiple languages
   */
  async bulkTranslate(ids: string[], targetLang: string) {
    const results: { id: string; code: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        await this.translateRequirement(id, targetLang);
        const req = await this.prisma.requirement.findUnique({ where: { id }, select: { code: true } });
        results.push({ id, code: req?.code || 'N/A', success: true });
      } catch (error: any) {
        results.push({ id, code: 'N/A', success: false, error: error.message });
      }
    }

    return {
      targetLang,
      total: ids.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Generate summary dashboard data
   */
  async getDashboardSummary() {
    const [
      total, byStatus, recentCreated, avgQuality, 
      pendingApproval, highRisk, orphanCount
    ] = await Promise.all([
      this.prisma.requirement.count({ where: { status: { not: 'DEPRECATED' } } }),
      this.prisma.requirement.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.requirement.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.qualityMetric.aggregate({ _avg: { overallScore: true } }),
      this.prisma.requirement.count({ where: { status: 'REVIEW' } }),
      this.prisma.qualityMetric.count({ where: { overallScore: { lt: 50 } } }),
      this.prisma.requirement.count({
        where: { parentId: null, businessId: null, status: { not: 'DEPRECATED' } }
      })
    ]);

    return {
      generatedAt: new Date().toISOString(),
      overview: {
        total,
        recentCreated,
        avgQualityScore: Math.round(avgQuality._avg.overallScore || 0)
      },
      statusDistribution: byStatus.reduce((acc, s) => {
        acc[s.status] = s._count.id;
        return acc;
      }, {} as Record<string, number>),
      alerts: {
        pendingApproval,
        highRisk,
        orphans: orphanCount
      },
      healthScore: Math.round(
        (1 - (highRisk / Math.max(total, 1))) * 100 * 0.5 +
        (1 - (orphanCount / Math.max(total, 1))) * 100 * 0.3 +
        (avgQuality._avg.overallScore || 50) * 0.2
      )
    };
  }
}
