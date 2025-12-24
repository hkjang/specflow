import { Injectable } from '@nestjs/common';
import { RequirementDraft } from '@prisma/client';

export interface QaIssue {
    draftId: string;
    type: 'AMBIGUITY' | 'OMISSION' | 'CONFLICT';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class QualityAssuranceService {

    analyzeDrafts(drafts: Partial<RequirementDraft>[]): QaIssue[] {
        const issues: QaIssue[] = [];

        drafts.forEach(draft => {
            // 1. Check for Ambiguity
            const ambiguousWords = ['fast', 'user-friendly', 'efficient', 'robust', 'seamless', 'easy'];
            const contentLower = (draft.content || '').toLowerCase();

            ambiguousWords.forEach(word => {
                if (contentLower.includes(word)) {
                    issues.push({
                        draftId: draft.id || '',
                        type: 'AMBIGUITY',
                        message: `Contains ambiguous term: "${word}". Define specific metrics.`,
                        severity: 'MEDIUM'
                    });
                }
            });

            // 2. Check for Omissions (Type check)
            if (!draft.type || draft.type === 'Unknown') {
                issues.push({
                    draftId: draft.id || '',
                    type: 'OMISSION',
                    message: 'Requirement type is missing.',
                    severity: 'LOW'
                });
            }

            // 3. Simple Conflict/Duplicate Check (Intra-batch)
            drafts.forEach(other => {
                if (other !== draft && other.content === draft.content) {
                    // Avoid double counting
                    if ((draft.id || '') < (other.id || '')) {
                        issues.push({
                            draftId: draft.id || '',
                            type: 'CONFLICT',
                            message: 'Potential duplicate requirement detected.',
                            severity: 'HIGH'
                        });
                    }
                }
            });
        });

        return issues;
    }
}
