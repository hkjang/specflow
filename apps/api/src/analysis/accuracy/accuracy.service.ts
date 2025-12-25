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
    this.logger.log('Seeding Accuracy Heatmap Data with Realistic Enterprise Scenarios...');

    // 0. Clear existing data to avoid conflicts and enable fast bulk insert
    await this.prisma.accuracyMetric.deleteMany({});

    // Dimensions
    const orgs = ['woori_bank', 'samsung_life', 'lg_cns', 'sk_telecom'];
    const models = ['GPT-4', 'Claude-3', 'Solar', 'Llama-3'];
    const industries = ['Finance', 'Medical', 'Automotive', 'RealEstate', 'Public', 'Legal', 'Retail'];
    const tasks = ['EXTRACTION', 'CLASSIFICATION', 'DEDUPLICATION', 'SUMMARIZATION', 'TRANSLATION'];

    // Helper to generate distinct randomish but consistent data
    const generateTrend = (base: number, volatility: number, monthOffset: number) => {
        // Create a trend that generally improves but has random dips
        const improvement = monthOffset * 0.005; 
        const randomVar = (Math.random() - 0.5) * volatility;
        return Math.min(0.99, Math.max(0.4, base + improvement + randomVar));
    };

    const metricsToInsert: any[] = [];

    // 1. Time Series Data (Last 6 Months)
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const periodDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
        
        for (const org of orgs) {
            for (const model of models) {
                for (const ind of industries) {
                    // Base accuracy depends on Model + Industry difficulty
                    let baseAcc = 0.85;
                    if (model === 'GPT-4') baseAcc += 0.05;
                    if (model === 'Solar') baseAcc -= 0.02; // Faster but slightly less acc
                    if (ind === 'Medical' || ind === 'Legal') baseAcc -= 0.1; // Hard domains

                    // Generate metrics for each task
                    for (const task of tasks) {
                        const acc = generateTrend(baseAcc, 0.05, 6 - i);
                        
                        // Impact/Risk logic
                        let impact = 0.5;
                        let risk = 0.3;
                        if (ind === 'Finance' || ind === 'Medical') { impact = 0.9; risk = 0.8; }
                        if (task === 'EXTRACTION') { risk += 0.1; }

                        // Cause logic for low accuracy
                        let majorCause: string | null = null;
                        if (acc < 0.75) {
                            const causes = ['Context Limit', 'Ambiguous Term', 'Complex Structure', 'Low Resolution', 'Hallucination'];
                            majorCause = causes[Math.floor(Math.random() * causes.length)];
                        }

                        metricsToInsert.push({
                            dimension: 'INDUSTRY', 
                            category: ind, 
                            aiTask: task, 
                            accuracy: acc, 
                            period, 
                            organizationId: org, 
                            aiModel: model,
                            majorCause,
                            impact,
                            risk,
                            sampleCount: Math.floor(Math.random() * 500) + 50
                        });
                    }
                }
            }
        }
    }

    // 2. Add some "Global/Industry Standard" Aggregates (No specific org/model)
    for (const ind of industries) {
        metricsToInsert.push({
            dimension: 'INDUSTRY',
            category: ind,
            aiTask: 'OVERALL',
            accuracy: 0.88,
            period: '2024-Q4', // Current Quarter
            impact: 0.7,
            risk: 0.6,
            organizationId: null,
            aiModel: null,
            sampleCount: 1000
        });
    }

    // Batch Insert
    // process in chunks of 500 to be safe
    const batchSize = 500;
    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
        const batch = metricsToInsert.slice(i, i + batchSize);
        await this.prisma.accuracyMetric.createMany({
            data: batch
        });
    }

    this.logger.log(`Realistic Seeding Completed. Inserted ${metricsToInsert.length} records.`);
    return { success: true, count: metricsToInsert.length };
  }
}
