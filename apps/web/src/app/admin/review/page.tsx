'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, aiApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { CheckCircle, XCircle, SkipForward, AlertCircle, Keyboard, RefreshCw } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function RapidReviewPage() {
    const [queue, setQueue] = useState<any[]>([]);
    const [currentOp, setCurrentOp] = useState<any>(null);
    const [requirement, setRequirement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [analyzing, setAnalyzing] = useState(false);
    const [openAnalyzeDialog, setOpenAnalyzeDialog] = useState(false);

    useEffect(() => {
        fetchQueue();
        fetchProviders();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await adminApi.getOperations();
            // Filter strictly for reviews
            const reviews = res.data.filter((op: any) => op.type === 'REVIEW' && op.status === 'PENDING');
            setQueue(reviews);
            if (reviews.length > 0) {
                loadRequirement(reviews[0]);
            } else {
                setCurrentOp(null);
                setRequirement(null);
            }
        } catch (error) {
            console.error("Failed to fetch queue", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);
            if (active.length > 0) setSelectedProviderId(active[0].id);
        } catch (err) { console.error(err); }
    };

    const loadRequirement = async (op: any) => {
        setCurrentOp(op);
        setRequirement(null); // Clear previous
        if (op.targetType === 'Requirement' && op.targetId) {
            try {
                const res = await adminApi.getRequirement(op.targetId);
                setRequirement(res.data);
            } catch (error) {
                console.error("Failed to fetch requirement", error);
            }
        }
    };

    const handleAction = async (action: 'APPROVE' | 'REJECT' | 'SKIP') => {
        if (!currentOp) return;

        if (action === 'SKIP') {
            // Move current to end or just pick next
            const nextQueue = queue.slice(1);
            setQueue(nextQueue);
            if (nextQueue.length > 0) loadRequirement(nextQueue[0]);
            else {
                setCurrentOp(null);
                setRequirement(null);
            }
            return;
        }

        try {
            await adminApi.processOperation(currentOp.id, action as 'APPROVE' | 'REJECT');

            // Remove from queue and load next
            const nextQueue = queue.filter(op => op.id !== currentOp.id);
            setQueue(nextQueue);
            if (nextQueue.length > 0) {
                loadRequirement(nextQueue[0]);
            } else {
                setCurrentOp(null);
                setRequirement(null);
            }
        } catch (error) {
            alert("작업 실패");
        }
    };

    const handleReanalyze = async () => {
        if (!requirement || !selectedProviderId) return;
        setAnalyzing(true);
        try {
            const res = await adminApi.analyzeQuality(requirement.id, selectedProviderId);
            setRequirement({ ...requirement, qualityMetric: res.data });
            alert('AI 재분석이 완료되었습니다.');
            setOpenAnalyzeDialog(false);
        } catch (error) {
            console.error(error);
            alert('분석 실패');
        } finally {
            setAnalyzing(false);
        }
    };

    // Keyboard Shortcuts
    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (!currentOp) return;

        // Ignore if typing in an input (not implemented here but good practice)
        if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;

        switch (event.key.toLowerCase()) {
            case 'a':
                handleAction('APPROVE');
                break;
            case 'r':
                handleAction('REJECT');
                break;
            case ' ': // Space
                event.preventDefault(); // Prevent scroll
                handleAction('SKIP');
                break;
        }
    }, [currentOp, queue]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    if (loading) return <div className="p-20 text-center text-slate-500">검토 대기열을 불러오는 중...</div>;

    if (!currentOp || !requirement) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
                <div className="bg-emerald-50 p-6 rounded-full ring-8 ring-emerald-50/50">
                    <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">검토 완료!</h2>
                    <p className="text-slate-500 mt-2">현재 대기 중인 검토 작업이 없습니다.</p>
                </div>
                <Button onClick={() => fetchQueue()} variant="outline">대기열 새로고침</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                title="빠른 검토 (Rapid Review)"
                description="대기 중인 요건을 신속하게 검토하고 승인 여부를 결정합니다."
                badgeText="WORKFLOW"
                steps={['관리자', '운영', '검토']}
            />

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">현재 작업:</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 text-slate-800">{currentOp.id.substring(0, 8)}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="text-sm font-bold text-indigo-600">{queue.length}건 남음</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        <Keyboard className="h-3 w-3" />
                        <span>단축키:</span>
                    </div>
                    <div className="text-xs text-slate-500">
                        <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] mx-1">A</kbd> 승인
                    </div>
                    <div className="text-xs text-slate-500">
                        <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] mx-1">R</kbd> 반려
                    </div>
                    <div className="text-xs text-slate-500">
                        <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] mx-1">Space</kbd> 건너뛰기
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <Card className="h-full border-l-4 border-l-indigo-500 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs font-normal text-slate-500">{requirement.code}</Badge>
                                        <span className="text-xs text-slate-400">v{requirement.version || '1.0'}</span>
                                    </div>
                                    <CardTitle className="text-xl leading-tight text-slate-900">{requirement.title}</CardTitle>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant={requirement.trustGrade > 0.8 ? 'default' : 'destructive'} className="ml-2">
                                        신뢰도: {Math.round(requirement.trustGrade * 100)}%
                                    </Badge>

                                    <Dialog open={openAnalyzeDialog} onOpenChange={setOpenAnalyzeDialog}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 px-2">
                                                <RefreshCw className="h-3 w-3 mr-1" /> AI 재분석
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>AI 품질 재분석 (Re-analyze)</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="space-y-2">
                                                    <Label>사용할 AI 모델 (Select Model)</Label>
                                                    <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="AI 모델 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {providers.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    <span className="font-bold">{p.name}</span>
                                                                    <span className="text-xs text-muted-foreground ml-2">({p.models})</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleReanalyze} disabled={analyzing || !selectedProviderId} className="bg-indigo-600 hover:bg-indigo-700">
                                                    {analyzing ? '분석 중...' : '분석 시작'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="prose prose-sm max-w-none bg-slate-50 p-6 rounded-md border border-slate-100 text-slate-700 leading-relaxed">
                                {requirement.content}
                            </div>

                            {requirement.qualityMetric && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">품질 분석 (AI Analysis)</h4>
                                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-xl font-bold text-slate-700 mb-1">{requirement.qualityMetric.ambiguityScore}</div>
                                            <div className="text-slate-500">모호성</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-xl font-bold text-slate-700 mb-1">{requirement.qualityMetric.completeness}</div>
                                            <div className="text-slate-500">완전성</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-xl font-bold text-slate-700 mb-1">{requirement.qualityMetric.correctness}</div>
                                            <div className="text-slate-500">정확성</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pt-5 pb-3">
                            <CardTitle className="text-sm uppercase text-slate-500 font-bold tracking-wider">검토 액션 (Actions)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 justify-start h-12 text-base shadow-sm" onClick={() => handleAction('APPROVE')}>
                                <CheckCircle className="mr-3 h-5 w-5" /> 승인 (Approve)
                            </Button>
                            <Button size="lg" variant="destructive" className="w-full bg-rose-600 hover:bg-rose-700 justify-start h-12 text-base shadow-sm" onClick={() => handleAction('REJECT')}>
                                <XCircle className="mr-3 h-5 w-5" /> 반려 (Reject)
                            </Button>
                            <Button size="lg" variant="outline" className="w-full justify-start h-12 text-base border-slate-300 text-slate-600 hover:bg-slate-50" onClick={() => handleAction('SKIP')}>
                                <SkipForward className="mr-3 h-5 w-5" /> 건너뛰기 (Skip)
                            </Button>
                        </CardContent>
                        <CardFooter className="bg-slate-50 p-4 text-xs text-slate-500 border-t border-slate-100">
                            사유: {currentOp.reason || '수동 검토 요청됨'}
                        </CardFooter>
                    </Card>

                    <Card className="border-blue-100 shadow-sm bg-blue-50/30">
                        <CardHeader className="pt-5 pb-3">
                            <CardTitle className="text-sm uppercase text-blue-500 font-bold tracking-wider flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                AI 제안 (Suggestion)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-blue-900 leading-relaxed">
                                AI 분석 결과, 높은 완전성 점수를 바탕으로 <strong>승인(Approval)</strong>을 제안합니다. 다만, 일부 도메인 용어의 적절성을 확인하세요.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
