'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight, Edit, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractionApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function VerificationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true); // Initial load only
    const [job, setJob] = useState<any>(null);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [qaIssues, setQaIssues] = useState<any[]>([]);

    const [editDraft, setEditDraft] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

    const fetchJob = async () => {
        try {
            const res = await extractionApi.getJob(id);
            setJob(res.data);
            setDrafts(res.data.drafts || []);
            setQaIssues(res.data.qaIssues || []);

            // Auto-poll if processing
            if (res.data.status === 'PROCESSING' || res.data.status === 'PENDING') {
                setTimeout(fetchJob, 2000); // Poll every 2 seconds
            } else {
                setLoading(false); // Stop main loading indicator when done or failed
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJob();
    }, [id]);

    const getIssuesForDraft = (id: string) => qaIssues.filter(i => i.draftId === id);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        try {
            await extractionApi.updateDraft(id, { status: newStatus });
            setDrafts(drafts.map(d => d.id === id ? { ...d, status: newStatus } : d));
        } catch (error) {
            alert('상태 업데이트 실패');
        }
    };

    const openEdit = (draft: any) => {
        setEditDraft({ ...draft });
    };

    const handleSaveEdit = async () => {
        if (!editDraft) return;
        try {
            await extractionApi.updateDraft(editDraft.id, {
                title: editDraft.title,
                content: editDraft.content,
                type: editDraft.type,
                status: editDraft.status // Maintain status
            });
            
            // Update local state
            setDrafts(drafts.map(d => d.id === editDraft.id ? editDraft : d));
            setEditDraft(null);
        } catch (error) {
            alert('수정 실패');
            console.error(error);
        }
    };

    const handleMerge = async () => {
        if (!confirm('승인된 요건들을 시스템에 등록하시겠습니까?')) return;
        try {
            await extractionApi.mergeJob(id);
            alert('요건 등록이 완료되었습니다.');
            router.push('/requirements');
        } catch (error) {
            alert('병합 실패');
        }
    };

    const handleBatchApprove = async () => {
        try {
            const res = await extractionApi.batchApprove(id);
            alert(`${res.data.count}개의 요건을 일괄 승인했습니다.`);
            setDrafts(drafts.map(d => d.status === 'PENDING' ? { ...d, status: 'APPROVED' } : d));
        } catch (error) {
            alert('일괄 승인 실패');
        }
    };

    const handleBatchReject = async () => {
        if (!confirm('보류 중인 모든 요건을 거절하시겠습니까?')) return;
        try {
            const res = await extractionApi.batchReject(id);
            alert(`${res.data.count}개의 요건을 일괄 거절했습니다.`);
            setDrafts(drafts.map(d => d.status === 'PENDING' ? { ...d, status: 'REJECTED' } : d));
        } catch (error) {
            alert('일괄 거절 실패');
        }
    };

    // Stats
    const pendingCount = drafts.filter(d => d.status === 'PENDING').length;
    const approvedCount = drafts.filter(d => d.status === 'APPROVED').length;
    const rejectedCount = drafts.filter(d => d.status === 'REJECTED').length;
    const modelName = (job?.result as any)?.modelName || 'AI';

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4 p-4">
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>원본 소스 (Job {id})</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto bg-muted/20 p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                    {job?.sourceText || '원본 텍스트가 없습니다.'}
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col">
                <CardHeader className="flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>추출된 요건 ({drafts.length}건)</CardTitle>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{modelName}</span>
                                <span>•</span>
                                <span className="text-green-600">승인 {approvedCount}</span>
                                <span className="text-amber-600">보류 {pendingCount}</span>
                                <span className="text-red-600">거절 {rejectedCount}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleBatchReject} disabled={pendingCount === 0}>
                                전체 거절
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleBatchApprove} disabled={pendingCount === 0}>
                                전체 승인
                            </Button>
                            <Button size="sm" onClick={handleMerge} disabled={approvedCount === 0}>
                                등록 ({approvedCount})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto space-y-4">
                    {/* Filter Tabs */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    statusFilter === status 
                                        ? 'bg-white shadow text-slate-900' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {status === 'ALL' ? `전체 (${drafts.length})` : 
                                 status === 'PENDING' ? `보류 (${pendingCount})` :
                                 status === 'APPROVED' ? `승인 (${approvedCount})` : `거절 (${rejectedCount})`}
                            </button>
                        ))}
                    </div>

                    {/* Processing State UI */}
                    {(job?.status === 'PROCESSING' || job?.status === 'PENDING') && (
                        <div className="p-6 border rounded-lg bg-blue-50 border-blue-100 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <div className="space-y-1 text-center">
                                <h3 className="font-semibold text-blue-900">AI가 문서를 분석하고 있습니다...</h3>
                                <p className="text-sm text-blue-700">잠시만 기다려주세요. ({job.progress || 0}%)</p>
                            </div>
                            <div className="w-full max-w-md h-2 bg-blue-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 transition-all duration-500" 
                                    style={{ width: `${job.progress || 10}%` }} 
                                />
                            </div>
                        </div>
                    )}

                    {drafts
                        .filter(d => statusFilter === 'ALL' || d.status === statusFilter)
                        .map((draft) => {
                        const issues = getIssuesForDraft(draft.id);
                        const confidencePercent = Math.round((draft.confidence || 0) * 100);
                        const confidenceColor = confidencePercent >= 90 ? 'bg-green-500' : 
                                               confidencePercent >= 70 ? 'bg-amber-500' : 'bg-red-500';
                        return (
                            <div key={draft.id} className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                                draft.status === 'APPROVED' ? 'bg-green-50/50 border-green-300' : 
                                draft.status === 'REJECTED' ? 'bg-red-50/50 border-red-300 opacity-60' : 
                                'bg-white border-slate-200'
                            }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-slate-900">{draft.title}</h4>
                                            <Badge variant="outline" className="text-xs">{draft.type}</Badge>
                                        </div>
                                        {/* Confidence Bar */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-slate-500 w-12">신뢰도</span>
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                                                <div className={`h-full ${confidenceColor} transition-all`} style={{ width: `${confidencePercent}%` }} />
                                            </div>
                                            <span className={`text-xs font-medium ${confidencePercent >= 90 ? 'text-green-600' : confidencePercent >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {confidencePercent}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {draft.status === 'PENDING' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleAction(draft.id, 'approve')}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleAction(draft.id, 'reject')}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        {draft.status !== 'PENDING' && (
                                            <Badge className={draft.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                {draft.status === 'APPROVED' ? '승인됨' : '거절됨'}
                                            </Badge>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => openEdit(draft)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{draft.content}</p>

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

            {/* Edit Dialog */}
            <Dialog open={!!editDraft} onOpenChange={() => setEditDraft(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>요건 수정</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">제목</label>
                            <Input 
                                value={editDraft?.title || ''} 
                                onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">유형</label>
                            <Input 
                                value={editDraft?.type || ''} 
                                onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">내용</label>
                            <Textarea 
                                className="min-h-[100px]"
                                value={editDraft?.content || ''} 
                                onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })} 
                            />
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDraft(null)}>취소</Button>
                        <Button onClick={handleSaveEdit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

