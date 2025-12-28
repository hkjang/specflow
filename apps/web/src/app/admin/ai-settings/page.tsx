'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'logs'>('settings');
    const [providers, setProviders] = useState<any[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [logStats, setLogStats] = useState<any>(null);
    const [recentErrors, setRecentErrors] = useState<any[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [costBudget, setCostBudget] = useState<number>(10); // $10 default budget
    const [showBudgetAlert, setShowBudgetAlert] = useState(false);
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
    const [logs, setLogs] = useState<any[]>([]);
    const [showRecommendations, setShowRecommendations] = useState(true);
    const [customTestPrompt, setCustomTestPrompt] = useState('');
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [pinnedProviders, setPinnedProviders] = useState<string[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    const fetchAnalytics = async () => {
        try {
            const [statsRes, errorsRes] = await Promise.all([
                aiApi.getLogStats(),
                aiApi.getRecentErrors()
            ]);
            setLogStats(statsRes.data);
            setRecentErrors(errorsRes.data || []);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await aiApi.getLogs();
            setLogs(res.data || []);
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    };

    // Generate smart recommendations
    const getRecommendations = () => {
        const recs: { type: 'warning' | 'info' | 'success'; message: string }[] = [];
        
        // Check for high failure rate
        const totalSuccess = statuses.reduce((s, st) => s + (st.successCount || 0), 0);
        const totalFail = statuses.reduce((s, st) => s + (st.failureCount || 0), 0);
        const total = totalSuccess + totalFail;
        if (total > 0 && (totalFail / total) > 0.1) {
            recs.push({ type: 'warning', message: `실패율이 ${Math.round((totalFail / total) * 100)}%로 높습니다. Provider 상태를 확인하세요.` });
        }
        
        // Check for slow providers
        const slowProviders = statuses.filter(s => s.avgLatencyMs > 5000);
        if (slowProviders.length > 0) {
            recs.push({ type: 'warning', message: `${slowProviders.map(s => s.name).join(', ')}의 평균 응답시간이 5초 이상입니다.` });
        }
        
        // Check for no active providers
        const activeProviders = providers.filter(p => p.isActive);
        if (activeProviders.length === 0) {
            recs.push({ type: 'warning', message: '활성화된 Provider가 없습니다. 최소 1개를 활성화하세요.' });
        }
        
        // Check for single point of failure
        if (activeProviders.length === 1) {
            recs.push({ type: 'info', message: 'Provider가 1개만 활성화되어 있습니다. 백업 Provider 추가를 권장합니다.' });
        }
        
        // Good status
        if (total > 0 && (totalFail / total) <= 0.05 && recs.length === 0) {
            recs.push({ type: 'success', message: '모든 Provider가 정상 작동 중입니다! 👍' });
        }
        
        return recs;
    };

    useEffect(() => {
        fetchProviders();
        fetchAnalytics();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchProviders();
            if (activeTab === 'analytics') fetchAnalytics();
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, activeTab]);

    // Cost budget alert check
    useEffect(() => {
        const totalCost = statuses.reduce((sum: number, s: any) => sum + (s.estimatedCostUsd || 0), 0);
        if (totalCost >= costBudget && !showBudgetAlert) {
            setShowBudgetAlert(true);
        }
    }, [statuses, costBudget]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            
            if (e.key === '1') setActiveTab('settings');
            if (e.key === '2') { setActiveTab('analytics'); fetchAnalytics(); }
            if (e.key === '3') { setActiveTab('logs'); fetchLogs(); }
            if (e.key === 'r' && !e.ctrlKey) { fetchProviders(); fetchAnalytics(); }
            if (e.key === 'h') handleHealthCheck();
            if (e.key === '?') setShowShortcuts(s => !s);
            if (e.key === 'Escape') setShowShortcuts(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Calculate performance score (0-100)
    const getPerformanceScore = (status: any) => {
        if (!status) return 0;
        const total = status.successCount + status.failureCount;
        if (total === 0) return 50; // No data
        
        const successRate = status.successCount / total;
        const latencyScore = Math.max(0, 100 - (status.avgLatencyMs / 100)); // 10s = 0 score
        const reliabilityScore = successRate * 100;
        
        return Math.round((reliabilityScore * 0.7) + (latencyScore * 0.3));
    };

    const getScoreGrade = (score: number) => {
        if (score >= 90) return { grade: 'A', color: 'text-emerald-600 bg-emerald-50' };
        if (score >= 80) return { grade: 'B', color: 'text-blue-600 bg-blue-50' };
        if (score >= 70) return { grade: 'C', color: 'text-amber-600 bg-amber-50' };
        if (score >= 60) return { grade: 'D', color: 'text-orange-600 bg-orange-50' };
        return { grade: 'F', color: 'text-rose-600 bg-rose-50' };
    };

    // Custom test handler
    const handleCustomTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const prompt = customTestPrompt || 'Hello, this is a test.';
            const res = await aiApi.testProvider(prompt, providers.find(p => p.isActive)?.id);
            setTestResult(res.data);
        } catch (error) {
            setTestResult({ status: 'FAILED', message: 'Connection refused or timeout' });
        } finally {
            setTesting(false);
        }
    };

    // Export analytics data
    const exportAnalytics = () => {
        const data = {
            exportDate: new Date().toISOString(),
            summary: logStats?.summary,
            byProvider: logStats?.byProvider,
            byModel: logStats?.byModel,
            statuses: statuses.map(s => ({
                name: s.name,
                successCount: s.successCount,
                failureCount: s.failureCount,
                avgLatencyMs: s.avgLatencyMs,
                totalTokensUsed: s.totalTokensUsed,
                estimatedCostUsd: s.estimatedCostUsd,
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Toggle all providers
    const toggleAllProviders = async (active: boolean) => {
        for (const p of providers) {
            await aiApi.updateProvider(p.id, { isActive: active });
        }
        await fetchProviders();
        showToast(active ? '모든 Provider 활성화됨' : '모든 Provider 비활성화됨');
    };

    // Toast notification
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Toggle pinned provider
    const togglePinned = (providerId: string) => {
        setPinnedProviders(prev => 
            prev.includes(providerId) 
                ? prev.filter(id => id !== providerId)
                : [...prev, providerId]
        );
    };

    // Copy provider config to clipboard
    const copyProviderConfig = (provider: any) => {
        const config = {
            name: provider.name,
            type: provider.type,
            endpoint: provider.endpoint,
            models: provider.models,
        };
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        showToast('Provider 설정이 클립보드에 복사됨');
    };

    // Calculate requests per minute (approximate)
    const getRequestsPerMinute = () => {
        const total = statuses.reduce((s, st) => s + (st.successCount || 0) + (st.failureCount || 0), 0);
        // Approximation based on 7-day data
        return Math.round(total / (7 * 24 * 60));
    };

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
        <div className={`space-y-6 ${darkMode ? 'dark bg-slate-900 text-white p-4 rounded-lg' : ''}`}>
            <PageHeader
                title="AI 모델 설정 (AI Settings)"
                description="LLM Provider(OpenAI, Ollama 등)를 연동하고 모델 우선순위를 관리합니다."
                badgeText="SYSTEM"
                steps={['관리자', 'AI 설정']}
            />

            {/* Tab Navigation with Quick Actions */}
            <div className="flex justify-between items-center border-b border-slate-200">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        ⚙️ 설정
                    </button>
                    <button 
                        onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        📊 분석
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        📋 로그
                    </button>
                </div>
                <div className="flex items-center gap-2 pb-2">
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={autoRefresh} 
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-3 h-3"
                        />
                        🔄 자동 (30s)
                    </label>
                    <Button variant="outline" size="sm" onClick={exportAnalytics} className="h-7 text-xs">
                        📥 내보내기
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllProviders(true)} className="h-7 text-xs text-emerald-600 hover:bg-emerald-50">
                        ✓ 모두 활성
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllProviders(false)} className="h-7 text-xs text-rose-600 hover:bg-rose-50">
                        ✗ 모두 비활성
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowComparison(true)} 
                        className="h-7 text-xs"
                        disabled={statuses.length < 2}
                    >
                        📊 비교
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDarkMode(!darkMode)} 
                        className="h-7 text-xs"
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="h-7 text-xs text-slate-400">
                        ⌨️ ?
                    </Button>
                </div>
            </div>

            {/* Keyboard Shortcuts Modal */}
            {showShortcuts && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
                    <Card className="w-80 shadow-xl" onClick={e => e.stopPropagation()}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold">⌨️ 키보드 단축키</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">설정 탭</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">1</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">분석 탭</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">2</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">로그 탭</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">3</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">새로고침</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">R</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">헬스체크</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">H</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">도움말 토글</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">?</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-500">닫기</span><kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">ESC</kbd></div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Provider Comparison Modal */}
            {showComparison && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComparison(false)}>
                    <Card className="w-[700px] max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold">📊 Provider 성능 비교</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-2 text-left">Provider</th>
                                        <th className="p-2 text-center">등급</th>
                                        <th className="p-2 text-right">성공률</th>
                                        <th className="p-2 text-right">평균 지연</th>
                                        <th className="p-2 text-right">토큰</th>
                                        <th className="p-2 text-right">비용</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {statuses.map((s: any) => {
                                        const score = getPerformanceScore(s);
                                        const { grade, color } = getScoreGrade(score);
                                        const total = s.successCount + s.failureCount;
                                        const successRate = total > 0 ? Math.round((s.successCount / total) * 100) : 0;
                                        return (
                                            <tr key={s.name} className="hover:bg-slate-50">
                                                <td className="p-2 font-medium">{s.name}</td>
                                                <td className="p-2 text-center">
                                                    <span className={`px-2 py-1 rounded font-bold ${color}`}>{grade}</span>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <span className={successRate >= 90 ? 'text-emerald-600' : successRate >= 70 ? 'text-amber-600' : 'text-rose-600'}>
                                                        {successRate}%
                                                    </span>
                                                </td>
                                                <td className="p-2 text-right text-blue-600">{Math.round(s.avgLatencyMs)}ms</td>
                                                <td className="p-2 text-right text-purple-600">{s.totalTokensUsed?.toLocaleString()}</td>
                                                <td className="p-2 text-right text-amber-600">${s.estimatedCostUsd?.toFixed(4)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="mt-4 flex justify-end">
                                <Button variant="outline" onClick={() => setShowComparison(false)}>닫기</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Cost Budget Alert */}
            {showBudgetAlert && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <div className="font-bold text-amber-800">비용 예산 초과!</div>
                            <div className="text-sm text-amber-700">
                                현재 비용 ${statuses.reduce((sum: number, s: any) => sum + (s.estimatedCostUsd || 0), 0).toFixed(4)}이 
                                예산 ${costBudget}을 초과했습니다.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            value={costBudget} 
                            onChange={(e) => setCostBudget(Number(e.target.value))}
                            className="w-20 h-8 text-sm"
                            step="1"
                        />
                        <Button variant="outline" size="sm" onClick={() => setShowBudgetAlert(false)} className="h-8">
                            무시
                        </Button>
                    </div>
                </div>
            )}

            {/* Smart Recommendations */}
            {showRecommendations && getRecommendations().length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-700">💡 스마트 추천</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowRecommendations(false)} className="h-6 text-xs text-slate-400">
                            닫기
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {getRecommendations().map((rec, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-2 rounded text-sm flex items-center gap-2 ${
                                        rec.type === 'warning' ? 'bg-amber-50 text-amber-800' :
                                        rec.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                                        'bg-blue-50 text-blue-800'
                                    }`}
                                >
                                    <span>{rec.type === 'warning' ? '⚠️' : rec.type === 'success' ? '✓' : 'ℹ️'}</span>
                                    {rec.message}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'settings' && (
            <>
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
                            {providers.map((p) => {
                                const status = statuses.find((s: any) => s.name === p.name);
                                const score = getPerformanceScore(status);
                                const { grade, color } = getScoreGrade(score);
                                return (
                                <div key={p.id} className="p-3 border rounded-md flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <div className="w-full overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-700 truncate">{p.name}</span>
                                            {p.isActive ? (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-5">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] h-5 text-slate-500">Disabled</Badge>
                                            )}
                                            {/* Performance Score Badge */}
                                            {status && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`} title={`성능 점수: ${score}/100`}>
                                                    {grade}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{p.type}</span>
                                            <span className="truncate max-w-[120px]" title={p.models}>{p.models}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-2 shrink-0">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className={`h-8 w-8 ${pinnedProviders.includes(p.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                                            onClick={() => togglePinned(p.id)}
                                            title="즐겨찾기"
                                        >
                                            {pinnedProviders.includes(p.id) ? '★' : '☆'}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                            onClick={() => copyProviderConfig(p)}
                                            title="설정 복사"
                                        >
                                            📋
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(p)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(p.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-700">🧪 연결 테스트 (Connection Test)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="테스트 프롬프트 (선택사항)"
                                    value={customTestPrompt}
                                    onChange={(e) => setCustomTestPrompt(e.target.value)}
                                    className="flex-1 h-9 text-sm"
                                />
                                <Button className="bg-indigo-600 hover:bg-indigo-700 shrink-0" size="sm" onClick={handleCustomTest} disabled={testing || providers.length === 0}>
                                    {testing ? <Plug className="h-3 w-3 animate-pulse mr-2" /> : <Plug className="h-3 w-3 mr-2" />}
                                    {testing ? '테스트중...' : '테스트'}
                                </Button>
                            </div>
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
            </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && logStats && (
                <div className="space-y-6">
                    {/* 7-Day Summary */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-700">📈 7일 요약</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-slate-50 rounded-lg">
                                    <div className="text-3xl font-bold text-blue-600">{logStats.summary?.total || 0}</div>
                                    <div className="text-xs text-slate-500">총 요청</div>
                                </div>
                                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                    <div className="text-3xl font-bold text-emerald-600">{logStats.summary?.successRate || 0}%</div>
                                    <div className="text-xs text-slate-500">성공률</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-3xl font-bold text-purple-600">{(logStats.summary?.totalTokens || 0).toLocaleString()}</div>
                                    <div className="text-xs text-slate-500">총 토큰</div>
                                </div>
                                <div className="text-center p-4 bg-rose-50 rounded-lg">
                                    <div className="text-3xl font-bold text-rose-600">{logStats.summary?.failed || 0}</div>
                                    <div className="text-xs text-slate-500">실패</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Provider Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-slate-700">🏢 Provider별 통계</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {logStats.byProvider?.length > 0 ? (
                                    <div className="space-y-2">
                                        {logStats.byProvider.map((p: any) => (
                                            <div key={p.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <span className="font-medium text-sm">{p.name}</span>
                                                <div className="flex gap-3 text-xs">
                                                    <span className="text-emerald-600">✓ {p.success}</span>
                                                    <span className="text-rose-600">✗ {p.failed}</span>
                                                    <span className="text-purple-600">{p.tokens?.toLocaleString()} 토큰</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 py-4">데이터 없음</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-slate-700">🤖 모델별 사용량</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {logStats.byModel?.length > 0 ? (
                                    <div className="space-y-2">
                                        {logStats.byModel.map((m: any) => (
                                            <div key={m.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <span className="font-medium text-sm font-mono">{m.name}</span>
                                                <div className="flex gap-3 text-xs">
                                                    <span className="text-blue-600">{m.count}회</span>
                                                    <span className="text-purple-600">{m.tokens?.toLocaleString()} 토큰</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 py-4">데이터 없음</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Hourly Distribution */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-700">🕐 시간대별 요청</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-1 h-24">
                                {logStats.byHour?.map((count: number, hour: number) => {
                                    const maxCount = Math.max(...(logStats.byHour || [1]));
                                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                    return (
                                        <div key={hour} className="flex-1 flex flex-col items-center">
                                            <div 
                                                className="w-full bg-blue-400 rounded-t transition-all hover:bg-blue-500" 
                                                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                                                title={`${hour}시: ${count}건`}
                                            />
                                            {hour % 6 === 0 && <span className="text-[8px] text-slate-400 mt-1">{hour}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Trend Chart */}
                    {logStats.byDay?.length > 0 && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-slate-700">📅 일별 추이 (7일)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {logStats.byDay.map((day: any) => {
                                        const total = day.success + day.failed;
                                        const successPct = total > 0 ? (day.success / total) * 100 : 0;
                                        return (
                                            <div key={day.date} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-20 shrink-0">
                                                    {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden flex">
                                                    <div 
                                                        className="h-full bg-emerald-400 transition-all" 
                                                        style={{ width: `${successPct}%` }}
                                                        title={`성공: ${day.success}`}
                                                    />
                                                    <div 
                                                        className="h-full bg-rose-400 transition-all" 
                                                        style={{ width: `${100 - successPct}%` }}
                                                        title={`실패: ${day.failed}`}
                                                    />
                                                </div>
                                                <div className="text-xs text-slate-500 w-28 text-right shrink-0">
                                                    {total}건 · {day.tokens?.toLocaleString()} 토큰
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Errors */}
                    {recentErrors.length > 0 && (
                        <Card className="border-rose-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-rose-700">❌ 최근 에러</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-60 overflow-auto">
                                    {recentErrors.map((err: any) => (
                                        <div key={err.id} className="p-2 bg-rose-50 rounded text-xs border border-rose-200">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-rose-700">{err.providerName}</span>
                                                <span className="text-[10px] text-slate-500">{new Date(err.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="text-rose-600 truncate">{err.errorMessage}</div>
                                            {err.actionContext && <div className="text-[10px] text-slate-500 mt-1">Context: {err.actionContext}</div>}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-700">📋 최근 AI 로그 ({logs.length}건)</CardTitle>
                        <Button variant="outline" size="sm" onClick={fetchLogs} className="h-7 text-xs">
                            🔄 새로고침
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="text-slate-400 mb-2">로그 데이터가 없습니다</div>
                                <Button variant="outline" size="sm" onClick={fetchLogs}>
                                    로그 불러오기
                                </Button>
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left font-medium">시간</th>
                                            <th className="p-2 text-left font-medium">Provider</th>
                                            <th className="p-2 text-left font-medium">모델</th>
                                            <th className="p-2 text-center font-medium">상태</th>
                                            <th className="p-2 text-right font-medium">토큰</th>
                                            <th className="p-2 text-right font-medium">지연</th>
                                            <th className="p-2 text-left font-medium">Context</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-slate-50">
                                                <td className="p-2 text-slate-500">
                                                    {new Date(log.createdAt).toLocaleString('ko-KR', { 
                                                        month: 'numeric', day: 'numeric', 
                                                        hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </td>
                                                <td className="p-2 font-medium">{log.providerName || '-'}</td>
                                                <td className="p-2 font-mono text-[10px]">{log.modelUsed || '-'}</td>
                                                <td className="p-2 text-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                        log.status === 'SUCCESS' 
                                                            ? 'bg-emerald-100 text-emerald-700' 
                                                            : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-right text-purple-600">{log.totalTokens?.toLocaleString() || 0}</td>
                                                <td className="p-2 text-right text-blue-600">{log.latencyMs || 0}ms</td>
                                                <td className="p-2 text-slate-400 max-w-[150px] truncate" title={log.actionContext}>
                                                    {log.actionContext || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse z-50">
                    ✓ {toastMessage}
                </div>
            )}
        </div>
    );
}
