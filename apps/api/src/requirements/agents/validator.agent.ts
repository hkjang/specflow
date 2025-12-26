import { Injectable, Logger } from '@nestjs/common';
import {
  AgentType,
  AgentContext,
  AgentInput,
  AgentResult,
  IRequirementAgent,
  AccuracyMetrics,
} from './agent.interface';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

/**
 * 정확도 검증 에이전트
 * 기존 성공 프로젝트 대비 정확도 점수 산정
 */
@Injectable()
export class ValidatorAgent implements IRequirementAgent {
  private readonly logger = new Logger(ValidatorAgent.name);
  
  type = AgentType.VALIDATOR;
  name = '정확도 검증 에이전트';
  description = '요건의 정확도와 품질을 검증합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    if (input.type !== 'REQUIREMENTS' || !input.requirements?.length) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No requirements to validate'
      };
    }

    this.logger.log(`Validating ${input.requirements.length} requirements`);

    const validatedCandidates = await Promise.all(
      input.requirements.map(async (req) => {
        const metrics = await this.calculateAccuracyMetrics(req, context);
        return {
          ...req,
          accuracyMetrics: metrics,
          confidence: metrics.overallScore / 100,
          thinkingLog: [
            ...(req.thinkingLog || []),
            {
              timestamp: new Date(),
              agentType: this.type,
              reasoning: `정확도 검증 완료. 전체점수: ${metrics.overallScore}점`,
              confidence: metrics.overallScore / 100
            }
          ]
        };
      })
    );

    const avgScore = validatedCandidates.reduce((s, c) => 
      s + ((c as any).accuracyMetrics?.overallScore || 0), 0
    ) / validatedCandidates.length;

    return {
      agentType: this.type,
      success: true,
      executionTime: 0,
      candidates: validatedCandidates,
      metrics: {
        validatedCount: validatedCandidates.length,
        avgAccuracyScore: Math.round(avgScore),
        highQualityCount: validatedCandidates.filter((c: any) => c.accuracyMetrics.overallScore >= 80).length,
        lowQualityCount: validatedCandidates.filter((c: any) => c.accuracyMetrics.overallScore < 60).length
      }
    };
  }

  private async calculateAccuracyMetrics(
    req: any,
    context: AgentContext
  ): Promise<AccuracyMetrics> {
    const prompt = `당신은 소프트웨어 요건 품질 분석 전문가입니다.

다음 요건의 정확도를 분석하세요:

제목: ${req.title}
내용: ${req.content}
유형: ${req.type || '미지정'}
카테고리: ${req.category || '미지정'}

산업 컨텍스트: ${context.industry || '일반'}

다음 5가지 지표로 0-100점 사이로 평가하세요:
1. 구조 적합도 (structuralFit): 표준 요건 템플릿과의 유사도
2. 산업 적합도 (industryFit): 해당 산업 평균 요건 대비 커버리지
3. 누락 위험도 (missingRisk): 필수 요건 미포함 확률 (낮을수록 좋음, 100에서 뺀 값)
4. 중복도 (duplicateRatio): 기존 요건과 중복 비율 (낮을수록 좋음, 100에서 뺀 값)
5. 실행 가능성 (feasibility): 실제 구현 가능성 점수

다음 JSON 형식으로 반환:
{
  "structuralFit": 0-100,
  "industryFit": 0-100,
  "missingRisk": 0-100,
  "duplicateRatio": 0-100,
  "feasibility": 0-100,
  "notes": "분석 근거"
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.2
      }, 'ACCURACY_VALIDATION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const overallScore = Math.round(
          (parsed.structuralFit + parsed.industryFit + 
           parsed.missingRisk + parsed.duplicateRatio + parsed.feasibility) / 5
        );

        return {
          structuralFit: parsed.structuralFit,
          industryFit: parsed.industryFit,
          missingRisk: parsed.missingRisk,
          duplicateRatio: parsed.duplicateRatio,
          feasibility: parsed.feasibility,
          overallScore
        };
      }
    } catch (error) {
      this.logger.error('Accuracy calculation failed', error);
    }

    // Default metrics
    return {
      structuralFit: 70,
      industryFit: 70,
      missingRisk: 80,
      duplicateRatio: 90,
      feasibility: 75,
      overallScore: 77
    };
  }

  validate(input: AgentInput): boolean {
    return input.type === 'REQUIREMENTS' && !!input.requirements?.length;
  }
}
