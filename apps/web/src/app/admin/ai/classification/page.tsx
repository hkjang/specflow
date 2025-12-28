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
    Save, Tags, Sparkles, Settings2, TestTube2, 
    BarChart3, RefreshCw, Zap, Clock, CheckCircle2, 
    XCircle, AlertTriangle, PlayCircle, FileText, Loader2,
    TrendingUp, Activity, Timer, Download, Upload, Copy, 
    ClipboardPaste, Filter, Keyboard, Trash2, Eye,
    MoreVertical, RotateCcw, Wand2, ChevronDown, Plus,
    FolderTree, Target, Layers, PieChart, ArrowUpDown, Info,
    Lightbulb, Edit2, Check, X, Hash, Percent, ThumbsUp,
    ThumbsDown, GitCompare, ListChecks, BookMarked, Split,
    FileUp, List, Search, ArrowRight, Shuffle, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ClassificationStats {
    totalClassifications: number;
    accuracyRate: number;
    avgConfidence: number;
    todayCount: number;
    categoryDistribution: { name: string; count: number; color: string }[];
    recentClassifications: {
        id: string;
        text: string;
        category: string;
        confidence: number;
        status: 'success' | 'failed' | 'pending';
        createdAt: string;
    }[];
}

interface Category {
    id: string;
    name: string;
    description: string;
    color: string;
    keywords: string[];
    isActive: boolean;
}

interface ClassificationRule {
    id: string;
    name: string;
    condition: string;
    targetCategory: string;
    priority: number;
    isActive: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', name: '기능 요구사항', description: '시스템이 제공해야 하는 기능', color: 'bg-blue-500', keywords: ['기능', '제공', '지원', '수행'], isActive: true },
    { id: '2', name: '비기능 요구사항', description: '성능, 보안, 확장성 등', color: 'bg-purple-500', keywords: ['성능', '보안', '가용성', '확장'], isActive: true },
    { id: '3', name: '제약사항', description: '시스템 구현 제약조건', color: 'bg-orange-500', keywords: ['제약', '제한', '금지', '불가'], isActive: true },
    { id: '4', name: '인터페이스', description: 'API, 외부 시스템 연동', color: 'bg-green-500', keywords: ['API', '연동', '인터페이스', '통신'], isActive: true },
    { id: '5', name: '데이터', description: '데이터 관리 및 저장', color: 'bg-cyan-500', keywords: ['데이터', '저장', 'DB', '테이블'], isActive: true },
];

const SAMPLE_TEXTS = [
    {
        id: 'functional',
        name: '기능 요구사항',
        icon: Zap,
        text: '시스템은 사용자가 로그인할 때 2단계 인증을 지원해야 한다. OTP 및 이메일 인증 방식을 제공해야 한다.'
    },
    {
        id: 'performance',
        name: '성능 요구사항',
        icon: Timer,
        text: '모든 API 응답은 95퍼센타일 기준 3초 이내여야 한다. 동시 접속자 10,000명을 지원해야 한다.'
    },
    {
        id: 'constraint',
        name: '제약사항',
        icon: AlertTriangle,
        text: '개인정보는 반드시 국내 서버에만 저장해야 하며, 해외 전송이 금지된다. ISMS 인증 요건을 준수해야 한다.'
    },
];

const CONFIDENCE_THRESHOLDS = {
    HIGH: { min: 0.8, label: '높음', color: 'text-green-600 bg-green-50' },
    MEDIUM: { min: 0.5, label: '중간', color: 'text-yellow-600 bg-yellow-50' },
    LOW: { min: 0, label: '낮음', color: 'text-red-600 bg-red-50' },
};

const KEYBOARD_SHORTCUTS = [
    { key: 'Ctrl + S', action: '설정 저장' },
    { key: 'Ctrl + Enter', action: '분류 실행' },
    { key: 'Ctrl + R', action: '새로고침' },
    { key: 'Ctrl + N', action: '새 카테고리' },
];

export default function AiClassificationPage() {
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
        temperature: 0.2,
        confidenceThreshold: 0.7,
        autoTagging: true,
        multiLabel: false,
        maxLabels: 3,
        useKeywords: true
    });
    
    // Categories and rules
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [rules, setRules] = useState<ClassificationRule[]>([]);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', color: 'bg-blue-500', keywords: '' });
    
    // Stats
    const [stats, setStats] = useState<ClassificationStats>({
        totalClassifications: 0,
        accuracyRate: 0,
        avgConfidence: 0,
        todayCount: 0,
        categoryDistribution: [],
        recentClassifications: []
    });
    
    // UI states
    const [refreshing, setRefreshing] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
    const [showKeyboardHints, setShowKeyboardHints] = useState(false);
    
    // Advanced features states
    const [batchTexts, setBatchTexts] = useState('');
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [showRuleDialog, setShowRuleDialog] = useState(false);
    const [newRule, setNewRule] = useState({ name: '', condition: '', targetCategory: '', priority: 1 });
    const [compareMode, setCompareMode] = useState(false);
    const [compareProvider, setCompareProvider] = useState('');
    const [feedbackStats, setFeedbackStats] = useState({ positive: 847, negative: 53, pending: 28 });
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProviders();
        fetchStats();
        
        const savedConfig = localStorage.getItem('specflow_classification_config');
        if (savedConfig) {
            setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
        }
        
        const savedCategories = localStorage.getItem('specflow_classification_categories');
        if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
        }
        
        // Auto-refresh every 30 seconds
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
                    case 'n':
                        e.preventDefault();
                        setShowCategoryDialog(true);
                        break;
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [testText]);

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);

            if (!localStorage.getItem('specflow_classification_config') && active.length > 0) {
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
            // Simulate fetching stats
            setStats({
                totalClassifications: 3842,
                accuracyRate: 91.5,
                avgConfidence: 0.87,
                todayCount: 128,
                categoryDistribution: [
                    { name: '기능 요구사항', count: 1542, color: 'bg-blue-500' },
                    { name: '비기능 요구사항', count: 892, color: 'bg-purple-500' },
                    { name: '제약사항', count: 456, color: 'bg-orange-500' },
                    { name: '인터페이스', count: 623, color: 'bg-green-500' },
                    { name: '데이터', count: 329, color: 'bg-cyan-500' },
                ],
                recentClassifications: [
                    { id: '1', text: '사용자 인증 시 OTP를 지원해야 한다', category: '기능 요구사항', confidence: 0.95, status: 'success', createdAt: new Date(Date.now() - 120000).toISOString() },
                    { id: '2', text: 'API 응답시간 2초 이내', category: '비기능 요구사항', confidence: 0.88, status: 'success', createdAt: new Date(Date.now() - 300000).toISOString() },
                    { id: '3', text: '외부 결제 시스템 연동', category: '인터페이스', confidence: 0.72, status: 'success', createdAt: new Date(Date.now() - 600000).toISOString() },
                    { id: '4', text: '데이터 암호화 필수', category: '제약사항', confidence: 0.91, status: 'success', createdAt: new Date(Date.now() - 900000).toISOString() },
                    { id: '5', text: '분류 대기 중...', category: '-', confidence: 0, status: 'pending', createdAt: new Date(Date.now() - 60000).toISOString() },
                ]
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
        toast({
            title: "새로고침 완료",
            description: "최신 상태로 업데이트되었습니다."
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            localStorage.setItem('specflow_classification_config', JSON.stringify(config));
            localStorage.setItem('specflow_classification_categories', JSON.stringify(categories));
            await new Promise(resolve => setTimeout(resolve, 500));
            toast({
                title: "설정 저장 완료",
                description: "분류 모델 설정이 성공적으로 저장되었습니다.",
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
                description: "분류할 텍스트를 입력해주세요.",
                variant: "destructive"
            });
            return;
        }
        
        setTesting(true);
        setTestResult(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate classification result
            const randomCategory = categories[Math.floor(Math.random() * categories.filter(c => c.isActive).length)];
            const confidence = 0.7 + Math.random() * 0.25;
            
            setTestResult({
                success: true,
                category: randomCategory.name,
                categoryColor: randomCategory.color,
                confidence: confidence,
                alternativeCategories: [
                    { name: categories[1].name, confidence: confidence - 0.15 },
                    { name: categories[2].name, confidence: confidence - 0.3 },
                ],
                keywords: ['인증', '사용자', '보안'],
                processingTime: 0.8 + Math.random() * 0.5
            });
            
            toast({
                title: "분류 완료",
                description: `"${randomCategory.name}"으로 분류되었습니다. (신뢰도: ${(confidence * 100).toFixed(1)}%)`
            });
        } catch (err) {
            setTestResult({ success: false, error: '분류 중 오류 발생' });
            toast({
                title: "분류 실패",
                description: "텍스트 분류 중 오류가 발생했습니다.",
                variant: "destructive"
            });
        } finally {
            setTesting(false);
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

    const handleAddCategory = () => {
        if (!newCategory.name) {
            toast({
                title: "입력 필요",
                description: "카테고리 이름을 입력해주세요.",
                variant: "destructive"
            });
            return;
        }
        
        const category: Category = {
            id: `custom-${Date.now()}`,
            name: newCategory.name,
            description: newCategory.description,
            color: newCategory.color,
            keywords: newCategory.keywords.split(',').map(k => k.trim()).filter(Boolean),
            isActive: true
        };
        
        const updated = [...categories, category];
        setCategories(updated);
        localStorage.setItem('specflow_classification_categories', JSON.stringify(updated));
        setNewCategory({ name: '', description: '', color: 'bg-blue-500', keywords: '' });
        setShowCategoryDialog(false);
        
        toast({
            title: "카테고리 추가됨",
            description: `"${category.name}" 카테고리가 추가되었습니다.`
        });
    };

    const handleDeleteCategory = (id: string) => {
        const updated = categories.filter(c => c.id !== id);
        setCategories(updated);
        localStorage.setItem('specflow_classification_categories', JSON.stringify(updated));
        toast({
            title: "카테고리 삭제됨",
            description: "카테고리가 삭제되었습니다."
        });
    };

    const handleToggleCategory = (id: string) => {
        const updated = categories.map(c => 
            c.id === id ? { ...c, isActive: !c.isActive } : c
        );
        setCategories(updated);
        localStorage.setItem('specflow_classification_categories', JSON.stringify(updated));
    };

    const handleResetConfig = () => {
        setConfig({
            providerId: providers[0]?.id || '',
            temperature: 0.2,
            confidenceThreshold: 0.7,
            autoTagging: true,
            multiLabel: false,
            maxLabels: 3,
            useKeywords: true
        });
        toast({
            title: "설정 초기화",
            description: "기본값으로 초기화되었습니다."
        });
    };

    const getConfidenceLevel = (confidence: number) => {
        if (confidence >= CONFIDENCE_THRESHOLDS.HIGH.min) return CONFIDENCE_THRESHOLDS.HIGH;
        if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM.min) return CONFIDENCE_THRESHOLDS.MEDIUM;
        return CONFIDENCE_THRESHOLDS.LOW;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'pending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
    };

    const filteredClassifications = stats.recentClassifications.filter(item => 
        historyFilter === 'all' || item.status === historyFilter
    );

    const totalCategoryCount = stats.categoryDistribution.reduce((sum, cat) => sum + cat.count, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI 분류 모델 (Classification Models)"
                description="요건의 유형을 자동으로 분류하는 AI 모델을 관리합니다."
                badgeText="AI ENGINE"
                steps={['관리자', 'AI 설정', '분류']}
            />

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm">총 분류 건수</p>
                                <p className="text-2xl font-bold">{stats.totalClassifications.toLocaleString()}</p>
                            </div>
                            <Tags className="h-8 w-8 text-amber-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">정확도</p>
                                <p className="text-2xl font-bold">{stats.accuracyRate}%</p>
                            </div>
                            <Target className="h-8 w-8 text-green-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">평균 신뢰도</p>
                                <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(1)}%</p>
                            </div>
                            <Percent className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">오늘 분류</p>
                                <p className="text-2xl font-bold">{stats.todayCount}건</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 lg:w-[650px]">
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" /> 설정
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> 규칙
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="flex items-center gap-2">
                        <Layers className="h-4 w-4" /> 카테고리
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
                                    <Tags className="h-5 w-5 text-amber-500" />
                                    기본 분류 모델 설정
                                </CardTitle>
                                <CardDescription>요건 자동 분류에 사용할 AI 모델을 설정합니다.</CardDescription>
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
                                        <span>일관됨 (0.0)</span>
                                        <span>다양함 (1.0)</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>신뢰도 임계값</Label>
                                        <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                                            {(config.confidenceThreshold * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <Slider
                                        value={[config.confidenceThreshold]}
                                        onValueChange={([val]) => setConfig({ ...config, confidenceThreshold: val })}
                                        min={0.5}
                                        max={0.95}
                                        step={0.05}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        이 값 이하의 분류 결과는 수동 검토가 필요합니다.
                                    </p>
                                </div>

                                <Button 
                                    className="w-full bg-amber-600 hover:bg-amber-700" 
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

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <Wand2 className="h-5 w-5 text-purple-500" />
                                    고급 옵션
                                </CardTitle>
                                <CardDescription>분류 동작을 세부 조정합니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>자동 태깅</Label>
                                        <p className="text-xs text-muted-foreground">분류 결과를 자동으로 태그에 반영</p>
                                    </div>
                                    <Switch 
                                        checked={config.autoTagging}
                                        onCheckedChange={(checked) => setConfig({ ...config, autoTagging: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>다중 레이블</Label>
                                        <p className="text-xs text-muted-foreground">하나의 요건에 여러 분류 허용</p>
                                    </div>
                                    <Switch 
                                        checked={config.multiLabel}
                                        onCheckedChange={(checked) => setConfig({ ...config, multiLabel: checked })}
                                    />
                                </div>

                                {config.multiLabel && (
                                    <div className="space-y-2">
                                        <Label>최대 레이블 수</Label>
                                        <Select 
                                            value={config.maxLabels.toString()} 
                                            onValueChange={(val) => setConfig({ ...config, maxLabels: parseInt(val) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2, 3, 4, 5].map(n => (
                                                    <SelectItem key={n} value={n.toString()}>{n}개</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>키워드 활용</Label>
                                        <p className="text-xs text-muted-foreground">카테고리 키워드를 분류에 활용</p>
                                    </div>
                                    <Switch 
                                        checked={config.useKeywords}
                                        onCheckedChange={(checked) => setConfig({ ...config, useKeywords: checked })}
                                    />
                                </div>

                                <div className="pt-2 border-t">
                                    <Button variant="outline" className="w-full" onClick={handleResetConfig}>
                                        <RotateCcw className="h-4 w-4 mr-2" /> 기본값으로 초기화
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">분류 규칙</h3>
                            <p className="text-sm text-muted-foreground">키워드와 조건 기반 자동 분류 규칙을 관리합니다.</p>
                        </div>
                        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-amber-600 hover:bg-amber-700">
                                    <Plus className="h-4 w-4 mr-2" /> 규칙 추가
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>새 분류 규칙 추가</DialogTitle>
                                    <DialogDescription>특정 조건에 따라 자동 분류하는 규칙을 정의합니다.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>규칙 이름</Label>
                                        <Input 
                                            value={newRule.name}
                                            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                            placeholder="예: 보안 키워드 탐지"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>조건 (키워드, 콤마로 구분)</Label>
                                        <Input 
                                            value={newRule.condition}
                                            onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                                            placeholder="예: 암호화, 인증, 보안, 접근제어"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>대상 카테고리</Label>
                                        <Select 
                                            value={newRule.targetCategory} 
                                            onValueChange={(val) => setNewRule({ ...newRule, targetCategory: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="카테고리 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.filter(c => c.isActive).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>우선순위 (1-10)</Label>
                                        <Input 
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={newRule.priority}
                                            onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowRuleDialog(false)}>취소</Button>
                                    <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => {
                                        if (!newRule.name || !newRule.condition || !newRule.targetCategory) {
                                            toast({ title: "입력 필요", description: "모든 필드를 입력해주세요.", variant: "destructive" });
                                            return;
                                        }
                                        const rule: ClassificationRule = { id: `rule-${Date.now()}`, ...newRule, isActive: true };
                                        setRules([...rules, rule]);
                                        setNewRule({ name: '', condition: '', targetCategory: '', priority: 1 });
                                        setShowRuleDialog(false);
                                        toast({ title: "규칙 추가됨", description: `"${rule.name}" 규칙이 추가되었습니다.` });
                                    }}>추가</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-green-500" />
                                    활성 규칙 ({rules.filter(r => r.isActive).length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {rules.filter(r => r.isActive).length > 0 ? (
                                    <div className="space-y-2">
                                        {rules.filter(r => r.isActive).map(rule => (
                                            <div key={rule.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{rule.name}</p>
                                                    <p className="text-xs text-muted-foreground">우선순위: {rule.priority}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: false } : r))}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setRules(rules.filter(r => r.id !== rule.id))}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">활성 규칙이 없습니다</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-purple-500" />
                                    분류 피드백 통계
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <ThumbsUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
                                        <p className="text-lg font-bold text-green-600">{feedbackStats.positive}</p>
                                        <p className="text-xs text-muted-foreground">정확</p>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 rounded-lg">
                                        <ThumbsDown className="h-5 w-5 mx-auto mb-1 text-red-600" />
                                        <p className="text-lg font-bold text-red-600">{feedbackStats.negative}</p>
                                        <p className="text-xs text-muted-foreground">오분류</p>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                        <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                                        <p className="text-lg font-bold text-yellow-600">{feedbackStats.pending}</p>
                                        <p className="text-xs text-muted-foreground">대기</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>피드백 정확도</span>
                                        <span className="font-medium">{((feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100).toFixed(1)}%</span>
                                    </div>
                                    <Progress value={(feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <GitCompare className="h-4 w-4 text-blue-500" />
                                    모델 비교
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Switch checked={compareMode} onCheckedChange={setCompareMode} />
                                    <Label className="text-sm">비교 모드</Label>
                                </div>
                            </div>
                        </CardHeader>
                        {compareMode && (
                            <CardContent>
                                <div className="space-y-2">
                                    <Label>비교 대상 Provider</Label>
                                    <Select value={compareProvider} onValueChange={setCompareProvider}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Provider 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.filter(p => p.id !== config.providerId).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">분류 카테고리</h3>
                            <p className="text-sm text-muted-foreground">요건을 분류할 카테고리를 관리합니다.</p>
                        </div>
                        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-amber-600 hover:bg-amber-700">
                                    <Plus className="h-4 w-4 mr-2" /> 카테고리 추가
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>새 카테고리 추가</DialogTitle>
                                    <DialogDescription>분류에 사용할 새 카테고리를 정의합니다.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>카테고리 이름</Label>
                                        <Input 
                                            value={newCategory.name}
                                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                            placeholder="예: 보안 요구사항"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>설명</Label>
                                        <Input 
                                            value={newCategory.description}
                                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                            placeholder="예: 시스템 보안 관련 요구사항"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>색상</Label>
                                        <div className="flex gap-2">
                                            {['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500'].map(color => (
                                                <button
                                                    key={color}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full transition-all",
                                                        color,
                                                        newCategory.color === color && "ring-2 ring-offset-2 ring-slate-900"
                                                    )}
                                                    onClick={() => setNewCategory({ ...newCategory, color })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>키워드 (쉼표로 구분)</Label>
                                        <Input 
                                            value={newCategory.keywords}
                                            onChange={(e) => setNewCategory({ ...newCategory, keywords: e.target.value })}
                                            placeholder="예: 암호화, 인증, 접근제어"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>취소</Button>
                                    <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleAddCategory}>추가</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {categories.map(category => (
                            <Card key={category.id} className={cn("border-slate-200 shadow-sm", !category.isActive && "opacity-60")}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-4 h-4 rounded-full", category.color)} />
                                            <CardTitle className="text-base">{category.name}</CardTitle>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleToggleCategory(category.id)}>
                                                    {category.isActive ? (
                                                        <><XCircle className="h-4 w-4 mr-2" /> 비활성화</>
                                                    ) : (
                                                        <><CheckCircle2 className="h-4 w-4 mr-2" /> 활성화</>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-red-600"
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> 삭제
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardDescription className="text-xs">{category.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {category.keywords.map((keyword, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                    {!category.isActive && (
                                        <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">
                                            비활성화됨
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Distribution Chart */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <PieChart className="h-5 w-5 text-amber-500" />
                                카테고리 분포
                            </CardTitle>
                            <CardDescription>분류된 요건의 카테고리별 분포</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats.categoryDistribution.map((cat, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-3 h-3 rounded-full", cat.color)} />
                                                <span>{cat.name}</span>
                                            </div>
                                            <span className="font-medium">{cat.count.toLocaleString()}건 ({((cat.count / totalCategoryCount) * 100).toFixed(1)}%)</span>
                                        </div>
                                        <Progress 
                                            value={(cat.count / totalCategoryCount) * 100} 
                                            className="h-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Test Tab */}
                <TabsContent value="test" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <TestTube2 className="h-5 w-5 text-amber-500" />
                                    분류 테스트
                                </CardTitle>
                                <CardDescription>텍스트를 입력하여 분류 결과를 테스트합니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Sample Text Buttons */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">샘플 텍스트</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {SAMPLE_TEXTS.map(sample => (
                                            <Button
                                                key={sample.id}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleApplySampleText(sample)}
                                                className="text-xs"
                                            >
                                                <sample.icon className="h-3 w-3 mr-1" />
                                                {sample.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <Textarea
                                    ref={testTextRef}
                                    value={testText}
                                    onChange={(e) => setTestText(e.target.value)}
                                    placeholder="분류할 텍스트를 입력하세요..."
                                    className="min-h-[150px] resize-none"
                                />

                                <div className="flex gap-2">
                                    <Button 
                                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                                        onClick={handleTest}
                                        disabled={testing || !testText.trim()}
                                    >
                                        {testing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                분류 중...
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircle className="h-4 w-4 mr-2" />
                                                분류 실행
                                            </>
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => { setTestText(''); setTestResult(null); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Result Card */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                    분류 결과
                                </CardTitle>
                                <CardDescription>AI가 분석한 분류 결과</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {testResult ? (
                                    testResult.success ? (
                                        <div className="space-y-4">
                                            {/* Primary Result */}
                                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={cn("w-5 h-5 rounded-full", testResult.categoryColor)} />
                                                    <span className="font-semibold text-lg">{testResult.category}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>신뢰도</span>
                                                        <Badge className={cn(getConfidenceLevel(testResult.confidence).color)}>
                                                            {(testResult.confidence * 100).toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                    <Progress value={testResult.confidence * 100} className="h-2" />
                                                </div>
                                            </div>

                                            {/* Alternative Categories */}
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">대체 분류</Label>
                                                {testResult.alternativeCategories.map((alt: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                                                        <span>{alt.name}</span>
                                                        <span className="text-muted-foreground">{(alt.confidence * 100).toFixed(1)}%</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Detected Keywords */}
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">감지된 키워드</Label>
                                                <div className="flex flex-wrap gap-1">
                                                    {testResult.keywords.map((kw: string, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="text-xs">
                                                            {kw}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Processing Info */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                                <span className="flex items-center gap-1">
                                                    <Timer className="h-3 w-3" />
                                                    처리 시간: {testResult.processingTime.toFixed(2)}초
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-red-500">
                                            <XCircle className="h-12 w-12 mb-2" />
                                            <p className="font-medium">분류 실패</p>
                                            <p className="text-sm text-muted-foreground">{testResult.error}</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Tags className="h-12 w-12 mb-3 opacity-30" />
                                        <p className="text-sm">텍스트를 입력하고 분류를 실행하세요</p>
                                        <p className="text-xs mt-1">Ctrl + Enter로 빠른 실행</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Batch Classification */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <List className="h-4 w-4 text-blue-500" />
                                        배치 분류
                                    </CardTitle>
                                    <CardDescription>여러 텍스트를 한 번에 분류합니다 (줄바꿈으로 구분)</CardDescription>
                                </div>
                                {batchResults.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                        const csv = batchResults.map(r => `"${r.text}","${r.category}",${(r.confidence * 100).toFixed(1)}%`).join('\n');
                                        const blob = new Blob([`텍스트,분류,신뢰도\n${csv}`], { type: 'text/csv' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href = url; a.download = `batch_classification_${Date.now()}.csv`; a.click();
                                        toast({ title: "내보내기 완료", description: "CSV 파일이 다운로드되었습니다." });
                                    }}>
                                        <Download className="h-4 w-4 mr-1" /> 내보내기
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={batchTexts}
                                onChange={(e) => setBatchTexts(e.target.value)}
                                placeholder="분류할 텍스트들을 입력하세요 (한 줄에 하나씩)..."
                                className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                                <Button 
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={async () => {
                                        const lines = batchTexts.split('\n').filter(l => l.trim());
                                        if (lines.length === 0) {
                                            toast({ title: "입력 필요", description: "분류할 텍스트를 입력해주세요.", variant: "destructive" });
                                            return;
                                        }
                                        setBatchProcessing(true);
                                        setBatchResults([]);
                                        await new Promise(r => setTimeout(r, 1000));
                                        const results = lines.map(text => {
                                            const cat = categories[Math.floor(Math.random() * categories.filter(c => c.isActive).length)];
                                            return { text: text.slice(0, 50) + (text.length > 50 ? '...' : ''), category: cat.name, categoryColor: cat.color, confidence: 0.7 + Math.random() * 0.25 };
                                        });
                                        setBatchResults(results);
                                        setBatchProcessing(false);
                                        toast({ title: "배치 분류 완료", description: `${results.length}건이 분류되었습니다.` });
                                    }}
                                    disabled={batchProcessing}
                                >
                                    {batchProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 분류 중...</> : <><Shuffle className="h-4 w-4 mr-2" /> 배치 분류 ({batchTexts.split('\n').filter(l => l.trim()).length}건)</>}
                                </Button>
                                <Button variant="outline" onClick={() => { setBatchTexts(''); setBatchResults([]); }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            {batchResults.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {batchResults.map((result, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-muted-foreground w-6">{idx + 1}.</span>
                                                <span className="truncate">{result.text}</span>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                <Badge className={cn("text-xs", result.categoryColor.replace('bg-', 'bg-').replace('500', '100'), result.categoryColor.replace('bg-', 'text-').replace('500', '700'))}>
                                                    {result.category}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{(result.confidence * 100).toFixed(0)}%</span>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFeedbackStats(prev => ({ ...prev, positive: prev.positive + 1 }))}>
                                                        <ThumbsUp className="h-3 w-3 text-green-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFeedbackStats(prev => ({ ...prev, negative: prev.negative + 1 }))}>
                                                        <ThumbsDown className="h-3 w-3 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                        <Clock className="h-5 w-5 text-amber-500" />
                                        최근 분류 기록
                                    </CardTitle>
                                    <CardDescription>최근에 처리된 분류 작업 목록</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={historyFilter} onValueChange={(val: any) => setHistoryFilter(val)}>
                                        <SelectTrigger className="w-[130px]">
                                            <Filter className="h-4 w-4 mr-2" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체</SelectItem>
                                            <SelectItem value="success">성공</SelectItem>
                                            <SelectItem value="failed">실패</SelectItem>
                                            <SelectItem value="pending">대기중</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                    >
                                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {filteredClassifications.length > 0 ? (
                                    filteredClassifications.map(item => (
                                        <div 
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(item.status)}
                                                <div>
                                                    <p className="font-medium text-sm line-clamp-1">{item.text}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                                        {item.confidence > 0 && (
                                                            <span className={cn("text-xs px-1.5 py-0.5 rounded", getConfidenceLevel(item.confidence).color)}>
                                                                {(item.confidence * 100).toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Tags className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">기록이 없습니다</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Keyboard Shortcuts Hint */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="fixed bottom-4 right-4 text-muted-foreground"
                            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
                        >
                            <Keyboard className="h-4 w-4 mr-1" />
                            단축키
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="w-48">
                        <div className="space-y-1">
                            {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="font-mono bg-slate-100 px-1 rounded">{shortcut.key}</span>
                                    <span>{shortcut.action}</span>
                                </div>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
