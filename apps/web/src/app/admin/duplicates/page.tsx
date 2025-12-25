'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { RefreshCw, Trash2, Search, AlertTriangle, CheckCircle, Copy } from 'lucide-react';

interface DuplicateGroup {
    originalId: string;
    originalCode: string;
    duplicates: { id: string; code: string; similarity: number }[];
}

interface ScanResult {
    message: string;
    totalDuplicates: number;
    deprecatedCount: number;
    groups: DuplicateGroup[];
}

export default function DuplicatesPage() {
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [deprecating, setDeprecating] = useState(false);

    const handleScan = async () => {
        setLoading(true);
        try {
            const res = await api.get('/requirements/duplicates/scan');
            setScanResult(res.data);
        } catch (e) {
            console.error(e);
            alert('스캔 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDeprecate = async () => {
        if (!confirm('모든 중복 요건을 폐기 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        setDeprecating(true);
        try {
            const res = await api.post('/requirements/duplicates/deprecate');
            setScanResult(res.data);
            alert(`${res.data.deprecatedCount}건 폐기 완료`);
        } catch (e) {
            console.error(e);
            alert('폐기 실패');
        } finally {
            setDeprecating(false);
        }
    };

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.95) return 'bg-red-100 text-red-700 border-red-200';
        if (similarity >= 0.85) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    };

    return (
        <div className="space-y-6 container mx-auto max-w-5xl animate-in fade-in duration-500">
            <PageHeader
                title="중복 요건 관리"
                description="기존 요건들의 중복 여부를 검사하고 정리합니다."
                steps={['관리자', 'AI 분석', '중복 관리']}
            />

            {/* Action Buttons */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-slate-800">중복 검사</h3>
                            <p className="text-sm text-slate-500">
                                제목 유사도 85% 이상 또는 원문 유사도 80% 이상인 요건을 검색합니다.
                            </p>
                            <p className="text-xs text-slate-400">
                                알고리즘: Jaccard(40%) + Levenshtein(30%) + N-gram(30%) 복합 점수
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleScan}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4 mr-2" />
                                )}
                                스캔
                            </Button>
                            {scanResult && scanResult.totalDuplicates > 0 && (
                                <Button
                                    onClick={handleDeprecate}
                                    disabled={deprecating}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {deprecating ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    중복 폐기
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {scanResult && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            {scanResult.totalDuplicates > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            검사 결과
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                            <p className="text-lg font-semibold text-slate-800">{scanResult.message}</p>
                            <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                <span>총 중복: <strong>{scanResult.totalDuplicates}건</strong></span>
                                <span>중복 그룹: <strong>{scanResult.groups.length}개</strong></span>
                                {scanResult.deprecatedCount > 0 && (
                                    <span className="text-red-600">폐기됨: <strong>{scanResult.deprecatedCount}건</strong></span>
                                )}
                            </div>
                        </div>

                        {scanResult.groups.length > 0 && (
                            <div className="space-y-4">
                                {scanResult.groups.map((group, idx) => (
                                    <div key={idx} className="border rounded-lg p-4 bg-white">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Copy className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium text-slate-800">
                                                원본: <code className="bg-blue-100 px-2 py-0.5 rounded text-blue-700">{group.originalCode}</code>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {group.duplicates.map(dup => (
                                                <Badge
                                                    key={dup.id}
                                                    variant="outline"
                                                    className={`${getSimilarityColor(dup.similarity)} px-3 py-1`}
                                                >
                                                    {dup.code}
                                                    <span className="ml-1 opacity-70">
                                                        ({Math.round(dup.similarity * 100)}%)
                                                    </span>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {scanResult.groups.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                <p>중복된 요건이 없습니다. 모든 요건이 고유합니다.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
