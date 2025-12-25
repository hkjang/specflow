'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart3, PieChart, TrendingUp, Layers, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendData {
    date: string;
    count: number;
}

interface ProgressStats {
    statusDistribution: { status: string; count: number }[];
    maturityDistribution: { maturity: string; count: number }[];
    weeklyTrend: { week: string; created: number; approved: number }[];
    extractionStats: { status: string; count: number }[];
}

export default function AnalysisPage() {
    const [classificationStats, setClassificationStats] = useState<any>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [progress, setProgress] = useState<ProgressStats | null>(null);
    const [quality, setQuality] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [classRes, trendsRes, progressRes, qualityRes] = await Promise.all([
                    adminApi.getClassificationStats().catch(() => ({ data: { total: 0, byCategory: {} } })),
                    adminApi.getTrends('daily').catch(() => ({ data: [] })),
                    adminApi.getProgressStats().catch(() => ({ data: null })),
                    adminApi.getQualityMetrics().catch(() => ({ data: null })),
                ]);
                setClassificationStats(classRes.data);
                setTrends(trendsRes.data);
                setProgress(progressRes.data);
                setQuality(qualityRes.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">분석 데이터 로딩 중...</div>;

    const categories = classificationStats?.byCategory || {};
    const total = classificationStats?.total || 1;

    // Calculate trend direction
    const trendDirection = trends.length >= 2 
        ? trends[trends.length - 1].count > trends[trends.length - 2].count ? 'up' 
        : trends[trends.length - 1].count < trends[trends.length - 2].count ? 'down' : 'flat'
        : 'flat';

    const totalTrendCount = trends.reduce((a, b) => a + b.count, 0);
    const avgPerDay = trends.length > 0 ? (totalTrendCount / trends.length).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="추세 분석 대시보드 (Trend Analysis)"
                description="요건 데이터의 분포, 품질 추이, 시스템 활용도를 심층 분석합니다."
                badgeText="INTELLIGENCE"
                steps={['관리자', '분석 및 통계']}
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-bold text-slate-500">30일간 총 요건</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalTrendCount}건</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-bold text-slate-500">일평균 등록</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-1">{avgPerDay}건</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500">추세</p>
                            <p className="text-2xl font-extrabold text-slate-800 mt-1">
                                {trendDirection === 'up' ? '상승' : trendDirection === 'down' ? '하락' : '유지'}
                            </p>
                        </div>
                        {trendDirection === 'up' && <ArrowUp className="h-8 w-8 text-green-500" />}
                        {trendDirection === 'down' && <ArrowDown className="h-8 w-8 text-red-500" />}
                        {trendDirection === 'flat' && <Minus className="h-8 w-8 text-slate-400" />}
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-bold text-slate-500">품질 점수 (평균)</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-1">
                            {quality?.averages?.overallScore?.toFixed(1) || '-'}/100
                        </p>
                    </CardContent>
                </Card>
            </div>

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

                {/* Status Distribution from Progress */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Layers className="h-4 w-4 text-indigo-500" />
                            요건 상태 분포 (Status Distribution)
                        </CardTitle>
                        <CardDescription>현재 요건들의 워크플로우 상태입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {progress?.statusDistribution && progress.statusDistribution.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                {progress.statusDistribution.map(item => {
                                    const statusTotal = progress.statusDistribution.reduce((a, b) => a + b.count, 0);
                                    const percent = statusTotal > 0 ? Math.round((item.count / statusTotal) * 100) : 0;
                                    const colors: Record<string, string> = {
                                        DRAFT: 'bg-slate-400', REVIEW: 'bg-amber-500', APPROVED: 'bg-green-500', DEPRECATED: 'bg-red-400'
                                    };
                                    return (
                                        <div key={item.status} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-slate-700">{item.status}</span>
                                                <span className="text-slate-500 font-mono">{item.count}건 ({percent}%)</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${colors[item.status] || 'bg-slate-400'}`} style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-slate-400 text-sm text-center py-4">상태 데이터가 없습니다.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Real Trend Chart */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        최근 30일 요건 등록 추이 (Daily Velocity)
                    </CardTitle>
                    <CardDescription>일별 신규 등록 요건 수입니다. 막대 위에 마우스를 올려 상세 확인하세요.</CardDescription>
                </CardHeader>
                <CardContent>
                    {trends.length === 0 ? (
                        <div className="h-56 flex items-center justify-center text-slate-400">추세 데이터가 없습니다.</div>
                    ) : (
                        <>
                            <div className="h-56 flex items-end gap-1 px-2 pb-2">
                                {trends.map((d, i) => {
                                    const maxCount = Math.max(...trends.map(t => t.count), 1);
                                    const height = (d.count / maxCount) * 100;
                                    return (
                                        <div 
                                            key={d.date} 
                                            className="flex-1 bg-emerald-100 hover:bg-emerald-400 transition-all rounded-t relative group cursor-pointer" 
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                                {d.date.substring(5)}: {d.count}건
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-2">
                                <span>{trends[0]?.date?.substring(5) || '30일 전'}</span>
                                <span>{trends[trends.length - 1]?.date?.substring(5) || '오늘'}</span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Weekly Comparison */}
            {progress?.weeklyTrend && progress.weeklyTrend.length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            주간 비교 (Weekly Comparison)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            {progress.weeklyTrend.map(week => (
                                <div key={week.week} className="text-center p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs font-bold text-slate-500">{week.week}</p>
                                    <p className="text-2xl font-extrabold text-indigo-600 mt-1">{week.created}</p>
                                    <p className="text-xs text-slate-400 mt-1">{week.approved} 승인</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
