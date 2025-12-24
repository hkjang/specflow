
'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Stethoscope, Activity, HeartPulse, Lock } from 'lucide-react';
import { useDomain } from '@/components/common/DomainContext';

export default function MedicalDashboardPage() {
    const { domain } = useDomain();

    if (domain !== 'MEDICAL') {
        return (
            <div className="p-8 text-center bg-slate-50 min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Stethoscope className="h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-600">의료 도메인 모드가 아닙니다.</h3>
                <p className="text-slate-500">상단 메뉴에서 [의료 (Medical)] 모드를 선택해주세요.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="의료 안전 대시보드 (Medical Safety)"
                description="환자 안전(Patient Safety)과 임상 데이터 무결성을 최우선으로 관리합니다."
                badgeText="GXP/HIPAA"
                steps={['관리자', '임상 안전 관리']}
            />

            {/* Critical Safety KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-teal-900 border-teal-800 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-teal-300 flex items-center gap-2">
                            <HeartPulse className="h-4 w-4" /> 환자 안전성 (Safety)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">100%</div>
                        <div className="text-xs text-teal-400 mt-1">Critical Incident 없음</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> 임상 유효성 (Validity)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">Verified</div>
                        <div className="text-xs text-emerald-500 mt-1 font-bold">SNOMED CT 표준 준수</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" /> 개인정보보호 (Privacy)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">GDPR</div>
                        <div className="text-xs text-slate-400 mt-1">가명화 처리 완료</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" /> 의료기기 등급
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">Class II</div>
                        <div className="text-xs text-blue-500 mt-1">FDA/KFDA 승인 기준</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clinical Validation Checklist */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">필수 임상 검증 항목 (Clinical Check)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0 divide-y divide-slate-100 border rounded-lg overflow-hidden">
                            <SafetyCheckItem title="환자 식별의 정확성" status="PASS" desc="이중 식별 수단 강제 적용됨" />
                            <SafetyCheckItem title="투약 경보 시스템" status="PASS" desc="알레르기 반응 자동 체크 활성화" />
                            <SafetyCheckItem title="응급 데이터 백업" status="WARN" desc="DR센터 동기화 지연 (3ms)" />
                            <SafetyCheckItem title="의료진 권한 분리" status="PASS" desc="처방 권한과 조제 권한 분리됨" />
                            <SafetyCheckItem title="장비 연동 프로토콜" status="PASS" desc="HL7/FHIR 표준 준수 확인" />
                        </div>
                    </CardContent>
                </Card>

                {/* Terminology Enforcement */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">의료 용어 표준 준수 현황</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-700">SNOMED CT Coverage</span>
                                <span className="text-teal-600 font-mono">94.5%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-teal-500 h-2 rounded-full w-[94.5%]"></div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-700">LOINC Code Mapping</span>
                                <span className="text-blue-600 font-mono">88.2%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full w-[88.2%]"></div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded border border-slate-100 mt-4">
                                <div className="text-xs font-bold text-slate-500 mb-2">비표준 용어 감지 (Non-standard Terms)</div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-xs rounded shadow-sm">Heart Attack (-> Myocardial Infarction)</span>
                                    <span className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-xs rounded shadow-sm">Sugar (-> Glucose)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SafetyCheckItem({ title, status, desc }: any) {
    const isPass = status === 'PASS';
    return (
        <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
            <div>
                <div className="font-bold text-sm text-slate-800">{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
            </div>
            {isPass ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">PASS</span>
            ) : (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 animate-pulse">CHECK</span>
            )}
        </div>
    );
}
