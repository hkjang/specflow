'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Trash2, RefreshCw, FileText, Globe, Edit2, Cloud, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface DataSource {
    id: string;
    name: string;
    type: string;
    url: string;
    status: string;
    lastSync?: string;
}

export default function CollectionPage() {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'URL', url: '' });
    const [syncing, setSyncing] = useState<string | null>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await api.get('/collection/sources');
            setSources(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'URL', url: '' });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.url) {
            alert('이름과 URL은 필수입니다.');
            return;
        }
        try {
            await api.post('/collection/sources', {
                ...formData,
                status: 'PENDING'
            });
            setCreateOpen(false);
            resetForm();
            fetchSources();
        } catch (error) {
            alert('소스 추가 실패');
        }
    };

    const handleEdit = (source: DataSource) => {
        setSelectedSource(source);
        setFormData({
            name: source.name,
            type: source.type,
            url: source.url
        });
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedSource) return;
        try {
            await api.patch(`/collection/sources/${selectedSource.id}`, formData);
            setEditOpen(false);
            setSelectedSource(null);
            resetForm();
            fetchSources();
        } catch (error) {
            alert('업데이트 실패');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" 소스를 정말 삭제하시겠습니까?`)) return;
        try {
            await api.delete(`/collection/sources/${id}`);
            fetchSources();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleSync = async (source: DataSource) => {
        setSyncing(source.id);
        try {
            await api.patch(`/collection/sources/${source.id}`, { 
                status: 'SYNCED',
                lastSync: new Date().toISOString()
            });
            fetchSources();
        } catch (error) {
            alert('동기화 실패');
        } finally {
            setSyncing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'SYNCED') return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />동기화됨</Badge>;
        if (status === 'ERROR') return <Badge className="bg-red-500 hover:bg-red-600"><AlertCircle className="h-3 w-3 mr-1" />오류</Badge>;
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />대기중</Badge>;
    };

    const getTypeBadge = (type: string) => {
        if (type === 'URL') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Globe className="h-3 w-3 mr-1" />URL</Badge>;
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200"><FileText className="h-3 w-3 mr-1" />FILE</Badge>;
    };

    const formatLastSync = (date?: string) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Summary stats
    const syncedCount = sources.filter(s => s.status === 'SYNCED').length;
    const pendingCount = sources.filter(s => s.status === 'PENDING').length;
    const errorCount = sources.filter(s => s.status === 'ERROR').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="지식 데이터 소스 (Data Sources)"
                description="RAG(검색 증강 생성)에 활용될 외부 지식 소스를 등록하고 관리합니다."
                badgeText="KNOWLEDGE"
                steps={['관리자', '데이터 수집', '소스']}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">전체 소스</p>
                            <h3 className="text-2xl font-bold text-slate-800">{sources.length}개</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">동기화됨</p>
                            <h3 className="text-2xl font-bold text-emerald-600">{syncedCount}개</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">대기중</p>
                            <h3 className="text-2xl font-bold text-amber-600">{pendingCount}개</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-red-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">오류</p>
                            <h3 className="text-2xl font-bold text-red-600">{errorCount}개</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={fetchSources}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>

                {/* Create Dialog */}
                <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 소스 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 지식 소스 등록</DialogTitle>
                            <DialogDescription>RAG 시스템에 활용될 외부 지식 소스를 등록합니다.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>소스 유형 *</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="URL">웹 페이지 (Web URL)</SelectItem>
                                        <SelectItem value="FILE">파일 스토리지 (S3/Local)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>소스 이름 *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 금융감독원 규정 문서"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>경로 / URL *</Label>
                                <Input
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    placeholder={formData.type === 'URL' ? 'https://...' : 's3://bucket/path/file.pdf'}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
                            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">등록하기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setSelectedSource(null); resetForm(); }}}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>소스 수정</DialogTitle>
                        <DialogDescription>데이터 소스 정보를 수정합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>소스 유형 *</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="URL">웹 페이지 (Web URL)</SelectItem>
                                    <SelectItem value="FILE">파일 스토리지 (S3/Local)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>소스 이름 *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>경로 / URL *</Label>
                            <Input
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
                        <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">저장하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sources Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>유형</TableHead>
                                <TableHead>이름</TableHead>
                                <TableHead>경로</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead>최근 동기화</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sources.map((source) => (
                                <TableRow key={source.id} className="hover:bg-slate-50">
                                    <TableCell>{getTypeBadge(source.type)}</TableCell>
                                    <TableCell className="font-bold text-slate-700">{source.name}</TableCell>
                                    <TableCell>
                                        <code className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate block" title={source.url}>
                                            {source.url}
                                        </code>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(source.status)}</TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {formatLastSync(source.lastSync)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50" 
                                                onClick={() => handleSync(source)} 
                                                title="동기화"
                                                disabled={syncing === source.id}
                                            >
                                                <Cloud className={`h-4 w-4 ${syncing === source.id ? 'animate-pulse' : ''}`} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(source)} title="수정">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(source.id, source.name)} title="삭제">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sources.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        등록된 데이터 소스가 없습니다. "소스 추가" 버튼을 눌러 새 소스를 등록하세요.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
