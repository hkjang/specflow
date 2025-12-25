import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccuracyService {
  private readonly logger = new Logger(AccuracyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHeatmapData(dimension: string = 'INDUSTRY', organizationId?: string, aiModel?: string) {
    const where: any = {
      dimension: dimension.toUpperCase(),
    };
    if (organizationId) where.organizationId = organizationId;
    if (aiModel) where.aiModel = aiModel;

    const metrics = await this.prisma.accuracyMetric.findMany({
      where,
    });
    return metrics;
  }

  async getImprovements() {
    // Priority = (1 - Accuracy) * Impact * Risk
    // High Impact/Risk and Low Accuracy -> High Priority
    const metrics = await this.prisma.accuracyMetric.findMany();
    
    const improvements = metrics.map((m) => {
        // Calculate priority score (0-100 scale mainly)
        // (1 - 0.70) * 0.9 * 0.9 = 0.3 * 0.81 = 0.243
        // (1 - 0.92) * 0.9 * 0.9 = 0.08 * 0.81 = 0.064
        const gap = 1.0 - m.accuracy;
        const priorityScore = gap * m.impact * m.risk * 100;

        let priorityLevel = 'LOW';
        if (priorityScore >= 15) priorityLevel = 'HIGH';
        else if (priorityScore >= 8) priorityLevel = 'MEDIUM';

        // Suggest Action based on Major Cause
        let action = 'Check Training Data';
        if (m.majorCause?.includes('Context')) action = 'Enhance Prompt Context';
        if (m.majorCause?.includes('Term')) action = 'Add to Terminology Dictionary';
        if (m.majorCause?.includes('Structure')) action = 'Refine Extraction Rules';

        return {
            id: m.id,
            category: m.category,
            dimension: m.dimension,
            accuracy: m.accuracy,
            impact: m.impact,
            risk: m.risk,
            priorityScore,
            priorityLevel,
            majorCause: m.majorCause,
            suggestedAction: action
        };
    });

    // Sort by priority score DESC
    return improvements.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10); // Top 10
  }

  async submitFeedback(data: any) {
    return this.prisma.accuracyFeedback.create({
      data: {
        targetType: data.targetType,
        targetId: data.targetId,
        aiTask: data.aiTask,
        predictedValue: data.predictedValue,
        actualValue: data.actualValue,
        isCorrect: data.isCorrect,
        comment: data.comment,
      },
    });
  }

  async seedInitialData() {
    this.logger.log('Seeding Accuracy Heatmap Data with Advanced Fields...');

    // 1. Industry Data
    const industryData = [
      { category: 'Finance', extraction: 0.92, classification: 0.88, deduplication: 0.90, summarization: 0.86, impact: 0.9, risk: 0.9 }, // High usage, High Reg
      { category: 'Medical', extraction: 0.85, classification: 0.80, deduplication: 0.82, summarization: 0.78, impact: 0.8, risk: 0.95 }, // High Reg
      { category: 'Automotive', extraction: 0.89, classification: 0.86, deduplication: 0.87, summarization: 0.84, impact: 0.7, risk: 0.7 },
      { category: 'RealEstate', extraction: 0.83, classification: 0.79, deduplication: 0.81, summarization: 0.78, impact: 0.6, risk: 0.5 },
      { category: 'Public', extraction: 0.87, classification: 0.82, deduplication: 0.84, summarization: 0.80, impact: 0.5, risk: 0.8 },
    ];

    for (const d of industryData) {
      await this.upsertMetric('INDUSTRY', d.category, 'EXTRACTION', d.extraction, undefined, d.impact, d.risk);
      await this.upsertMetric('INDUSTRY', d.category, 'CLASSIFICATION', d.classification, undefined, d.impact, d.risk);
      await this.upsertMetric('INDUSTRY', d.category, 'DEDUPLICATION', d.deduplication, undefined, d.impact, d.risk);
      await this.upsertMetric('INDUSTRY', d.category, 'SUMMARIZATION', d.summarization, undefined, d.impact, d.risk);
    }

    // 2. Function Data
    const functionData = [
      { category: 'Registration', accuracy: 0.94, cause: 'Clear Sentence', impact: 0.9, risk: 0.6 },
      { category: 'Approval', accuracy: 0.91, cause: 'Rule Based', impact: 0.8, risk: 0.8 },
      { category: 'Classification', accuracy: 0.81, cause: 'Polysemy', impact: 0.7, risk: 0.5 },
      { category: 'Merge', accuracy: 0.78, cause: 'Overlap', impact: 0.5, risk: 0.5 },
      { category: 'Recommend', accuracy: 0.75, cause: 'Lack of Context', impact: 0.6, risk: 0.4 },
    ];

    for (const d of functionData) {
      await this.upsertMetric('FUNCTION', d.category, 'GENERAL', d.accuracy, d.cause, d.impact, d.risk);
    }

    // 3. Source Data
    const sourceData = [
      { category: 'Regulation', accuracy: 0.93, cause: 'Standard Structure', impact: 0.4, risk: 0.9 },
      { category: 'RFP', accuracy: 0.88, cause: 'Mixed Style', impact: 0.6, risk: 0.7 },
      { category: 'InternalDoc', accuracy: 0.82, cause: 'Colloquial', impact: 0.8, risk: 0.6 },
      { category: 'Email', accuracy: 0.70, cause: 'Unstructured', impact: 0.7, risk: 0.4 },
      { category: 'Messenger', accuracy: 0.65, cause: 'Abbreviation', impact: 0.6, risk: 0.3 },
    ];

    for (const d of sourceData) {
      await this.upsertMetric('SOURCE', d.category, 'GENERAL', d.accuracy, d.cause, d.impact, d.risk);
    }

    this.logger.log('Seeding Completed.');
    return { success: true, count: industryData.length + functionData.length + sourceData.length };
  }

  private async upsertMetric(dimension: string, category: string, aiTask: string, accuracy: number, majorCause?: string, impact: number = 0.5, risk: number = 0.5) {
    const period = '2024-Q4';
    const existing = await this.prisma.accuracyMetric.findFirst({
      where: { dimension, category, aiTask, period },
    });

    if (existing) {
      await this.checkAndCreateAlert(dimension, category, accuracy);
      return this.prisma.accuracyMetric.update({
        where: { id: existing.id },
        data: { accuracy, majorCause, impact, risk },
      });
    }

    await this.checkAndCreateAlert(dimension, category, accuracy);
    return this.prisma.accuracyMetric.create({
      data: {
        dimension,
        category,
        aiTask,
        accuracy,
        majorCause,
        period,
        sampleCount: 100,
        impact,
        risk,
      },
    });
  }

  private async checkAndCreateAlert(dimension: string, category: string, accuracy: number) {
    if (accuracy < 0.7) {
      const title = `Low Accuracy Alert: ${dimension} - ${category}`;
      const message = `Accuracy for ${category} in ${dimension} is ${accuracy}, which is below the SLA threshold of 0.7. Immediate action required.`;
      
      // Check if alert already exists to avoid spam
      const existing = await this.prisma.adminAlert.findFirst({
        where: { title, isRead: false }
      });

      if (!existing) {
        await this.prisma.adminAlert.create({
          data: {
            title,
            message,
            severity: 'CRITICAL',
            category: 'Quality',
            isRead: false
          }
        });
        this.logger.warn(`Created SLA Alert: ${title}`);
      }
    }
  }
}
