'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, History, FileText, CheckCircle, AlertTriangle, GitCompare } from 'lucide-react';
import clsx from 'clsx';

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [req, setReq] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            try {
                const res = await api.get(`/requirements/${id}`);
                setReq(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-8">로딩 중... (Loading)</div>;
    if (!req) return <div className="p-8">요건을 찾을 수 없습니다. (Not found)</div>;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-500">{req.code}</span>
                            <Badge variant={req.status === 'APPROVED' ? 'default' : 'secondary'}>{req.status}</Badge>
                        </div>
                        <h1 className="text-2xl font-bold">{req.title}</h1>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/assets/${id}/diff`)}>
                    <GitCompare className="h-4 w-4 mr-2" /> 변경 이력 비교 (History)
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Tabs defaultValue="content">
                        <TabsList>
                            <TabsTrigger value="content">내용 (Content)</TabsTrigger>
                            <TabsTrigger value="context">원문 문맥 (Context)</TabsTrigger>
                            <TabsTrigger value="history">변경 이력 (History)</TabsTrigger>
                        </TabsList>

                        <TabsContent value="content" className="space-y-4 pt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>요건 정의 (Definition)</CardTitle>
                                </CardHeader>
                                <CardContent className="prose max-w-none">
                                    <p className="whitespace-pre-wrap">{req.content}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="context" className="pt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>추출 원문 (Source)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {req.source ? (
                                        <div className="bg-slate-50 p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                                            {req.source.content}
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 italic">연결된 원문이 없습니다.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="pt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>변경 로그 (Change Log)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {req.history && req.history.length > 0 ? (
                                        <div className="relative border-l border-gray-200 ml-3 space-y-6">
                                            {req.history.map((h: any) => (
                                                <div key={h.id} className="ml-6 relative">
                                                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                                                        <History className="h-3 w-3 text-blue-600" />
                                                    </span>
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                                                        <h3 className="text-sm font-semibold text-gray-900">{h.field} 변경됨</h3>
                                                        <time className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</time>
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        {h.oldValue ? <span className="line-through mr-2 text-red-400">{h.oldValue}</span> : null}
                                                        <span className="text-green-600">{h.newValue}</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">변경 이력이 없습니다.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Quality Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-500" /> 품질 지표 (Quality Metrics)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {req.qualityMetric ? (
                                <>
                                    <MetricBar label="모호성 (Ambiguity)" value={req.qualityMetric.ambiguityScore} inverse />
                                    <MetricBar label="중복성 (Redundancy)" value={req.qualityMetric.redundancyScore} inverse />
                                    <MetricBar label="완전성 (Completeness)" value={req.qualityMetric.completeness} />
                                    <div className="pt-2 border-t mt-2">
                                        <div className="flex justify-between items-center font-bold">
                                            <span>종합 점수 (Overall)</span>
                                            <span className="text-lg text-blue-600">{req.qualityMetric.overallScore}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-gray-500">분석된 데이터가 없습니다.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">메타데이터 (Metadata)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">생성일 (Created)</span>
                                <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">수정일 (Updated)</span>
                                <span>{new Date(req.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">버전 (Version)</span>
                                <span>v{req.version}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricBar({ label, value, inverse }: { label: string, value: number, inverse?: boolean }) {
    // Inverse: 100 is bad (Red), 0 is good (Green/Blue) for Ambiguity/Redundancy?
    // Let's assume standard Score: Higher is better usually in UI, unless labeled "Risk".
    // If input is "Ambiguity Score", 100 is very ambiguous.
    // Display raw for now.
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="font-medium">{value}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={clsx("h-full rounded-full", inverse ? "bg-orange-400" : "bg-blue-500")}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}
