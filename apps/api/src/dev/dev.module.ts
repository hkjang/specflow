import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DevController } from './dev.controller';

@Module({
    controllers: [DevController],
    providers: [PrismaService],
})
export class DevModule { }
