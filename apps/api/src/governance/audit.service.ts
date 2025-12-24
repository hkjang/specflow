
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(data: {
        actorId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        diff?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        return this.prisma.auditLog.create({
            data: {
                actorId: data.actorId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                diff: data.diff ?? Prisma.JsonNull,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent
            }
        });
    }

    async getLogs() {
        return this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }
}
