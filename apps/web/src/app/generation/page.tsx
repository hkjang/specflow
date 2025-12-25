
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
    Cpu, 
    Bot, 
    CheckCircle2, 
    Loader2, 
    BrainCircuit, 
    ShieldCheck, 
    FileText, 
    ArrowRight, 
    PauseCircle, 
    PlayCircle,
    Search,
    Database,
    Wand2
} from 'lucide-react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type AgentStep = 'GOAL' | 'CONTEXT' | 'GENERATE' | 'VALIDATE' | 'REFINE' | 'RED_TEAM' | 'PROTOTYPE' | 'COMPLETE';

interface AgentLog {
    id: number;
    step: AgentStep;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
}

export default function AutonomousAgentPage() {
    const [goal, setGoal] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentStep, setCurrentStep] = useState<AgentStep>('GOAL');
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [generatedReqs, setGeneratedReqs] = useState<any[]>([]);

    const [jobId, setJobId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>('default');
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Fetch available models from backend
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch('/api/ai/providers');
                const providers = await res.json();
                // Aggregate all models from all active providers
                const allModels = providers
                    .filter((p: any) => p.isActive)
                    .flatMap((p: any) => p.models || []);
                
                // Remove duplicates and set
                const uniqueModels = Array.from(new Set(allModels)) as string[];
                setAvailableModels(uniqueModels);
                
                // Don't auto-select specific model, keep 'default' as initial
                // Only if 'default' is somehow invalid we might want to change, but 'default' is always valid for us.
            } catch (e) {
                console.error("Failed to fetch models", e);
                setAvailableModels(['gpt-4', 'gpt-3.5-turbo']);
            }
        };
        fetchModels();
    }, []);

    const addLog = (step: AgentStep, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        setLogs(prev => [...prev, {
            id: Date.now(),
            step,
            message,
            timestamp: new Date(),
            type
        }]);
    };

    const handleStart = async () => {
        if (!goal.trim()) return;

        setIsRunning(true);
        setLogs([]);
        setGeneratedReqs([]);
        setCurrentStep('GOAL');
        addLog('GOAL', `Initializing Agent Job with Model: ${selectedModel}...`, 'info');

        try {
            // 1. Create Job with Model
            const res = await fetch('/api/agent/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    goal, 
                    desiredModel: selectedModel === 'default' ? undefined : selectedModel 
                })
            });
            const job = await res.json();
            setJobId(job.id);
            addLog('GOAL', `Job Created: ${job.id}`, 'success');

        } catch (e) {
            console.error(e);
            addLog('GOAL', 'Failed to start job.', 'error');
            setIsRunning(false);
        }
    };

    // Polling Effect
    useEffect(() => {
        if (!isRunning || !jobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/agent/jobs/${jobId}`);
                const job = await res.json();

                // Process Steps to Logs
                if (job.steps) {
                    const newLogs: AgentLog[] = job.steps.map((s: any) => {
                        let step: AgentStep = 'GOAL';
                        // Map backend Action/Type to Frontend Step
                        if (s.action.includes('Goal')) step = 'GOAL';
                        else if (s.action.includes('Context')) step = 'CONTEXT';
                        else if (s.action.includes('Generate')) step = 'GENERATE';
                        else if (s.action.includes('Validate')) step = 'VALIDATE';
                        else if (s.action.includes('Refine')) step = 'REFINE';
                        else if (s.action.includes('Red Team')) step = 'RED_TEAM';
                        else if (s.action.includes('Prototyping')) step = 'PROTOTYPE';

                        // Set Current Step if Running
                        if (s.status === 'RUNNING') setCurrentStep(step);

                        return {
                            id: s.id,
                            step: step,
                            message: `${s.agentType}: ${s.action} - ${s.status}`,
                            timestamp: new Date(s.startedAt),
                            type: s.status === 'FAILED' ? 'error' : s.status === 'SUCCESS' ? 'success' : 'info'
                        };
                    });
                    
                    // Deduplicate logs or just verify (simplification: just set logs)
                    // In real app, merge logs. For now, simple replace is okay if list is small.
                    // But to keep scrolling nice, maybe just replace.
                    setLogs(newLogs);
                }

                // Check Completion
                if (job.status === 'COMPLETED') {
                    console.log('Job Completed:', job); // Debugging
                    setIsRunning(false);
                    setCurrentStep('COMPLETE');
                    clearInterval(interval);
                    
                    if (job.result) {
                         let resultObj = job.result;
                         // Handle double-stringified JSON if applicable
                         if (typeof resultObj === 'string') {
                             try { resultObj = JSON.parse(resultObj); } catch(e) {}
                         }

                         console.log('Processed Result:', resultObj); // Debugging

                         const rawReqs = resultObj.requirements || [];
                         const reqs = Array.isArray(rawReqs) ? rawReqs : [rawReqs];
                         
                         setGeneratedReqs(reqs.map((r: any, i: number) => ({
                             id: `REQ-${i + 1}`,
                             title: r.title || 'Requirement',
                             content: r.content || JSON.stringify(r),
                             type: r.category || 'Functional',
                             status: 'Verified'
                         })));
                    } else {
                        console.warn('Job completed but no result found');
                    }
                } else if (job.status === 'FAILED') {
                     setIsRunning(false);
                     clearInterval(interval);
                     addLog('COMPLETE', 'Job Failed.', 'error');
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, jobId]);

    return (
        <div className="h-full flex flex-col p-6 space-y-6 max-w-[1600px] mx-auto">
            <PageHeader
                title="자율 요건 생성 에이전트 (Autonomous Requirement Agents)"
                description="목표를 입력하면 AI 에이전트 팀이 협업하여 요건을 스스로 탐색, 생성, 검증합니다."
                badgeText="ORGANIZATIONAL INTELLIGENCE"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Panel: Input & Status */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <Card className="border-indigo-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-indigo-600" />
                                1. 목표 설정 (Goal)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">AI 모델 (AI Model)</label>
                                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isRunning}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default" className="text-indigo-600 font-semibold">
                                            Default (System Setting)
                                        </SelectItem>
                                        {availableModels.map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">비즈니스 목표/요구사항</label>
                                <Textarea 
                                    placeholder="예: 우리 은행 앱에 새로운 '비대면 계좌 개설' 기능을 추가하고 싶어. 금융소비자보호법을 준수해야 하고, 신분증 진위확인 시스템과 연동되어야 해."
                                    className="min-h-[150px] resize-none focus:ring-indigo-500"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    disabled={isRunning}
                                />
                            </div>
                            <Button 
                                className={`w-full h-12 text-lg font-bold gap-2 ${isRunning ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200'}`}
                                onClick={handleStart}
                                disabled={isRunning || !goal.trim()}
                            >
                                {isRunning ? <Loader2 className="animate-spin" /> : <Wand2 className="h-5 w-5" />}
                                {isRunning ? '에이전트 실행 중...' : '자율 생성 시작 (Start Agents)'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 border-slate-200 flex flex-col min-h-[300px]">
                        <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                            <CardTitle className="text-sm flex items-center justify-between">
                                <span className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Agent Thinking Log</span>
                                {isRunning && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                                {logs.length === 0 && <div className="text-slate-400 text-center py-10">대기 중...</div>}
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <span className="text-slate-400 shrink-0">[{log.timestamp.toLocaleTimeString().split(' ')[0]}]</span>
                                        <div className="flex-1">
                                            <span className={`font-bold mr-2 ${
                                                log.step === 'GOAL' ? 'text-blue-600' :
                                                log.step === 'CONTEXT' ? 'text-amber-600' :
                                                log.step === 'GENERATE' ? 'text-purple-600' :
                                                log.step === 'VALIDATE' ? 'text-red-500' :
                                                log.step === 'REFINE' ? 'text-emerald-600' : 'text-slate-600'
                                            }`}>[{log.step}]</span>
                                            <span className={log.type === 'error' ? 'text-red-600' : 'text-slate-700'}>{log.message}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Agent Visualizer & Result */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Agent Pipeline Visualizer */}
                    <Card className="border-slate-200 bg-slate-900 text-white overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-center relative">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -z-0"></div>
                                <div className={`absolute top-1/2 left-0 h-1 bg-indigo-500 transition-all duration-1000 -z-0`} 
                                     style={{ width: currentStep === 'COMPLETE' ? '100%' : currentStep === 'REFINE' ? '80%' : currentStep === 'VALIDATE' ? '60%' : currentStep === 'GENERATE' ? '40%' : currentStep === 'CONTEXT' ? '20%' : '0%' }} 
                                />

                                <AgentNode 
                                    icon={Search} label="Goal Manager" 
                                    active={currentStep === 'GOAL'} status={['GOAL', 'CONTEXT', 'GENERATE', 'VALIDATE', 'REFINE', 'COMPLETE'].indexOf(currentStep) > 0 ? 'done' : currentStep === 'GOAL' ? 'active' : 'pending'} 
                                />
                                <AgentNode 
                                    icon={Database} label="Context Analyzer" 
                                    active={currentStep === 'CONTEXT'} status={['CONTEXT', 'GENERATE', 'VALIDATE', 'REFINE', 'COMPLETE'].indexOf(currentStep) > 0 ? 'done' : currentStep === 'CONTEXT' ? 'active' : 'pending'} 
                                />
                                <AgentNode 
                                    icon={BrainCircuit} label="Generator" 
                                    active={currentStep === 'GENERATE'} status={['GENERATE', 'VALIDATE', 'REFINE', 'COMPLETE'].indexOf(currentStep) > 0 ? 'done' : currentStep === 'GENERATE' ? 'active' : 'pending'} 
                                />
                                <AgentNode 
                                    icon={ShieldCheck} label="Validator" 
                                    active={currentStep === 'VALIDATE'} status={['VALIDATE', 'REFINE', 'COMPLETE'].indexOf(currentStep) > 0 ? 'done' : currentStep === 'VALIDATE' ? 'active' : 'pending'} 
                                />
                                <AgentNode 
                                    icon={CheckCircle2} label="Refiner" 
                                    active={currentStep === 'REFINE'} status={['REFINE', 'COMPLETE'].indexOf(currentStep) > 0 ? 'done' : currentStep === 'REFINE' ? 'active' : 'pending'} 
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Result Area */}
                    <Card className="flex-1 border-slate-200 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>2. 생성 결과 (Generated Requirements)</CardTitle>
                            {generatedReqs.length > 0 && <Button size="sm" variant="outline" onClick={() => downloadExcel(generatedReqs)}>엑셀 다운로드</Button>}
                        </CardHeader>
                        <CardContent className="p-0">
                            {generatedReqs.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <FileText className="h-10 w-10 mb-2 opacity-20" />
                                    <p>요건이 생성되면 이곳에 표시됩니다.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {generatedReqs.map((req, idx) => (
                                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{req.id}</span>
                                                    <h4 className="font-bold text-slate-900">{req.title}</h4>
                                                </div>
                                                <Badge variant="outline" className={
                                                    req.type === 'Security' ? 'border-red-200 text-red-700 bg-red-50' : 
                                                    req.type === 'Functional' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-700'
                                                }>{req.type}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{req.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        {generatedReqs.length > 0 && (
                            <CardFooter className="bg-slate-50 border-t p-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={handleStart}>재생성 (Retry)</Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={async () => {
                                        if(!jobId) return;
                                        try {
                                            await fetch(`/api/agent/jobs/${jobId}/merge`, { method: 'POST' });
                                            alert('프로젝트 요건으로 반영되었습니다!');
                                        } catch(e) {
                                            alert('반영 실패');
                                        }
                                    }}
                                >프로젝트에 반영 (Approve & Merge)</Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Helper for Excel Download (Call this function from a button)
import * as XLSX from 'xlsx';

function downloadExcel(reqs: any[]) {
    const ws = XLSX.utils.json_to_sheet(reqs.map(r => ({
        ID: r.id,
        Title: r.title,
        Type: r.type,
        Content: r.content,
        Status: r.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requirements");
    XLSX.writeFile(wb, "Agent_Requirements.xlsx");
}

function AgentNode({ icon: Icon, label, active, status }: { icon: any, label: string, active: boolean, status: 'pending' | 'active' | 'done' }) {
    return (
        <div className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 transform ${active ? 'scale-110' : 'scale-100'}`}>
            <div className={`
                h-12 w-12 rounded-full flex items-center justify-center border-4 shadow-xl transition-all duration-500
                ${status === 'done' ? 'bg-indigo-500 border-indigo-600 text-white' : 
                  status === 'active' ? 'bg-white border-indigo-500 text-indigo-600 animate-pulse ring-4 ring-indigo-500/20' : 
                  'bg-slate-800 border-slate-600 text-slate-500'}
            `}>
                <Icon className="h-5 w-5" />
            </div>
            <span className={`text-xs font-bold transition-colors duration-300 ${status === 'pending' ? 'text-slate-500' : 'text-white'}`}>
                {label}
            </span>
            {status === 'active' && <span className="absolute -bottom-5 text-[10px] text-indigo-300 animate-bounce">Processing...</span>}
        </div>
    );
}
