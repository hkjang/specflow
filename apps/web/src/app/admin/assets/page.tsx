'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Search, Filter, CheckSquare, Square, ChevronLeft, ChevronRight, Trash2, CheckCircle, XCircle, Plus, Edit2 } from 'lucide-react';
import clsx from 'clsx';

export default function AdminAssetsPage() {
    const [requirements, setRequirements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [status, setStatus] = useState<string>('ALL');
    const [search, setSearch] = useState<string>('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, page, search]); // Simple debounce might be needed for search in real app

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/requirements', {
                params: { status, search, page, limit }
            });
            setRequirements(res.data.data);
            setTotal(res.data.total);
            // Clear selection on page change or filter change? Usually yes to avoid confusion
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Failed to fetch requirements", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === requirements.length && requirements.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(requirements.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (actionStatus: string) => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size}개 항목의 상태를 변경하시겠습니까?`)) return;

        try {
            await api.post('/requirements/global/bulk-status', {
                ids: Array.from(selectedIds),
                status: actionStatus
            });
            fetchData();
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Bulk action failed", error);
            alert("상태 업데이트 실패");
        }
    };

    const totalPages = Math.ceil(total / limit);
    const isAllSelected = requirements.length > 0 && selectedIds.size === requirements.length;

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
            <PageHeader
                title="요건 자산 관리 (Assets)"
                description="등록된 모든 요건 자산을 조회, 검수, 승인 및 관리합니다."
                badgeText="MANAGEMENT"
                steps={['관리자', '자산 관리', '전체 조회']}
            />

            {/* Toolbar */}
            <Card className="flex flex-wrap items-center gap-4 p-4 border-slate-200 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="요건 코드, 제목, 내용 검색..."
                        className="pl-8 bg-slate-50 border-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
                    />
                </div>

                <div className="flex gap-2">
                    {['ALL', 'DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'].map((s) => (
                        <Button
                            key={s}
                            variant={status === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setStatus(s); setPage(1); }}
                            className={clsx(status === s ? 'bg-slate-800' : 'text-slate-600')}
                        >
                            {s === 'ALL' ? '전체' : s}
                        </Button>
                    ))}
                    <div className="w-px bg-gray-200 h-8 mx-2" />
                    <Link href="/requirements/new">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold">
                            <Plus className="mr-2 h-4 w-4" /> 신규 자산 등록
                        </Button>
                    </Link>
                </div>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-4 rounded-lg bg-indigo-50 px-4 py-2 text-indigo-900 animate-in fade-in slide-in-from-top-2 border border-indigo-100">
                    <span className="font-bold">{selectedIds.size}개 선택됨</span>
                    <div className="h-4 w-px bg-indigo-200" />
                    <Button size="sm" variant="ghost" className="hover:bg-indigo-100" onClick={() => handleBulkAction('APPROVED')}>
                        <CheckCircle className="mr-2 h-4 w-4" /> 승인 처리 (Approve)
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:bg-indigo-100" onClick={() => handleBulkAction('REVIEW')}>
                        <Filter className="mr-2 h-4 w-4" /> 검수 요청 (Review)
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:bg-rose-100 hover:text-rose-700" onClick={() => handleBulkAction('DEPRECATED')}>
                        <XCircle className="mr-2 h-4 w-4" /> 폐기 (Deprecate)
                    </Button>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 shadow-sm font-semibold">
                        <tr>
                            <th className="w-12 px-4 py-3 border-b">
                                <button onClick={toggleSelectAll} className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 hover:bg-white bg-white">
                                    {isAllSelected ? <CheckSquare className="h-3 w-3 text-blue-600" /> : <div className="h-3 w-3" />}
                                </button>
                            </th>
                            <th className="px-4 py-3 border-b">코드 (Code)</th>
                            <th className="px-4 py-3 w-1/3 border-b">요건명 (Title)</th>
                            <th className="px-4 py-3 border-b">상태 (Status)</th>
                            <th className="px-4 py-3 border-b">품질 점수 (Avg)</th>
                            <th className="px-4 py-3 border-b">최종 수정일</th>
                            <th className="px-4 py-3 text-right border-b">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-500">데이터를 불러오는 중입니다...</td></tr>
                        )}
                        {!loading && requirements.length === 0 && (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-400">조건에 맞는 데이터가 없습니다.</td></tr>
                        )}
                        {!loading && requirements.map((req) => (
                            <tr key={req.id} className={clsx("hover:bg-slate-50/80 transition-colors", selectedIds.has(req.id) && "bg-blue-50/40")}>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => toggleSelect(req.id)}
                                        className={clsx(
                                            "flex h-4 w-4 items-center justify-center rounded border",
                                            selectedIds.has(req.id) ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 hover:bg-white bg-white"
                                        )}
                                    >
                                        {selectedIds.has(req.id) && <CheckSquare className="h-3 w-3" />}
                                    </button>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                    <Link href={`/admin/assets/${req.id}`} className="hover:underline hover:text-blue-600">
                                        {req.code}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    <Link href={`/admin/assets/${req.id}`} className="hover:text-blue-600 truncate block max-w-sm">
                                        {req.title}
                                    </Link>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={req.status === 'APPROVED' ? 'default' : 'secondary'} className={clsx(
                                        req.status === 'APPROVED' && "bg-emerald-500 hover:bg-emerald-600",
                                        req.status === 'DRAFT' && "bg-slate-500",
                                        req.status === 'REVIEW' && "bg-amber-500",
                                    )}>
                                        {req.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    {req.qualityMetric ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full", req.qualityMetric.overallScore > 80 ? 'bg-emerald-500' : 'bg-amber-500')}
                                                    style={{ width: `${req.qualityMetric.overallScore}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-mono text-slate-600">{req.qualityMetric.overallScore.toFixed(0)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(req.updatedAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Link href={`/requirements/${req.id}/edit`}>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={async () => {
                                            if (confirm('이 자산을 영구 삭제하시겠습니까?')) {
                                                try {
                                                    await api.delete(`/requirements/${req.id}`);
                                                    fetchData();
                                                } catch (e) {
                                                    alert('삭제 실패');
                                                }
                                            }
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 px-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="h-8"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    이전
                </Button>
                <div className="text-xs font-medium text-slate-600">
                    {page} / {totalPages || 1} 페이지
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="h-8"
                >
                    다음
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
