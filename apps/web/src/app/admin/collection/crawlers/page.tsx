'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { Play, Pause, RefreshCw, Trash2, Plus, Bot } from 'lucide-react';
import { api } from '@/lib/api';

export default function CrawlersPage() {
    const [crawlers, setCrawlers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newCrawler, setNewCrawler] = useState({ name: '', url: '', schedule: '0 0 * * *' });

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

    const handleCreate = async () => {
        try {
            await api.post('/collection/crawlers', {
                ...newCrawler,
                status: 'ACTIVE'
            });
            setOpen(false);
            setNewCrawler({ name: '', url: '', schedule: '0 0 * * *' });
            fetchCrawlers();
        } catch (error) {
            alert('크롤러 생성 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/collection/crawlers/${id}`);
            fetchCrawlers();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const toggleStatus = async (crawler: any) => {
        const newStatus = crawler.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            await api.patch(`/collection/crawlers/${crawler.id}`, { status: newStatus });
            fetchCrawlers();
        } catch (error) {
            alert('상태 업데이트 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="자동 수집 봇 (Crawler Bots)"
                description="정기적으로 외부 사이트를 방문하여 최신 정보를 수집하는 봇을 관리합니다."
                badgeText="AUTOMATION"
                steps={['관리자', '데이터 수집', '크롤러']}
            />

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCrawlers}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                    </Button>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 크롤러 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 크롤러 추가</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>크롤러 이름 (Name)</Label>
                                <Input
                                    value={newCrawler.name}
                                    onChange={e => setNewCrawler({ ...newCrawler, name: e.target.value })}
                                    placeholder="예: 법률 뉴스 수집 봇"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>대상 URL (Target)</Label>
                                <Input
                                    value={newCrawler.url}
                                    onChange={e => setNewCrawler({ ...newCrawler, url: e.target.value })}
                                    placeholder="https://"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>수집 주기 (Cron Expression)</Label>
                                <Input
                                    value={newCrawler.schedule}
                                    onChange={e => setNewCrawler({ ...newCrawler, schedule: e.target.value })}
                                    placeholder="0 0 * * *"
                                />
                                <p className="text-[10px] text-slate-400">예: 매일 자정 (0 0 * * *)</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>생성하기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>봇 이름</TableHead>
                                <TableHead>대상 URL</TableHead>
                                <TableHead>주기 (Schedule)</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {crawlers.map((crawler) => (
                                <TableRow key={crawler.id} className="hover:bg-slate-50">
                                    <TableCell className="font-bold text-slate-700 flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-slate-400" />
                                        {crawler.name}
                                    </TableCell>
                                    <TableCell className="text-blue-600 text-xs font-mono underline cursor-pointer" title={crawler.url}>{crawler.url}</TableCell>
                                    <TableCell className="text-slate-500 text-xs font-mono bg-slate-100 px-2 py-1 rounded w-fit">{crawler.schedule}</TableCell>
                                    <TableCell>
                                        <Badge variant={crawler.status === 'ACTIVE' ? 'default' : 'secondary'} className={crawler.status === 'ACTIVE' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-200 text-slate-500"}>
                                            {crawler.status === 'ACTIVE' ? '동작중' : '일시정지'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => toggleStatus(crawler)} title={crawler.status === 'ACTIVE' ? "일시정지" : "재개"}>
                                                {crawler.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(crawler.id)} title="삭제">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {crawlers.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        설정된 크롤러가 없습니다.
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

