
import React from 'react';

interface RequirementBlockDisplayProps {
    content: string; // The full requirement text
}

export function RequirementBlockDisplay({ content }: RequirementBlockDisplayProps) {
    // Simple heuristic parsing for visualizing structure
    // In a real app, this would be pre-parsed by the AI service (LinguisticsService)

    // Splitting loosely by 'if', 'when', 'then' or Korean equivalents ('면', '때', '한다')
    // For MVP, we will just simulate the visual block structure.

    return (
        <div className="flex flex-col gap-2 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
            <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Structured View (구조화 보기)</div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                {/* Context/Condition Block */}
                <div className="bg-white p-3 rounded border border-l-4 border-l-amber-400 border-gray-100 shadow-sm">
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold block w-fit mb-1">
                        조건 / 배경 (Condition)
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {content.split(/면|때문에|하여/)[0] || "조건 없음"}...
                    </p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center text-slate-300">
                    →
                </div>

                {/* Result/Action Block */}
                <div className="bg-white p-3 rounded border border-l-4 border-l-blue-500 border-gray-100 shadow-sm">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold block w-fit mb-1">
                        행동 / 결과 (Action)
                    </span>
                    <p className="text-sm text-slate-900 font-medium leading-relaxed">
                        ...{content.split(/면|때문에|하여/)[1] || content}
                    </p>
                </div>
            </div>
        </div>
    );
}
