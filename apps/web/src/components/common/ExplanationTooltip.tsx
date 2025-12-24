
import React from 'react';
import { Info, HelpCircle } from 'lucide-react';

interface ExplanationTooltipProps {
    content?: string;
    title?: string;
}

export function ExplanationTooltip({ title, content }: ExplanationTooltipProps) {
    if (!content) return null;

    return (
        <div className="group relative list-none ml-2 inline-flex items-center">
            <span className="cursor-help text-muted-foreground hover:text-primary transition-colors">
                <HelpCircle className="w-4 h-4" />
            </span>
            <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-sm rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto"
            >
                {title && <div className="font-semibold mb-1 border-b pb-1">{title}</div>}
                <div className="text-xs leading-relaxed">{content}</div>
                <div className="absolute left-1/2 -ml-1 top-full w-0 h-0 border-4 border-transparent border-t-popover"></div>
            </div>
        </div>
    );
}
