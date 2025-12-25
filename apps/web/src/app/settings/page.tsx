'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { settingsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Save, RefreshCw, Shield, Bell, Monitor, Activity, Palette, RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// Helper for default values
const DEFAULTS: Record<string, string> = {
    'general.site_name': 'SpecFlow AI',
    'general.maintenance_mode': 'false',
    'security.min_pw_len': '8',
    'security.mfa_enabled': 'false',
    'notif.email_enabled': 'true',
    'ai.model': 'gpt-4',
    'ai.temperature': '0.7',
    'brand.primary_color': '#2563eb', // blue-600
    'brand.logo_url': '/logo.png',
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await settingsApi.getAll();
            
            // Merge DB values with defaults to ensure all keys exist
            const mergedValues = { ...DEFAULTS };
            res.data.forEach((s: any) => {
                mergedValues[s.key] = s.value;
            });
            setFormValues(mergedValues);

        } catch(e) {
            console.error(e);
            toast.error('설정 로드 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const promises = Object.entries(formValues).map(([key, value]) => 
                settingsApi.upsert({ key, value: String(value), category: getCategoryForKey(key) })
            );
            await Promise.all(promises);
            toast.success('설정이 저장되었습니다.');
        } catch(e) {
            console.error(e);
            toast.error('설정 저장 실패');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm('모든 설정을 기본값으로 초기화하시겠습니까? 저장하지 않은 변경사항은 손실됩니다.')) {
            setFormValues({ ...DEFAULTS });
            toast.info('설정이 초기화되었습니다. 적용하려면 [저장]을 눌러주세요.');
        }
    };

    const updateValue = (key: string, value: any) => {
        setFormValues(prev => ({ ...prev, [key]: value }));
    };

    const getCategoryForKey = (key: string) => {
        if (key.startsWith('security.')) return 'SECURITY';
        if (key.startsWith('notif.')) return 'NOTIFICATION';
        if (key.startsWith('ai.')) return 'AI';
        if (key.startsWith('brand.')) return 'BRANDING';
        return 'GENERAL';
    };

    const getValue = (key: string) => {
        return formValues[key] !== undefined ? formValues[key] : DEFAULTS[key];
    };

    return (
        <div className="space-y-6 container mx-auto max-w-5xl animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="시스템 설정 (System Settings)"
                    description="전역 시스템 설정 및 환경 변수를 관리합니다."
                    badgeText="ADMIN"
                />
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" /> 초기화
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                        <Save className="mr-2 h-4 w-4" /> {saving ? '저장...' : '저장'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList>
                        <TabsTrigger value="general">일반</TabsTrigger>
                        <TabsTrigger value="ai">AI 설정</TabsTrigger>
                        <TabsTrigger value="branding">브랜딩</TabsTrigger>
                        <TabsTrigger value="security">보안</TabsTrigger>
                        <TabsTrigger value="notification">알림</TabsTrigger>
                    </TabsList>
                </div>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-slate-600" />
                                <CardTitle>기본 설정</CardTitle>
                            </div>
                            <CardDescription>애플리케이션의 기본 동작을 설정합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="site_name">사이트 이름</Label>
                                <Input 
                                    id="site_name" 
                                    value={getValue('general.site_name')}
                                    onChange={e => updateValue('general.site_name', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="maintenance_mode">유지보수 모드</Label>
                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">기능 제한 활성화</div>
                                        <span className="text-sm text-slate-500">활성화 시 일반 사용자의 접근이 제한됩니다.</span>
                                    </div>
                                    <Switch 
                                        id="maintenance_mode" 
                                        checked={getValue('general.maintenance_mode') === 'true'}
                                        onCheckedChange={checked => updateValue('general.maintenance_mode', String(checked))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AI Tab */}
                <TabsContent value="ai" className="space-y-4">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-indigo-600" />
                                <CardTitle>AI 엔진 설정</CardTitle>
                            </div>
                            <CardDescription>기본 AI 모델 파라미터 및 연결 설정을 관리합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2">
                                <Label>기본 모델 (Default Model)</Label>
                                <Select 
                                    value={getValue('ai.model')} 
                                    onValueChange={val => updateValue('ai.model', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4">GPT-4 (OpenAI)</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>창의성 (Temperature)</Label>
                                    <span className="text-sm font-mono text-slate-500">{getValue('ai.temperature')}</span>
                                </div>
                                <Slider 
                                    defaultValue={[0.7]} 
                                    max={1.0} 
                                    step={0.1} 
                                    value={[parseFloat(getValue('ai.temperature'))]}
                                    onValueChange={(vals) => updateValue('ai.temperature', String(vals[0]))}
                                />
                                <p className="text-xs text-slate-400">값이 높을수록 더 창의적이고 다양한 응답을 생성합니다.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Tab */}
                <TabsContent value="branding" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-pink-600" />
                                <CardTitle>브랜딩 및 테마</CardTitle>
                            </div>
                            <CardDescription>사이트의 로고 및 주요 색상을 설정합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2">
                                <Label>로고 이미지 URL</Label>
                                <Input 
                                    value={getValue('brand.logo_url')}
                                    onChange={e => updateValue('brand.logo_url', e.target.value)}
                                    placeholder="/logo.png or https://..."
                                />
                            </div>
                             <div className="grid gap-2">
                                <Label>테마 색상 (Primary Color)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="color" 
                                        className="w-12 h-10 p-1 cursor-pointer"
                                        value={getValue('brand.primary_color')}
                                        onChange={e => updateValue('brand.primary_color', e.target.value)}
                                    />
                                    <Input 
                                        className="font-mono text-sm"
                                        value={getValue('brand.primary_color')}
                                        onChange={e => updateValue('brand.primary_color', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-red-600" />
                                <CardTitle>보안 정책</CardTitle>
                            </div>
                            <CardDescription>비밀번호 정책 및 세션 보안을 설정합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2">
                                <Label>최소 비밀번호 길이</Label>
                                <Input 
                                    type="number" 
                                    value={getValue('security.min_pw_len')} 
                                    onChange={e => updateValue('security.min_pw_len', e.target.value)}
                                />
                            </div>
                            <Separator />
                            <div className="grid gap-2">
                                <Label htmlFor="mfa_enabled">MFA (다중 인증) 강제</Label>
                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">관리자 MFA 강제</div>
                                        <span className="text-sm text-slate-500">모든 관리자 계정에 대해 MFA를 필수로 요구합니다.</span>
                                    </div>
                                    <Switch 
                                        id="mfa_enabled" 
                                        checked={getValue('security.mfa_enabled') === 'true'}
                                        onCheckedChange={checked => updateValue('security.mfa_enabled', String(checked))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notification Tab */}
                <TabsContent value="notification" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-amber-600" />
                                <CardTitle>알림 설정</CardTitle>
                            </div>
                            <CardDescription>시스템 알림 및 이메일 발송 설정을 관리합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid gap-2">
                                <Label htmlFor="notif_email_enabled">시스템 이메일 발송</Label>
                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">이메일 알림 활성화</div>
                                        <span className="text-sm text-slate-500">중요 이벤트 발생 시 관리자에게 이메일을 발송합니다.</span>
                                    </div>
                                    <Switch 
                                        id="notif_email_enabled" 
                                        checked={getValue('notif.email_enabled') === 'true'}
                                        onCheckedChange={checked => updateValue('notif.email_enabled', String(checked))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
