import { Injectable, Logger } from '@nestjs/common';
import {
  AgentType,
  AgentContext,
  AgentInput,
  AgentResult,
  IRequirementAgent,
  RiskDetectionResult,
} from './agent.interface';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

/**
 * 위험 탐지 에이전트
 * 보안, 개인정보, 규제 리스크 자동 감지
 */
@Injectable()
export class RiskDetectorAgent implements IRequirementAgent {
  private readonly logger = new Logger(RiskDetectorAgent.name);
  
  type = AgentType.RISK_DETECTOR;
  name = '위험 탐지 에이전트';
  description = '보안, 개인정보, 규제 리스크를 자동 감지합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    if (input.type !== 'REQUIREMENTS' || !input.requirements?.length) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No requirements to analyze'
      };
    }

    this.logger.log(`Detecting risks in ${input.requirements.length} requirements`);

    const requirementsList = input.requirements.map((c, i) => 
      `${i + 1}. [${c.type}] ${c.title}: ${c.content}`
    ).join('\n');

    const prompt = `당신은 소프트웨어 보안 및 규제 전문가입니다.

다음 요건들에서 리스크를 탐지하세요.

요건 목록:
${requirementsList}

산업: ${context.industry || '일반'}
규제 수준: ${context.regulationLevel || 'MEDIUM'}

다음 유형의 리스크를 분석하세요:
1. SECURITY: 보안 취약점, 인증/권한 부족
2. PRIVACY: 개인정보 보호 위반 가능성
3. REGULATION: 법적/규제 준수 미흡
4. COMPLIANCE: 산업 표준 미준수

다음 JSON 형식으로 반환:
{
  "riskAnalysis": [
    {
      "requirementIndex": 1,
      "risks": [
        {
          "type": "SECURITY|PRIVACY|REGULATION|COMPLIANCE",
          "severity": "HIGH|MEDIUM|LOW",
          "description": "리스크 설명",
          "recommendation": "권장 조치"
        }
      ]
    }
  ],
  "overallRiskLevel": "HIGH|MEDIUM|LOW",
  "summary": "전체 리스크 요약"
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2500,
        temperature: 0.2
      }, 'RISK_DETECTION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Add risk info to candidates
        const candidatesWithRisks = input.requirements.map((req, idx) => {
          const riskInfo = (parsed.riskAnalysis || []).find(
            (r: any) => r.requirementIndex === idx + 1
          );
          
          return {
            ...req,
            risks: riskInfo?.risks || [],
            thinkingLog: [
              ...(req.thinkingLog || []),
              {
                timestamp: new Date(),
                agentType: this.type,
                reasoning: riskInfo?.risks?.length 
                  ? `리스크 ${riskInfo.risks.length}건 감지`
                  : '리스크 없음',
                confidence: 0.85
              }
            ]
          };
        });

        const totalRisks = (parsed.riskAnalysis || []).reduce(
          (sum: number, r: any) => sum + (r.risks?.length || 0), 0
        );

        return {
          agentType: this.type,
          success: true,
          executionTime: 0,
          candidates: candidatesWithRisks,
          metrics: {
            analyzedCount: input.requirements.length,
            totalRisks,
            highRisks: this.countBySeverity(parsed.riskAnalysis, 'HIGH'),
            mediumRisks: this.countBySeverity(parsed.riskAnalysis, 'MEDIUM'),
            lowRisks: this.countBySeverity(parsed.riskAnalysis, 'LOW')
          },
          logs: [{
            timestamp: new Date(),
            agentType: this.type,
            reasoning: parsed.summary || `전체 리스크 수준: ${parsed.overallRiskLevel}`,
            confidence: 0.85
          }]
        };
      }

      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'Failed to parse AI response'
      };
    } catch (error: any) {
      this.logger.error('Risk detection failed', error);
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: error.message
      };
    }
  }

  private countBySeverity(analysis: any[], severity: string): number {
    if (!analysis) return 0;
    return analysis.reduce((sum, r) => 
      sum + (r.risks?.filter((risk: any) => risk.severity === severity)?.length || 0)
    , 0);
  }

  validate(input: AgentInput): boolean {
    return input.type === 'REQUIREMENTS' && !!input.requirements?.length;
  }
}
