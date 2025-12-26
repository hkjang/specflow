import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  AccuracyMetrics, 
  IndustryBenchmark, 
  RequirementCandidate 
} from './agent.interface';

/**
 * 정확도 히트맵 서비스
 * 5가지 지표로 요건 정확도 분석
 */
@Injectable()
export class AccuracyHeatmapService {
  private readonly logger = new Logger(AccuracyHeatmapService.name);

  // 산업별 벤치마크 시드 데이터
  private readonly benchmarks: IndustryBenchmark[] = [
    { industry: '금융', function: '인증/권한', avgAccuracy: 92, cautionAreas: ['접근 로그 세분화', '다중 인증'] },
    { industry: '금융', function: '개인정보', avgAccuracy: 88, cautionAreas: ['마스킹 정책', '동의 관리'] },
    { industry: '금융', function: '거래처리', avgAccuracy: 90, cautionAreas: ['실시간 처리', '장애 복구'] },
    { industry: '의료', function: 'EMR 연동', avgAccuracy: 85, cautionAreas: ['표준 코드 누락', 'HL7 호환'] },
    { industry: '의료', function: '환자정보', avgAccuracy: 87, cautionAreas: ['HIPAA 준수', '익명화'] },
    { industry: '자동차', function: 'IoT 수집', avgAccuracy: 90, cautionAreas: ['실시간 장애 처리', '대용량 처리'] },
    { industry: '자동차', function: '진단', avgAccuracy: 88, cautionAreas: ['OBD 표준', '에러 코드'] },
    { industry: '부동산', function: '계약 관리', avgAccuracy: 87, cautionAreas: ['법적 문구 표준', '전자 서명'] },
    { industry: '제조', function: 'MES 연동', avgAccuracy: 86, cautionAreas: ['설비 인터페이스', '실시간 모니터링'] },
    { industry: '물류', function: '배송 추적', avgAccuracy: 89, cautionAreas: ['GPS 정확도', '실시간 업데이트'] },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * 요건 하나의 정확도 히트맵 계산
   */
  calculateHeatmap(candidate: RequirementCandidate, industry?: string): AccuracyMetrics {
    const benchmark = this.findBenchmark(industry, candidate.category);
    
    // 구조 적합도
    const structuralFit = this.calculateStructuralFit(candidate);
    
    // 산업 적합도
    const industryFit = this.calculateIndustryFit(candidate, benchmark);
    
    // 누락 위험도 (100에서 빼줌 - 낮을수록 좋음)
    const missingRisk = 100 - this.calculateMissingRisk(candidate);
    
    // 중복도 (100에서 빼줌 - 낮을수록 좋음)
    const duplicateRatio = 100 - this.calculateDuplicateRatio(candidate);
    
    // 실행 가능성
    const feasibility = this.calculateFeasibility(candidate);
    
    // 전체 점수
    const overallScore = Math.round(
      (structuralFit + industryFit + missingRisk + duplicateRatio + feasibility) / 5
    );

    return {
      structuralFit,
      industryFit,
      missingRisk,
      duplicateRatio,
      feasibility,
      overallScore
    };
  }

  /**
   * 다수 요건의 히트맵 생성
   */
  generateHeatmapMatrix(candidates: RequirementCandidate[], industry?: string): {
    candidates: (RequirementCandidate & { metrics: AccuracyMetrics })[];
    summary: {
      avgScore: number;
      highRisk: number;
      distribution: Record<string, number>;
    };
  } {
    const withMetrics = candidates.map(c => ({
      ...c,
      metrics: this.calculateHeatmap(c, industry)
    }));

    const avgScore = Math.round(
      withMetrics.reduce((s, c) => s + c.metrics.overallScore, 0) / withMetrics.length
    );

    return {
      candidates: withMetrics,
      summary: {
        avgScore,
        highRisk: withMetrics.filter(c => c.metrics.overallScore < 60).length,
        distribution: {
          excellent: withMetrics.filter(c => c.metrics.overallScore >= 90).length,
          good: withMetrics.filter(c => c.metrics.overallScore >= 70 && c.metrics.overallScore < 90).length,
          fair: withMetrics.filter(c => c.metrics.overallScore >= 50 && c.metrics.overallScore < 70).length,
          poor: withMetrics.filter(c => c.metrics.overallScore < 50).length
        }
      }
    };
  }

  /**
   * 산업별 벤치마크 조회
   */
  getBenchmarks(industry?: string): IndustryBenchmark[] {
    if (industry) {
      return this.benchmarks.filter(b => b.industry === industry);
    }
    return this.benchmarks;
  }

  /**
   * 산업/기능별 벤치마크 찾기
   */
  private findBenchmark(industry?: string, category?: string): IndustryBenchmark | undefined {
    return this.benchmarks.find(b => 
      b.industry === industry && 
      (b.function === category || category?.includes(b.function))
    ) || this.benchmarks.find(b => b.industry === industry);
  }

  /**
   * 구조 적합도 계산
   */
  private calculateStructuralFit(candidate: RequirementCandidate): number {
    let score = 50;
    const content = candidate.content || '';
    
    // 표준 구조 체크
    if (/시스템은|시스템이/.test(content)) score += 10;
    if (/해야\s*한다|하여야\s*한다/.test(content)) score += 15;
    if (/경우|조건|상황/.test(content)) score += 5;
    if (/예외|오류|에러/.test(content)) score += 10;
    if (/[0-9]+\s*(초|분|ms|건|개|%)/.test(content)) score += 10;
    
    // 제목 품질
    if (candidate.title?.length >= 5 && candidate.title?.length <= 100) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * 산업 적합도 계산
   */
  private calculateIndustryFit(candidate: RequirementCandidate, benchmark?: IndustryBenchmark): number {
    if (!benchmark) return 70;
    
    let score = benchmark.avgAccuracy - 10; // 기본값은 벤치마크보다 약간 낮음
    
    // 주의 영역 포함 여부 체크
    const content = (candidate.content || '').toLowerCase();
    for (const caution of benchmark.cautionAreas) {
      if (content.includes(caution.toLowerCase())) {
        score += 5;
      }
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 누락 위험도 계산 (높을수록 위험)
   */
  private calculateMissingRisk(candidate: RequirementCandidate): number {
    let risk = 0;
    const content = candidate.content || '';
    
    // 필수 요소 누락 체크
    if (content.length < 50) risk += 20;
    if (!/[0-9]/.test(content)) risk += 10;  // 수치 없음
    if (!/예외|오류|실패/.test(content)) risk += 10;  // 예외 처리 없음
    if (!candidate.type) risk += 10;  // 유형 미지정
    if (!candidate.category) risk += 10;  // 카테고리 미지정
    
    return Math.min(50, risk);
  }

  /**
   * 중복 비율 계산 (높을수록 중복)
   */
  private calculateDuplicateRatio(candidate: RequirementCandidate): number {
    // 실제 구현에서는 DB의 기존 요건과 비교
    // 여기서는 confidence 기반으로 간단 계산
    return Math.max(0, 20 - (candidate.confidence || 0.7) * 20);
  }

  /**
   * 실행 가능성 계산
   */
  private calculateFeasibility(candidate: RequirementCandidate): number {
    let score = 70;
    const content = candidate.content || '';
    
    // 구체성 체크
    if (/[0-9]+/.test(content)) score += 10;
    if (/API|인터페이스|연동/.test(content)) score += 5;
    if (/화면|UI|사용자/.test(content)) score += 5;
    
    // 모호함 체크
    if (/등|기타|적절히/.test(content)) score -= 15;
    if (/추후|나중에|필요시/.test(content)) score -= 10;
    
    return Math.min(100, Math.max(0, score));
  }
}
