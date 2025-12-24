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
import { Plus, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function RulesPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newRule, setNewRule] = useState({ name: '', condition: '', action: 'APPROVE' });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await api.get('/operations/rules');
            setRules(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await api.post('/operations/rules', { ...newRule, isActive: true });
            setOpen(false);
            setNewRule({ name: '', condition: '', action: 'APPROVE' });
            fetchRules();
        } catch (error) {
            alert('규칙 생성 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 규칙을 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/operations/rules/${id}`);
            fetchRules();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const toggleStatus = async (rule: any) => {
        try {
            await api.patch(`/operations/rules/${rule.id}`, { isActive: !rule.isActive });
            fetchRules();
        } catch (error) {
            alert('상태 업데이트 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="운영 규칙 설정 (Operation Rules)"
                description="요건의 자동 승인, 반려, 알림 조건을 설정하여 워크플로우를 자동화합니다."
                badgeText="AUTOMATION"
                steps={['관리자', '운영', '규칙']}
            />

            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchRules}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                    </Button>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> 규칙 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 자동화 규칙 정의</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>규칙 이름 (Rule Name)</Label>
                                <Input
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                    placeholder="예: 코드 라인 수 제한"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>조건식 (Condition, Pseudo-code)</Label>
                                <Input
                                    value={newRule.condition}
                                    onChange={e => setNewRule({ ...newRule, condition: e.target.value })}
                                    placeholder="예: lines_of_code > 500"
                                />
                                <p className="text-[10px] text-slate-500">사용 가능 변수: lines(수), complexity(복잡도), type(유형)</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>수행 동작 (Action)</Label>
                                <Input
                                    value={newRule.action}
                                    onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                                    placeholder="REJECT | NOTIFY | APPROVE"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>규칙 생성</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>규칙명</TableHead>
                                <TableHead>조건식</TableHead>
                                <TableHead>액션</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((rule) => (
                                <TableRow key={rule.id} className="hover:bg-slate-50">
                                    <TableCell className="font-bold text-slate-700">{rule.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500">{rule.condition}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{rule.action}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={rule.isActive ? 'default' : 'secondary'} className={rule.isActive ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-200 text-slate-500"}>
                                            {rule.isActive ? 'Active' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => toggleStatus(rule)}>
                                                {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(rule.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rules.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        등록된 규칙이 없습니다.
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

