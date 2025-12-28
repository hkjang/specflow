'use client';

import React, { useEffect, useState } from 'react';
import { aiApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Trash2, Save, Plug, AlertCircle, CheckCircle, Server, Edit } from 'lucide-react';

export default function AiSettingsPage() {
    const [providers, setProviders] = useState<any[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [form, setForm] = useState<any>({
        name: '',
        type: 'OPENAI',
        endpoint: '',
        apiKey: '',
        models: '',
        timeout: 120,
        maxRetries: 3,
        retryDelayMs: 1000,
        isActive: true,
        priority: 1
    });
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [healthChecking, setHealthChecking] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    const fetchProviders = async () => {
        try {
            const [provRes, statRes] = await Promise.all([
                aiApi.getProviders(),
                aiApi.getProviderStatuses()
            ]);
            setProviders(provRes.data);
            setStatuses(statRes.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleHealthCheck = async () => {
        setHealthChecking(true);
        try {
            const res = await aiApi.checkHealth();
            setStatuses(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setHealthChecking(false);
        }
    };

    const handleRefresh = async () => {
        await aiApi.refreshProviders();
        await fetchProviders();
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const handleChange = (key: string, value: any) => {
        setForm({ ...form, [key]: value });
    };

    const handleEdit = (provider: any) => {
        // Coerce null values to empty strings to prevent React warning about null value props
        setForm({
            ...provider,
            name: provider.name ?? '',
            endpoint: provider.endpoint ?? '',
            apiKey: provider.apiKey ?? '',
            models: provider.models ?? '',
            timeout: provider.timeout ?? 120,
            maxRetries: provider.maxRetries ?? 3,
            retryDelayMs: provider.retryDelayMs ?? 1000,
            priority: provider.priority ?? 1
        });
    };

    const handleSave = async () => {
        try {
            if (form.id) {
                await aiApi.updateProvider(form.id, form);
            } else {
                await aiApi.createProvider(form);
            }
            fetchProviders();
            setForm({ id: undefined, name: '', type: 'OPENAI', endpoint: '', apiKey: '', models: '', timeout: 120, maxRetries: 3, retryDelayMs: 1000, isActive: true, priority: 1 });
        } catch (error) {
            console.error(error);
            alert('저장 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await aiApi.deleteProvider(id);
            fetchProviders();
        } catch (error) {
            console.error(error);
        }
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            setTestResult(null);
            const res = await aiApi.testProvider("Test connection", providers.find(p => p.isActive)?.id);
            setTestResult(res.data);
        } catch (error) {
            setTestResult({ status: 'FAILED', message: 'Connection refused or timeout' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">AI 설정 불러오는 중...</div>;

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI 모델 설정 (AI Settings)"
                description="LLM Provider(OpenAI, Ollama 등)를 연동하고 모델 우선순위를 관리합니다."
                badgeText="SYSTEM"
                steps={['관리자', 'AI 설정']}
            />

            {/* Summary Dashboard */}
            {statuses.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="border-slate-200 shadow-sm p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{providers.filter(p => p.isActive).length}</div>
                        <div className="text-xs text-slate-500">활성 Provider</div>
                    </Card>
                    <Card className="border-slate-200 shadow-sm p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                            {statuses.reduce((sum: number, s: any) => sum + (s.successCount || 0), 0)}
                        </div>
                        <div className="text-xs text-slate-500">총 성공</div>
                    </Card>
                    <Card className="border-slate-200 shadow-sm p-4 text-center">
                        <div className="text-2xl font-bold text-rose-600">
                            {statuses.reduce((sum: number, s: any) => sum + (s.failureCount || 0), 0)}
                        </div>
                        <div className="text-xs text-slate-500">총 실패</div>
                    </Card>
                    <Card className="border-slate-200 shadow-sm p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {statuses.reduce((sum: number, s: any) => sum + (s.totalTokensUsed || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">총 토큰</div>
                    </Card>
                    <Card className="border-slate-200 shadow-sm p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">
                            ${statuses.reduce((sum: number, s: any) => sum + (s.estimatedCostUsd || 0), 0).toFixed(4)}
                        </div>
                        <div className="text-xs text-slate-500">추정 비용</div>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Provider List */}
                <div className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-slate-500">연동된 Provider</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {providers.length === 0 && <div className="text-slate-400 text-sm p-4 text-center">설정된 Provider가 없습니다.</div>}
                            {providers.map((p) => (
                                <div key={p.id} className="p-3 border rounded-md flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <div className="w-full overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-700 truncate">{p.name}</span>
                                            {p.isActive ? (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-5">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] h-5 text-slate-500">Disabled</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{p.type}</span>
                                            <span className="truncate max-w-[120px]" title={p.models}>{p.models}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-2 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(p)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(p.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-700">연결 테스트 (Connection Test)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="sm" onClick={handleTest} disabled={testing || providers.length === 0}>
                                {testing ? <Plug className="h-3 w-3 animate-pulse mr-2" /> : <Plug className="h-3 w-3 mr-2" />}
                                {testing ? '테스트 수행 중...' : '활성 Provider 테스트'}
                            </Button>
                            {testResult && (
                                <div className={`p-3 rounded-lg text-xs border ${testResult.status === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        {testResult.status === 'SUCCESS' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                        {testResult.status}
                                    </div>
                                    <div className="opacity-90 leading-tight">
                                        {testResult.message}
                                    </div>
                                    {testResult.response && (
                                        <div className="mt-2 pt-2 border-t border-black/5 font-mono text-[10px] opacity-75 truncate">
                                            Res: {testResult.response}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Provider Status Monitoring */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-700">📊 실시간 상태</CardTitle>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={handleRefresh} className="h-7 text-xs">
                                    ↻ 새로고침
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={healthChecking} className="h-7 text-xs">
                                    {healthChecking ? '체크중...' : '🩺 헬스체크'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {statuses.length === 0 ? (
                                <div className="text-slate-400 text-xs text-center py-3">상태 데이터 없음</div>
                            ) : (
                                statuses.map((s: any) => {
                                    const successRate = s.successCount + s.failureCount > 0 
                                        ? Math.round((s.successCount / (s.successCount + s.failureCount)) * 100) 
                                        : 100;
                                    return (
                                        <div key={s.id} className={`p-3 border rounded-lg text-xs ${s.isHealthy ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{s.name}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${successRate >= 90 ? 'bg-emerald-200 text-emerald-800' : successRate >= 70 ? 'bg-yellow-200 text-yellow-800' : 'bg-rose-200 text-rose-800'}`}>
                                                        {successRate}%
                                                    </span>
                                                </div>
                                                <span className={s.isHealthy ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {s.isHealthy ? '✓ Healthy' : '✗ Unhealthy'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-600 mb-2">
                                                <div className="text-center p-1 bg-white rounded">
                                                    <div className="font-bold text-emerald-600">{s.successCount}</div>
                                                    <div className="text-[8px]">성공</div>
                                                </div>
                                                <div className="text-center p-1 bg-white rounded">
                                                    <div className="font-bold text-rose-600">{s.failureCount}</div>
                                                    <div className="text-[8px]">실패</div>
                                                </div>
                                                <div className="text-center p-1 bg-white rounded">
                                                    <div className="font-bold text-blue-600">{s.avgLatencyMs}ms</div>
                                                    <div className="text-[8px]">평균</div>
                                                </div>
                                                <div className="text-center p-1 bg-white rounded">
                                                    <div className="font-bold text-purple-600">{s.totalTokensUsed?.toLocaleString() || 0}</div>
                                                    <div className="text-[8px]">토큰</div>
                                                </div>
                                            </div>
                                            {s.estimatedCostUsd > 0 && (
                                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mb-1">
                                                    💰 추정 비용: <span className="font-bold text-amber-600">${s.estimatedCostUsd.toFixed(4)}</span>
                                                    <span className="text-[8px]">(P:{s.promptTokensUsed?.toLocaleString() || 0} / C:{s.completionTokensUsed?.toLocaleString() || 0})</span>
                                                </div>
                                            )}
                                            {s.lastUsed && (
                                                <div className="text-[9px] text-slate-400">
                                                    마지막 사용: {new Date(s.lastUsed).toLocaleString()}
                                                </div>
                                            )}
                                            {s.lastError && <div className="mt-1 text-[10px] text-rose-600 truncate">❌ {s.lastError}</div>}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Add/Edit Form */}
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-slate-500" />
                                {form.id ? 'Provider 수정' : '새 Provider 추가'}
                            </CardTitle>
                            <CardDescription>OpenAI, Anthropic, 또는 로컬 LLM (Ollama) 연결을 설정합니다.</CardDescription>
                        </div>
                        {form.id && (
                            <Button variant="outline" size="sm" onClick={() => setForm({ id: undefined, name: '', type: 'OPENAI', endpoint: '', apiKey: '', models: '', timeout: 120, maxRetries: 3, retryDelayMs: 1000, isActive: true, priority: 1 })}>
                                취소 (새로 만들기)
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>설정 이름 (Name)</Label>
                                <Input
                                    placeholder="예: My OpenAI Production"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>유형 (Type)</Label>
                                <Select value={form.type} onValueChange={(val) => handleChange('type', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPENAI">OpenAI Compatible</SelectItem>
                                        <SelectItem value="OLLAMA">Ollama (Local)</SelectItem>
                                        <SelectItem value="VLLM">vLLM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>엔드포인트 URL (Endpoint)</Label>
                            <Input
                                placeholder="https://api.openai.com/v1"
                                value={form.endpoint}
                                onChange={(e) => handleChange('endpoint', e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400">Ollama 예시: http://localhost:11434/v1</p>
                        </div>

                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                placeholder="sk-..."
                                value={form.apiKey}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400">로컬 모델 사용 시 비워둘 수 있습니다.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>모델명 (Model ID)</Label>
                                <Input
                                    placeholder="예: gpt-4, llama3"
                                    value={form.models}
                                    onChange={(e) => handleChange('models', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>우선순위 (Priority)</Label>
                                <Input
                                    type="number"
                                    value={form.priority}
                                    onChange={(e) => handleChange('priority', parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Advanced Settings */}
                        <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Label className="text-slate-700 font-medium">⚙️ 고급 설정</Label>
                                <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">선택사항</span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">타임아웃 (초)</Label>
                                    <Input
                                        type="number"
                                        placeholder={form.type === 'OPENAI' ? '120' : '600'}
                                        value={form.timeout}
                                        onChange={(e) => handleChange('timeout', parseInt(e.target.value) || (form.type === 'OPENAI' ? 120 : 600))}
                                    />
                                    <p className="text-[9px] text-slate-500">
                                        {form.type === 'OPENAI' ? '클라우드: 60-180초' : '로컬: 300-900초'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">재시도 횟수</Label>
                                    <Input
                                        type="number"
                                        placeholder="3"
                                        min="0"
                                        max="10"
                                        value={form.maxRetries}
                                        onChange={(e) => handleChange('maxRetries', parseInt(e.target.value) || 3)}
                                    />
                                    <p className="text-[9px] text-slate-500">실패 시 재시도 (0-10)</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">재시도 지연 (ms)</Label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        step="100"
                                        value={form.retryDelayMs}
                                        onChange={(e) => handleChange('retryDelayMs', parseInt(e.target.value) || 1000)}
                                    />
                                    <p className="text-[9px] text-slate-500">재시도 간격</p>
                                </div>
                            </div>

                            {(form.type === 'OLLAMA' || form.type === 'VLLM') && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                    💡 <strong>로컬 모델 팁:</strong> Ollama/vLLM은 첫 요청 시 모델 로딩에 시간이 걸릴 수 있습니다. 
                                    타임아웃을 600초 이상, 재시도를 3회 이상 설정하세요.
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-slate-100 bg-slate-50/50 p-4">
                        <Button onClick={handleSave} disabled={!form.name || !form.endpoint} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="h-4 w-4 mr-2" />
                            {form.id ? '설정 수정 (Update)' : 'Provider 저장 (Create)'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
