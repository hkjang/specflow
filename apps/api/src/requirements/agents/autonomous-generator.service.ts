import { Injectable, Logger } from '@nestjs/common';
import { AiProviderManager } from '../../ai/provider/ai-provider.manager';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  AutonomousGenerationConfig, 
  RequirementCandidate,
  ThinkingLogEntry,
  AgentType 
} from './agent.interface';

@Injectable()
export class AutonomousGeneratorService {
  private readonly logger = new Logger(AutonomousGeneratorService.name);

  constructor(
    private aiManager: AiProviderManager,
    private prisma: PrismaService
  ) {}

  async generateRequirements(config: AutonomousGenerationConfig): Promise<{
    requirements: RequirementCandidate[];
    thinkingProcess: ThinkingLogEntry[];
    metadata: {
      config: AutonomousGenerationConfig;
      generatedAt: string;
      totalGenerated: number;
    };
  }> {
    this.logger.log(`Generating requirements for ${config.industry} / ${config.systemType}`);

    const thinkingProcess: ThinkingLogEntry[] = [];

    const references = await this.getSuccessfulReferences();
    thinkingProcess.push({
      timestamp: new Date(),
      agentType: AgentType.EXTRACTOR,
      reasoning: `${config.industry} 산업의 성공 사례 ${references.length}건 참조`,
      references: references.map(r => r.id),
      confidence: 0.8
    });

    const failures = await this.getFailureCases();
    thinkingProcess.push({
      timestamp: new Date(),
      agentType: AgentType.RISK_DETECTOR,
      reasoning: `과거 실패 사례 ${failures.length}건 반례로 참조`,
      references: failures.map(f => f.id),
      confidence: 0.7
    });

    const prompt = this.buildGenerationPrompt(config, references, failures);
    
    try {
      const response = await this.aiManager.execute({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4000,
        temperature: 0.4
      }, 'AUTONOMOUS_GENERATION');

      const text = response.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const requirements: RequirementCandidate[] = (parsed.requirements || []).map((r: any) => ({
          title: r.title,
          content: r.content,
          type: r.type,
          category: r.category,
          confidence: r.confidence || 0.75,
          source: 'AI_AUTONOMOUS',
          thinkingLog: [
            ...thinkingProcess,
            {
              timestamp: new Date(),
              agentType: AgentType.EXPANDER,
              reasoning: r.reasoning || 'AI 자율 생성',
              references: r.references || [],
              confidence: r.confidence || 0.75
            }
          ]
        }));

        this.logger.log(`Generated ${requirements.length} requirements`);

        return {
          requirements,
          thinkingProcess,
          metadata: {
            config,
            generatedAt: new Date().toISOString(),
            totalGenerated: requirements.length
          }
        };
      }

      throw new Error('Failed to parse AI response');
    } catch (error: any) {
      this.logger.error('Autonomous generation failed', error);
      throw error;
    }
  }

  async getThinkingLog(requirementId: string): Promise<ThinkingLogEntry[]> {
    // Return empty array as thinkingLog is not stored in DB
    this.logger.log(`Getting thinking log for ${requirementId}`);
    return [];
  }

  private async getSuccessfulReferences(): Promise<{ id: string; code: string }[]> {
    try {
      const successful = await this.prisma.requirement.findMany({
        where: {
          status: 'APPROVED',
          trustGrade: { gte: 0.8 }
        },
        select: { id: true, code: true },
        take: 10
      });
      return successful;
    } catch {
      return [];
    }
  }

  private async getFailureCases(): Promise<{ id: string; reason: string }[]> {
    try {
      const failed = await this.prisma.requirement.findMany({
        where: {
          status: 'DEPRECATED',
          trustGrade: { lt: 0.5 }
        },
        select: { id: true, code: true },
        take: 5
      });
      return failed.map(f => ({ id: f.id, reason: '' }));
    } catch {
      return [];
    }
  }

  private buildGenerationPrompt(
    config: AutonomousGenerationConfig,
    references: any[],
    failures: any[]
  ): string {
    return `당신은 소프트웨어 요건 전문가입니다. 주어진 조건에 맞는 요건 세트를 생성하세요.

## 프로젝트 컨텍스트
- 산업: ${config.industry}
- 시스템 유형: ${config.systemType}
- 조직 성숙도: ${config.organizationMaturity}
- 규제 수준: ${config.regulationLevel}

## 요구사항
${config.includeNonFunctional ? '- 비기능 요건 포함' : ''}
${config.includeSecurityRequirements ? '- 보안 요건 필수 포함' : ''}
- 최대 ${config.maxRequirements || 20}개 요건 생성

## 참조 정보
- 성공 사례: ${references.length}건 참조됨
- 반례 (과거 실패): ${failures.length}건 참조됨

다음 JSON 형식으로 반환:
{
  "requirements": [
    {
      "title": "요건 제목",
      "content": "시스템은 ~ 해야 한다 형식의 상세 요건",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|INTERFACE|CONSTRAINT",
      "category": "카테고리",
      "reasoning": "이 요건을 생성한 이유",
      "confidence": 0.0-1.0
    }
  ]
}

JSON만 반환하세요.`;
  }
}
