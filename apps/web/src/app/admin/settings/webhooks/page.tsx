import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Globe, Bolt, Activity, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { webhookApi } from '@/lib/api';

interface Webhook {
    id: string;
    description: string;
    url: string;
    isActive: boolean;
    events: string[];
    lastStatus: 'SUCCESS' | 'FAILURE' | 'NONE';
    lastTriggeredAt?: string;
}

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newHook, setNewHook] = useState({ description: '', url: '', events: [] as string[] });

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        setLoading(true);
        try {
            const res = await webhookApi.getAll();
            setWebhooks(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await webhookApi.create({
                ...newHook,
                isActive: true,
                events: ['requirement.created', 'requirement.approved'] // Default events for now
            });
            setOpen(false);
            setNewHook({ description: '', url: '', events: [] });
            fetchWebhooks();
        } catch (error) {
            alert('웹훅 생성 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await webhookApi.delete(id);
            fetchWebhooks();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleTest = async (id: string) => {
        try {
            await webhookApi.test(id);
            alert('테스트 이벤트가 전송되었습니다.');
            fetchWebhooks();
        } catch (error) {
            alert('테스트 전송 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="웹훅 관리 (Webhooks)"
                description="시스템 이벤트를 외부 URL로 실시간 전송합니다. 이벤트 기반 자동화를 구축하세요."
                badgeText="DEVELOPER"
                steps={['관리자', '시스템 설정', '웹훅']}
            />

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <Globe className="h-4 w-4 text-blue-500" />
                        등록된 엔드포인트 (Registered Endpoints)
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchWebhooks}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                                    <Plus className="h-4 w-4 mr-1" /> 엔드포인트 추가
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>새 웹훅 등록</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>설명 (Description)</Label>
                                        <Input
                                            value={newHook.description}
                                            onChange={e => setNewHook({ ...newHook, description: e.target.value })}
                                            placeholder="예: 슬랙 알림 봇"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>URL</Label>
                                        <Input
                                            value={newHook.url}
                                            onChange={e => setNewHook({ ...newHook, url: e.target.value })}
                                            placeholder="https://hooks.slack.com/..."
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreate}>등록하기</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {webhooks.map((hook) => (
                            <div key={hook.id} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={hook.isActive ? "default" : "secondary"} className={hook.isActive ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-200 text-slate-500"}>
                                            {hook.isActive ? "ACTIVE" : "INACTIVE"}
                                        </Badge>
                                        <h4 className="font-bold text-sm text-slate-800">{hook.description}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                        <span className="font-bold text-slate-400">POST</span>
                                        {hook.url}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {hook.events?.map(ev => (
                                            <span key={ev} className="text-[10px] border border-blue-200 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                                {ev}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-slate-400">마지막 전송:</span>
                                        {hook.lastStatus === 'SUCCESS' && <span className="font-bold text-emerald-600 flex items-center gap-1"><Activity className="h-3 w-3" /> 200 OK</span>}
                                        {hook.lastStatus === 'FAILURE' && <span className="font-bold text-rose-600 flex items-center gap-1"><Activity className="h-3 w-3" /> 500 FAIL</span>}
                                        <span className="text-slate-300 ml-1">({hook.lastTriggeredAt || '-'})</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleTest(hook.id)}>테스트</Button>
                                        <Button variant="outline" size="sm" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(hook.id)}>삭제</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {webhooks.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            등록된 웹훅이 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <Bolt className="h-4 w-4 text-amber-500" /> 지원되는 이벤트 (Supported Events)
                    </h3>
                    <ul className="text-xs space-y-2 text-slate-600">
                        <li><code className="bg-white border rounded px-1">requirement.created</code> : 요건 생성 시</li>
                        <li><code className="bg-white border rounded px-1">requirement.approved</code> : 요건 최종 승인 시</li>
                        <li><code className="bg-white border rounded px-1">risk.detected</code> : 고위험도 리스크 감지 시</li>
                        <li><code className="bg-white border rounded px-1">audit.log</code> : 주요 감사 로그 발생 시</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
