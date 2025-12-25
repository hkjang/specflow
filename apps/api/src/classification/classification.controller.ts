import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ClassificationService } from './classification.service';

@Controller('classification')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) { }

  @Post('business')
  createBusiness(@Body() body: { name: string; projectId: string }) {
    return this.classificationService.createBusiness(body);
  }

  @Get('business')
  getBusinesses(@Query('projectId') projectId: string) {
    return this.classificationService.getBusinesses(projectId);
  }

  @Post('function')
  createFunction(@Body() body: any) {
    return this.classificationService.createFunction(body);
  }

  @Get('menu')
  getMenus() {
    return this.classificationService.getMenus();
  }

  @Get('categories')
  getCategories() {
    return this.classificationService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { code: string; name: string; level: string; parentId?: string; description?: string }) {
    return this.classificationService.createCategory(body);
  }

  @Get('stats')
  getStats() {
    return this.classificationService.getClassificationStats();
  }

  @Post('override')
  override(@Body() body: { requirementId: string; categoryIds: string[] }) {
    return this.classificationService.overrideClassification(body.requirementId, body.categoryIds);
  }

  @Post('auto')
  autoClassify(@Body() body: { content: string }) {
      return this.classificationService.classifyRequirement(body.content);
  }
}
