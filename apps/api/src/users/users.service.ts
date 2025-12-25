import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({ data });
    }

    findAll() {
        return this.prisma.user.findMany({ include: { history: false } }); // Avoid too much data
    }

    findOne(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    update(id: string, data: Prisma.UserUpdateInput) {
        return this.prisma.user.update({
            where: { id },
            data
        });
    }

    remove(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }
}
