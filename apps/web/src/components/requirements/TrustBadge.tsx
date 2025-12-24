
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { ExplanationTooltip } from '@/components/common/ExplanationTooltip';

interface TrustBadgeProps {
    score: number; // 0 to 100
    status: 'VERIFIED' | 'REVIEW' | 'DRAFT' | 'DEPRECATED';
}

export function TrustBadge({ score, status }: TrustBadgeProps) {
    let colorClass = "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200";
    let Icon = Shield;
    let text = "초안 (Draft)";

    if (status === 'VERIFIED') {
        colorClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
        Icon = ShieldCheck;
        text = `승인됨 (${score}점)`;
    } else if (status === 'REVIEW') {
        colorClass = "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200";
        Icon = ShieldAlert;
        text = "검토중";
    } else if (score < 50 && status !== 'DRAFT') {
        colorClass = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
        Icon = ShieldAlert;
        text = `주의 필요 (${score}점)`;
    }

    return (
        <div className="flex items-center gap-1 group">
            <Badge variant="outline" className={`gap-1 pr-3 pl-2 py-0.5 border ${colorClass} transition-colors cursor-help`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{text}</span>
            </Badge>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExplanationTooltip
                    title="신뢰도 점수 (Trust Score)"
                    content="이 요건의 신뢰도는 소스의 명확성, 최신 업데이트, 전문가 검증 여부를 종합하여 계산됩니다."
                />
            </span>
        </div>
    );
}
