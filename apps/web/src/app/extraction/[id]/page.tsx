'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight, Edit, Loader2 } from "lucide-react";
import { extractionApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function VerificationPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<any>(null);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [qaIssues, setQaIssues] = useState<any[]>([]);

    useEffect(() => {
        fetchJob();
    }, [params.id]);

    const fetchJob = async () => {
        setLoading(true);
        try {
            const res = await extractionApi.getJob(params.id);
            setJob(res.data);
            setDrafts(res.data.drafts || []);
            setQaIssues(res.data.qaIssues || []);
        } catch (error) {
            console.error(error);
            // Fallback for demo/mock if backend not ready
            // keep existing mock data logic here if strictly needed, 
            // but for CUD task we assume backend exists or we strictly wire it up.
            // Using empty state to indicate "Real" connection attempt.
        } finally {
            setLoading(false);
        }
    };

    const getIssuesForDraft = (id: string) => qaIssues.filter(i => i.draftId === id);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        try {
            await extractionApi.updateDraft(id, newStatus);
            setDrafts(drafts.map(d => d.id === id ? { ...d, status: newStatus } : d));
        } catch (error) {
            alert('상태 업데이트 실패');
        }
    };

    const handleMerge = async () => {
        if (!confirm('승인된 요건들을 시스템에 등록하시겠습니까?')) return;
        try {
            await extractionApi.mergeJob(params.id);
            alert('요건 등록이 완료되었습니다.');
            router.push('/requirements');
        } catch (error) {
            alert('병합 실패');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4 p-4">
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>원본 소스 (Job {params.id})</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto bg-muted/20 p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                    {job?.sourceText || '원본 텍스트가 없습니다.'}
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>추출된 요건 (Extracted Requirements)</CardTitle>
                    <Button onClick={handleMerge} disabled={!drafts.some(d => d.status === 'APPROVED')}>
                        승인된 요건 등록 (Merge)
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto space-y-4">
                    {drafts.map((draft) => {
                        const issues = getIssuesForDraft(draft.id);
                        return (
                            <div key={draft.id} className={`p-4 border rounded-lg ${draft.status === 'APPROVED' ? 'bg-green-50/10 border-green-200' : draft.status === 'REJECTED' ? 'bg-red-50/10 border-red-200' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold">{draft.title}</h4>
                                        <Badge variant="outline" className="mr-2">{draft.type}</Badge>
                                        <span className="text-xs text-muted-foreground mr-2">신뢰도: {(draft.confidence * 100).toFixed(0)}%</span>
                                        <span className={`text-xs font-bold ${draft.status === 'APPROVED' ? 'text-green-600' : draft.status === 'REJECTED' ? 'text-red-600' : 'text-slate-400'}`}>
                                            {draft.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {draft.status === 'PENDING' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleAction(draft.id, 'approve')}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleAction(draft.id, 'reject')}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm mb-2 text-slate-700">{draft.content}</p>

                                {issues.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                                        <strong>Quality Check:</strong>
                                        <ul className="list-disc pl-4 mt-1">
                                            {issues.map((issue: any, idx: number) => (
                                                <li key={idx}>{issue.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {drafts.length === 0 && (
                        <div className="text-center py-8 text-slate-500">추출된 요건이 없습니다.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

