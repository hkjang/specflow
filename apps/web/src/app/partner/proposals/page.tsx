'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Trash2, Send, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function PartnerProposalsPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newProposal, setNewProposal] = useState({ title: '', partner: '', content: '' });

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/partner/proposals');
            setProposals(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await api.post('/partner/proposals', { ...newProposal, status: 'DRAFT' });
            setOpen(false);
            setNewProposal({ title: '', partner: '', content: '' });
            fetchProposals();
        } catch (error) {
            alert('제안서 생성 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/partner/proposals/${id}`);
            fetchProposals();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleSend = async (id: string) => {
        try {
            await api.patch(`/partner/proposals/${id}`, { status: 'SENT' });
            fetchProposals();
        } catch (error) {
            alert('전송 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="파트너 제안 관리 (Partner Proposals)"
                description="외부 파트너와의 협업 제안서를 작성하고 관리합니다."
                badgeText="PARTNER"
                steps={['파트너', '제안 관리']}
            />

            <div className="flex justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 신규 제안 작성
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 제안서 작성</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>제안 제목 (Title)</Label>
                                <Input value={newProposal.title} onChange={e => setNewProposal({ ...newProposal, title: e.target.value })} placeholder="예: 2024년도 기술 협력 제안" />
                            </div>
                            <div className="grid gap-2">
                                <Label>파트너명 (Partner Name)</Label>
                                <Input value={newProposal.partner} onChange={e => setNewProposal({ ...newProposal, partner: e.target.value })} placeholder="예: (주)테크솔루션" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>작성 완료</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>제안 제목</TableHead>
                                <TableHead>파트너사</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead>작성일</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposals.map((p) => (
                                <TableRow key={p.id} className="hover:bg-slate-50">
                                    <TableCell className="font-bold text-slate-700">{p.title}</TableCell>
                                    <TableCell className="text-slate-600">{p.partner}</TableCell>
                                    <TableCell>
                                        {p.status === 'SENT' ? (
                                            <Badge className="bg-blue-500 hover:bg-blue-600">발송됨</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-600">작성 중</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs font-mono">
                                        {new Date(p.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {p.status === 'DRAFT' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleSend(p.id)} title="전송">
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(p.id)} title="삭제">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {proposals.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        등록된 제안서가 없습니다.
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

