'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, BrainCircuit, Sparkles } from "lucide-react";

export default function AiExtractionPage() {
    const [providers, setProviders] = useState<any[]>([]);
    const [config, setConfig] = useState({
        providerId: '',
        temperature: 0.3,
        strategy: 'HYBRID'
    });

    useEffect(() => {
        fetchProviders();
        // Load config from localStorage
        const savedConfig = localStorage.getItem('specflow_extraction_config');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);

            // If no provider selected and localStorage empty, select first active
            if (!localStorage.getItem('specflow_extraction_config') && active.length > 0) {
                setConfig(prev => ({ ...prev, providerId: active[0].id }));
            }
        } catch (err) { console.error(err); }
    };

    const handleSave = () => {
        localStorage.setItem('specflow_extraction_config', JSON.stringify(config));
        alert('추출 엔진 설정이 저장되었습니다. (Local Persistence)');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI 추출 엔진 (Extraction Engine)"
                description="문서에서 요건을 자동으로 추출하는 AI 엔진을 설정합니다."
                badgeText="AI ENGINE"
                steps={['관리자', 'AI 설정', '추출']}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <BrainCircuit className="h-5 w-5 text-indigo-500" />
                            기본 추출 모델 설정
                        </CardTitle>
                        <CardDescription>모든 추출 작업에 기본으로 사용될 AI 모델을 지정합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>AI Provider</Label>
                            <Select value={config.providerId} onValueChange={(val) => setConfig({ ...config, providerId: val })}>
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
                        <div className="space-y-2">
                            <Label>추창 방식 (Strategy)</Label>
                            <Select value={config.strategy} onValueChange={(val) => setConfig({ ...config, strategy: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="방식 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FAST">Fast (Rule-based + Lightweight AI)</SelectItem>
                                    <SelectItem value="HYBRID">Hybrid (Speed & Accuracy Balanced)</SelectItem>
                                    <SelectItem value="DEEP">Deep Analysis (Full LLM Context)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full mt-4 bg-indigo-600" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> 설정 저장
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-blue-100 bg-blue-50/20 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> 현재 엔진 상태
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Active Pipeline</span>
                            <span className="font-mono font-bold text-green-600">ONLINE</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Last Updated</span>
                            <span className="text-slate-800">2 mins ago</span>
                        </div>
                        <div className="p-3 bg-white rounded border border-blue-100 text-xs text-slate-500 leading-relaxed">
                            선택된 Provider는 모든 텍스트 및 파일 추출 작업의 기본 엔진으로 동작합니다. 작업별 오버라이드도 가능합니다.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
