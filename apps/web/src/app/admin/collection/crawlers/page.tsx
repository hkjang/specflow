'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/PageHeader';
import { Play, Pause, RefreshCw, Trash2, Plus, Bot, Edit2, CheckCircle, XCircle, Clock, AlertTriangle, Zap, History } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Crawler {
    id: string;
    name: string;
    url: string;
    schedule: string;
    status: string;
    category?: string;
    description?: string;
    lastRunAt?: string;
    successCount?: number;
    errorCount?: number;
}

const CATEGORIES = [
    { value: 'REGULATION', label: '규정/법령' },
    { value: 'NEWS', label: '뉴스/동향' },
    { value: 'COMPETITOR', label: '경쟁사 분석' },
    { value: 'INTERNAL', label: '사내 문서' },
];

const SCHEDULE_PRESETS = [
    { value: '0 * * * *', label: '매시간' },
    { value: '0 */2 * * *', label: '2시간마다' },
    { value: '0 */4 * * *', label: '4시간마다' },
    { value: '0 0 * * *', label: '매일 자정' },
    { value: '0 2 * * *', label: '매일 새벽 2시' },
    { value: '0 0 * * 1', label: '매주 월요일' },
    { value: '0 0 1 * *', label: '매월 1일' },
];

export default function CrawlersPage() {
    const [crawlers, setCrawlers] = useState<Crawler[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedCrawler, setSelectedCrawler] = useState<Crawler | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        schedule: '0 0 * * *',
        category: 'REGULATION',
        description: ''
    });
    const [runningId, setRunningId] = useState<string | null>(null);
    const [lastRunResult, setLastRunResult] = useState<{ success: boolean; message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchCrawlers();
    }, []);

    const fetchCrawlers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/collection/crawlers');
            setCrawlers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchCrawlers, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Toast notification
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Get filtered crawlers
    const getFilteredCrawlers = () => {
        return crawlers.filter(c => {
            const matchesSearch = !searchTerm || 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.url.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    };

    // Select all toggle
    const toggleSelectAll = () => {
        const filtered = getFilteredCrawlers();
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(c => c.id));
        }
    };

    // Bulk actions
    const handleBulkRun = async () => {
        for (const id of selectedIds) {
            const crawler = crawlers.find(c => c.id === id);
            if (crawler) await handleRun(crawler);
        }
        setSelectedIds([]);
        showToast(`${selectedIds.length}개 크롤러 실행 완료`);
    };

    const handleBulkToggle = async (active: boolean) => {
        for (const id of selectedIds) {
            await api.patch(`/collection/crawlers/${id}`, { status: active ? 'ACTIVE' : 'PAUSED' });
        }
        await fetchCrawlers();
        setSelectedIds([]);
        showToast(`${selectedIds.length}개 크롤러 ${active ? '활성화' : '일시정지'}`);
    };

    // Success rate calculation
    const getSuccessRate = (crawler: Crawler) => {
        const total = (crawler.successCount || 0) + (crawler.errorCount || 0);
        if (total === 0) return 0;
        return Math.round(((crawler.successCount || 0) / total) * 100);
    };

    const resetForm = () => {
        setFormData({ name: '', url: '', schedule: '0 0 * * *', category: 'REGULATION', description: '' });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.url) {
            alert('이름과 URL은 필수입니다.');
            return;
        }
        try {
            await api.post('/collection/crawlers', {
                ...formData,
                status: 'ACTIVE'
            });
            setCreateOpen(false);
            resetForm();
            fetchCrawlers();
        } catch (error) {
            alert('크롤러 생성 실패');
        }
    };

    const handleEdit = (crawler: Crawler) => {
        setSelectedCrawler(crawler);
        setFormData({
            name: crawler.name,
            url: crawler.url,
            schedule: crawler.schedule,
            category: crawler.category || 'REGULATION',
            description: crawler.description || ''
        });
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedCrawler) return;
        try {
            await api.patch(`/collection/crawlers/${selectedCrawler.id}`, formData);
            setEditOpen(false);
            setSelectedCrawler(null);
            resetForm();
            fetchCrawlers();
        } catch (error) {
            alert('업데이트 실패');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" 크롤러를 정말 삭제하시겠습니까?\n\n모든 수집 이력도 함께 삭제됩니다.`)) return;
        try {
            await api.delete(`/collection/crawlers/${id}`);
            fetchCrawlers();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const toggleStatus = async (crawler: Crawler) => {
        const newStatus = crawler.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            await api.patch(`/collection/crawlers/${crawler.id}`, { status: newStatus });
            fetchCrawlers();
        } catch (error) {
            alert('상태 업데이트 실패');
        }
    };

    const handleRun = async (crawler: Crawler) => {
        setRunningId(crawler.id);
        setLastRunResult(null);
        try {
            const res = await api.post(`/collection/crawlers/${crawler.id}/run`);
            setLastRunResult({ success: res.data.success, message: res.data.message });
            fetchCrawlers();
        } catch (error: any) {
            setLastRunResult({ success: false, message: error.message || '실행 실패' });
        } finally {
            setRunningId(null);
            // Auto clear result after 5 seconds
            setTimeout(() => setLastRunResult(null), 5000);
        }
    };

    const getCategoryBadge = (category?: string) => {
        const colors: Record<string, string> = {
            REGULATION: 'bg-purple-100 text-purple-700',
            NEWS: 'bg-blue-100 text-blue-700',
            COMPETITOR: 'bg-orange-100 text-orange-700',
            INTERNAL: 'bg-slate-100 text-slate-700',
        };
        const labels: Record<string, string> = {
            REGULATION: '규정',
            NEWS: '뉴스',
            COMPETITOR: '경쟁사',
            INTERNAL: '사내',
        };
        return <Badge className={colors[category || 'REGULATION'] || colors.REGULATION}>{labels[category || 'REGULATION']}</Badge>;
    };

    const getStatusBadge = (status: string) => {
        if (status === 'ACTIVE') return <Badge className="bg-emerald-500 hover:bg-emerald-600">동작중</Badge>;
        if (status === 'ERROR') return <Badge className="bg-red-500 hover:bg-red-600">오류</Badge>;
        return <Badge className="bg-slate-200 text-slate-500">일시정지</Badge>;
    };

    const formatLastRun = (date?: string) => {
        if (!date) return '-';
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return '방금 전';
        if (diffHours < 24) return `${diffHours}시간 전`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}일 전`;
    };

    // Summary stats
    const activeCrawlers = crawlers.filter(c => c.status === 'ACTIVE').length;
    const totalSuccess = crawlers.reduce((sum, c) => sum + (c.successCount || 0), 0);
    const totalErrors = crawlers.reduce((sum, c) => sum + (c.errorCount || 0), 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="자동 수집 봇 (Crawler Bots)"
                description="정기적으로 외부 사이트를 방문하여 최신 정보를 수집하는 봇을 관리합니다."
                badgeText="AUTOMATION"
                steps={['관리자', '데이터 수집', '크롤러']}
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-bold text-slate-500">전체 크롤러</p>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800">{crawlers.length}개</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Play className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs font-bold text-slate-500">활성 봇</p>
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-600">{activeCrawlers}개</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <p className="text-xs font-bold text-slate-500">총 성공</p>
                        </div>
                        <p className="text-2xl font-extrabold text-green-600">{totalSuccess}회</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <p className="text-xs font-bold text-slate-500">총 오류</p>
                        </div>
                        <p className="text-2xl font-extrabold text-amber-600">{totalErrors}회</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search, Filter, and Actions Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 flex-wrap">
                    <Input 
                        placeholder="이름/URL 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 w-[180px] bg-white"
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-9 w-[100px] bg-white">
                            <SelectValue placeholder="카테고리" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">전체</SelectItem>
                            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-[100px] bg-white">
                            <SelectValue placeholder="상태" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">전체</SelectItem>
                            <SelectItem value="ACTIVE">활성</SelectItem>
                            <SelectItem value="PAUSED">정지</SelectItem>
                            <SelectItem value="ERROR">오류</SelectItem>
                        </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={autoRefresh} 
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-3 h-3"
                        />
                        🔄 자동 (30s)
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="text-xs text-slate-500">{selectedIds.length}개 선택</span>
                            <Button variant="outline" size="sm" onClick={handleBulkRun} className="h-8 text-xs text-emerald-600">
                                ⚡ 일괄 실행
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(true)} className="h-8 text-xs text-blue-600">
                                ▶ 활성화
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(false)} className="h-8 text-xs text-amber-600">
                                ⏸ 정지
                            </Button>
                        </div>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchCrawlers}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                    </Button>
                    <Link href="/admin/collection/history">
                        <Button variant="outline" size="sm">
                            <History className="h-4 w-4 mr-1" /> 이력
                        </Button>
                    </Link>
                </div>
                
                {/* Create Dialog */}
                <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 크롤러 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>새 크롤러 추가</DialogTitle>
                            <DialogDescription>외부 사이트에서 자동으로 정보를 수집할 봇을 설정합니다.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>크롤러 이름 *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 금융감독원 규정 수집"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>대상 URL *</Label>
                                <Input
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://example.com/regulations"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>카테고리</Label>
                                    <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>수집 주기</Label>
                                    <Select value={formData.schedule} onValueChange={v => setFormData({ ...formData, schedule: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SCHEDULE_PRESETS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>설명</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="이 크롤러의 목적을 설명하세요..."
                                    rows={2}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
                            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">생성하기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setSelectedCrawler(null); resetForm(); }}}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>크롤러 수정</DialogTitle>
                        <DialogDescription>크롤러 설정을 수정합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>크롤러 이름 *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>대상 URL *</Label>
                            <Input
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>카테고리</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>수집 주기</Label>
                                <Select value={formData.schedule} onValueChange={v => setFormData({ ...formData, schedule: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SCHEDULE_PRESETS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>설명</Label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
                        <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">저장하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Crawlers Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.length === getFilteredCrawlers().length && getFilteredCrawlers().length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4"
                                    />
                                </TableHead>
                                <TableHead>봇 이름</TableHead>
                                <TableHead>카테고리</TableHead>
                                <TableHead>대상 URL</TableHead>
                                <TableHead>주기</TableHead>
                                <TableHead>마지막 실행</TableHead>
                                <TableHead>성공률</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getFilteredCrawlers().map((crawler) => (
                                <TableRow key={crawler.id} className={`hover:bg-slate-50 ${selectedIds.includes(crawler.id) ? 'bg-blue-50' : ''}`}>
                                    <TableCell>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(crawler.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, crawler.id]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => id !== crawler.id));
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-4 w-4 text-slate-400" />
                                            <div>
                                                <p className="font-bold text-slate-700">{crawler.name}</p>
                                                {crawler.description && (
                                                    <p className="text-xs text-slate-400 max-w-[200px] truncate">{crawler.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getCategoryBadge(crawler.category)}</TableCell>
                                    <TableCell>
                                        <a href={crawler.url} target="_blank" rel="noopener" className="text-blue-600 text-xs font-mono underline max-w-[150px] truncate block">{crawler.url}</a>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">{crawler.schedule}</code>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Clock className="h-3 w-3" />
                                            {formatLastRun(crawler.lastRunAt)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${getSuccessRate(crawler) >= 80 ? 'bg-emerald-500' : getSuccessRate(crawler) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${getSuccessRate(crawler)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium ${getSuccessRate(crawler) >= 80 ? 'text-emerald-600' : getSuccessRate(crawler) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {getSuccessRate(crawler)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(crawler.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" 
                                                onClick={() => handleRun(crawler)} 
                                                title="수집 실행"
                                                disabled={runningId === crawler.id}
                                            >
                                                <Zap className={`h-4 w-4 ${runningId === crawler.id ? 'animate-pulse text-amber-500' : ''}`} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(crawler)} title="수정">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50" onClick={() => toggleStatus(crawler)} title={crawler.status === 'ACTIVE' ? "일시정지" : "재개"}>
                                                {crawler.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(crawler.id, crawler.name)} title="삭제">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {crawlers.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                        설정된 크롤러가 없습니다. "크롤러 추가" 버튼을 눌러 새 봇을 등록하세요.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse z-50">
                    ✓ {toastMessage}
                </div>
            )}
        </div>
    );
}
