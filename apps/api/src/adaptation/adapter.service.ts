import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ProjectContextService } from './project-context.service';

@Injectable()
export class AdapterService {
    constructor(
        private aiService: AiService,
        private contextService: ProjectContextService,
    ) { }

    async adaptRequirement(projectId: string, requirementContent: string): Promise<string> {
        const context = await this.contextService.getContext(projectId);
        if (!context) return requirementContent;

        const techStack = JSON.stringify(context.techStack);
        const styleGuide = JSON.stringify(context.styleGuide);
        const forbidden = context.forbiddenTech.join(', ');

        // This logic allows the Requirement to be rewritten to match the Org's Tech Stack
        // e.g. "Implement Login" -> "Implement Login using Spring Security and JWT" (if Java/Spring context)

        // We need to extend AIService to handle this generic prompt, 
        // or just assume we add a method `transformText` there.
        // For now, I'll mock the call or assume AiService has it. 
        // Since I can't modify AiService in the same tool call easily without context switch,
        // I will write the prompt here and assume we'll implement a `generativeTransform` method in AiService.

        // Let's modify AiService in next step to support this.
        return `[Adapted for ${techStack}] ${requirementContent}`;
    }
}
