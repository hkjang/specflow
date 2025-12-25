'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Target, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function AccuracyAnalysisPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="정확도 분석 (Accuracy Analysis)"
                description="AI 분류 및 추출 모델의 정확도와 성능을 분석합니다."
                badgeText="QUALITY"
                steps={['관리자', '품질 관리', '정확도 분석']}
            />

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-bold text-slate-500">추출 정확도</p>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800">92.5%</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <p className="text-xs font-bold text-slate-500">분류 정확도</p>
                        </div>
                        <p className="text-2xl font-extrabold text-green-600">88.3%</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <p className="text-xs font-bold text-slate-500">오분류 건수</p>
                        </div>
                        <p className="text-2xl font-extrabold text-amber-600">12건</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-bold text-slate-500">정확도 추이</p>
                        </div>
                        <p className="text-2xl font-extrabold text-indigo-600">↑ 3.2%</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>모델별 성능 비교</CardTitle>
                    <CardDescription>AI 모델별 정확도 및 처리 성능입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-slate-400">
                        정확도 분석 데이터가 수집되면 여기에 표시됩니다.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
