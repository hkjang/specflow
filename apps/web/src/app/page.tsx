'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, Clock, CheckCircle, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="나의 워크스페이스 (My Workspace)"
                description="내가 담당하는 요건의 현황과 할 일을 한눈에 확인합니다."
                badgeText="PRACTITIONER"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: '내 담당 요건', value: '120', icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: '검토 대기 (To Do)', value: '12', icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: '승인 완료 (Approved)', value: '85', icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: '오늘의 변경사항', value: '5', icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
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
                            <p className="mt-1 text-3xl font-extrabold text-slate-800">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            최근 활동 (Recent Activity)
                        </h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">금융소비자보호법 관련 요건이 수정되었습니다.</p>
                                        <p className="text-xs text-slate-400 mt-0.5">2시간 전 • 홍길동</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            진행 상태 (Progress)
                        </h2>
                        <div className="h-48 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-slate-400 text-sm">
                            차트 데이터 로딩 중...
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

