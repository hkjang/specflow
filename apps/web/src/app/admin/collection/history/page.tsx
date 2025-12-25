'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
    RefreshCw, CheckCircle, XCircle, Clock, Activity, 
    TrendingUp, Calendar, FileText, AlertTriangle, Zap
} from 'lucide-react';
import { api } from '@/lib/api';

interface CrawlHistory {
    id: string;
    crawlerId: string;
    status: string;
    duration: number | null;
    pagesFound: number;
    itemsExtracted: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
    crawler: {
        id: string;
        name: string;
        url: string;
        category: string | null;
    };
}

interface HistoryStats {
    todayRuns: number;
    weeklyRuns: number;
    totalSuccess: number;
    totalFailed: number;
    successRate: number;
}

export default function CrawlHistoryPage() {
    const [history, setHistory] = useState<CrawlHistory[]>([]);
    const [stats, setStats] = useState<HistoryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, statsRes] = await Promise.all([
                api.get('/collection/crawlers/history?limit=100'),
                api.get('/collection/crawlers/history/stats')
            ]);
            setHistory(historyRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (ms: number | null) => {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('ko-KR', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        if (status === 'SUCCESS') return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (status === 'FAILED') return <XCircle className="h-4 w-4 text-red-500" />;
        return <Clock className="h-4 w-4 text-amber-500" />;
    };

    const getCategoryColor = (category: string | null) => {
        const colors: Record<string, string> = {
            REGULATION: 'bg-purple-100 text-purple-700 border-purple-200',
            NEWS: 'bg-blue-100 text-blue-700 border-blue-200',
            COMPETITOR: 'bg-orange-100 text-orange-700 border-orange-200',
            INTERNAL: 'bg-slate-100 text-slate-700 border-slate-200',
        };
        return colors[category || ''] || colors.INTERNAL;
    };

    // Group by date for timeline
    const groupedHistory = history.reduce((acc, h) => {
        const date = new Date(h.startedAt).toLocaleDateString('ko-KR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(h);
        return acc;
    }, {} as Record<string, CrawlHistory[]>);

    return (
        <div className="space-y-6">
            <PageHeader
                title="수집 이력 (Crawl History)"
                description="크롤러 실행 기록 및 통계를 확인합니다. 실시간으로 수집 상태를 모니터링할 수 있습니다."
                badgeText="MONITORING"
                steps={['관리자', '데이터 수집', '이력']}
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-bold text-slate-500">오늘 실행</p>
                        </div>
                        <p className="text-3xl font-extrabold text-blue-600">{stats?.todayRuns || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-bold text-slate-500">주간 실행</p>
                        </div>
                        <p className="text-3xl font-extrabold text-indigo-600">{stats?.weeklyRuns || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs font-bold text-slate-500">성공</p>
                        </div>
                        <p className="text-3xl font-extrabold text-emerald-600">{stats?.totalSuccess || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-red-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <p className="text-xs font-bold text-slate-500">실패</p>
                        </div>
                        <p className="text-3xl font-extrabold text-red-600">{stats?.totalFailed || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-amber-500" />
                            <p className="text-xs font-bold text-slate-500">성공률</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <p className="text-3xl font-extrabold text-amber-600">{stats?.successRate || 0}</p>
                            <span className="text-lg text-amber-500">%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Zap className="h-4 w-4" />
                    총 {history.length}건의 실행 기록
                </div>
            </div>

            {/* Timeline View */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        실행 타임라인
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {Object.keys(groupedHistory).length === 0 && !loading && (
                        <div className="text-center py-16 text-slate-400">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>수집 이력이 없습니다.</p>
                            <p className="text-xs mt-1">크롤러를 실행하면 여기에 기록됩니다.</p>
                        </div>
                    )}
                    
                    {Object.entries(groupedHistory).map(([date, runs]) => (
                        <div key={date} className="border-b last:border-b-0">
                            {/* Date Header */}
                            <div className="px-4 py-2 bg-slate-50 border-b sticky top-0">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="font-bold text-slate-700">{date}</span>
                                    <Badge variant="outline" className="text-xs">{runs.length}건</Badge>
                                </div>
                            </div>
                            
                            {/* Runs for this date */}
                            <div className="divide-y">
                                {runs.map((run) => (
                                    <div key={run.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                {/* Status Icon */}
                                                <div className={`p-2 rounded-full ${run.status === 'SUCCESS' ? 'bg-green-100' : 'bg-red-100'}`}>
                                                    {getStatusIcon(run.status)}
                                                </div>
                                                
                                                {/* Info */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-slate-800">{run.crawler.name}</span>
                                                        <Badge className={`text-xs ${getCategoryColor(run.crawler.category)}`}>
                                                            {run.crawler.category || 'GENERAL'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono truncate max-w-[300px]">{run.crawler.url}</p>
                                                    
                                                    {run.status === 'FAILED' && run.errorMessage && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {run.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Stats */}
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">{formatTime(run.startedAt)}</p>
                                                
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="text-xs">
                                                        <span className="text-slate-400">소요:</span>
                                                        <span className="font-bold text-slate-600 ml-1">{formatDuration(run.duration)}</span>
                                                    </div>
                                                    {run.status === 'SUCCESS' && (
                                                        <>
                                                            <div className="text-xs">
                                                                <span className="text-slate-400">페이지:</span>
                                                                <span className="font-bold text-blue-600 ml-1">{run.pagesFound}</span>
                                                            </div>
                                                            <div className="text-xs">
                                                                <span className="text-slate-400">추출:</span>
                                                                <span className="font-bold text-emerald-600 ml-1">{run.itemsExtracted}건</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
