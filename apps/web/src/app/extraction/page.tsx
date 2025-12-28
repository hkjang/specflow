'use client';


import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from '@/components/layout/PageHeader';
import { 
    PlusCircle, FileText, Activity, Trash2, Loader2, ArrowRight, 
    Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
    Download, RefreshCw, Search, Filter, BarChart3, TrendingUp, Zap,
    Copy, Eye, MoreHorizontal, Keyboard
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { extractionApi } from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Relative time formatting
const getRelativeTime = (date: string | Date): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return then.toLocaleDateString('ko-KR');
};

// Duration calculation
const getDuration = (start: string | Date, end?: string | Date): string => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return `${diffSec}초`;
    if (diffMin < 60) return `${diffMin}분 ${diffSec % 60}초`;
    return `${Math.floor(diffMin / 60)}시간 ${diffMin % 60}분`;
};

// Status configuration
const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; label: string; animate?: boolean }> = {
    COMPLETED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', label: '완료' },
    PROCESSING: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', label: '진행중', animate: true },
    PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', label: '대기중' },
    FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', label: '실패' },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ExtractionDashboard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState<'date' | 'status' | 'count' | 'duration'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            switch(e.key.toLowerCase()) {
                case 'r':
                    e.preventDefault();
                    fetchJobs();
                    break;
                case 'n':
                    e.preventDefault();
                    window.location.href = '/extraction/new';
                    break;
                case 'escape':
                    setSelectedIds([]);
                    break;
                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleSelectAll();
                    }
                    break;
                case '?':
                    setShowKeyboardShortcuts(prev => !prev);
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        fetchJobs();
        // Auto-refresh every 5 seconds if there are active jobs and auto-refresh is enabled
        const interval = setInterval(() => {
            if (!autoRefreshEnabled) return;
            setJobs(currentJobs => {
                const hasActive = currentJobs.some(j => j.status === 'PROCESSING' || j.status === 'PENDING');
                if (hasActive) {
                    fetchJobs(true); // Silent fetch
                }
                return currentJobs;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefreshEnabled]);

    const fetchJobs = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await extractionApi.getAllJobs();
            setJobs(res.data);
        } catch (e) {
            console.error(e);
            if (!silent) toast.error("Failed to load extraction jobs");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await extractionApi.deleteJob(id);
            setJobs(prev => prev.filter(j => j.id !== id));
            toast.success("Extraction job deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete job");
        } finally {
            setDeletingId(null);
        }
    };

    // Filter jobs
    const filteredJobs = useMemo(() => jobs.filter(job => {
        const matchesSearch = (job.source?.metadata?.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              job.id.includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [jobs, searchTerm, statusFilter]);

    // Sort jobs
    const sortedJobs = useMemo(() => [...filteredJobs].sort((a, b) => {
        let result = 0;
        if (sortBy === 'date') result = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        else if (sortBy === 'status') result = a.status.localeCompare(b.status);
        else if (sortBy === 'count') result = (b.drafts?.length || 0) - (a.drafts?.length || 0);
        else if (sortBy === 'duration') {
            const durationA = new Date(a.completedAt || new Date()).getTime() - new Date(a.createdAt).getTime();
            const durationB = new Date(b.completedAt || new Date()).getTime() - new Date(b.createdAt).getTime();
            result = durationB - durationA;
        }
        return sortOrder === 'asc' ? -result : result;
    }), [filteredJobs, sortBy, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
    const paginatedJobs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedJobs.slice(start, start + itemsPerPage);
    }, [sortedJobs, currentPage, itemsPerPage]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, itemsPerPage]);

    // Toast notification
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Toggle select all
    const toggleSelectAll = useCallback(() => {
        if (selectedIds.length === paginatedJobs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedJobs.map(j => j.id));
        }
    }, [selectedIds, paginatedJobs]);

    // Bulk delete
    const handleBulkDelete = async () => {
        if (!confirm(`선택한 ${selectedIds.length}개의 작업을 삭제하시겠습니까?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => extractionApi.deleteJob(id)));
            setJobs(prev => prev.filter(j => !selectedIds.includes(j.id)));
            toast.success(`${selectedIds.length}개 작업 삭제됨`);
            setSelectedIds([]);
        } catch (e) {
            toast.error("일부 작업 삭제에 실패했습니다");
        } finally {
            setLoading(false);
        }
    };

    // Export jobs data (JSON)
    const exportJobsData = (format: 'json' | 'csv') => {
        const data = sortedJobs.map(j => ({
            id: j.id,
            source: j.source?.metadata?.filename || '',
            status: j.status,
            draftsCount: j.drafts?.length || 0,
            createdAt: j.createdAt,
            completedAt: j.completedAt || ''
        }));
        
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extraction-jobs-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const headers = ['ID', 'Source', 'Status', 'Drafts Count', 'Created At', 'Completed At'];
            const csvContent = [
                headers.join(','),
                ...data.map(row => [row.id, `"${row.source}"`, row.status, row.draftsCount, row.createdAt, row.completedAt].join(','))
            ].join('\n');
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extraction-jobs-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        toast.success(`${format.toUpperCase()} 내보내기 완료`);
    };

    // Copy ID to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('ID가 클립보드에 복사되었습니다');
    };

    // Calculate metrics locally from jobs
    const metrics = useMemo(() => {
        const activeJobs = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length;
        const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
        const failedJobs = jobs.filter(j => j.status === 'FAILED').length;
        const allDrafts = jobs.flatMap(j => j.drafts || []);
        const totalRequirements = allDrafts.length;
        const pendingReview = allDrafts.filter((d: any) => d.status === 'PENDING').length;
        const confidenceSum = allDrafts.reduce((acc: number, d: any) => acc + (d.confidence || 0), 0);
        const avgConfidence = totalRequirements > 0 ? Math.round(confidenceSum / totalRequirements) : 0;
        const successRate = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0;
        
        return { activeJobs, completedJobs, failedJobs, totalRequirements, pendingReview, avgConfidence, successRate };
    }, [jobs]);

    // Distribution Stats
    const distribution = useMemo(() => {
        const allDrafts = jobs.flatMap(j => j.drafts || []);
        return allDrafts.reduce((acc: any, draft: any) => {
            const type = draft.type || 'Functional'; 
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [jobs]);

    const totalDist = metrics.totalRequirements || 1;

    return (
        <TooltipProvider>
        <div className="p-6 space-y-6">
            <PageHeader
                title="AI 추출 대시보드 (Extraction)"
                description="문서로부터 요건을 자동으로 추출하고 상태를 모니터링합니다."
                badgeText="AI JOB"
                steps={['작업장', 'AI 추출']}
            />

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {/* Quick Status Filters */}
                    <Button 
                        variant={statusFilter === 'ALL' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setStatusFilter('ALL')}
                        className="h-8"
                    >
                        전체 ({jobs.length})
                    </Button>
                    <Button 
                        variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setStatusFilter('COMPLETED')}
                        className="h-8"
                    >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        완료 ({metrics.completedJobs})
                    </Button>
                    <Button 
                        variant={statusFilter === 'PROCESSING' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setStatusFilter('PROCESSING')}
                        className="h-8"
                    >
                        <Loader2 className="w-3 h-3 mr-1" />
                        진행중 ({metrics.activeJobs})
                    </Button>
                    <Button 
                        variant={statusFilter === 'FAILED' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setStatusFilter('FAILED')}
                        className="h-8"
                    >
                        <XCircle className="w-3 h-3 mr-1" />
                        실패 ({metrics.failedJobs})
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setShowKeyboardShortcuts(true)} className="h-8">
                                <Keyboard className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>키보드 단축키 (?)</TooltipContent>
                    </Tooltip>
                    <Link href="/extraction/new">
                        <Button className="font-bold bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> 신규 추출 작업
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Metrics Row - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            진행 중인 작업
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.activeJobs}</div>
                        {metrics.activeJobs > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-xs text-muted-foreground">실행 중</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            검토 대기
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{metrics.pendingReview}</div>
                        <span className="text-xs text-muted-foreground">드래프트</span>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            평균 신뢰도
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{metrics.avgConfidence}%</div>
                        <Progress value={metrics.avgConfidence} className="mt-2 h-1.5" />
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                            총 추출 요건
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.totalRequirements}</div>
                        <span className="text-xs text-muted-foreground">requirements</span>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Zap className="h-4 w-4 text-emerald-500" />
                            성공률
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{metrics.successRate}%</div>
                        <Progress value={metrics.successRate} className="mt-2 h-1.5" />
                    </CardContent>
                </Card>
            </div>

            {/* Real Data Visualization: Distribution */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-slate-500" />
                        요건 유형 분포 (Requirement Distribution)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {metrics.totalRequirements === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다.</div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(distribution).map(([type, count]) => {
                                const percentage = Math.round(((count as number) / totalDist) * 100);
                                let colorClass = 'bg-blue-500';
                                if (type.includes('Security')) colorClass = 'bg-red-500';
                                if (type.includes('Non')) colorClass = 'bg-slate-400';
                                if (type.includes('Performance')) colorClass = 'bg-purple-500';
                                
                                return (
                                    <div key={type} className="flex items-center gap-3">
                                        <div className="w-28 text-sm font-medium text-slate-700 capitalize truncate">{type}</div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${colorClass} transition-all duration-500`} 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-20 text-sm text-right font-mono text-slate-600">
                                            {count as number} ({percentage}%)
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-slate-500" />
                        추출 작업 이력 ({sortedJobs.length}건)
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="파일명 검색..." 
                                className="h-9 w-[180px] pl-8 bg-white" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                            <SelectTrigger className="h-9 w-[110px] bg-white">
                                <SelectValue placeholder="정렬" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date">날짜순</SelectItem>
                                <SelectItem value="status">상태순</SelectItem>
                                <SelectItem value="count">추출수</SelectItem>
                                <SelectItem value="duration">소요시간</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="h-9 px-2"
                        >
                            {sortOrder === 'desc' ? '↓' : '↑'}
                        </Button>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer bg-white border rounded-md px-2 h-9">
                            <input 
                                type="checkbox" 
                                checked={autoRefreshEnabled} 
                                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                                className="w-3.5 h-3.5"
                            />
                            <RefreshCw className={`w-3 h-3 ${autoRefreshEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                            자동
                        </label>
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-9">
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                {selectedIds.length}개 삭제
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Download className="w-4 h-4 mr-1" />
                                    내보내기
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => exportJobsData('json')}>
                                    JSON 형식
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportJobsData('csv')}>
                                    CSV 형식
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => fetchJobs()} disabled={loading} className="h-9">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                
                {filteredJobs.length === 0 ? (
                    <div className="text-sm text-slate-500 py-16 text-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                <span>데이터를 불러오는 중입니다...</span>
                            </div>
                        ) : (searchTerm || statusFilter !== 'ALL') ? (
                            <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-slate-300" />
                                <span>검색 결과가 없습니다.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-slate-300" />
                                <span>아직 수행된 추출 작업이 없습니다.</span>
                                <Link href="/extraction/new">
                                    <Button size="sm" className="mt-2">
                                        <PlusCircle className="w-4 h-4 mr-1" />
                                        첫 추출 작업 만들기
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.length === paginatedJobs.length && paginatedJobs.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded"
                                    />
                                </TableHead>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>소스</TableHead>
                                <TableHead>파일명</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead>추출수</TableHead>
                                <TableHead>소요시간</TableHead>
                                <TableHead>생성일</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedJobs.map((job) => {
                                const statusConfig = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                                const StatusIcon = statusConfig.icon;
                                
                                return (
                                <TableRow 
                                    key={job.id} 
                                    className={`${selectedIds.includes(job.id) ? 'bg-blue-50' : ''} hover:bg-slate-50 transition-colors`}
                                >
                                    <TableCell>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(job.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, job.id]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => id !== job.id));
                                                }
                                            }}
                                            className="w-4 h-4 rounded"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={() => copyToClipboard(job.id)}
                                                    className="font-mono text-xs text-muted-foreground hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    {job.id.slice(0, 8)}
                                                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>클릭하여 복사</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {job.source?.type || 'UNKNOWN'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-default">
                                                    {job.source?.metadata?.filename || 'Untitled Source'}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{job.source?.metadata?.filename || 'Untitled Source'}</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border flex items-center gap-1 w-fit`}>
                                            <StatusIcon className={`w-3 h-3 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                                            {statusConfig.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{job.drafts?.length || 0}</span>
                                        <span className="text-muted-foreground text-xs ml-1">개</span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {job.status === 'COMPLETED' || job.status === 'FAILED' 
                                            ? getDuration(job.createdAt, job.completedAt || job.updatedAt)
                                            : job.status === 'PROCESSING' 
                                                ? <span className="text-blue-600">{getDuration(job.createdAt)}</span>
                                                : '-'
                                        }
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {getRelativeTime(job.createdAt)}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {new Date(job.createdAt).toLocaleString('ko-KR')}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link href={`/extraction/${job.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent>상세 보기</TooltipContent>
                                            </Tooltip>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            이 작업과 관련된 모든 추출 데이터(Drafts)가 영구적으로 삭제됩니다.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handleDelete(job.id)}
                                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                        >
                                                            {deletingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>페이지당</span>
                                <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEMS_PER_PAGE_OPTIONS.map(n => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>건</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedJobs.length)} / {sortedJobs.length}건
                                </span>
                                <div className="flex gap-1">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>

            {/* Keyboard Shortcuts Modal */}
            {showKeyboardShortcuts && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardShortcuts(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Keyboard className="h-5 w-5" />
                            키보드 단축키
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-1.5 border-b">
                                <span>새 작업 생성</span>
                                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">N</kbd>
                            </div>
                            <div className="flex justify-between py-1.5 border-b">
                                <span>새로고침</span>
                                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">R</kbd>
                            </div>
                            <div className="flex justify-between py-1.5 border-b">
                                <span>전체 선택</span>
                                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">Ctrl+A</kbd>
                            </div>
                            <div className="flex justify-between py-1.5 border-b">
                                <span>선택 해제</span>
                                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">ESC</kbd>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span>이 창 토글</span>
                                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">?</kbd>
                            </div>
                        </div>
                        <Button className="w-full mt-4" onClick={() => setShowKeyboardShortcuts(false)}>
                            닫기
                        </Button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse z-50">
                    ✓ {toastMessage}
                </div>
            )}
        </div>
        </TooltipProvider>
    );
}

