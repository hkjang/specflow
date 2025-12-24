
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnerTemplateService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.projectTemplate.findMany();
    }

    async createTemplate(data: { name: string; industry: string; description?: string; structure: any }) {
        return this.prisma.projectTemplate.create({
            data: {
                name: data.name,
                industry: data.industry,
                description: data.description,
                structure: data.structure,
            },
        });
    }

    // Core Logic for SI: "Instant Project Setup"
    async instantiateProject(data: { templateId: string; projectName: string; description?: string }) {
        const template = await this.prisma.projectTemplate.findUnique({
            where: { id: data.templateId },
        });

        if (!template) {
            throw new NotFoundException(`Template ${data.templateId} not found`);
        }

        // 1. Create Project
        const project = await this.prisma.project.create({
            data: {
                name: data.projectName,
                description: data.description || `Instantiated from ${template.name}`,
            },
        });

        // 2. Setup Context (Tech Stack, etc. from template structure if available)
        const structure = template.structure as any;
        const techStack = structure?.defaultStack || ["React", "NestJS", "PostgreSQL"]; // Default fallbacks

        await this.prisma.projectContext.create({
            data: {
                projectId: project.id,
                techStack: techStack,
                styleGuide: structure?.styleGuide || {},
                forbiddenTech: structure?.forbiddenTech || [],
            },
        });

        // 3. (Future) Clone standard requirements / assets
        // For now, just logging or handling basic setup

        return {
            success: true,
            projectId: project.id,
            message: `Project instantianted from ${template.name}`,
            context: { techStack }
        };
    }
}
