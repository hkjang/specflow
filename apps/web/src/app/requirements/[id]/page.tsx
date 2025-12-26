'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api, knowledgeApi, adminApi } from '@/lib/api';
// Wrapper for params to handle async nature of Next.js 15+ or just standard hook
import { useParams } from 'next/navigation';
import { Save, ArrowLeft, History, FileText, Tag, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/requirements/CommentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirementBlockDisplay } from '@/components/requirements/RequirementBlockDisplay';
import { AiAssistantWidget } from '@/components/ai/AiAssistantWidget';
import { TrustBadge } from '@/components/requirements/TrustBadge';

export default function RequirementDetail() {
    const params = useParams();
    const id = params?.id as string;
    const [req, setReq] = useState<any>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEnriching, setIsEnriching] = useState(false);
    const enrichAttemptedRef = useRef(false);

    // Check if requirement lacks metadata
    const hasNoMetadata = (requirement: any) => {
        return !requirement.business &&
            !requirement.function &&
            !requirement.menu &&
            (!requirement.classifications || requirement.classifications.length === 0);
    };

    // Auto-enrich with AI when metadata is missing
    const autoEnrich = async () => {
        if (!id || isEnriching) return;
        setIsEnriching(true);
        try {
            await adminApi.enrichRequirement(id);
            await fetchReq(); // Refresh to get new metadata
        } catch (err) {
            console.error('Auto enrichment failed:', err);
        } finally {
            setIsEnriching(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchReq();
        }
    }, [id]);

    // Trigger auto-enrich after data is loaded if metadata is missing
    useEffect(() => {
        if (req && hasNoMetadata(req) && !enrichAttemptedRef.current && !isEnriching) {
            enrichAttemptedRef.current = true;
            autoEnrich();
        }
    }, [req]);

    const fetchReq = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/requirements/${id}`);
            setReq(res.data);
            setContent(res.data.content);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.patch(`/requirements/${id}`, { content });
            alert('저장되었습니다.');
            fetchReq(); // Refresh
        } catch (err) {
            alert('저장 실패');
        }
    };

    const handleAiApply = (newContent: string) => {
        setContent(newContent);
        // Automatically save or just update state? Let's just update state for review.
    };

    if (loading) return <div className="p-8 text-center text-slate-500">정보 불러오는 중...</div>;
    if (!req) return <div className="p-8 text-center text-slate-500">요건을 찾을 수 없습니다.</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2 mb-4">
                <Link href="/requirements" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="text-sm text-slate-500">목록으로 돌아가기</div>
            </div>

            <PageHeader
                title={`${req.code}: ${req.title}`}
                description="요건의 상세 내용을 정의하고 AI 도구를 활용해 완성도를 높이세요."
                steps={['요건 정의', '상세 및 편집']}
                badgeText={req.status}
            />

            <div className="flex justify-end gap-2">
                <button onClick={handleSave} className="flex items-center gap-2 rounded bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all">
                    <Save className="h-4 w-4" /> 변경사항 저장
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Structure Visualization */}
                    <RequirementBlockDisplay content={content} />

                    {/* 2. Editor & AI */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                원문 상세 편집 (Content Editor)
                            </label>
                            <span className="text-xs text-slate-400">MarkDown 지원</span>
                        </div>

                        <div className="p-4 space-y-4">
                            <textarea
                                className="w-full rounded-lg border-slate-200 p-4 min-h-[300px] text-slate-700 leading-relaxed focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono text-sm"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="요건 내용을 상세히 입력하세요..."
                            />

                            {/* AI Widget */}
                            <div className="flex justify-end">
                                <AiAssistantWidget currentContent={content} onApply={handleAiApply} />
                            </div>
                        </div>
                    </div>

                    {/* 3. History */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
                            <History className="h-4 w-4" />
                            변경 이력 (History)
                        </h3>
                        <ul className="space-y-4 relative before:absolute before:left-[9px] before:top-2 before:h-full before:w-px before:bg-slate-100">
                            {req.history?.map((h: any) => (
                                <li key={h.id} className="relative pl-6">
                                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-slate-200 ring-4 ring-white" />
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                        <span className="text-sm font-bold text-slate-700">v{h.version}</span>
                                        <span className="text-xs text-slate-500">updated by {h.changer?.email || 'Unknown'}</span>
                                        <span className="text-xs text-slate-400 ml-auto">{new Date(h.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                        {/* Simple change summary simulation */}
                                        Update content...
                                    </div>
                                </li>
                            ))}
                            {(!req.history || req.history.length === 0) && (
                                <li className="pl-6 text-sm text-slate-400 italic">이력이 없습니다.</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Sidebar Panel */}
                <div className="space-y-6">
                    {/* Knowledge Asset Card */}
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                        <h3 className="font-bold mb-4 text-slate-800 border-b pb-2">지식 자산 정보</h3>

                        <div className="space-y-5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">성숙도 (Maturity)</span>
                                <TrustBadge score={req.trustScore?.overallScore || 0} status={req.maturity} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-600">신뢰 등급 (Trust)</span>
                                    <span className="font-mono font-bold text-emerald-600">{req.trustGrade?.toFixed(1) || '0.0'}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${req.trustGrade || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center pt-2">
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                    <div className="text-xl font-extrabold text-slate-800">{req.assetMetric?.views || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">조회수</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                    <div className="text-xl font-extrabold text-slate-800">{req.assetMetric?.adoptionRate?.toFixed(1) || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">활용도</div>
                                </div>
                            </div>

                            <div className="pt-2 space-y-2">
                                {req.maturity !== 'VERIFIED' && (
                                    <button
                                        className="w-full text-xs font-bold bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm hover:shadow"
                                        onClick={async () => {
                                            if (!confirm('이 요건을 표준 자산으로 승격하시겠습니까?')) return;
                                            await knowledgeApi.promoteRequirement(id);
                                            fetchReq();
                                        }}
                                    >
                                        표준 자산 승격 (Promote)
                                    </button>
                                )}
                                {req.maturity === 'STANDARD' && (
                                    <button
                                        className="w-full text-xs font-bold bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 transition shadow-sm hover:shadow"
                                        onClick={async () => {
                                            if (!confirm('이 표준 요건의 활용을 검증하시겠습니까?')) return;
                                            await knowledgeApi.verifyRequirement(id);
                                            fetchReq();
                                        }}
                                    >
                                        검증 완료 (Verify)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-slate-800">메타데이터</h3>
                            {isEnriching && (
                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>AI 자동 분류 중...</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500">비즈니스 도메인</span>
                                <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors cursor-pointer">
                                    {req.business?.name || '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500">기능 (Function)</span>
                                <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors cursor-pointer">
                                    {req.function?.name || '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500">관련 메뉴</span>
                                <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors cursor-pointer">
                                    {req.menu?.name || '-'}
                                </span>
                            </div>

                            {/* AI Source Metadata */}
                            {req.aiMetadata?.modelName && (
                                <div className="flex justify-between items-center group pt-2 border-t border-slate-100 mt-2">
                                    <span className="text-slate-500 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                        생성 모델
                                    </span>
                                    <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100">
                                        {req.aiMetadata.modelName}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Classifications / Tags */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">분류 태그 (Tags)</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {req.classifications?.map((c: any) => (
                                    <div
                                        key={c.id}
                                        className={`
                                            flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${c.source === 'AI'
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 border-dashed'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'}
                                            transition-colors hover:bg-opacity-80
                                        `}
                                        title={
                                            c.source === 'AI'
                                                ? `AI Classified by ${c.model || 'Unknown'} (Confidence: ${(c.confidence * 100).toFixed(0)}%)`
                                                : 'Human Verified'
                                        }
                                    >
                                        {c.source === 'AI' && <Sparkles className="h-3 w-3" />}
                                        {c.category?.name}
                                        {c.model && <span className="text-[10px] opacity-75 ml-0.5">({c.model})</span>}
                                    </div>
                                ))}
                                {(!req.classifications || req.classifications.length === 0) && (
                                    <span className="text-xs text-slate-400">등록된 태그가 없습니다.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mock Comments Wrapper */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <CommentSection requirementId={req.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
