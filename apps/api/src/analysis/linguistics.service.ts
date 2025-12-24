
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LinguisticsService {
    private readonly logger = new Logger(LinguisticsService.name);

    // Mocking AI response for normalization
    async normalizeSentence(text: string): Promise<string> {
        this.logger.log(`Normalizing: ${text}`);

        // Simple heuristic mock for MVP
        // In real prod, this calls LLM with prompt: "Rewrite the following requirement in formal Korean technical style (ending in ~한다/해야 한다)."

        let normalized = text.trim();
        if (normalized.endsWith('요.') || normalized.endsWith('요')) {
            normalized = normalized.replace(/요\.?$/, '다.');
            normalized = normalized.replace(/해주세요/g, '해야 한다');
            normalized = normalized.replace(/할 수 있으면 좋겠어/g, '제공해야 한다');
        }

        // Ensure it looks like a formal requirement
        if (!normalized.endsWith('한다.') && !normalized.endsWith('다.')) {
            normalized += ' (Review Style)';
        }

        return normalized;
    }

    async decomposeComplexity(text: string): Promise<string[]> {
        this.logger.log(`Decomposing: ${text}`);
        // Mock logic: Split by conjunctions like '그리고', '하며', ','
        const parts = text.split(/,|그리고|하며/).map(p => p.trim()).filter(p => p.length > 0);

        // Re-add subject if missing in split parts (Advanced logic skipped for MVP)
        return parts.map(p => {
            if (!p.endsWith('다.')) return p + '해야 한다.';
            return p;
        });
    }
}
