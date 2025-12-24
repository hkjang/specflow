
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const apiKeyRecord = request['apiKey']; // Attached by Guard
        const start = Date.now();

        return next
            .handle()
            .pipe(
                tap(async () => {
                    if (apiKeyRecord) {
                        const response = context.switchToHttp().getResponse();
                        const duration = Date.now() - start;

                        try {
                            await this.prisma.apiUsageLog.create({
                                data: {
                                    keyId: apiKeyRecord.id,
                                    endpoint: request.url,
                                    method: request.method,
                                    statusCode: response.statusCode,
                                    durationMs: duration
                                }
                            });
                        } catch (e) {
                            console.error('Failed to log API usage', e);
                        }
                    }
                }),
            );
    }
}
