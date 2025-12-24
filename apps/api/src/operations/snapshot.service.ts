
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SnapshotService {
    private readonly logger = new Logger(SnapshotService.name);

    constructor(private prisma: PrismaService) { }

    async restoreSnapshot(requirementId: string, version: number) {
        this.logger.log(`Restoring Req ${requirementId} to Version ${version}`);

        // 1. Find History Record
        // In Phase 8/9, RequirementHistory has 'version', 'newValue' etc.
        // Ideally we need a full snapshot. Since History is field-based diff, restoration is complex.
        // For MVP Phase 10, we will assume 'newValue' of 'content' field in history represents the state at that version (simplified).

        const history = await this.prisma.requirementHistory.findFirst({
            where: { requirementId, version, field: 'content' }
        });

        if (!history || !history.newValue) {
            throw new NotFoundException(`Snapshot for version ${version} not found`);
        }

        // 2. Revert Requirement Content
        return this.prisma.requirement.update({
            where: { id: requirementId },
            data: {
                content: history.newValue,
                version: version // Reset current version to match snapshot? Or increment? Usually increment.
                // keeping version logic simple for now.
            }
        });
    }
}
