'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Sparkles, Bot, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrustBadge } from '@/components/requirements/TrustBadge';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function RequirementsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [requirements, setRequirements] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const [category, setCategory] = useState<string | null>(searchParams.get('category'));

    // Debounced Search
    const debouncedSearch = useDebounce(search, 500);

    // Sync filters from URL on mount and URL change
    useEffect(() => {
        const catParam = searchParams.get('category');
        const statusParam = searchParams.get('status');

        if (catParam !== category) {
            setCategory(catParam);
        }
        if (statusParam && statusParam !== status) {
            setStatus(statusParam);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchReqs();
    }, [page, limit, debouncedSearch, status, category]);

    const fetchReqs = async () => {
        try {
            setLoading(true);
            const params: any = { page, limit };
            if (debouncedSearch) params.search = debouncedSearch;
            if (status !== 'ALL') params.status = status;
            if (category) params.category = category;

            const res = await api.get('/requirements', { params });
            // Backend returns { data: [], total: number, page: number, limit: number }
            setRequirements(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const maxPages = Math.ceil(total / limit) || 1;

    // Handlers
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        setPage(1);
        setSelected(new Set());
    };

    // Selection handlers
    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === requirements.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(requirements.map(r => r.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`${selected.size}개의 요건을 삭제하시겠습니까?`)) return;

        setBulkDeleting(true);
        try {
            await api.post('/requirements/global/bulk-delete', { ids: Array.from(selected) });
            setSelected(new Set());
            fetchReqs();
        } catch (err) {
            console.error(err);
            alert('일괄 삭제 실패');
        } finally {
            setBulkDeleting(false);
        }
    };

    return (
        <div className="space-y-6 container mx-auto max-w-7xl animate-in fade-in duration-500">
            <PageHeader
                title="요건 정의 및 관리"
                description="비즈니스 요구사항을 등록하고 AI로 분석하여 명확한 기술 요건으로 발전시킵니다."
                steps={['워크스페이스', '요건 정의']}
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="코드, 제목, 내용 검색..."
                            className="pl-9"
                            value={search}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="상태 (Status)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">전체 상태</SelectItem>
                            <SelectItem value="DRAFT">DRAFT</SelectItem>
                            <SelectItem value="REVIEW">REVIEW</SelectItem>
                            <SelectItem value="APPROVED">APPROVED</SelectItem>
                            <SelectItem value="DEPRECATED">DEPRECATED</SelectItem>
                        </SelectContent>
                    </Select>
                    {category && (
                        <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 px-3 py-1 cursor-pointer hover:bg-amber-200"
                            onClick={() => {
                                setCategory(null);
                                router.push('/requirements');
                            }}
                        >
                            🏷️ {category} ✕
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-500 mr-2">
                        Total <span className="font-bold text-slate-800">{total}</span> items
                    </div>
                    <Link href="/requirements/new">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> 신규 등록
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-white shadow-sm overflow-hidden relative min-h-[400px]">
                {/* Bulk Action Bar */}
                {selected.size > 0 && (
                    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-blue-700">
                            {selected.size}개 선택됨
                        </span>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                        >
                            {bulkDeleting ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            일괄 삭제
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                )}
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-3 py-4 w-[40px]">
                                <Checkbox
                                    checked={requirements.length > 0 && selected.size === requirements.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-5 py-4 font-bold w-[120px]">코드 (Code)</th>
                            <th className="px-5 py-4 font-bold">요건 명 / 내용 미리보기</th>
                            <th className="px-5 py-4 font-bold w-[120px]">생성 모델</th>
                            <th className="px-5 py-4 font-bold w-[150px]">신뢰도 (Trust)</th>
                            <th className="px-5 py-4 font-bold w-[120px]">상태</th>
                            <th className="px-5 py-4 font-bold w-[120px]">분류</th>
                            <th className="px-5 py-4 font-bold w-[150px]">최종 수정일</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requirements.map((req) => (
                            <tr
                                key={req.id}
                                className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${selected.has(req.id) ? 'bg-blue-50' : ''}`}
                                onClick={() => router.push(`/requirements/${req.id}`)}
                            >
                                <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selected.has(req.id)}
                                        onCheckedChange={() => toggleSelect(req.id)}
                                    />
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-900 font-mono text-xs">{req.code}</td>
                                <td className="px-5 py-4">
                                    <div className="font-bold text-slate-800 mb-0.5">{req.title}</div>
                                    <div className="text-xs text-slate-500 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {req.content}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-xs">
                                    {req.aiMetadata?.modelName ? (
                                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit">
                                            <Sparkles className="h-3 w-3" />
                                            {req.aiMetadata.modelName}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <TrustBadge
                                        score={req.trustScore?.totalScore || req.trustGrade || 0}
                                        status={req.maturity || 'DRAFT'}
                                    />
                                </td>
                                <td className="px-5 py-4">
                                    <Badge variant="outline" className={
                                        req.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                                            req.status === 'REVIEW' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                'bg-slate-50 text-slate-500'
                                    }>
                                        {req.status}
                                    </Badge>
                                </td>
                                <td className="px-5 py-4 text-xs font-medium text-slate-600">
                                    {req.business?.name || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-5 py-4 text-xs text-slate-400">
                                    {new Date(req.updatedAt).toLocaleString('ko-KR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })}
                                </td>
                            </tr>
                        ))}
                        {!loading && requirements.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-20 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Filter className="h-8 w-8 text-slate-200" />
                                        <p>검색 결과가 없습니다.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    Showing {requirements.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">Page {page}</span>
                        <span className="text-sm text-slate-400">/ {maxPages}</span>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(p => Math.min(maxPages, p + 1))}
                        disabled={page === maxPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(maxPages)}
                        disabled={page === maxPages}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
