'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart3, PieChart, TrendingUp, Layers, Activity } from 'lucide-react';

export default function AnalysisPage() {
    const [classificationStats, setClassificationStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminApi.getClassificationStats();
                setClassificationStats(res.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">분석 데이터 로딩 중...</div>;

    // Mock distribution for visualization if data is simple
    // classificationStats = { total: 10, byCategory: { 'Payment': 5, 'Auth': 2 ... } }
    const categories = classificationStats?.byCategory || {};
    const total = classificationStats?.total || 1; // avoid div by 0

    return (
        <div className="space-y-6">
            <PageHeader
                title="통합 분석 대시보드 (Analysis Dashboard)"
                description="요건 데이터의 분포, 품질 추이, 시스템 활용도를 심층 분석합니다."
                badgeText="INTELLIGENCE"
                steps={['관리자', '분석 및 통계']}
            />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Category Distribution */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <PieChart className="h-4 w-4 text-blue-500" />
                            카테고리별 요건 분포 (Category Distribution)
                        </CardTitle>
                        <CardDescription>기능 영역별 요건 자산의 비중입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-2">
                            {Object.entries(categories).length === 0 && <div className="text-slate-400 text-sm text-center py-4">분석할 데이터가 없습니다.</div>}
                            {Object.entries(categories).map(([cat, count]: [string, any]) => (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">{cat}</span>
                                        <span className="text-slate-500 font-mono">{count}건 ({Math.round(count / total * 100)}%)</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${(count / total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quality Insight Placeholder */}
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Layers className="h-4 w-4 text-indigo-500" />
                            요건 품질 심층 분석 (Deep Quality Insight)
                        </CardTitle>
                        <CardDescription>요건의 무결성 및 논리적 모순을 자동 분석합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center space-y-5">
                        <div className="bg-white p-4 rounded-full shadow-sm border border-indigo-100">
                            <Activity className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-lg">고급 분석 기능 활성화 필요</p>
                            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                                전체 요건에 대한 벡터 기반 일관성 검사와 의미론적 중복 분석 리포트를 생성하려면 Enterprise 플랜이 필요합니다.
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-700">On-Demand Feature</Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Simulated Trend Deep Dive */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        최근 30일 요건 등록 속도 (Velocity)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-56 flex items-end gap-1 px-2 pb-2">
                        {[...Array(30)].map((_, i) => {
                            const height = Math.random() * 100;
                            return (
                                <div key={i} className="flex-1 bg-slate-100 hover:bg-emerald-200 hover:scale-y-105 transition-all rounded-t relative group cursor-pointer" style={{ height: `${height}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                        {Math.round(height)}건
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-2">
                        <span>30일 전</span>
                        <span>오늘</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
