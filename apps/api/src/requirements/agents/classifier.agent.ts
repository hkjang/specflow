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
 * 카테고리 분류 에이전트
 * 비즈니스/산업/기능/비기능 자동 분류
 */
@Injectable()
export class ClassifierAgent implements IRequirementAgent {
  private readonly logger = new Logger(ClassifierAgent.name);
  
  type = AgentType.CLASSIFIER;
  name = '카테고리 분류 에이전트';
  description = '요건을 산업, 비즈니스, 기능/비기능으로 자동 분류합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    if (input.type !== 'REQUIREMENTS' || !input.requirements?.length) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No requirements to classify'
      };
    }

    this.logger.log(`Classifying ${input.requirements.length} requirements`);

    const requirementsList = input.requirements.map((c, i) => 
      `${i + 1}. ${c.title}: ${c.content}`
    ).join('\n');

    const prompt = `당신은 소프트웨어 요건 분류 전문가입니다.

다음 요건들을 분류하세요.

요건 목록:
${requirementsList}

산업 컨텍스트: ${context.industry || '미지정'}

다음 JSON 형식으로 반환:
{
  "classifiedRequirements": [
    {
      "originalIndex": 1,
      "industry": "금융|의료|자동차|부동산|제조|물류|IT|기타",
      "businessDomain": "비즈니스 도메인명",
      "category": "기능요건|비기능요건|인터페이스|제약조건",
      "subcategory": "세부 카테고리",
      "tags": ["태그1", "태그2"],
      "confidence": 0.0-1.0
    }
  ]
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2500,
        temperature: 0.2
      }, 'REQUIREMENT_CLASSIFICATION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const classified = (parsed.classifiedRequirements || []).map((r: any) => {
          const original = input.requirements![r.originalIndex - 1];
          return {
            ...original,
            category: r.category,
            industry: r.industry,
            businessDomain: r.businessDomain,
            subcategory: r.subcategory,
            tags: r.tags,
            confidence: r.confidence || 0.8,
            thinkingLog: [
              ...(original?.thinkingLog || []),
              {
                timestamp: new Date(),
                agentType: this.type,
                reasoning: `분류됨: ${r.industry} > ${r.businessDomain} > ${r.category}`,
                confidence: r.confidence || 0.8
              }
            ]
          };
        });

        return {
          agentType: this.type,
          success: true,
          executionTime: 0,
          candidates: classified,
          metrics: {
            classifiedCount: classified.length,
            industries: [...new Set(classified.map((c: any) => c.industry))].length,
            categories: [...new Set(classified.map((c: any) => c.category))].length
          }
        };
      }

      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'Failed to parse AI response'
      };
    } catch (error: any) {
      this.logger.error('Classification failed', error);
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
