import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Predicts future accuracy based on historical trends using a simple linear regression
   * or moving average for the forecast.
   */
  async predictAccuracyDrop(dimension: string = 'INDUSTRY', category: string) {
    // 1. Fetch historical data sorted by period/timestamp
    const metrics = await this.prisma.accuracyMetric.findMany({
      where: { dimension, category },
      orderBy: { timestamp: 'asc' }
    });

    if (metrics.length < 3) {
      return { status: 'INSUFFICIENT_DATA', prediction: null };
    }

    // 2. Simple Linear Regression (y = mx + b)
    const n = metrics.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    // Map timestamps to 0, 1, 2... for simplicity
    const dataPoints = metrics.map((m, i) => ({ x: i, y: m.accuracy }));

    dataPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict for next period (n)
    const nextX = n;
    const predictedAccuracy = slope * nextX + intercept;
    
    // Calculate simple confidence interval based on standard error
    const residuals = dataPoints.map(p => Math.pow(p.y - (slope * p.x + intercept), 2));
    const stdDev = Math.sqrt(residuals.reduce((a, b) => a + b, 0) / (n - 2 || 1));
    const confidenceMargin = 1.96 * stdDev; // 95% CI

    const confidenceLow = predictedAccuracy - confidenceMargin;
    const confidenceHigh = predictedAccuracy + confidenceMargin;

    // 3. Trigger Alert if significant drop predicted
    if (slope < -0.05 || predictedAccuracy < 0.7) {
        // Trigger alert logic here (could integrate or return flag)
        this.logger.warn(`Predicted accuracy drop for ${category}: ${predictedAccuracy.toFixed(2)}`);
    }

    // 4. Save prediction
    await this.prisma.qualityPrediction.create({
        data: {
            dimension,
            category,
            predictedAccuracy,
            confidenceLow,
            confidenceHigh,
            predictionDate: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Next month
        }
    });

    return {
        dimension,
        category,
        current: metrics[metrics.length - 1].accuracy,
        predicted: predictedAccuracy,
        trend: slope > 0 ? 'UP' : 'DOWN',
        confidence: { low: confidenceLow, high: confidenceHigh }
    };
  }
}
