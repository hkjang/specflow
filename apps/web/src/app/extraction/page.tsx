'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusCircle, FileText, Activity } from "lucide-react";

export default function ExtractionDashboard() {
    // Mock metrics
    const stats = {
        active: 3,
        pendingReview: 12,
        avgConfidence: 88,
        byType: { functional: 12, security: 5, nonFunctional: 3 }
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="AI 추출 대시보드 (Extraction)"
                description="문사로부터 요건을 자동으로 추출하고 상태를 모니터링합니다."
                badgeText="AI JOB"
                steps={['작업장', 'AI 추출']}
            />

            <div className="flex justify-end">
                <Link href="/extraction/new">
                    <Button className="font-bold bg-blue-600 hover:bg-blue-700">
                        <PlusCircle className="mr-2 h-4 w-4" /> 신규 추출 작업
                    </Button>
                </Link>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">진행 중인 작업 (Active)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">검토 대기 (Pending)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-600">{stats.pendingReview}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">평균 신뢰도 (Confidence)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{stats.avgConfidence}%</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">총 추출 요건</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">20</div></CardContent>
                </Card>
            </div>

            {/* Visualization: Distribution (Simple Bar) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">요건 유형 분포 (Distribution)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <div className="w-32 text-sm font-bold text-slate-700">기능 요건</div>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                            </div>
                            <div className="w-12 text-sm text-right font-mono">12</div>
                        </div>
                        <div className="flex items-center">
                            <div className="w-32 text-sm font-bold text-slate-700">보안 요건</div>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: '25%' }}></div>
                            </div>
                            <div className="w-12 text-sm text-right font-mono">5</div>
                        </div>
                        <div className="flex items-center">
                            <div className="w-32 text-sm font-bold text-slate-700">비기능 요건</div>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400" style={{ width: '15%' }}></div>
                            </div>
                            <div className="w-12 text-sm text-right font-mono">3</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-500" />
                    최근 추출 이력
                </h3>
                <div className="text-sm text-slate-500 py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    최근 수행한 추출 작업이 없습니다.
                </div>
            </div>
        </div>
    );
}
