'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, Tags } from "lucide-react";

export default function AiClassificationPage() {
    const [providers, setProviders] = useState<any[]>([]);
    const [config, setConfig] = useState({
        providerId: '',
        autoTagging: true
    });

    useEffect(() => {
        fetchProviders();
        // Load config from localStorage
        const savedConfig = localStorage.getItem('specflow_classification_config');
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
            if (!localStorage.getItem('specflow_classification_config') && active.length > 0) {
                setConfig(prev => ({ ...prev, providerId: active[0].id }));
            }
        } catch (err) { console.error(err); }
    };

    const handleSave = () => {
        localStorage.setItem('specflow_classification_config', JSON.stringify(config));
        alert('분류 모델 설정이 저장되었습니다. (Local Persistence)');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI 분류 모델 (Classification Models)"
                description="요건의 유형을 자동으로 분류하는 AI 모델을 관리합니다."
                badgeText="AI ENGINE"
                steps={['관리자', 'AI 설정', '분류']}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Tags className="h-5 w-5 text-amber-500" />
                            기본 분류 모델 설정
                        </CardTitle>
                        <CardDescription>요건 자동 분류 및 태깅에 사용할 모델입니다.</CardDescription>
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
                        <Button className="w-full mt-4 bg-amber-600 hover:bg-amber-700" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> 설정 저장
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
