import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { SnapshotService } from './snapshot.service';

@Module({
    controllers: [RulesController, OperationsController],
    providers: [RulesService, PrismaService, OperationsService, SnapshotService],
})
export class OperationsModule { }
