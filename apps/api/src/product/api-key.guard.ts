
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            throw new UnauthorizedException('Missing X-API-KEY header');
        }

        // Check if key exists and is active
        // Note: This relies on ApiProductKey model being generated later
        const keyRecord = await this.prisma.apiProductKey.findUnique({
            where: { key: apiKey as string },
        });

        if (!keyRecord || !keyRecord.isActive) {
            throw new UnauthorizedException('Invalid or inactive API Key');
        }

        // Attach key info to request for interceptor
        request['apiKey'] = keyRecord;

        return true;
    }
}
