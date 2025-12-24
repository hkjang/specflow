import { Controller, Get, Post, Body } from '@nestjs/common';
import { DataMartService } from './data-mart.service';

@Controller('data-mart')
export class DataMartController {
    constructor(private readonly service: DataMartService) { }

    @Get('datasets')
    getDatasets() {
        return this.service.getDatasets();
    }

    @Post('snapshots')
    createSnapshot(@Body() body: { name: string }) {
        return this.service.createSnapshot(body.name);
    }
}
