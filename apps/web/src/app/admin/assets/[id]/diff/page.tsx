'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function DiffViewerPage() {
    const params = useParams();
    const router = useRouter();
    const [requirement, setRequirement] = useState<any>(null);
    const [selectedHistory, setSelectedHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params.id) return;
        const fetchData = async () => {
            try {
                const res = await adminApi.getRequirement(params.id as string);
                setRequirement(res.data);
                // Select most recent history if available
                if (res.data.history && res.data.history.length > 0) {
                    setSelectedHistory(res.data.history[0]);
                }
            } catch (error) {
                console.error("Failed to fetch requirement", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    if (loading) return <div className="p-8">비교 데이터 로딩 중... (Loading)</div>;
    if (!requirement) return <div className="p-8">요건을 찾을 수 없습니다. (Not found)</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> 뒤로가기 (Back)
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">버전 비교 (Version Comparison)</h2>
                    <p className="text-sm text-gray-500"><span className="font-mono">{requirement.code}</span>의 변경 사항을 비교합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                {/* History List Side */}
                <Card className="col-span-3 overflow-hidden flex flex-col">
                    <CardHeader className="py-4 border-b">
                        <CardTitle className="text-sm uppercase text-gray-500">변경 이력 타임라인 (History Timeline)</CardTitle>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {requirement.history?.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-4">이력이 없습니다.</div>
                        )}
                        {requirement.history?.map((hist: any) => (
                            <div
                                key={hist.id}
                                onClick={() => setSelectedHistory(hist)}
                                className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedHistory?.id === hist.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Badge variant="outline" className="text-[10px]">{hist.field}</Badge>
                                    <span className="text-[10px] text-gray-500">{new Date(hist.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="text-xs text-gray-900 font-medium truncate">
                                    v{hist.version} by User
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Diff View Side */}
                <Card className="col-span-9 flex flex-col overflow-hidden">
                    <CardHeader className="py-4 border-b bg-gray-50">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">
                                {selectedHistory ? `'${selectedHistory.field}' 필드 변경` : '이력을 선택하세요'}
                            </CardTitle>
                            {selectedHistory && (
                                <Badge variant="secondary">v{selectedHistory.version}</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                        {/* Old Value */}
                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="bg-red-50 p-2 text-xs font-bold text-red-700 border-b border-red-100">
                                변경 전 (Previous Value)
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto bg-red-50/10 font-mono text-sm whitespace-pre-wrap">
                                {selectedHistory?.oldValue || <span className="text-gray-400 italic">없음 (none)</span>}
                            </div>
                        </div>

                        {/* New Value */}
                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="bg-green-50 p-2 text-xs font-bold text-green-700 border-b border-green-100">
                                변경 후 (New Value)
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto bg-green-50/10 font-mono text-sm whitespace-pre-wrap">
                                {selectedHistory?.newValue || <span className="text-gray-400 italic">없음 (none)</span>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
