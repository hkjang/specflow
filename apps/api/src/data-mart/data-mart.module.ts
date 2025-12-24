import { Module } from '@nestjs/common';
import { DataMartController } from './data-mart.controller';
import { DataMartService } from './data-mart.service';

@Module({
    controllers: [DataMartController],
    providers: [DataMartService],
})
export class DataMartModule { }
