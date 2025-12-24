'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api, aiApi, classificationApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Layers, Construction, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ClassificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [projectId, setProjectId] = useState('default-project-id');
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [openAiDialog, setOpenAiDialog] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchBusinesses();
        fetchProviders();
    }, [projectId]);

    const fetchBusinesses = async () => {
        try {
            const res = await classificationApi.getBusiness({ projectId });
            setBusinesses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);
            if (active.length > 0) setSelectedProviderId(active[0].id);
        } catch (err) { console.error(err); }
    };

    const createBusiness = async () => {
        const name = prompt('새로운 비즈니스 분류명을 입력하세요:');
        if (!name) return;
        try {
            await classificationApi.createBusiness({ name, projectId });
            fetchBusinesses();
        } catch (error) {
            alert('생성 실패');
        }
    };

    const handleAutoClassify = async () => {
        try {
            setProcessing(true);
            await classificationApi.autoClassify({ projectId, providerId: selectedProviderId });
            alert('자동 분류 작업이 시작되었습니다. 결과를 확인하려면 잠시 후 새로고침하세요.');
            setOpenAiDialog(false);
        } catch (error) {
            alert('자동 분류 요청 실패');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="분류 체계 관리 (Classification)"
                description="비즈니스 도메인 및 기능별 분류 체계를 정의하고 AI 자동 분류를 학습시킵니다."
                badgeText="TAXONOMY"
                steps={['작업장', '분류/태깅']}
            />

            <div className="flex justify-end gap-2">
                <Dialog open={openAiDialog} onOpenChange={setOpenAiDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                            <Wand2 className="h-4 w-4 mr-2" /> AI 자동 분류 실행
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>AI 자동 분류 실행</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <p className="text-sm text-slate-600">
                                등록된 모든 미분류 요건에 대해 AI가 자동으로 카테고리를 추론하여 태깅합니다.
                            </p>
                            <div className="space-y-2">
                                <Label>사용할 AI 모델 (Select Model)</Label>
                                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="AI 모델 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <span className="font-bold">{p.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({p.models})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAutoClassify} disabled={processing || !selectedProviderId} className="bg-indigo-600 hover:bg-indigo-700">
                                {processing ? '요청 중...' : '분류 시작'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button onClick={createBusiness} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm">
                    <Plus className="h-4 w-4 mr-2" /> 분류 추가
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {businesses.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        등록된 분류 체계가 없습니다.
                    </div>
                )}
                {businesses.map((biz) => (
                    <Card key={biz.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                {biz.code || 'NO-CODE'}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{biz.name}</h3>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            <Tag className="h-3 w-3" />
                            <span>{biz.functions?.length || 0}개 하위 기능</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
