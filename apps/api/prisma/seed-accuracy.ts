
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MASSIVE Accuracy Heatmap Data (12 Months, 8 Orgs, 6 Models)...');

  // 0. Clear existing data
  await prisma.accuracyMetric.deleteMany({});
  console.log('Cleared existing data.');

  // Enhanced Dimensions
  const orgs = [
      'woori_bank', 'samsung_life', 'lg_cns', 'sk_telecom',
      'kakao_bank', 'hyundai_motor', 'posco_holdings', 'naver_cloud'
  ];
  const models = ['GPT-4', 'Claude-3', 'Solar', 'Llama-3', 'Gemini-Pro', 'Llama-3-70b'];
  const industries = ['Finance', 'Medical', 'Automotive', 'RealEstate', 'Public', 'Legal', 'Retail'];
  const tasks = ['EXTRACTION', 'CLASSIFICATION', 'DEDUPLICATION', 'SUMMARIZATION', 'TRANSLATION'];

  // Ensure Organizations exist
  for (const orgId of orgs) {
      const exists = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!exists) {
          await prisma.organization.create({
              data: {
                  id: orgId,
                  name: orgId.toUpperCase().replace('_', ' '),
                  plan: 'ENTERPRISE'
              }
          });
          console.log(`Created Org: ${orgId}`);
      }
  }

  // Helper to generate distinct randomish but consistent data
  const generateTrend = (base: number, volatility: number, monthOffset: number) => {
      // General improvement over time (0.5% per month)
      const improvement = monthOffset * 0.005; 
      const randomVar = (Math.random() - 0.5) * volatility;
      return Math.min(0.99, Math.max(0.4, base + improvement + randomVar));
  };

  const metricsToInsert: any[] = [];
  const today = new Date();

  // 1. Time Series Data (Last 12 Months)
  for (let i = 11; i >= 0; i--) {
      const periodDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Simulate "Bad Deployment" event for Solar model in roughly 3 months ago (i=3)
      const isBadDeploymentMonth = (i === 3); 

      for (const org of orgs) {
          for (const model of models) {
              
              // Skip some org-model combos to make it look realistic (not everyone uses every model)
              // Hash simulation: if (org.char + model.char) % 7 == 0 -> skip
              if ((org.length + model.length) % 7 === 0) continue;

              for (const ind of industries) {
                  let baseAcc = 0.85;
                  
                  // Model Base Performance
                  if (model === 'GPT-4') baseAcc = 0.92;
                  else if (model === 'Claude-3') baseAcc = 0.90;
                  else if (model === 'Gemini-Pro') baseAcc = 0.89;
                  else if (model.includes('Llama')) baseAcc = 0.82;
                  
                  // Solar is fast but sometimes lower acc
                  if (model === 'Solar') baseAcc = 0.80;

                  // Industry Difficulty
                  if (ind === 'Medical' || ind === 'Legal') baseAcc -= 0.15; // Very Hard
                  if (ind === 'Finance') baseAcc -= 0.05;

                  // Bad Deployment Scenario
                  if (model === 'Solar' && isBadDeploymentMonth) {
                      baseAcc -= 0.3; // Huge dip
                  }

                  for (const task of tasks) {
                      const acc = generateTrend(baseAcc, 0.05, 12 - i);
                      
                      let impact = 0.5;
                      let risk = 0.3;
                      if (ind === 'Finance' || ind === 'Medical') { impact = 0.9; risk = 0.8; }
                      if (task === 'EXTRACTION') { risk += 0.1; }

                      let majorCause: string | null = null;
                      if (acc < 0.75) {
                          const causes = ['Context Limit', 'Ambiguous Term', 'Complex Structure', 'Low Resolution', 'Hallucination', 'Model Drift'];
                          majorCause = causes[Math.floor(Math.random() * causes.length)];
                      }
                      
                      // Inject Bad Deployment Cause
                      if (model === 'Solar' && isBadDeploymentMonth) {
                          majorCause = 'Model Version Defect (v2.1)';
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
                          sampleCount: Math.floor(Math.random() * 2000) + 100
                      });
                  }
              }
          }
      }
  }

  // 2. Add some "User Specific" metrics for top performers
  // e.g., Expert reviewers in specific domains
  const users = ['user_expert_01', 'user_junior_02'];
  for (const user of users) {
      metricsToInsert.push({
          dimension: 'USER',
          category: 'Expert Review',
          aiTask: 'VERIFICATION',
          accuracy: user.includes('expert') ? 0.98 : 0.85,
          period: '2024-12',
          impact: 0.8,
          risk: 0.5,
          organizationId: 'woori_bank',
          userId: user,
          sampleCount: 50
      });
  }

  console.log(`Inserting ${metricsToInsert.length} metrics...`);
  
  // Batch Insert
  const batchSize = 1000;
  for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);
      await prisma.accuracyMetric.createMany({
          data: batch
      });
      console.log(`Inserted batch ${i} to ${i + batchSize}`);
  }

  console.log('Massive Seeding Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
