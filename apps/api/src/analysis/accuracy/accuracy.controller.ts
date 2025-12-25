import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccuracyService } from './accuracy.service';
import { TerminologyService } from './terminology.service';
import { PredictionService } from './prediction.service';

@Controller('analysis/accuracy')
export class AccuracyController {
  constructor(
    private readonly accuracyService: AccuracyService,
    private readonly terminologyService: TerminologyService,
    private readonly predictionService: PredictionService
  ) {}

  @Get('heatmap')
  async getHeatmapData(
    @Query('dimension') dimension?: string,
    @Query('organizationId') organizationId?: string,
    @Query('aiModel') aiModel?: string
  ) {
    return this.accuracyService.getHeatmapData(dimension, organizationId, aiModel);
  }

  @Get('forecast')
  async getForecast(@Query('category') category: string) {
    return this.predictionService.predictAccuracyDrop('INDUSTRY', category);
  }

  @Get('improvements')
  async getImprovements() {
    return this.accuracyService.getImprovements();
  }

  @Post('seed')
  async seedData() {
    return this.accuracyService.seedInitialData();
  }

  @Post('feedback')
  async submitFeedback(@Body() body: any) {
    return this.accuracyService.submitFeedback(body);
  }

  @Post('terms')
  async addTerm(@Body() body: { term: string; definition: string; industry?: string }) {
    return this.terminologyService.addTerm(body);
  }

  @Post('report')
  async generateReport() {
    // Generate a summary report
    const stats = await this.accuracyService.getHeatmapData();
    const improvements = await this.accuracyService.getImprovements();
    
    const overallAccuracy = stats.reduce((acc, curr) => acc + curr.accuracy, 0) / stats.length || 0;
    
    return {
        title: "AI Accuracy Analysis Report",
        generatedAt: new Date(),
        summary: {
            overallAccuracy: overallAccuracy.toFixed(2),
            totalMetrics: stats.length,
            criticalIssues: improvements.filter(i => i.priorityLevel === 'HIGH').length
        },
        topPriorities: improvements.slice(0, 3),
        recommendation: "Immediate action required for High priority items. Consider updating the terminology dictionary for 'Medical' and 'Finance' sectors to improve classification accuracy."
    };
  }
}
