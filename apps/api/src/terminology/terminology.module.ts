
import { Module } from '@nestjs/common';
import { TerminologyService } from './terminology.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [TerminologyService],
    exports: [TerminologyService],
})
export class TerminologyModule { }
