
'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldAlert, Landmark, FileText, Scale } from 'lucide-react';
import { useDomain } from '@/components/common/DomainContext';

export default function FinanceDashboardPage() {
    const { domain } = useDomain();

    if (domain !== 'FINANCE') {
        return (
            <div className="p-8 text-center bg-slate-50 min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Landmark className="h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-600">금융 도메인 모드가 아닙니다.</h3>
                <p className="text-slate-500">상단 메뉴에서 [금융 (Finance)] 모드를 선택해주세요.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="금융 컴플라이언스 대시보드 (Financial Compliance)"
                description="금융소비자보호법 및 전자금융감독규정 준수 현황을 모니터링합니다."
                badgeText="FINANCE"
                steps={['관리자', '금융 규제 관리']}
            />

            {/* Critical KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-indigo-900 border-indigo-800 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                            <Scale className="h-4 w-4" /> 규제 준수율 (Adherence)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">98.2%</div>
                        <div className="text-xs text-indigo-400 mt-1">전자금융감독규정 기준</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> 미준수 리스크
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-rose-600">3건</div>
                        <div className="text-xs text-rose-500 mt-1 font-bold">즉시 조치 필요</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> 감사 증적 (Evidence)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">1,240</div>
                        <div className="text-xs text-slate-400 mt-1">자동 수집됨</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Landmark className="h-4 w-4" /> 망분리 정책
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">적용됨</div>
                        <div className="text-xs text-emerald-500 mt-1">내부망/외부망 분리 확인</div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">금융 리스크 히트맵 (Risk Heatmap)</CardTitle>
                        <p className="text-xs text-slate-500">시스템 중요도(System Criticality) 대비 재무적 파급효과(Financial Impact)</p>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-50 p-4 rounded border border-slate-100 h-[300px] relative grid grid-cols-3 grid-rows-3 gap-1">
                            {/* Grid Labels */}
                            <div className="absolute -left-6 top-1/2 -rotate-90 text-xs font-bold text-slate-400 text-center w-full">재무적 파급효과 (Impact)</div>
                            <div className="absolute bottom-[-24px] w-full text-center text-xs font-bold text-slate-400">시스템 중요도 (Criticality)</div>

                            {/* Cells */}
                            <RiskCell level="High" color="bg-rose-100 border-rose-200" count={2} label="Critical" />
                            <RiskCell level="High" color="bg-rose-50 border-rose-100" count={0} />
                            <RiskCell level="Medium" color="bg-amber-100 border-amber-200" count={5} label="Warning" />

                            <RiskCell level="High" color="bg-rose-50 border-rose-100" count={1} />
                            <RiskCell level="Medium" color="bg-amber-50 border-amber-100" count={8} />
                            <RiskCell level="Low" color="bg-slate-100 border-slate-200" count={12} />

                            <RiskCell level="Medium" color="bg-amber-50 border-amber-100" count={4} />
                            <RiskCell level="Low" color="bg-slate-100 border-slate-200" count={20} />
                            <RiskCell level="Low" color="bg-slate-50 border-slate-100" count={45} label="Safe" />
                        </div>
                    </CardContent>
                </Card>

                {/* Regulation List */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">주요 모니터링 규제</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <RegulationItem name="전자금융감독규정 제15조" status="OK" desc="해킹 등 방지대책" />
                            <RegulationItem name="신용정보법 제20조" status="OK" desc="개인신용정보 관리" />
                            <RegulationItem name="자본시장법 시행령" status="WARNING" desc="불공정거래 모니터링" isWarning />
                            <RegulationItem name="금융소비자보호법" status="OK" desc="설명의무 이행" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RiskCell({ level, color, count, label }: any) {
    return (
        <div className={`rounded flex flex-col items-center justify-center border ${color} relative transition-all hover:brightness-95 cursor-pointer`}>
            {label && <span className="absolute top-1 left-2 text-[10px] font-bold opacity-50 uppercase">{label}</span>}
            <span className="text-2xl font-bold text-slate-700">{count}</span>
            <span className="text-[10px] text-slate-500">items</span>
        </div>
    );
}

function RegulationItem({ name, status, desc, isWarning }: any) {
    return (
        <div className="flex items-start justify-between p-3 bg-white border border-slate-100 rounded hover:border-blue-200 transition-colors">
            <div>
                <div className="text-sm font-bold text-slate-700">{name}</div>
                <div className="text-xs text-slate-500">{desc}</div>
            </div>
            {isWarning ? (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">점검 필요</span>
            ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">정상</span>
            )}
        </div>
    );
}
