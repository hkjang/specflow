/**
 * Industry Benchmark Seed Script
 * Populates IndustryBenchmark table with initial data for 10 industries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const benchmarkData = [
  // FINANCE
  { industry: 'FINANCE', category: 'AUTH', avgAccuracy: 0.92, sampleSize: 150, description: '인증/인가 요건' },
  { industry: 'FINANCE', category: 'TRANSACTION', avgAccuracy: 0.89, sampleSize: 200, description: '거래처리 요건' },
  { industry: 'FINANCE', category: 'AUDIT', avgAccuracy: 0.95, sampleSize: 120, description: '감사추적 요건' },
  { industry: 'FINANCE', category: 'COMPLIANCE', avgAccuracy: 0.88, sampleSize: 180, description: '규제준수 요건' },

  // HEALTHCARE
  { industry: 'HEALTHCARE', category: 'EMR', avgAccuracy: 0.87, sampleSize: 130, description: '전자의무기록 요건' },
  { industry: 'HEALTHCARE', category: 'PRIVACY', avgAccuracy: 0.94, sampleSize: 160, description: '환자정보보호 요건' },
  { industry: 'HEALTHCARE', category: 'INTEROP', avgAccuracy: 0.82, sampleSize: 90, description: '의료시스템연동 요건' },
  { industry: 'HEALTHCARE', category: 'CLINICAL', avgAccuracy: 0.85, sampleSize: 110, description: '임상워크플로우 요건' },

  // AUTOMOTIVE
  { industry: 'AUTOMOTIVE', category: 'SAFETY', avgAccuracy: 0.96, sampleSize: 200, description: '안전기능 요건' },
  { industry: 'AUTOMOTIVE', category: 'CONNECTIVITY', avgAccuracy: 0.84, sampleSize: 140, description: '커넥티비티 요건' },
  { industry: 'AUTOMOTIVE', category: 'ECU', avgAccuracy: 0.88, sampleSize: 170, description: 'ECU 소프트웨어 요건' },

  // MANUFACTURING
  { industry: 'MANUFACTURING', category: 'MES', avgAccuracy: 0.86, sampleSize: 120, description: '생산관리시스템 요건' },
  { industry: 'MANUFACTURING', category: 'QC', avgAccuracy: 0.91, sampleSize: 130, description: '품질관리 요건' },
  { industry: 'MANUFACTURING', category: 'SCM', avgAccuracy: 0.83, sampleSize: 100, description: '공급망관리 요건' },

  // RETAIL
  { industry: 'RETAIL', category: 'POS', avgAccuracy: 0.89, sampleSize: 150, description: 'POS 시스템 요건' },
  { industry: 'RETAIL', category: 'INVENTORY', avgAccuracy: 0.87, sampleSize: 120, description: '재고관리 요건' },
  { industry: 'RETAIL', category: 'LOYALTY', avgAccuracy: 0.82, sampleSize: 90, description: '멤버십/로열티 요건' },

  // LOGISTICS
  { industry: 'LOGISTICS', category: 'TMS', avgAccuracy: 0.85, sampleSize: 110, description: '운송관리시스템 요건' },
  { industry: 'LOGISTICS', category: 'WMS', avgAccuracy: 0.88, sampleSize: 130, description: '창고관리시스템 요건' },
  { industry: 'LOGISTICS', category: 'TRACKING', avgAccuracy: 0.90, sampleSize: 140, description: '배송추적 요건' },

  // EDUCATION
  { industry: 'EDUCATION', category: 'LMS', avgAccuracy: 0.84, sampleSize: 100, description: '학습관리시스템 요건' },
  { industry: 'EDUCATION', category: 'ASSESSMENT', avgAccuracy: 0.86, sampleSize: 110, description: '평가시스템 요건' },
  { industry: 'EDUCATION', category: 'STUDENT', avgAccuracy: 0.82, sampleSize: 90, description: '학생정보시스템 요건' },

  // PUBLIC
  { industry: 'PUBLIC', category: 'CIVIL', avgAccuracy: 0.80, sampleSize: 140, description: '민원처리 요건' },
  { industry: 'PUBLIC', category: 'GRP', avgAccuracy: 0.83, sampleSize: 120, description: '행정업무 요건' },
  { industry: 'PUBLIC', category: 'OPEN_DATA', avgAccuracy: 0.78, sampleSize: 80, description: '공공데이터 요건' },

  // ENERGY
  { industry: 'ENERGY', category: 'SCADA', avgAccuracy: 0.92, sampleSize: 100, description: 'SCADA 시스템 요건' },
  { industry: 'ENERGY', category: 'GRID', avgAccuracy: 0.88, sampleSize: 90, description: '전력망관리 요건' },
  { industry: 'ENERGY', category: 'METERING', avgAccuracy: 0.86, sampleSize: 110, description: '스마트미터링 요건' },

  // TELECOM
  { industry: 'TELECOM', category: 'BILLING', avgAccuracy: 0.90, sampleSize: 160, description: '과금시스템 요건' },
  { industry: 'TELECOM', category: 'OSS', avgAccuracy: 0.85, sampleSize: 130, description: '운영지원시스템 요건' },
  { industry: 'TELECOM', category: 'BSS', avgAccuracy: 0.87, sampleSize: 140, description: '사업지원시스템 요건' },
];

async function seed() {
  console.log('Seeding industry benchmarks...');

  for (const data of benchmarkData) {
    await prisma.industryBenchmark.upsert({
      where: {
        industry_category: {
          industry: data.industry,
          category: data.category,
        },
      },
      update: {
        avgAccuracy: data.avgAccuracy,
        sampleSize: data.sampleSize,
        description: data.description,
      },
      create: data,
    });
  }

  console.log(`Seeded ${benchmarkData.length} benchmarks for 10 industries`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
