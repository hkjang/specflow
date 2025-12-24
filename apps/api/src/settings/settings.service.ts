import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async upsert(data: Prisma.SystemSettingCreateInput) {
        return this.prisma.systemSetting.upsert({
            where: { key: data.key },
            update: { value: data.value, category: data.category },
            create: data
        });
    }

    findAll() {
        return this.prisma.systemSetting.findMany();
    }

    findOne(key: string) {
        return this.prisma.systemSetting.findUnique({ where: { key } });
    }
}
