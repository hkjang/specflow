import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OperationsService } from './operations.service';

@Controller('operations')
export class OperationsController {
    constructor(private readonly service: OperationsService) { }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Post(':id/process')
    process(
        @Param('id') id: string,
        @Body() body: { action: 'APPROVE' | 'REJECT' | 'RESOLVE'; notes?: string }
    ) {
        return this.service.processOperation(id, body.action, body.notes);
    }
}
