'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp, AlertOctagon, Activity, Zap, Database, Users } from 'lucide-react';
import { AiTrendSummary } from '@/components/admin/AiTrendSummary';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';

interface ProgressStats {
    statusDistribution: { status: string; count: number }[];
    maturityDistribution: { maturity: string; count: number }[];
    weeklyTrend: { week: string; created: number; approved: number }[];
    extractionStats: { status: string; count: number }[];
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [quality, setQuality] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [risks, setRisks] = useState<any>(null);
    const [progress, setProgress] = useState<ProgressStats | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, qualityRes, trendsRes, risksRes, progressRes, activitiesRes] = await Promise.all([
                    adminApi.getOverallStats(),
                    adminApi.getQualityMetrics(),
                    adminApi.getTrends('daily'),
                    adminApi.getRisks(),
                    adminApi.getProgressStats(),
                    adminApi.getRecentActivities(5),
                ]);

                setStats(statsRes.data);
                setQuality(qualityRes.data);
                setTrends(trendsRes.data);
                setRisks(risksRes.data);
                setProgress(progressRes.data);
                setActivities(activitiesRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">대시보드 데이터를 불러오고 있습니다...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="운영 대시보드 (Operations Dashboard)"
                description="전사 요건 자산의 현황, 품질, 리스크를 한눈에 파악하고 조치합니다."
                badgeText="ADMIN"
                steps={['관리자 콘솔', '전체 현황']}
            />

            {/* AI Summary Widget - Assuming AiTrendSummary handles its own localization or we wrap it */}
            <AiTrendSummary />

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="전체 요건 자산"
                    value={stats?.total || 0}
                    icon={FileText}
                    description="등록된 모든 요건"
                    color="text-slate-600"
                />
                <StatCard
                    title="검토 대기 중"
                    value={stats?.byStatus?.['REVIEW'] || 0}
                    icon={Clock}
                    description="승인 또는 반려 필요"
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                />
                <StatCard
                    title="검증 완료 (Verified)"
                    value={stats?.byStatus?.['VERIFIED'] || stats?.byStatus?.['APPROVED'] || 0}
                    icon={CheckCircle}
                    description="개발 및 테스트 완료"
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                />
                <StatCard
                    title="리스크/지연"
                    value={risks?.riskyRequirements?.length || 0}
                    icon={AlertTriangle}
                    description="주의가 필요한 항목"
                    color="text-rose-600"
                    bgColor="bg-rose-50"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Quality Metrics */}
                <Card className="col-span-4 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Activity className="h-4 w-4 text-blue-500" />
                            요건 품질 지수 (Quality Health)
                        </CardTitle>
                        <p className="text-xs text-slate-500">AI가 분석한 요건의 명확성, 완전성, 중복성 점수입니다.</p>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <QualityIndicators data={quality?.averages} />
                    </CardContent>
                </Card>

                {/* Risk Alerts */}
                <Card className="col-span-3 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <AlertOctagon className="h-4 w-4 text-rose-500" />
                            최근 알림 및 리스크
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RiskList items={risks?.alerts} />
                    </CardContent>
                </Card>
            </div>

            {/* Trends */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">신규 요건 등록 추이</CardTitle>
                        <p className="text-xs text-slate-500">최근 30일간 등록된 요건 수</p>
                    </CardHeader>
                    <CardContent>
                        <SimpleBarChart data={trends} />
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">산업별 요건 분포</CardTitle>
                        <p className="text-xs text-slate-500">비즈니스 도메인별 자산 비중</p>
                    </CardHeader>
                    <CardContent>
                        {/* Mock data for visualization */}
                            {/* Real extraction stats */}
                            {progress?.extractionStats && progress.extractionStats.length > 0 ? (
                                <div className="space-y-3 pt-2">
                                    <p className="text-xs text-slate-500 mb-2">AI 추출 작업 현황</p>
                                    {progress.extractionStats.map(item => {
                                        const total = progress.extractionStats.reduce((a, b) => a + b.count, 0);
                                        const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                                        const colors: Record<string, string> = {
                                            COMPLETED: 'bg-green-500',
                                            PROCESSING: 'bg-blue-500',
                                            PENDING: 'bg-amber-500',
                                            FAILED: 'bg-red-500'
                                        };
                                        return (
                                            <div key={item.status} className="flex items-center text-sm">
                                                <div className="w-24 font-medium text-slate-700">{item.status}</div>
                                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full mx-3 overflow-hidden">
                                                    <div className={`h-full rounded-full ${colors[item.status] || 'bg-slate-400'}`} style={{ width: `${percent}%` }} />
                                                </div>
                                                <div className="w-12 text-right font-mono text-slate-600">{item.count}건</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 p-4">추출 작업 데이터가 없습니다.</div>
                            )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activities Section */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        시스템 최근 활동 (Recent System Activity)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="text-sm text-slate-400 p-4">최근 활동이 없습니다.</div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {activities.map((a: any) => (
                                <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="h-2 w-2 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{a.user} • {new Date(a.timestamp).toLocaleString()}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">{a.code}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, description, color, bgColor }: any) {
    return (
        <Card className={`border-slate-200 shadow-sm overflow-hidden ${bgColor || 'bg-white'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-slate-700">
                    {title}
                </CardTitle>
                {Icon && <Icon className={`h-4 w-4 ${color || "text-slate-500"}`} />}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-extrabold ${color || 'text-slate-900'}`}>{value}</div>
                <p className="text-xs text-slate-500 mt-1">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

function QualityIndicators({ data }: { data: any }) {
    if (!data) return <div className="text-sm text-slate-400 p-4">데이터가 없습니다.</div>;

    const metrics = [
        { key: 'ambiguityScore', label: '명확성 (Ambiguity)', desc: '모호한 표현이 적을수록 높음' },
        { key: 'redundancyScore', label: '간결성 (Redundancy)', desc: '중복이 적을수록 높음' },
        { key: 'completeness', label: '완전성 (Completeness)', desc: '필수 요소 포함 여부' },
        { key: 'correctness', label: '정확성 (Correctness)', desc: '용어 및 문법 준수' },
    ];

    return (
        <div className="space-y-5 p-2">
            {metrics.map((m) => {
                const value = data[m.key] || 0;
                return (
                    <div key={m.key} className="group">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors cursor-help" title={m.desc}>
                                {m.label}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600">{value.toFixed(1)}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${value}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RiskList({ items }: { items: any[] }) {
    if (!items || items.length === 0) return <div className="text-sm text-slate-500 p-2">최근 발생한 리스크 알림이 없습니다.</div>;

    return (
        <div className="space-y-3">
            {items.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-rose-50/50 rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors">
                    <AlertOctagon className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-rose-800">{alert.title}</h4>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">{alert.message}</p>
                        <span className="text-[10px] text-rose-400 block mt-1.5 font-medium">
                            {new Date(alert.createdAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SimpleBarChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="text-sm text-slate-400 p-4">분석할 추세 데이터가 없습니다.</div>;

    const maxValue = Math.max(...data.map(d => d.count)) || 1;

    return (
        <div className="flex items-end gap-2 h-48 mt-4 px-2">
            {data.map((d: any) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full relative h-full flex flex-col justify-end">
                        <div
                            className="w-full bg-blue-100 hover:bg-blue-300 rounded-t transition-all relative min-h-[4px]"
                            style={{ height: `${(d.count / maxValue) * 100}%` }}
                        >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {d.count}건
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 -rotate-45 origin-center translate-y-3 w-8 text-center truncate">
                        {d.date.substring(5)}
                    </span>
                </div>
            ))}
        </div>
    );
}
