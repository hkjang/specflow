import { Injectable } from '@nestjs/common';
import { AiProviderManager } from './provider/ai-provider.manager';

@Injectable()
export class AiService {

    constructor(private readonly providerManager: AiProviderManager) { }

    async translateToKorean(text: string): Promise<string> {
        const prompt = `
            Translate the following software requirement text into natural, professional Korean.
            Maintain technical terms in English if they are industry standards (e.g. API, REST, SSO).
            
            Input Text: "${text}"
            
            Output ONLY the translated text.
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            }, 'TRANSLATION');

            return response.content.trim();
        } catch (e) {
            console.error('Translation failed', e);
            return text;
        }
    }

    async standardizeRequirement(text: string): Promise<string> {
        const prompt = `
            Rewrite the following Korean software requirement to follow standard requirement syntax.
            
            Rules:
            1. Use the sentence structure: "subject" + "must/should" + "action".
            2. End the sentence with "~해야 한다" (must).
            3. Use present tense.
            4. Remove vague words like "appropriately", "possibly".
            
            Input: "${text}"
            
            Output ONLY the rewritten text.
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            }, 'STANDARDIZATION');

            return response.content.trim();
        } catch (e) {
            console.error('Standardization failed', e);
            return text;
        }
    }

    async classifyRequirement(text: string, categoriesContext: any[]): Promise<{ categoryCodes: string[], confidence: number, reasoning: string }> {
        const categoriesList = categoriesContext.map(c => `${c.code} (${c.level}): ${c.name} - ${c.description}`).join('\n');

        const prompt = `
      You are a Senior Requirement Analyst.
      Classify the following software requirement into the provided categories.
      
      Input Requirement: "${text}"
      
      Categories Hierarchy:
      ${categoriesList}

      Instructions:
      1. Select the most specific LEAF categories if possible.
      2. If a requirement implies multiple domains (e.g., "Login speed" -> Security + Performance), select both.
      3. Assign a confidence score (0.0 - 1.0) based on how clearly the text matches the category description.
      
      Respond ONLY in JSON format:
      {
        "categoryCodes": ["CODE1", "CODE2"],
        "confidence": 0.95,
        "reasoning": "Explain why these categories were chosen."
      }
    `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0,
            }, 'CLASSIFICATION');

            return JSON.parse(response.content || '{}');
        } catch (error) {
            console.error('AI Classification Failed', error);
            // Partial fallback if parsing fails but content exists? rarely happens with json_object mode
            return { categoryCodes: [], confidence: 0, reasoning: 'AI Error: ' + error.message };
        }
    }
    async generateExplanation(key: string, category: string, context?: string): Promise<{ title: string, content: string, examples: string }> {
        const prompt = `
            You are a UX writer for a Korean enterprise software.
            Generate a helpful explanation for a UI element.
            
            Context:
            - Key: ${key} (This indicates the location/type of the element)
            - Category: ${category} (MENU, SCREEN, FIELD, etc.)
            - Additional Context: ${context || 'N/A'}
            
            Language: Korean (Natural, Professional, Friendly)
            
            Output JSON:
            {
                "title": "Short descriptive title (max 5 words)",
                "content": "Clear explanation of what this is and why it's used (1-2 sentences)",
                "examples": "Practical example of value or usage (optional)"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.7,
            }, 'GENERATION');

            if (!response.content) {
                throw new Error('Empty response from AI provider');
            }

            return JSON.parse(response.content);
        } catch (e) {
            console.error('Explanation generation failed', e);
            throw new Error(`Failed to generate explanation: ${e.message}`);
        }
    }

    async summarize(text: string): Promise<{ summary: string; points: string[] }> {
        const prompt = `
            Analyze the following requirement text and provide a concise summary.
            
            Text: "${text}"
            
            Language: Korean
            Output JSON:
            {
                "summary": "One line summary of the requirement",
                "points": ["Key point 1", "Key point 2"]
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.3,
            }, 'GENERATION');

            return JSON.parse(response.content || '{}');
        } catch (e) {
            console.error('Summary generation failed', e);
            throw new Error('Failed to generate summary');
        }
    }

    async improve(text: string): Promise<{ suggestion: string; reason: string }> {
        const prompt = `
            Review the following requirement text and suggest improvements for clarity, professionalism, and standard format (System must...).
            
            Text: "${text}"
            
            Language: Korean
            Output JSON:
            {
                "suggestion": "Rewritten text",
                "reason": "Why this is better (e.g. removed ambiguity, standardized format)"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.5,
            }, 'GENERATION');

            return JSON.parse(response.content || '{}');
        } catch (e) {
            console.error('Improvement generation failed', e);
            throw new Error('Failed to generate improvement');
        }
    }

    /**
     * Convert news article to IT development/operation requirements
     */
    async convertNewsToRequirements(newsTitle: string, newsContent: string): Promise<{
        requirements: Array<{
            title: string;
            content: string;
            type: string;
            priority: string;
            rationale: string;
        }>;
        relevanceScore: number;
        summary: string;
    }> {
        const prompt = `
            당신은 시니어 IT 요건 분석가입니다.
            다음 뉴스 기사를 분석하여 IT 시스템 개발 또는 운영에 필요한 요건을 도출해주세요.
            
            뉴스 제목: "${newsTitle}"
            뉴스 내용: "${newsContent.slice(0, 2000)}"
            
            분석 지침:
            1. 이 뉴스에서 IT 시스템에 적용해야 할 사항이 있는지 파악
            2. 보안, 규정 준수, 성능, 사용자 경험 등의 관점에서 요건 도출
            3. 실행 가능하고 측정 가능한 요건으로 작성
            4. "시스템은 ~해야 한다" 형식으로 작성
            5. 관련성이 낮은 뉴스라면 빈 배열 반환
            
            JSON 형식으로 응답:
            {
                "requirements": [
                    {
                        "title": "요건 제목 (간결하게)",
                        "content": "상세 요건 내용 (시스템은 ~해야 한다 형식)",
                        "type": "SECURITY | PERFORMANCE | COMPLIANCE | UX | FUNCTIONAL | OPERATIONAL",
                        "priority": "HIGH | MEDIUM | LOW",
                        "rationale": "이 요건이 필요한 이유 (뉴스 기반)"
                    }
                ],
                "relevanceScore": 0.0-1.0,
                "summary": "뉴스 요약 및 IT 시스템 관련성 설명"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.3,
            }, 'GENERATION');

            const result = JSON.parse(response.content || '{}');
            console.log(`[AI] Extracted ${result.requirements?.length || 0} requirements from news: "${newsTitle}"`);
            return result;
        } catch (e) {
            console.error('News to requirement conversion failed', e);
            return { requirements: [], relevanceScore: 0, summary: 'AI 분석 실패' };
        }
    }

    /**
     * Convert any crawled content to IT development/operation requirements
     * Works for regulations, documents, competitor analysis, internal wikis, etc.
     */
    async convertContentToRequirements(contentTitle: string, content: string, sourceType: string): Promise<{
        requirements: Array<{
            title: string;
            content: string;
            type: string;
            priority: string;
            rationale: string;
            category: string;
        }>;
        relevanceScore: number;
        summary: string;
    }> {
        const prompt = `
            당신은 시니어 IT 요건 분석가입니다.
            다음 수집된 콘텐츠를 분석하여 IT 시스템 개발 또는 운영에 필요한 요건을 도출해주세요.
            
            콘텐츠 출처: ${sourceType}
            콘텐츠 제목: "${contentTitle}"
            콘텐츠 내용: "${content.slice(0, 3000)}"
            
            분석 지침:
            1. 콘텐츠 유형에 맞게 요건 도출:
               - REGULATION: 법규/규정 준수 요건
               - COMPETITOR: 경쟁사 대응 기능 요건
               - NEWS: 기술 트렌드 반영 요건
               - INTERNAL: 내부 프로세스 개선 요건
               - SECURITY: 보안 강화 요건
            2. "시스템은 ~해야 한다" 형식으로 작성
            3. 실행 가능하고 측정 가능한 요건으로 작성
            4. 각 요건에 적절한 분류(category)를 지정
            5. 관련성이 낮으면 빈 배열 반환
            
            JSON 형식으로 응답:
            {
                "requirements": [
                    {
                        "title": "요건 제목",
                        "content": "시스템은 ~해야 한다",
                        "type": "SECURITY | PERFORMANCE | COMPLIANCE | UX | FUNCTIONAL | OPERATIONAL",
                        "priority": "HIGH | MEDIUM | LOW",
                        "rationale": "이 요건이 필요한 이유",
                        "category": "AUTH | DATA | API | UI | INFRA | MONITORING | PAYMENT | NOTIFICATION"
                    }
                ],
                "relevanceScore": 0.0-1.0,
                "summary": "콘텐츠 요약 및 IT 시스템 관련성"
            }
        `;

        try {
            const response = await this.providerManager.execute({
                messages: [{ role: 'user', content: prompt }],
                responseFormat: 'json_object',
                temperature: 0.3,
            }, 'GENERATION');

            const result = JSON.parse(response.content || '{}');
            console.log(`[AI] Extracted ${result.requirements?.length || 0} requirements from ${sourceType}: "${contentTitle}"`);
            return result;
        } catch (e) {
            console.error('Content to requirement conversion failed', e);
            return { requirements: [], relevanceScore: 0, summary: 'AI 분석 실패' };
        }
    }
}
