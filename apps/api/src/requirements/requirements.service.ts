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
}
