
import React from 'react';
import { ExplanationTooltip } from '@/components/common/ExplanationTooltip';

interface PageHeaderProps {
    title: string;
    description: string; // Action-oriented description
    badgeText?: string;  // e.g. "Admin Only"
    steps?: string[];    // Breadcrumbs or step indicator
}

export function PageHeader({ title, description, badgeText, steps }: PageHeaderProps) {
    return (
        <div className="mb-8 border-b pb-4">
            <div className="flex items-center gap-2 mb-1">
                {badgeText && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border">
                        {badgeText}
                    </span>
                )}
                {steps && (
                    <span className="text-xs text-slate-400">
                        {steps.join(' > ')}
                    </span>
                )}
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {title}
                    </h1>
                    <p className="mt-2 text-slate-600 text-sm">
                        {description}
                    </p>
                </div>
                {/* Placeholder for standard page actions like 'Help' or 'Settings' specific to page */}
                <div className="text-xs text-slate-400">
                    specflow-enterprise-v1.0
                </div>
            </div>
        </div>
    );
}
