'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { Save, Settings, Shield, Activity } from 'lucide-react';
import { api } from '@/lib/api';

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            // Convert list to map
            const map: Record<string, string> = {};
            res.data.forEach((s: any) => map[s.key] = s.value);
            setSettings(map);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveSetting = async (key: string, value: string, category: string) => {
        try {
            await api.post('/settings', { key, value, category });
            setSettings(prev => ({ ...prev, [key]: value }));
            // Maybe show toast? Use simple alert for now
        } catch (error) {
            alert('설정 저장 실패');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="시스템 환경 설정 (System Settings)"
                description="시스템 동작, 보안 정책 및 로깅 레벨을 전역적으로 설정합니다."
                badgeText="CONFIGURATION"
                steps={['관리자', '설정', '환경 설정']}
            />

            <Tabs defaultValue="general" className="gap-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="general">일반 (General)</TabsTrigger>
                    <TabsTrigger value="security">보안 (Security)</TabsTrigger>
                    <TabsTrigger value="logging">로깅 (Logging)</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                일반 설정
                            </CardTitle>
                            <CardDescription>기본 시스템 정보를 설정합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>시스템 이름 (System Name)</Label>
                                <Input
                                    value={settings['system.name'] || ''}
                                    onChange={e => saveSetting('system.name', e.target.value, 'GENERAL')}
                                    placeholder="SpecFlow System"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>관리자 이메일 (Admin Email)</Label>
                                <Input
                                    value={settings['system.email'] || ''}
                                    onChange={e => saveSetting('system.email', e.target.value, 'GENERAL')}
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">유지보수 모드 (Maintenance Mode)</Label>
                                    <p className="text-xs text-slate-500">활성화 시 일반 사용자의 접속이 제한됩니다.</p>
                                </div>
                                <Switch
                                    checked={settings['system.maintenance'] === 'true'}
                                    onCheckedChange={v => saveSetting('system.maintenance', String(v), 'GENERAL')}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-slate-500" />
                                보안 정책
                            </CardTitle>
                            <CardDescription>접근 제어 및 인증 관련 설정을 관리합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">MFA 강제 적용 (Enforce MFA)</Label>
                                    <p className="text-xs text-slate-500">모든 사용자에게 다중 인증을 강제합니다.</p>
                                </div>
                                <Switch
                                    checked={settings['security.mfa_enforced'] === 'true'}
                                    onCheckedChange={v => saveSetting('security.mfa_enforced', String(v), 'SECURITY')}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>세션 만료 시간 (분)</Label>
                                <Input
                                    type="number"
                                    value={settings['security.session_timeout'] || '30'}
                                    onChange={e => saveSetting('security.session_timeout', e.target.value, 'SECURITY')}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logging">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-slate-500" />
                                시스템 로깅
                            </CardTitle>
                            <CardDescription>감사 및 오류 로그 레벨을 설정합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>로그 레벨 (Log Level)</Label>
                                <Select
                                    value={settings['logging.level'] || 'INFO'}
                                    onValueChange={v => saveSetting('logging.level', v, 'LOGGING')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DEBUG">DEBUG (디버그)</SelectItem>
                                        <SelectItem value="INFO">INFO (정보)</SelectItem>
                                        <SelectItem value="WARN">WARN (경고)</SelectItem>
                                        <SelectItem value="ERROR">ERROR (오류)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
