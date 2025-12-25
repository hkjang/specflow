import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderManager } from '../ai/provider/ai-provider.manager';

@Injectable()
export class RequirementEnrichmentService {
    private readonly logger = new Logger(RequirementEnrichmentService.name);

    constructor(
        private prisma: PrismaService,
        private providerManager: AiProviderManager
    ) { }

    /**
     * Find requirements that lack metadata (no business, function, menu, or classifications)
     */
    async findRequirementsWithoutMetadata(limit = 50) {
        return this.prisma.requirement.findMany({
            where: {
                AND: [
                    { businessId: null },
                    { functionId: null },
                    { menuId: null },
                    { classifications: { none: {} } }
                ]
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                code: true,
                title: true,
                content: true
            }
        });
    }

    /**
     * Enrich a single requirement with AI-suggested metadata
     */
    async enrichRequirement(requirementId: string) {
        const requirement = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
            include: {
                classifications: true,
                business: true,
                function: true,
                menu: true
            }
        });

        if (!requirement) {
            throw new Error('Requirement not found');
        }

        // Get AI suggestions
        const suggestions = await this.getAISuggestions(requirement.title, requirement.content);

        // Apply suggestions
        const updates: any = {};

        // Find or create Business domain
        if (suggestions.suggestedDomain && !requirement.businessId) {
            const business = await this.findOrCreateBusiness(suggestions.suggestedDomain);
            if (business) updates.businessId = business.id;
        }

        // Find or create Function
        if (suggestions.suggestedFunction && !requirement.functionId) {
            const func = await this.findOrCreateFunction(suggestions.suggestedFunction, updates.businessId);
            if (func) updates.functionId = func.id;
        }

        // Find or create Menu
        if (suggestions.suggestedMenu && !requirement.menuId) {
            const menu = await this.findOrCreateMenu(suggestions.suggestedMenu);
            if (menu) updates.menuId = menu.id;
        }

        // Update requirement with new metadata
        const updated = await this.prisma.requirement.update({
            where: { id: requirementId },
            data: updates
        });

        // Add classification tags
        if (suggestions.suggestedTags && suggestions.suggestedTags.length > 0 && requirement.classifications.length === 0) {
            await this.addClassificationTags(requirementId, suggestions.suggestedTags, suggestions.modelName);
        }

        return {
            requirementId,
            applied: {
                domain: suggestions.suggestedDomain,
                function: suggestions.suggestedFunction,
                menu: suggestions.suggestedMenu,
                tags: suggestions.suggestedTags
            }
        };
    }

    /**
     * Batch enrich multiple requirements
     */
    async batchEnrich(limit = 20) {
        const requirements = await this.findRequirementsWithoutMetadata(limit);

        if (requirements.length === 0) {
            return { message: 'No requirements to enrich', count: 0 };
        }

        const results = [];
        for (const req of requirements) {
            try {
                const result = await this.enrichRequirement(req.id);
                results.push({ success: true, ...result });
            } catch (e) {
                results.push({ success: false, requirementId: req.id, error: String(e) });
            }
        }

        return {
            message: `Enriched ${results.filter(r => r.success).length} of ${requirements.length} requirements`,
            results
        };
    }

    /**
     * Get AI suggestions for metadata
     */
    private async getAISuggestions(title: string, content: string) {
        const prompt = `
            Analyze the following software requirement and suggest metadata classifications.
            Return a JSON object with the following keys:
            - suggestedDomain: 비즈니스 도메인 (금융, 물류, 공공, 제조, 의료, IT서비스 중 선택)
            - suggestedFunction: 기능 분류 (사용자관리, 권한관리, 결제, 알림, 검색, 보안, 데이터관리, 연계 중 선택)
            - suggestedMenu: 관련 메뉴 추천 (예: 마이페이지, 관리자설정, 대시보드, 주문관리)
            - suggestedTags: 분류 태그 배열 (예: ["보안", "성능", "UI/UX", "규제준수"])
            
            Requirement Title: ${title}
            Requirement Content: ${content}
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.1
            }, 'CLASSIFICATION');

            const parsed = JSON.parse(response.content || '{}');
            return {
                ...parsed,
                modelName: response.modelUsed || 'AI Model'
            };
        } catch (error) {
            this.logger.error('AI enrichment failed:', error);
            return {
                suggestedDomain: null,
                suggestedFunction: null,
                suggestedMenu: null,
                suggestedTags: [],
                modelName: 'Unknown'
            };
        }
    }

    private async findOrCreateBusiness(domain: string) {
        // First try to find existing business with similar name
        let business = await this.prisma.business.findFirst({
            where: { name: { contains: domain, mode: 'insensitive' } }
        });

        if (!business) {
            // Get first project for fallback
            const project = await this.prisma.project.findFirst();
            if (project) {
                business = await this.prisma.business.create({
                    data: {
                        name: domain,
                        projectId: project.id
                    }
                });
            }
        }
        return business;
    }

    private async findOrCreateFunction(funcName: string, businessId?: string) {
        let func = await this.prisma.function.findFirst({
            where: { name: { contains: funcName, mode: 'insensitive' } }
        });

        if (!func && businessId) {
            func = await this.prisma.function.create({
                data: {
                    name: funcName,
                    businessId: businessId,
                    type: 'Large'
                }
            });
        }
        return func;
    }

    private async findOrCreateMenu(menuName: string) {
        let menu = await this.prisma.menu.findFirst({
            where: { name: { contains: menuName, mode: 'insensitive' } }
        });

        if (!menu) {
            menu = await this.prisma.menu.create({
                data: {
                    name: menuName,
                    depth: 1
                }
            });
        }
        return menu;
    }

    private async addClassificationTags(requirementId: string, tags: string[], modelName: string) {
        for (const tagName of tags) {
            // Find category by name
            const category = await this.prisma.category.findFirst({
                where: {
                    OR: [
                        { name: { contains: tagName, mode: 'insensitive' } },
                        { code: { contains: tagName, mode: 'insensitive' } }
                    ]
                }
            });

            if (category) {
                // Check if classification already exists
                const existing = await this.prisma.requirementClassification.findFirst({
                    where: {
                        requirementId,
                        categoryId: category.id
                    }
                });

                if (!existing) {
                    await this.prisma.requirementClassification.create({
                        data: {
                            requirementId,
                            categoryId: category.id,
                            source: 'AI',
                            confidence: 0.8,
                            model: modelName
                        }
                    });
                }
            }
        }
    }
}
