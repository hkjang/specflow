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

  async findAll(params: { status?: string, search?: string, page: number, limit: number } = { page: 1, limit: 100 }) {
    const { status, search, page, limit } = params;

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

    const [data, total] = await Promise.all([
      this.prisma.requirement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
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

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.requirement.findUnique({
      where: { id },
      include: {
        history: true,
        qualityMetric: true,
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
}
