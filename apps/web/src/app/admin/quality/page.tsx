'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
    Shield, Target, AlertTriangle, CheckCircle, XCircle, 
    TrendingUp, TrendingDown, BarChart3, Activity, Zap, 
    FileWarning, Eye, RefreshCw 
} from 'lucide-react';

interface QualityMetrics {
    averages: {
        ambiguityScore: number;
        redundancyScore: number;
        completeness: number;
        correctness: number;
        overallScore: number;
    };
    lowConfidenceCount: number;
}

interface RiskData {
    riskyRequirements: any[];
    alerts: any[];
}

export default function StrategicQualityPage() {
    const [quality, setQuality] = useState<QualityMetrics | null>(null);
    const [risks, setRisks] = useState<RiskData | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [qualityRes, risksRes, statsRes] = await Promise.all([
                adminApi.getQualityMetrics().catch(() => ({ data: null })),
                adminApi.getRisks().catch(() => ({ data: { riskyRequirements: [], alerts: [] } })),
                adminApi.getOverallStats().catch(() => ({ data: { total: 0, byStatus: {} } })),
            ]);
            setQuality(qualityRes.data);
            setRisks(risksRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch quality data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) return <div className="p-8 text-center text-slate-500">품질 데이터 로딩 중...</div>;

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    const overallScore = quality?.averages?.overallScore || 0;
    const totalRequirements = stats?.total || 0;
    const approvedCount = stats?.byStatus?.APPROVED || 0;
    const approvalRate = totalRequirements > 0 ? Math.round((approvedCount / totalRequirements) * 100) : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="전략적 요건 품질 플랫폼 (Strategic Quality Platform)"
                description="요건 자산의 품질 수준을 전략적 관점에서 분석하고 개선 방향을 제시합니다."
                badgeText="GOVERNANCE"
                steps={['관리자', '품질 거버넌스']}
            />

            {/* Refresh Button */}
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    데이터 새로고침
                </Button>
            </div>

            {/* Quality Score Overview */}
            <div className="grid gap-6 md:grid-cols-5">
                <Card className="col-span-2 border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                    <CardContent className="p-6 flex items-center gap-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreBg(overallScore)} text-white`}>
                            <div className="text-center">
                                <p className="text-3xl font-extrabold">{getGrade(overallScore)}</p>
                                <p className="text-xs opacity-80">Grade</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500">전체 품질 점수</p>
                            <p className={`text-4xl font-extrabold ${getScoreColor(overallScore)}`}>
                                {overallScore.toFixed(1)}<span className="text-lg text-slate-400">/100</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {overallScore >= 80 ? '우수한 품질 수준입니다' : overallScore >= 60 ? '개선이 필요합니다' : '긴급 조치가 필요합니다'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-bold text-slate-500">전체 요건</p>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800">{totalRequirements}건</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <p className="text-xs font-bold text-slate-500">승인율</p>
                        </div>
                        <p className="text-2xl font-extrabold text-green-600">{approvalRate}%</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <p className="text-xs font-bold text-slate-500">리스크 항목</p>
                        </div>
                        <p className="text-2xl font-extrabold text-red-600">{risks?.riskyRequirements?.length || 0}건</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Quality Metrics */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            품질 지표 상세 (Quality Metrics Detail)
                        </CardTitle>
                        <CardDescription>각 품질 지표별 현재 수준과 목표 대비 달성도입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {[
                                { key: 'ambiguityScore', label: '명확성 (Clarity)', desc: '모호한 표현 없음', target: 85 },
                                { key: 'redundancyScore', label: '간결성 (Conciseness)', desc: '중복 없는 표현', target: 80 },
                                { key: 'completeness', label: '완전성 (Completeness)', desc: '필수 요소 포함', target: 90 },
                                { key: 'correctness', label: '정확성 (Correctness)', desc: '용어/문법 준수', target: 85 },
                            ].map((metric) => {
                                const value = quality?.averages?.[metric.key as keyof typeof quality.averages] || 0;
                                const achievement = metric.target > 0 ? Math.round((value / metric.target) * 100) : 0;
                                return (
                                    <div key={metric.key} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className="font-bold text-slate-700">{metric.label}</span>
                                                <span className="text-xs text-slate-400 ml-2">{metric.desc}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono font-bold ${getScoreColor(value)}`}>
                                                    {value.toFixed(1)}
                                                </span>
                                                <span className="text-xs text-slate-400">/ {metric.target}</span>
                                                {value >= metric.target ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <TrendingUp className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${getScoreBg(value)}`}
                                                style={{ width: `${Math.min(value, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Risk Requirements */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <FileWarning className="h-4 w-4 text-red-500" />
                            리스크 요건 (Risk Requirements)
                        </CardTitle>
                        <CardDescription>품질 기준 미달 또는 주의가 필요한 요건입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(!risks?.riskyRequirements || risks.riskyRequirements.length === 0) ? (
                            <div className="text-center py-8 text-slate-400">
                                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>리스크 요건이 없습니다.</p>
                                <p className="text-xs mt-1">모든 요건이 품질 기준을 충족합니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-72 overflow-auto">
                                {risks.riskyRequirements.map((item: any) => (
                                    <div key={item.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-sm text-red-800">{item.requirement?.title || 'Unknown'}</p>
                                                <p className="text-xs text-red-600 mt-1">{item.requirement?.code}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                                                {item.overallScore?.toFixed(0) || '-'}점
                                            </Badge>
                                        </div>
                                        <div className="flex gap-4 mt-2 text-xs text-red-600">
                                            {item.ambiguityScore > 80 && <span>⚠️ 모호성 높음</span>}
                                            {item.redundancyScore > 80 && <span>⚠️ 중복 높음</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* System Alerts */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Activity className="h-4 w-4 text-amber-500" />
                        시스템 알림 (System Alerts)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(!risks?.alerts || risks.alerts.length === 0) ? (
                        <div className="text-center py-6 text-slate-400">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>처리되지 않은 알림이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {risks.alerts.map((alert: any) => (
                                <div key={alert.id} className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm text-amber-900">{alert.title}</p>
                                            <p className="text-xs text-amber-700 mt-1">{alert.message}</p>
                                            <p className="text-[10px] text-amber-500 mt-2">
                                                {new Date(alert.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Strategic Recommendations */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-indigo-50 to-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Zap className="h-4 w-4 text-indigo-500" />
                        전략적 개선 권고 (Strategic Recommendations)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {overallScore < 80 && (
                            <div className="p-4 bg-white rounded-lg border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="h-5 w-5 text-indigo-500" />
                                    <span className="font-bold text-slate-700">품질 점수 향상</span>
                                </div>
                                <p className="text-sm text-slate-600">
                                    현재 품질 점수가 목표(80점) 미달입니다. 모호한 표현과 중복 요건을 우선 개선하세요.
                                </p>
                            </div>
                        )}
                        {(risks?.riskyRequirements?.length || 0) > 0 && (
                            <div className="p-4 bg-white rounded-lg border border-red-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileWarning className="h-5 w-5 text-red-500" />
                                    <span className="font-bold text-slate-700">리스크 요건 처리</span>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {risks?.riskyRequirements?.length}건의 리스크 요건이 있습니다. 즉시 검토 및 수정이 필요합니다.
                                </p>
                            </div>
                        )}
                        {approvalRate < 70 && (
                            <div className="p-4 bg-white rounded-lg border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="h-5 w-5 text-amber-500" />
                                    <span className="font-bold text-slate-700">승인 프로세스 점검</span>
                                </div>
                                <p className="text-sm text-slate-600">
                                    승인율이 {approvalRate}%로 낮습니다. 리뷰 단계 요건을 확인하고 병목을 해소하세요.
                                </p>
                            </div>
                        )}
                        {overallScore >= 80 && (risks?.riskyRequirements?.length || 0) === 0 && approvalRate >= 70 && (
                            <div className="p-4 bg-white rounded-lg border border-green-100 col-span-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="font-bold text-green-700">우수한 품질 상태</span>
                                </div>
                                <p className="text-sm text-slate-600">
                                    모든 품질 지표가 양호합니다. 현재 수준을 유지하며 지속적인 모니터링을 권장합니다.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
