
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PartnerTemplateService } from './partner-templates.service';

@Controller('partner/templates')
export class PartnerTemplatesController {
    constructor(private readonly templateService: PartnerTemplateService) { }

    @Get()
    findAll() {
        return this.templateService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; industry: string; description?: string; structure: any }) {
        return this.templateService.createTemplate(body);
    }

    @Post('instantiate')
    instantiate(@Body() body: { templateId: string; projectName: string; description?: string }) {
        return this.templateService.instantiateProject(body);
    }
}
