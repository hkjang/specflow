'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    RefreshCw, Globe, FileText, ArrowRight, CheckCircle, XCircle,
    Clock, Zap, Database, Eye, ChevronRight, Sparkles, Check, X, Tag, Briefcase, Layout
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ExtractionJob {
    id: string;
    sourceId: string;
    status: string;
    progress: number;
    result: any;
    createdAt: string;
    source?: {
        id: string;
        type: string;
        metadata: any;
    };
    drafts?: RequirementDraft[];
}

interface RequirementDraft {
    id: string;
    title: string | null;
    content: string | null;
    originalText: string | null;
    confidence: number | null;
    status: string;
    mergedRequirementId: string | null;
    suggestedDomain: string | null;
    suggestedFunction: string | null;
    suggestedMenu: string | null;
    suggestedTags: string[];
    createdAt: string;
}

export default function CollectionWorkflowPage() {
    const [jobs, setJobs] = useState<ExtractionJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<ExtractionJob | null>(null);
    const [drafts, setDrafts] = useState<RequirementDraft[]>([]);
    const [approving, setApproving] = useState<string | null>(null);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/extraction/jobs?limit=20');
            setJobs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const viewJobDrafts = async (job: ExtractionJob) => {
        setSelectedJob(job);
        try {
            const res = await api.get(`/extraction/jobs/${job.id}/drafts`);
            setDrafts(res.data);
        } catch (error) {
            console.error(error);
            setDrafts([]);
        }
    };

    const approveDraft = async (draftId: string) => {
        setApproving(draftId);
        try {
            await api.post(`/extraction/drafts/${draftId}/approve`);
            // Update local state
            setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'APPROVED' } : d));
        } catch (error) {
            console.error(error);
            alert('승인 실패');
        } finally {
            setApproving(null);
        }
    };

    const rejectDraft = async (draftId: string) => {
        try {
            await api.post(`/extraction/drafts/${draftId}/reject`);
            setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'REJECTED' } : d));
        } catch (error) {
            console.error(error);
        }
    };

    const mergeSingleDraft = async (draftId: string) => {
        try {
            setApproving(draftId);
            const res = await api.post(`/extraction/drafts/${draftId}/merge`, { projectId: 'default' });
            const req = res.data;

            // Update local state - mark as merged with requirement ID
            setDrafts(prev => prev.map(d =>
                d.id === draftId
                    ? { ...d, status: 'MERGED', mergedRequirementId: req.id }
                    : d
            ));
            alert('요건으로 병합되었습니다.');
        } catch (error) {
            console.error(error);
            alert('병합 실패');
        } finally {
            setApproving(null);
        }
    };

    const batchApproveAll = async () => {
        if (!selectedJob) return;
        try {
            setApproving('batch');
            await api.post(`/extraction/jobs/${selectedJob.id}/batch-approve`);
            setDrafts(prev => prev.map(d => d.status === 'PENDING' ? { ...d, status: 'APPROVED' } : d));
            alert('모든 대기 중인 요건이 승인되었습니다.');
        } catch (error) {
            console.error(error);
            alert('일괄 승인 실패');
        } finally {
            setApproving(null);
        }
    };

    const batchRejectAll = async () => {
        if (!selectedJob) return;
        if (!confirm('모든 대기 중인 요건을 거절하시겠습니까?')) return;
        try {
            await api.post(`/extraction/jobs/${selectedJob.id}/batch-reject`);
            setDrafts(prev => prev.map(d => d.status === 'PENDING' ? { ...d, status: 'REJECTED' } : d));
            alert('모든 대기 중인 요건이 거절되었습니다.');
        } catch (error) {
            console.error(error);
            alert('일괄 거절 실패');
        }
    };

    const mergeApprovedToRequirements = async () => {
        if (!selectedJob) return;
        const approvedCount = drafts.filter(d => d.status === 'APPROVED').length;
        if (approvedCount === 0) {
            alert('승인된 초안이 없습니다.');
            return;
        }
        if (!confirm(`${approvedCount}개의 승인된 초안을 요건으로 병합하시겠습니까?`)) return;

        try {
            setApproving('merge');
            const res = await api.post(`/extraction/jobs/${selectedJob.id}/merge`);
            const data = res.data;

            // Update local state - mark approved as merged and store the requirement IDs
            if (data.requirements && Array.isArray(data.requirements)) {
                setDrafts(prev => prev.map((d, idx) => {
                    if (d.status === 'APPROVED') {
                        const reqData = data.requirements.find((_: any, i: number) => i === idx) || data.requirements[0];
                        return { ...d, status: 'MERGED', mergedRequirementId: reqData?.id || null };
                    }
                    return d;
                }));
            }

            // Show detailed result message
            const created = data.created || data.requirements?.length || 0;
            const skipped = data.skipped || 0;
            let resultMessage = `✅ ${created}건 등록 완료`;
            if (skipped > 0) {
                resultMessage += `\n⚠️ ${skipped}건 중복으로 스킵됨`;
            }
            alert(resultMessage);

            // Refresh drafts to get the latest state with mergedRequirementId
            const refreshed = await api.get(`/extraction/jobs/${selectedJob.id}/drafts`);
            setDrafts(refreshed.data);
        } catch (error) {
            console.error(error);
            alert('요건 병합 실패');
        } finally {
            setApproving(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
            APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
            REJECTED: 'bg-red-100 text-red-700 border-red-200',
            PROCESSING: 'bg-purple-100 text-purple-700 border-purple-200',
            MERGED: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        };
        return styles[status] || 'bg-slate-100 text-slate-700';
    };

    const pendingCount = jobs.reduce((sum, j) => {
        const count = (j.result as any)?.extractedCount || 0;
        return sum + count;
    }, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="수집 → 요건 워크플로우"
                description="크롤러가 수집한 데이터에서 요건을 추출하고 검토/승인하는 전체 프로세스를 관리합니다."
                badgeText="WORKFLOW"
                steps={['관리자', '데이터 수집', '워크플로우']}
            />

            {/* Flow Diagram */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50">
                <CardContent className="py-6">
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <Globe className="h-8 w-8 text-blue-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">1. 웹 수집</span>
                            <Link href="/admin/collection/crawlers">
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50">크롤러 관리</Badge>
                            </Link>
                        </div>
                        <ArrowRight className="h-6 w-6 text-slate-300" />
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-purple-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">2. 콘텐츠 추출</span>
                            <Link href="/admin/collection/data">
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-purple-50">수집 데이터</Badge>
                            </Link>
                        </div>
                        <ArrowRight className="h-6 w-6 text-slate-300" />
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-amber-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">3. 요건 초안</span>
                            <Badge className="text-xs bg-amber-500">{pendingCount}건 대기</Badge>
                        </div>
                        <ArrowRight className="h-6 w-6 text-slate-300" />
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-emerald-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">4. 요건 확정</span>
                            <Link href="/requirements">
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-emerald-50">요건 목록</Badge>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={fetchJobs}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>
                <Link href="/admin/collection/crawlers">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Zap className="h-4 w-4 mr-1" /> 크롤러 실행하기
                    </Button>
                </Link>
            </div>

            {/* Extraction Jobs List */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        최근 추출 작업 ({jobs.length}건)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {jobs.length === 0 && !loading && (
                        <div className="text-center py-16 text-slate-400">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>추출 작업이 없습니다.</p>
                            <p className="text-xs mt-1">크롤러를 실행하면 추출 작업이 생성됩니다.</p>
                        </div>
                    )}

                    <div className="divide-y">
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => viewJobDrafts(job)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${job.status === 'COMPLETED' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                            {job.status === 'COMPLETED' ? (
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-slate-800">
                                                    {(job.result as any)?.crawlerName || job.source?.metadata?.crawlerName || '추출 작업'}
                                                </span>
                                                <Badge className={`text-xs ${getStatusBadge(job.status)}`}>
                                                    {job.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(job.createdAt)} •
                                                {(job.result as any)?.extractedCount || 0}건 추출됨
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            <FileText className="h-3 w-3 mr-1" />
                                            {(job.result as any)?.extractedCount || 0}건
                                        </Badge>
                                        <ChevronRight className="h-4 w-4 text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Drafts Review Dialog */}
            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-amber-500" />
                            추출된 요건 초안 검토
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto">
                        {drafts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>추출된 요건이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {drafts.map((draft) => (
                                    <Card key={draft.id} className={`border ${draft.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : draft.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-bold text-slate-800">{draft.title || '제목 없음'}</span>
                                                        <Badge className={`text-xs ${getStatusBadge(draft.status)}`}>
                                                            {draft.status}
                                                        </Badge>
                                                        {draft.confidence && (
                                                            <Badge variant="outline" className="text-xs">
                                                                신뢰도: {Math.round(draft.confidence * 100)}%
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2">{draft.content}</p>

                                                    {/* AI Metadata Display */}
                                                    {(draft.suggestedDomain || draft.suggestedFunction || draft.suggestedMenu || (draft.suggestedTags && draft.suggestedTags.length > 0)) && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {draft.suggestedDomain && (
                                                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                                    <Briefcase className="h-3 w-3 mr-1" />
                                                                    {draft.suggestedDomain}
                                                                </Badge>
                                                            )}
                                                            {draft.suggestedFunction && (
                                                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                                    <Layout className="h-3 w-3 mr-1" />
                                                                    {draft.suggestedFunction}
                                                                </Badge>
                                                            )}
                                                            {draft.suggestedMenu && (
                                                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                                    <Eye className="h-3 w-3 mr-1" />
                                                                    {draft.suggestedMenu}
                                                                </Badge>
                                                            )}
                                                            {draft.suggestedTags && draft.suggestedTags.map((tag, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                                    <Tag className="h-3 w-3 mr-1" />
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {draft.originalText && (
                                                        <p className="text-xs text-slate-400 bg-slate-100 p-2 rounded">
                                                            원문: "{draft.originalText.slice(0, 150)}..."
                                                        </p>
                                                    )}
                                                </div>

                                                {draft.status === 'PENDING' && (
                                                    <div className="flex gap-2 ml-4">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={(e) => { e.stopPropagation(); approveDraft(draft.id); }}
                                                            disabled={approving === draft.id}
                                                        >
                                                            {approving === draft.id ? (
                                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={(e) => { e.stopPropagation(); rejectDraft(draft.id); }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}

                                                {draft.status === 'APPROVED' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-indigo-600 hover:bg-indigo-700 ml-4"
                                                        onClick={(e) => { e.stopPropagation(); mergeSingleDraft(draft.id); }}
                                                        disabled={approving === draft.id}
                                                    >
                                                        {approving === draft.id ? (
                                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <Database className="h-4 w-4 mr-1" />
                                                        )}
                                                        요건 병합
                                                    </Button>
                                                )}

                                                {draft.status === 'MERGED' && draft.mergedRequirementId && (
                                                    <Link
                                                        href={`/requirements/${draft.mergedRequirementId}`}
                                                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors ml-4"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                        요건 보기
                                                    </Link>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm text-slate-500">
                                {drafts.filter(d => d.status === 'APPROVED').length}건 승인 /
                                {drafts.filter(d => d.status === 'PENDING').length}건 대기
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={batchRejectAll}
                                    disabled={drafts.filter(d => d.status === 'PENDING').length === 0}
                                >
                                    <X className="h-4 w-4 mr-1" /> 전체 거절
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={batchApproveAll}
                                    disabled={drafts.filter(d => d.status === 'PENDING').length === 0 || approving === 'batch'}
                                >
                                    {approving === 'batch' ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    전체 승인
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    onClick={mergeApprovedToRequirements}
                                    disabled={drafts.filter(d => d.status === 'APPROVED').length === 0 || approving === 'merge'}
                                >
                                    {approving === 'merge' ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Database className="h-4 w-4 mr-1" />
                                    )}
                                    요건으로 병합
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                                    닫기
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
