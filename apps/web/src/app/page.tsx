'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, Clock, CheckCircle, Activity, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { userApi, adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Activity {
    id: string;
    title: string;
    code: string;
    action: string;
    user: string;
    timestamp: string;
    summary: string;
}

interface ProgressStats {
    statusDistribution: { status: string; count: number }[];
    maturityDistribution: { maturity: string; count: number }[];
    weeklyTrend: { week: string; created: number; approved: number }[];
    extractionStats: { status: string; count: number }[];
}

export default function Home() {
    const [stats, setStats] = useState({ assigned: 0, toDo: 0, approved: 0, todayActivity: 0 });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [progress, setProgress] = useState<ProgressStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = 'user-123';
        
        Promise.all([
            userApi.getMyStats(userId).catch(() => ({ data: { assigned: 0, toDo: 0, approved: 0, todayActivity: 0 } })),
            adminApi.getRecentActivities(5).catch(() => ({ data: [] })),
            adminApi.getProgressStats().catch(() => ({ data: null }))
        ]).then(([statsRes, activitiesRes, progressRes]) => {
            setStats(statsRes.data);
            setActivities(activitiesRes.data);
            setProgress(progressRes.data);
        }).finally(() => setLoading(false));
    }, []);

    const formatTime = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return '방금 전';
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    const statusColors: Record<string, string> = {
        DRAFT: 'bg-slate-200',
        REVIEW: 'bg-amber-400',
        APPROVED: 'bg-green-400',
        DEPRECATED: 'bg-red-400'
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="나의 워크스페이스 (My Workspace)"
                description="내가 담당하는 요건의 현황과 할 일을 한눈에 확인합니다."
                badgeText="PRACTITIONER"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: '내 담당 요건', value: stats.assigned, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: '검토 대기 (To Do)', value: stats.toDo, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: '승인 완료 (Approved)', value: stats.approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: '오늘의 활동', value: stats.todayActivity, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((stat) => (
                    <Card key={stat.label} className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                                <TrendingUp className="h-4 w-4 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                            <p className="mt-1 text-3xl font-extrabold text-slate-800">
                                {loading ? '-' : stat.value}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="h-5 w-5 text-blue-500" />
                            최근 활동 (Recent Activity)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="h-32 flex items-center justify-center text-slate-400">로딩 중...</div>
                            ) : activities.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-slate-400">최근 활동이 없습니다.</div>
                            ) : (
                                activities.map((activity) => (
                                    <div key={activity.id} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{activity.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {formatTime(activity.timestamp)} • {activity.user}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="h-fit text-xs">{activity.code}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChart className="h-5 w-5 text-emerald-500" />
                            요건 상태 분포 (Status Distribution)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading || !progress ? (
                            <div className="h-32 flex items-center justify-center text-slate-400">로딩 중...</div>
                        ) : (
                            <div className="space-y-3">
                                {progress.statusDistribution.map(item => {
                                    const total = progress.statusDistribution.reduce((a, b) => a + b.count, 0);
                                    const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                                    return (
                                        <div key={item.status} className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-slate-600 w-20">{item.status}</span>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${statusColors[item.status] || 'bg-slate-400'} transition-all`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-12 text-right">{item.count}건</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Trend */}
            {progress && progress.weeklyTrend.length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                            주간 요건 추이 (Weekly Trend)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4 h-40">
                            {progress.weeklyTrend.map(week => {
                                const maxVal = Math.max(...progress.weeklyTrend.map(w => w.created), 1);
                                const height = (week.created / maxVal) * 100;
                                return (
                                    <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full flex flex-col items-center">
                                            <span className="text-xs font-bold text-slate-700">{week.created}</span>
                                            <div 
                                                className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t transition-all"
                                                style={{ height: `${Math.max(height, 5)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500">{week.week}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
