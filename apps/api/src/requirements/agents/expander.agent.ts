import { Injectable, Logger } from '@nestjs/common';
import {
  AgentType,
  AgentContext,
  AgentInput,
  AgentResult,
  IRequirementAgent,
  RequirementCandidate,
} from './agent.interface';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';

/**
 * 요건 확장 에이전트
 * 누락 가능 요건 자동 제안
 */
@Injectable()
export class ExpanderAgent implements IRequirementAgent {
  private readonly logger = new Logger(ExpanderAgent.name);
  
  type = AgentType.EXPANDER;
  name = '요건 확장 에이전트';
  description = '누락될 수 있는 요건을 자동으로 제안합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    if (input.type !== 'REQUIREMENTS' || !input.requirements?.length) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No requirements to expand'
      };
    }

    this.logger.log(`Expanding ${input.requirements.length} requirements`);

    const existingList = input.requirements.map(c => 
      `- [${c.category || c.type}] ${c.title}: ${c.content.substring(0, 100)}`
    ).join('\n');

    const prompt = `당신은 소프트웨어 요건 전문가입니다. 기존 요건들을 분석하고 누락된 요건을 제안하세요.

기존 요건:
${existingList}

프로젝트 컨텍스트:
- 산업: ${context.industry || '미지정'}
- 시스템 유형: ${context.systemType || '미지정'}
- 조직 성숙도: ${context.organizationMaturity || '미지정'}
- 규제 수준: ${context.regulationLevel || '미지정'}

다음을 고려하여 누락된 요건을 제안하세요:
1. 보안 요건 (인증, 권한, 암호화)
2. 성능 요건 (응답시간, 처리량)
3. 예외 처리 요건
4. 데이터 관련 요건 (백업, 복구, 무결성)
5. 인터페이스 요건
6. 규제/준수 요건

다음 JSON 형식으로 반환:
{
  "suggestedRequirements": [
    {
      "title": "제안 요건 제목",
      "content": "제안 요건 내용",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|INTERFACE|CONSTRAINT",
      "category": "카테고리",
      "reason": "이 요건이 필요한 이유",
      "relatedTo": ["관련된 기존 요건 제목"],
      "priority": "HIGH|MEDIUM|LOW",
      "confidence": 0.0-1.0
    }
  ],
  "analysisNotes": "분석 시 고려한 사항"
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 3000,
        temperature: 0.3
      }, 'REQUIREMENT_EXPANSION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const suggested: RequirementCandidate[] = (parsed.suggestedRequirements || []).map((r: any) => ({
          title: r.title,
          content: r.content,
          type: r.type,
          category: r.category,
          confidence: r.confidence || 0.7,
          source: 'AI_EXPANSION',
          thinkingLog: [{
            timestamp: new Date(),
            agentType: this.type,
            reasoning: `자동 제안됨: ${r.reason}`,
            references: r.relatedTo,
            confidence: r.confidence || 0.7
          }]
        }));

        // Combine original + suggested
        const allCandidates = [...input.requirements, ...suggested];

        return {
          agentType: this.type,
          success: true,
          executionTime: 0,
          candidates: allCandidates,
          metrics: {
            originalCount: input.requirements.length,
            suggestedCount: suggested.length,
            totalCount: allCandidates.length
          },
          logs: [{
            timestamp: new Date(),
            agentType: this.type,
            reasoning: parsed.analysisNotes || 'Requirements expanded',
            confidence: 0.8
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
      this.logger.error('Expansion failed', error);
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: error.message
      };
    }
  }

  validate(input: AgentInput): boolean {
    return input.type === 'REQUIREMENTS' && !!input.requirements?.length;
  }
}
