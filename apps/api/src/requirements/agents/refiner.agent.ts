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
 * 요건 정제 에이전트
 * 중복 제거, 모호 표현 제거, 표준 문장화
 */
@Injectable()
export class RefinerAgent implements IRequirementAgent {
  private readonly logger = new Logger(RefinerAgent.name);
  
  type = AgentType.REFINER;
  name = '요건 정제 에이전트';
  description = '요건을 정제하고 표준화합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    if (input.type !== 'REQUIREMENTS' || !input.requirements?.length) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No requirements to refine'
      };
    }

    this.logger.log(`Refining ${input.requirements.length} requirements`);

    // Step 1: Remove duplicates
    const deduplicated = this.removeDuplicates(input.requirements);
    
    // Step 2: AI-based refinement
    const refined = await this.aiRefine(deduplicated);

    return {
      agentType: this.type,
      success: true,
      executionTime: 0,
      candidates: refined,
      metrics: {
        originalCount: input.requirements.length,
        afterDedup: deduplicated.length,
        refinedCount: refined.length,
        removedCount: input.requirements.length - refined.length
      }
    };
  }

  private removeDuplicates(candidates: RequirementCandidate[]): RequirementCandidate[] {
    const seen = new Map<string, RequirementCandidate>();
    
    for (const c of candidates) {
      const key = this.normalizeText(c.title + c.content);
      const existing = seen.get(key);
      
      if (!existing || c.confidence > existing.confidence) {
        seen.set(key, c);
      }
    }

    return Array.from(seen.values());
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\s\-_]+/g, ' ')
      .replace(/[^가-힣a-z0-9\s]/g, '')
      .trim();
  }

  private async aiRefine(candidates: RequirementCandidate[]): Promise<RequirementCandidate[]> {
    const requirementsList = candidates.map((c, i) => 
      `${i + 1}. [${c.type}] ${c.title}: ${c.content}`
    ).join('\n');

    const prompt = `당신은 소프트웨어 요건 정제 전문가입니다.

다음 요건들을 정제하세요:
1. 모호한 표현 제거 ("등", "기타", "적절히", "약간" 등)
2. 표준 문장화 ("~해야 한다", "~하여야 한다" 형식)
3. 구체적인 측정 기준 추가
4. 불완전한 요건 보완

요건 목록:
${requirementsList}

다음 JSON 형식으로 반환:
{
  "refinedRequirements": [
    {
      "originalIndex": 1,
      "title": "정제된 제목",
      "content": "정제된 내용",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|INTERFACE|CONSTRAINT",
      "changes": ["변경사항1", "변경사항2"],
      "confidence": 0.0-1.0
    }
  ]
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 3000,
        temperature: 0.2
      }, 'REQUIREMENT_REFINEMENT');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.refinedRequirements || []).map((r: any) => {
          const original = candidates[r.originalIndex - 1];
          return {
            ...original,
            title: r.title,
            content: r.content,
            type: r.type || original?.type,
            confidence: r.confidence || 0.8,
            thinkingLog: [
              ...(original?.thinkingLog || []),
              {
                timestamp: new Date(),
                agentType: this.type,
                reasoning: `정제됨: ${(r.changes || []).join(', ')}`,
                confidence: r.confidence || 0.8
              }
            ]
          };
        });
      }

      return candidates;
    } catch (error: any) {
      this.logger.error('AI refinement failed', error);
      return candidates;
    }
  }

  validate(input: AgentInput): boolean {
    return input.type === 'REQUIREMENTS' && !!input.requirements?.length;
  }
}
