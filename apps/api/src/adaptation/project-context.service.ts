import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectContextService {
    constructor(private prisma: PrismaService) { }

    async getContext(projectId: string) {
        return this.prisma.projectContext.findUnique({
            where: { projectId },
            include: { orgStandards: true },
        });
    }

    async updateContext(movieId: string, data: any) {
        // Implementation for updating tech stack, etc.
        // simplified for now
        return this.prisma.projectContext.upsert({
            where: { projectId: movieId },
            create: {
                projectId: movieId,
                ...data,
            },
            update: {
                ...data,
            },
        });
    }
}
