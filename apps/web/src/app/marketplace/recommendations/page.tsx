'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { adminApi, api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';

interface Recommendation {
    name: string;
    category: string;
    reason: string;
    pros: string;
    cons: string;
}

export default function ApiRecommendationsPage() {
    const [requirements, setRequirements] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/requirements')
            .then(res => setRequirements(res.data.data || []))
            .catch(console.error);
    }, []);

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAnalyze = async () => {
        if (selectedIds.length === 0) return;

        setLoading(true);
        setRecommendations([]);
        try {
            const res = await adminApi.recommendApis(selectedIds);
            setRecommendations(res.data);
        } catch (e) {
            console.error('Failed to get recommendations', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                title="API 마켓플레이스 & 추천 (Marketplace)"
                description="요구사항에 가장 적합한 API와 솔루션을 AI가 분석하여 추천합니다."
                badgeText="RECOMMENDER"
            />

            <div className="grid gap-6 md:grid-cols-12">
                <Card className="md:col-span-5 h-[calc(100vh-200px)] flex flex-col">
                    <CardHeader>
                        <CardTitle>요구사항 컨텍스트 (Requirements)</CardTitle>
                        <CardDescription>분석할 요구사항을 선택하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <div className="space-y-3">
                            {requirements.map(req => (
                                <div key={req.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                    <Checkbox
                                        checked={selectedIds.includes(req.id)}
                                        onCheckedChange={() => handleToggle(req.id)}
                                    />
                                    <div>
                                        <div className="font-semibold text-sm">{req.code}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">{req.title}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t sticky bottom-0 bg-white">
                            <Button className="w-full" onClick={handleAnalyze} disabled={loading || selectedIds.length === 0}>
                                {loading ? '분석 중...' : '추천 솔루션 검색 (Find Recommendations)'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-7 space-y-4">
                    {recommendations.length === 0 && !loading && (
                        <div className="text-center p-12 bg-gray-50 rounded-lg border border-dashed">
                            <p className="text-gray-500">요구사항을 선택하고 '추천 솔루션 검색'을 클릭하면<br />AI가 적합한 API와 도구를 제안합니다.</p>
                        </div>
                    )}

                    {recommendations.map((rec, idx) => (
                        <Card key={idx}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{rec.name}</CardTitle>
                                        <Badge variant="secondary" className="mt-1">{rec.category}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p className="text-gray-700 font-medium">{rec.reason}</p>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="p-2 bg-green-50 rounded text-green-800">
                                        <span className="font-bold block text-xs uppercase mb-1">장점 (Pros)</span>
                                        {rec.pros}
                                    </div>
                                    <div className="p-2 bg-red-50 rounded text-red-800">
                                        <span className="font-bold block text-xs uppercase mb-1">단점 (Cons)</span>
                                        {rec.cons}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
