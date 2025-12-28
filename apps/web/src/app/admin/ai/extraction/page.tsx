'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
    Save, BrainCircuit, Sparkles, Settings2, TestTube2, 
    BarChart3, RefreshCw, Zap, Clock, CheckCircle2, 
    XCircle, AlertTriangle, PlayCircle, FileText, Loader2,
    TrendingUp, Activity, Timer, Download, Upload, Copy, 
    ClipboardPaste, FileCode2, Filter, Keyboard, Trash2,
    MoreVertical, Eye, RotateCcw, Wand2, BookOpen, ChevronDown,
    MessageSquare, Code2, List, ArrowUpDown, Info, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ExtractionStats {
    totalExtractions: number;
    successRate: number;
    avgProcessingTime: number;
    todayCount: number;
    recentExtractions: {
        id: string;
        documentName: string;
        status: 'success' | 'failed' | 'processing';
        extractedCount: number;
        processingTime: number;
        createdAt: string;
    }[];
}

interface EngineStatus {
    status: 'online' | 'offline' | 'degraded';
    lastUpdated: string;
    queueSize: number;
    activeWorkers: number;
    maxWorkers: number;
}

interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    isDefault: boolean;
}

interface TrendData {
    date: string;
    count: number;
    successRate: number;
}

const STRATEGY_INFO = {
    FAST: {
        name: 'Fast',
        description: 'Rule-based + Lightweight AI',
        icon: Zap,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        speed: '~2초',
        accuracy: '70-80%'
    },
    HYBRID: {
        name: 'Hybrid',
        description: 'Speed & Accuracy Balanced',
        icon: Activity,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        speed: '~5초',
        accuracy: '85-90%'
    },
    DEEP: {
        name: 'Deep Analysis',
        description: 'Full LLM Context',
        icon: BrainCircuit,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        speed: '~15초',
        accuracy: '95%+'
    }
};

const SAMPLE_TEXTS = [
    {
        id: 'requirements',
        name: '요구사항 문서',
        icon: FileText,
        text: `시스템 요구사항 명세서

1. 사용자 인증
- 시스템은 OAuth 2.0 및 SAML 2.0 기반 SSO를 지원해야 한다.
- 비밀번호는 최소 12자 이상, 특수문자 포함 필수이다.
- 로그인 실패 5회 시 계정이 15분간 잠금되어야 한다.

2. 성능 요구사항
- 모든 API 응답은 95퍼센타일 기준 3초 이내여야 한다.
- 동시 접속자 10,000명을 지원해야 한다.
- 시스템 가용성 99.9% 이상을 보장해야 한다.

3. 데이터 관리
- 개인정보는 AES-256으로 암호화하여 저장해야 한다.
- 데이터 백업은 일일 1회 자동 실행되어야 한다.`
    },
    {
        id: 'api-spec',
        name: 'API 스펙',
        icon: Code2,
        text: `API 설계 스펙

POST /api/users
- 새 사용자를 생성한다.
- 요청 본문에 email, password, name이 필수이다.
- 성공 시 201 Created와 사용자 ID를 반환한다.
- 이메일 중복 시 409 Conflict를 반환해야 한다.

GET /api/users/{id}
- 특정 사용자 정보를 조회한다.
- 인증된 사용자만 접근 가능해야 한다.
- 본인이 아닌 경우 민감 정보를 마스킹해야 한다.`
    },
    {
        id: 'user-story',
        name: '사용자 스토리',
        icon: MessageSquare,
        text: `사용자 스토리

AS A 관리자
I WANT TO 사용자 권한을 일괄 변경할 수 있다
SO THAT 대량의 사용자 권한을 효율적으로 관리할 수 있다

수용 조건:
- 최대 100명까지 선택 가능해야 한다
- 변경 전 확인 다이얼로그를 표시해야 한다
- 변경 이력이 감사 로그에 기록되어야 한다
- 처리 중 진행률 표시가 필요하다`
    }
];

const DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'default',
        name: '기본 추출',
        description: '일반적인 요구사항 추출',
        prompt: `다음 텍스트에서 요구사항을 추출해주세요. 각 요구사항에 대해:
- 고유 ID (REQ-XXX 형식)
- 유형 (기능/비기능)
- 우선순위 (높음/중간/낮음)
- 요약을 제공해주세요.`,
        isDefault: true
    },
    {
        id: 'detailed',
        name: '상세 분석',
        description: '의존성과 리스크까지 분석',
        prompt: `다음 텍스트를 상세 분석하고 요구사항을 추출해주세요:
- 요구사항 ID, 유형, 우선순위
- 예상 구현 복잡도
- 관련 요구사항 (의존성)
- 잠재적 리스크`,
        isDefault: false
    },
    {
        id: 'api-focused',
        name: 'API 중심',
        description: 'API 스펙에서 요구사항 추출',
        prompt: `API 스펙에서 다음을 추출해주세요:
- 엔드포인트별 기능 요구사항
- 입력 검증 규칙
- 에러 처리 요구사항
- 보안 요구사항`,
        isDefault: false
    }
];

const KEYBOARD_SHORTCUTS = [
    { key: 'Ctrl + S', action: '설정 저장' },
    { key: 'Ctrl + Enter', action: '테스트 실행' },
    { key: 'Ctrl + R', action: '새로고침' },
    { key: 'Ctrl + E', action: '결과 내보내기' },
];

export default function AiExtractionPage() {
    const { toast } = useToast();
    const testTextRef = useRef<HTMLTextAreaElement>(null);
    
    // Basic states
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testText, setTestText] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    
    // Config state
    const [config, setConfig] = useState({
        providerId: '',
        temperature: 0.3,
        strategy: 'HYBRID',
        maxTokens: 4096,
        timeout: 30,
        autoRetry: true,
        batchSize: 5
    });
    
    // Stats and status
    const [stats, setStats] = useState<ExtractionStats>({
        totalExtractions: 0,
        successRate: 0,
        avgProcessingTime: 0,
        todayCount: 0,
        recentExtractions: []
    });
    const [engineStatus, setEngineStatus] = useState<EngineStatus>({
        status: 'online',
        lastUpdated: new Date().toISOString(),
        queueSize: 0,
        activeWorkers: 2,
        maxWorkers: 4
    });
    
    // New states for advanced features
    const [refreshing, setRefreshing] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed' | 'processing'>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
    const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
    const [showKeyboardHints, setShowKeyboardHints] = useState(false);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', description: '', prompt: '' });

    useEffect(() => {
        fetchProviders();
        fetchStats();
        generateTrendData();
        
        const savedConfig = localStorage.getItem('specflow_extraction_config');
        if (savedConfig) {
            setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
        }
        
        const savedTemplates = localStorage.getItem('specflow_extraction_templates');
        if (savedTemplates) {
            setTemplates(JSON.parse(savedTemplates));
        }
        
        // Auto-refresh status every 30 seconds
        const interval = setInterval(() => {
            fetchStats();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        handleSave();
                        break;
                    case 'enter':
                        e.preventDefault();
                        if (testText.trim()) handleTest();
                        break;
                    case 'r':
                        e.preventDefault();
                        handleRefresh();
                        break;
                    case 'e':
                        e.preventDefault();
                        if (testResult?.success) handleExportResults('json');
                        break;
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [testText, testResult]);

    const generateTrendData = () => {
        const data: TrendData[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            data.push({
                date: format(date, 'MM/dd'),
                count: Math.floor(Math.random() * 50) + 20,
                successRate: Math.floor(Math.random() * 15) + 85
            });
        }
        setTrendData(data);
    };

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);

            if (!localStorage.getItem('specflow_extraction_config') && active.length > 0) {
                setConfig(prev => ({ ...prev, providerId: active[0].id }));
            }
        } catch (err) { 
            console.error(err);
            toast({
                title: "Provider 로드 실패",
                description: "AI Provider 목록을 불러오는데 실패했습니다.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            // Simulate fetching stats - replace with actual API call
            setStats({
                totalExtractions: 1247,
                successRate: 94.2,
                avgProcessingTime: 3.8,
                todayCount: 42,
                recentExtractions: [
                    { id: '1', documentName: '요구사항_v2.3.docx', status: 'success', extractedCount: 24, processingTime: 2.3, createdAt: new Date(Date.now() - 300000).toISOString() },
                    { id: '2', documentName: '시스템설계서.pdf', status: 'success', extractedCount: 18, processingTime: 4.1, createdAt: new Date(Date.now() - 900000).toISOString() },
                    { id: '3', documentName: 'API_스펙.xlsx', status: 'processing', extractedCount: 0, processingTime: 0, createdAt: new Date(Date.now() - 60000).toISOString() },
                    { id: '4', documentName: '기능명세_draft.docx', status: 'failed', extractedCount: 0, processingTime: 0, createdAt: new Date(Date.now() - 1800000).toISOString() },
                    { id: '5', documentName: '화면설계서.pptx', status: 'success', extractedCount: 31, processingTime: 5.7, createdAt: new Date(Date.now() - 3600000).toISOString() },
                ]
            });
            setEngineStatus({
                status: 'online',
                lastUpdated: new Date().toISOString(),
                queueSize: 3,
                activeWorkers: 2,
                maxWorkers: 4
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        generateTrendData();
        setRefreshing(false);
        toast({
            title: "새로고침 완료",
            description: "최신 상태로 업데이트되었습니다."
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            localStorage.setItem('specflow_extraction_config', JSON.stringify(config));
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            toast({
                title: "설정 저장 완료",
                description: "추출 엔진 설정이 성공적으로 저장되었습니다.",
            });
        } catch (err) {
            toast({
                title: "저장 실패",
                description: "설정 저장 중 오류가 발생했습니다.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!testText.trim()) {
            toast({
                title: "텍스트 입력 필요",
                description: "테스트할 텍스트를 입력해주세요.",
                variant: "destructive"
            });
            return;
        }
        
        setTesting(true);
        setTestResult(null);
        try {
            // Simulate extraction test with selected template
            const template = templates.find(t => t.id === selectedTemplate);
            await new Promise(resolve => setTimeout(resolve, 2000));
            setTestResult({
                success: true,
                template: template?.name || '기본',
                extractedRequirements: [
                    { id: 'REQ-001', type: 'functional', title: '사용자 로그인 기능', priority: 'high', complexity: 'medium' },
                    { id: 'REQ-002', type: 'non-functional', title: '응답 시간 3초 이내', priority: 'medium', complexity: 'low' },
                    { id: 'REQ-003', type: 'functional', title: 'OAuth 2.0 지원', priority: 'high', complexity: 'high' },
                ],
                processingTime: 1.8,
                tokensUsed: 856
            });
            toast({
                title: "테스트 완료",
                description: `${3}개의 요구사항이 추출되었습니다.`
            });
        } catch (err) {
            setTestResult({ success: false, error: '추출 중 오류 발생' });
            toast({
                title: "테스트 실패",
                description: "추출 테스트 중 오류가 발생했습니다.",
                variant: "destructive"
            });
        } finally {
            setTesting(false);
        }
    };

    const handleExportResults = (format: 'json' | 'csv') => {
        if (!testResult?.success) return;
        
        let content: string;
        let filename: string;
        let mimeType: string;
        
        if (format === 'json') {
            content = JSON.stringify(testResult.extractedRequirements, null, 2);
            filename = `extraction_results_${Date.now()}.json`;
            mimeType = 'application/json';
        } else {
            const headers = ['ID', 'Type', 'Title', 'Priority', 'Complexity'];
            const rows = testResult.extractedRequirements.map((req: any) => 
                [req.id, req.type, req.title, req.priority, req.complexity || '-'].join(',')
            );
            content = [headers.join(','), ...rows].join('\n');
            filename = `extraction_results_${Date.now()}.csv`;
            mimeType = 'text/csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
            title: "내보내기 완료",
            description: `${filename} 파일이 다운로드되었습니다.`
        });
    };

    const handleCopyConfig = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
            toast({
                title: "설정 복사됨",
                description: "현재 설정이 클립보드에 복사되었습니다."
            });
        } catch (err) {
            toast({
                title: "복사 실패",
                description: "클립보드 접근에 실패했습니다.",
                variant: "destructive"
            });
        }
    };

    const handlePasteConfig = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            setConfig(prev => ({ ...prev, ...parsed }));
            toast({
                title: "설정 붙여넣기 완료",
                description: "클립보드에서 설정을 불러왔습니다."
            });
        } catch (err) {
            toast({
                title: "붙여넣기 실패",
                description: "유효한 설정 JSON이 아닙니다.",
                variant: "destructive"
            });
        }
    };

    const handleApplySampleText = (sample: typeof SAMPLE_TEXTS[0]) => {
        setTestText(sample.text);
        testTextRef.current?.focus();
        toast({
            title: "샘플 적용됨",
            description: `"${sample.name}" 샘플이 적용되었습니다.`
        });
    };

    const handleAddTemplate = () => {
        if (!newTemplate.name || !newTemplate.prompt) {
            toast({
                title: "입력 필요",
                description: "템플릿 이름과 프롬프트를 입력해주세요.",
                variant: "destructive"
            });
            return;
        }
        
        const template: PromptTemplate = {
            id: `custom-${Date.now()}`,
            ...newTemplate,
            isDefault: false
        };
        
        const updated = [...templates, template];
        setTemplates(updated);
        localStorage.setItem('specflow_extraction_templates', JSON.stringify(updated));
        setNewTemplate({ name: '', description: '', prompt: '' });
        setShowTemplateDialog(false);
        
        toast({
            title: "템플릿 추가됨",
            description: `"${template.name}" 템플릿이 추가되었습니다.`
        });
    };

    const handleDeleteTemplate = (id: string) => {
        const template = templates.find(t => t.id === id);
        if (template?.isDefault) {
            toast({
                title: "삭제 불가",
                description: "기본 템플릿은 삭제할 수 없습니다.",
                variant: "destructive"
            });
            return;
        }
        
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('specflow_extraction_templates', JSON.stringify(updated));
        if (selectedTemplate === id) setSelectedTemplate('default');
        
        toast({
            title: "템플릿 삭제됨",
            description: "템플릿이 삭제되었습니다."
        });
    };

    const handleResetConfig = () => {
        setConfig({
            providerId: providers[0]?.id || '',
            temperature: 0.3,
            strategy: 'HYBRID',
            maxTokens: 4096,
            timeout: 30,
            autoRetry: true,
            batchSize: 5
        });
        toast({
            title: "설정 초기화",
            description: "기본값으로 초기화되었습니다."
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-600 bg-green-100';
            case 'degraded': return 'text-yellow-600 bg-yellow-100';
            case 'offline': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
    };

    const filteredExtractions = stats.recentExtractions.filter(item => 
        historyFilter === 'all' || item.status === historyFilter
    );

    const selectedStrategy = STRATEGY_INFO[config.strategy as keyof typeof STRATEGY_INFO];
    const StrategyIcon = selectedStrategy?.icon || Activity;
    const maxTrendCount = Math.max(...trendData.map(d => d.count), 1);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI 추출 엔진 (Extraction Engine)"
                description="문서에서 요건을 자동으로 추출하는 AI 엔진을 설정합니다."
                badgeText="AI ENGINE"
                steps={['관리자', 'AI 설정', '추출']}
            />

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm">총 추출 건수</p>
                                <p className="text-2xl font-bold">{stats.totalExtractions.toLocaleString()}</p>
                            </div>
                            <FileText className="h-8 w-8 text-indigo-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">성공률</p>
                                <p className="text-2xl font-bold">{stats.successRate}%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">평균 처리시간</p>
                                <p className="text-2xl font-bold">{stats.avgProcessingTime}초</p>
                            </div>
                            <Timer className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">오늘 처리</p>
                                <p className="text-2xl font-bold">{stats.todayCount}건</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" /> 설정
                    </TabsTrigger>
                    <TabsTrigger value="test" className="flex items-center gap-2">
                        <TestTube2 className="h-4 w-4" /> 테스트
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> 히스토리
                    </TabsTrigger>
                </TabsList>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <BrainCircuit className="h-5 w-5 text-indigo-500" />
                                    기본 추출 모델 설정
                                </CardTitle>
                                <CardDescription>모든 추출 작업에 기본으로 사용될 AI 모델을 지정합니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2">
                                    <Label>AI Provider</Label>
                                    <Select value={config.providerId} onValueChange={(val) => setConfig({ ...config, providerId: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="AI 모델 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{p.name}</span>
                                                        <span className="text-xs text-muted-foreground">({p.models})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>추출 방식 (Strategy)</Label>
                                    <Select value={config.strategy} onValueChange={(val) => setConfig({ ...config, strategy: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="방식 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STRATEGY_INFO).map(([key, info]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <info.icon className={cn("h-4 w-4", info.color)} />
                                                        <span className="font-medium">{info.name}</span>
                                                        <span className="text-xs text-muted-foreground">({info.description})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedStrategy && (
                                        <div className={cn("p-3 rounded-lg mt-2", selectedStrategy.bgColor)}>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Timer className="h-3.5 w-3.5" />
                                                    <span>속도: {selectedStrategy.speed}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    <span>정확도: {selectedStrategy.accuracy}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Temperature</Label>
                                        <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                                            {config.temperature.toFixed(2)}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[config.temperature]}
                                        onValueChange={([val]) => setConfig({ ...config, temperature: val })}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>정확함 (0.0)</span>
                                        <span>창의적 (1.0)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Max Tokens</Label>
                                        <Input 
                                            type="number" 
                                            value={config.maxTokens}
                                            onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 4096 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Timeout (초)</Label>
                                        <Input 
                                            type="number" 
                                            value={config.timeout}
                                            onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30 })}
                                        />
                                    </div>
                                </div>

                                <Button 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700" 
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    설정 저장
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" /> 엔진 상태
                                        </CardTitle>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleRefresh}
                                            disabled={refreshing}
                                        >
                                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">상태</span>
                                        <Badge className={cn("font-mono", getStatusColor(engineStatus.status))}>
                                            {engineStatus.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">대기열</span>
                                        <span className="font-medium">{engineStatus.queueSize}개 작업</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">워커 사용률</span>
                                            <span className="font-medium">{engineStatus.activeWorkers}/{engineStatus.maxWorkers}</span>
                                        </div>
                                        <Progress 
                                            value={(engineStatus.activeWorkers / engineStatus.maxWorkers) * 100} 
                                            className="h-2"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">마지막 업데이트</span>
                                        <span className="text-slate-700">
                                            {formatDistanceToNow(new Date(engineStatus.lastUpdated), { addSuffix: true, locale: ko })}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <StrategyIcon className={cn("h-4 w-4", selectedStrategy?.color)} />
                                        현재 선택된 전략
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className={cn("p-4 rounded-lg", selectedStrategy?.bgColor || 'bg-slate-50')}>
                                        <h4 className={cn("font-bold mb-1", selectedStrategy?.color)}>
                                            {selectedStrategy?.name || 'N/A'}
                                        </h4>
                                        <p className="text-sm text-slate-600 mb-3">
                                            {selectedStrategy?.description || '전략을 선택해주세요'}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-white/60 rounded p-2">
                                                <span className="text-slate-500">예상 속도</span>
                                                <p className="font-medium">{selectedStrategy?.speed || '-'}</p>
                                            </div>
                                            <div className="bg-white/60 rounded p-2">
                                                <span className="text-slate-500">예상 정확도</span>
                                                <p className="font-medium">{selectedStrategy?.accuracy || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Test Tab */}
                <TabsContent value="test" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <TestTube2 className="h-5 w-5 text-green-500" />
                                추출 테스트
                            </CardTitle>
                            <CardDescription>
                                샘플 텍스트를 입력하여 현재 설정으로 요구사항 추출을 테스트해보세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="테스트할 문서 내용을 입력하세요... 
예: 시스템은 사용자 인증을 위해 OAuth 2.0을 지원해야 합니다. 모든 API 응답은 3초 이내에 반환되어야 하며, 동시 접속자 1000명을 지원해야 합니다."
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                            <Button 
                                onClick={handleTest} 
                                disabled={testing || !testText.trim()}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        추출 중...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        테스트 실행
                                    </>
                                )}
                            </Button>

                            {testResult && (
                                <div className={cn(
                                    "p-4 rounded-lg border",
                                    testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                                )}>
                                    {testResult.success ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-green-700">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-medium">추출 성공</span>
                                                <span className="text-sm text-green-600">
                                                    ({testResult.processingTime}초 소요, {testResult.tokensUsed} tokens)
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {testResult.extractedRequirements.map((req: any, idx: number) => (
                                                    <div key={idx} className="bg-white p-3 rounded border border-green-100">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                {req.id}
                                                            </Badge>
                                                            <Badge 
                                                                className={cn(
                                                                    "text-xs",
                                                                    req.type === 'functional' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                )}
                                                            >
                                                                {req.type === 'functional' ? '기능' : '비기능'}
                                                            </Badge>
                                                            <Badge 
                                                                className={cn(
                                                                    "text-xs",
                                                                    req.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                                )}
                                                            >
                                                                {req.priority === 'high' ? '높음' : '중간'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-700">{req.title}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-700">
                                            <XCircle className="h-5 w-5" />
                                            <span className="font-medium">추출 실패: {testResult.error}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-slate-800">
                                        <Clock className="h-5 w-5 text-slate-500" />
                                        최근 추출 작업
                                    </CardTitle>
                                    <CardDescription>최근 실행된 추출 작업 목록입니다.</CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                >
                                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                                    새로고침
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats.recentExtractions.map((item) => (
                                    <div 
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(item.status)}
                                            <div>
                                                <p className="font-medium text-sm text-slate-800">{item.documentName}</p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {item.status === 'success' && (
                                                <>
                                                    <p className="text-sm font-medium text-slate-800">{item.extractedCount}개 추출</p>
                                                    <p className="text-xs text-slate-500">{item.processingTime}초</p>
                                                </>
                                            )}
                                            {item.status === 'processing' && (
                                                <Badge className="bg-blue-100 text-blue-700">처리중</Badge>
                                            )}
                                            {item.status === 'failed' && (
                                                <Badge className="bg-red-100 text-red-700">실패</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
