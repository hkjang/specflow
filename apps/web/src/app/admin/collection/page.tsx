'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Trash2, RefreshCw, FileText, Globe } from 'lucide-react';
import { api } from '@/lib/api';

export default function CollectionPage() {
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newSource, setNewSource] = useState({ name: '', type: 'URL', url: '' });

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

    const handleCreate = async () => {
        try {
            await api.post('/collection/sources', {
                ...newSource,
                status: 'PENDING'
            });
            setOpen(false);
            setNewSource({ name: '', type: 'URL', url: '' });
            fetchSources();
        } catch (error) {
            alert('소스 추가 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/collection/sources/${id}`);
            fetchSources();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="지식 데이터 소스 (Data Sources)"
                description="RAG(검색 증강 생성)에 활용될 외부 지식 소스를 등록하고 관리합니다."
                badgeText="KNOWLEDGE"
                steps={['관리자', '데이터 수집', '소스']}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">연동된 Web 소스</p>
                            <h3 className="text-2xl font-bold text-slate-800">{sources.filter(s => s.status === 'SYNCED').length}개</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">수집된 문서</p>
                            <h3 className="text-2xl font-bold text-slate-800">1,240건</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={fetchSources}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 소스 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 지식 소스 등록</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>소스 유형 (Type)</Label>
                                <Select value={newSource.type} onValueChange={(v) => setNewSource({ ...newSource, type: v })}>
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
                                <Label>소스 이름 (Name)</Label>
                                <Input
                                    value={newSource.name}
                                    onChange={e => setNewSource({ ...newSource, name: e.target.value })}
                                    placeholder="예: 법제처 최신 규정"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>경로 / URL</Label>
                                <Input
                                    value={newSource.url}
                                    onChange={e => setNewSource({ ...newSource, url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>등록하기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

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
                                    <TableCell>
                                        <Badge variant="outline" className="bg-white">{source.type}</Badge>
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-700">{source.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500 max-w-[200px] truncate" title={source.url}>
                                        {source.url}
                                    </TableCell>
                                    <TableCell>
                                        {source.status === 'SYNCED' ? (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">동기화됨</Badge>
                                        ) : (
                                            <Badge variant="secondary">{source.status}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {source.lastSync ? new Date(source.lastSync).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(source.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sources.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        등록된 데이터 소스가 없습니다.
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

