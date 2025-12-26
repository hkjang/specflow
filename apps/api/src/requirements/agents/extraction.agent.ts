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
 * 요건 추출 에이전트
 * 비정형 문서, 웹, PDF, 회의록에서 요건 후보 추출
 */
@Injectable()
export class ExtractionAgent implements IRequirementAgent {
  private readonly logger = new Logger(ExtractionAgent.name);
  
  type = AgentType.EXTRACTOR;
  name = '요건 추출 에이전트';
  description = '비정형 문서에서 요건 후보를 추출합니다.';

  constructor(private aiManager: AiProviderManager) {}

  async execute(input: AgentInput, context: AgentContext): Promise<AgentResult> {
    this.logger.log(`Extracting requirements from ${input.type}`);

    const content = this.getContent(input);
    if (!content) {
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: 'No content provided'
      };
    }

    const prompt = `당신은 소프트웨어 요건 추출 전문가입니다.

다음 문서에서 소프트웨어 요건을 추출하세요.

문서 내용:
${content.substring(0, 5000)}

다음 JSON 형식으로 반환:
{
  "requirements": [
    {
      "title": "요건 제목",
      "content": "구체적인 요건 내용 (시스템은 ~해야 한다 형식)",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|INTERFACE|CONSTRAINT",
      "confidence": 0.0-1.0
    }
  ],
  "sourceType": "DOCUMENT|MEETING|WEB|OTHER",
  "extractionNotes": "추출 시 고려한 사항"
}

JSON만 반환하세요.`;

    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 3000,
        temperature: 0.2
      }, 'REQUIREMENT_EXTRACTION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const candidates: RequirementCandidate[] = (parsed.requirements || []).map((r: any) => ({
          title: r.title,
          content: r.content,
          type: r.type,
          confidence: r.confidence || 0.7,
          source: parsed.sourceType,
          thinkingLog: [{
            timestamp: new Date(),
            agentType: this.type,
            reasoning: `문서에서 추출됨. ${parsed.extractionNotes || ''}`,
            confidence: r.confidence || 0.7
          }]
        }));

        return {
          agentType: this.type,
          success: true,
          executionTime: 0,
          candidates,
          metrics: {
            extractedCount: candidates.length,
            avgConfidence: candidates.reduce((s, c) => s + c.confidence, 0) / candidates.length
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
      this.logger.error('Extraction failed', error);
      return {
        agentType: this.type,
        success: false,
        executionTime: 0,
        error: error.message
      };
    }
  }

  private getContent(input: AgentInput): string {
    switch (input.type) {
      case 'TEXT':
        return input.content || '';
      case 'FILE':
        // TODO: Parse file buffer based on type
        return input.content || '';
      case 'URL':
        // TODO: Fetch URL content
        return input.content || '';
      default:
        return '';
    }
  }

  validate(input: AgentInput): boolean {
    return input.type !== 'REQUIREMENTS' && !!input.content;
  }
}
