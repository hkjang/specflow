import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ClassificationService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) { }

  // Business
  async createBusiness(data: { name: string; projectId: string }) {
    return this.prisma.business.create({ data });
  }

  async getBusinesses(projectId: string) {
    return this.prisma.business.findMany({ where: { projectId }, include: { functions: true } });
  }

  // Function
  async createFunction(data: { name: string; businessId: string; parentId?: string; type?: string }) {
    return this.prisma.function.create({
      data: {
        name: data.name,
        businessId: data.businessId,
        parentId: data.parentId,
        type: data.type || 'Small'
      }
    });
  }

  // Menu
  async createMenu(data: { name: string; depth: number; parentId?: string }) {
    return this.prisma.menu.create({ data });
  }

  async getMenus() {
    return this.prisma.menu.findMany({ where: { parentId: null }, include: { children: true } });
  }

  // Auto Classification
  async classifyRequirement(text: string) {
    // Step 1: Identify Industry (Level 1)
    const industries = await this.prisma.category.findMany({
      where: { level: 'Industry' },
      select: { code: true, name: true, description: true, level: true, parentId: true }
    });

    const indResult = await this.aiService.classifyRequirement(text, industries);
    const industryCode = indResult.categoryCodes[0]; // Assuming single industry context

    if (!industryCode) {
      // Fallback: search all if industry detection fails (or maybe allow multi-industry?)
      return {
        suggestedCategories: [],
        confidence: 0,
        reasoning: "Could not identify industry."
      };
    }

    const matchedIndustry = await this.prisma.category.findUnique({ where: { code: industryCode } });

    if (!matchedIndustry) {
      return {
        suggestedCategories: [],
        confidence: 0,
        reasoning: "Industry code returned by AI not found in DB."
      };
    }

    // Step 2: Identify Domain & Function within the selected Industry
    // Get Domains (children of Industry) and Functions (children of those Domains)
    const hierarchy = await this.prisma.category.findMany({
      where: { parentId: matchedIndustry.id }, // Domains
      include: { children: true } // Functions
    });

    const subContext: { code: string; name: string; description: string | null; level: string | null }[] = [];
    hierarchy.forEach(domain => {
      subContext.push({
        code: domain.code!,
        name: domain.name,
        description: domain.description,
        level: 'Domain'
      });
      if (domain.children) {
        domain.children.forEach(func => {
          subContext.push({
            code: func.code!,
            name: func.name,
            description: func.description, // func has no desc in seed but valid in model
            level: 'Function'
          });
        });
      }
    });

    const subResult = await this.aiService.classifyRequirement(text, subContext);

    // Combine results
    const finalCodes = [industryCode, ...subResult.categoryCodes];

    const allMatchedCategories = await this.prisma.category.findMany({
      where: { code: { in: finalCodes } }
    });

    // Re-order to have Industry -> Domain -> Function
    // (Optional, just sorting by level or hierarchy?)

    return {
      suggestedCategories: allMatchedCategories,
      confidence: (indResult.confidence + subResult.confidence) / 2,
      reasoning: `[Industry]: ${indResult.reasoning}\n[Detail]: ${subResult.reasoning}`
    };
  }

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { code: 'asc' },
      include: { 
          children: {
              include: { children: true }
          } 
      }
    });
  }

  async createCategory(data: { code: string; name: string; level: string; parentId?: string; description?: string }) {
    return this.prisma.category.create({
      data: {
        code: data.code,
        name: data.name,
        level: data.level,
        parentId: data.parentId,
        description: data.description
      }
    });
  }

  async updateCategory(id: string, data: { code?: string; name?: string; level?: string; description?: string }) {
      return this.prisma.category.update({
          where: { id },
          data
      });
  }

  async deleteCategory(id: string) {
      return this.prisma.category.delete({
          where: { id }
      });
  }

  async getClassificationStats() {
    // Mocking heatmap data for now as simple counts
    // In real implementation, this would aggregate AiMetadata vs Final Category
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { requirements: true }
        }
      }
    });

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      count: c._count.requirements,
      accuracy: Math.random() * 20 + 80 // Mock 80-100% accuracy
    }));
  }

  async overrideClassification(requirementId: string, categoryIds: string[]) {
    // 1. Update Requirement categories
    const req = await this.prisma.requirement.update({
      where: { id: requirementId },
      data: {
        categories: {
          set: categoryIds.map(id => ({ id }))
        }
      }
    });

    // 2. Log this as a "correction" for AI learning (mocked)
    // In real system, we save this pair (text, old_cats, new_cats) to a dataset table

    // 3. Update Quality/Confidence metrics (Human override = 100% trust)
    await this.prisma.requirement.update({
      where: { id: requirementId },
      data: {
        trustGrade: 1.0
      }
    });

    return req;
  }
}
