import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationStatus } from '@prisma/client';

@Injectable()
export class OperationsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.operationQueue.findMany({
            where: {
                status: {
                    in: ['PENDING', 'IN_PROGRESS']
                }
            },
            orderBy: {
                priority: 'desc'
            },
            include: {
                assignee: true
            }
        });
    }

    async processOperation(id: string, action: 'APPROVE' | 'REJECT' | 'RESOLVE', notes?: string) {
        const operation = await this.prisma.operationQueue.findUnique({
            where: { id }
        });

        if (!operation) throw new NotFoundException('Operation not found');

        // Perform logic based on type and action
        // Real implementation would delegate to specific handlers (RequirementService, etc.)
        // For now, we just complete the operation.

        if (operation.targetType === 'Requirement' && action === 'APPROVE') {
            await this.prisma.requirement.update({
                where: { id: operation.targetId! },
                data: { status: 'APPROVED' }
            });
        }

        if (operation.targetType === 'Requirement' && action === 'REJECT') {
            await this.prisma.requirement.update({
                where: { id: operation.targetId! },
                data: { status: 'DEPRECATED' }
            });
        }

        return this.prisma.operationQueue.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                // In real app, we log the result context
            }
        });
    }
}
