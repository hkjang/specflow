
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const addLog = (step: AgentStep, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        setLogs(prev => [...prev, {
            id: Date.now(),
            step,
            message,
            timestamp: new Date(),
            type
        }]);
    };

    const handleStart = () => {
        if (!goal.trim()) return;
        
        setIsRunning(true);
        setLogs([]);
        setGeneratedReqs([]);
        setCurrentStep('GOAL');

        // Simulation of Agent Pipeline V2 (Parallel + Recursive)
        addLog('GOAL', 'Agent Job initialized (V2 Mode).', 'info');
        
        setTimeout(() => {
            setCurrentStep('CONTEXT');
            addLog('GOAL', 'Goal Manager: Intent analyzed. Domain: Finance (Smart Banking).', 'success');
            addLog('CONTEXT', 'Context Analyzer: Retrieving globally compliant regulations...', 'info');
        }, 1500);

        setTimeout(() => {
            addLog('CONTEXT', 'Context Analyzer: Context set. Spawning 3 Generators...', 'success');
            setCurrentStep('GENERATE');
            addLog('GENERATE', 'Generator [FUNC]: Creating core banking features...', 'info');
            addLog('GENERATE', 'Generator [NFR]: Defining performance SLAs...', 'info');
            addLog('GENERATE', 'Generator [SEC]: Applying ISMS-P security controls...', 'info');
        }, 3500);

        setTimeout(() => {
            addLog('GENERATE', 'Generators: Merged 24 requirements.', 'success');
            setCurrentStep('VALIDATE');
            addLog('VALIDATE', 'Validator: Loop 1 - Analyzing compliance...', 'info');
        }, 6500);

        setTimeout(() => {
            addLog('VALIDATE', 'Validator: Found 3 critical issues. Score: 78/100. Triggering Self-Correction.', 'warning');
            setCurrentStep('REFINE');
            addLog('REFINE', 'Refiner: Fixing ambiguity in REQ-005, REQ-008...', 'info');
        }, 8500);

        setTimeout(() => {
            setCurrentStep('VALIDATE');
            addLog('VALIDATE', 'Validator: Loop 2 - Re-validating...', 'info');
        }, 10500);

        setTimeout(() => {
            addLog('VALIDATE', 'Validator: All checks passed. Score: 98/100.', 'success');
            setCurrentStep('RED_TEAM');
            addLog('RED_TEAM', 'Red Team: Launching "Devil\'s Advocate" Protocol...', 'warning');
        }, 12500);

        setTimeout(() => {
            addLog('RED_TEAM', 'Red Team: SIMULATING DDOS ATTACK on Login API...', 'error');
            addLog('RED_TEAM', 'Red Team: SIMULATING DB FAILURE...', 'error');
            addLog('RED_TEAM', 'Red Team: Defense mechanism verified in REQ-002.', 'success');
        }, 14500);

        setTimeout(() => {
            setCurrentStep('PROTOTYPE');
            addLog('PROTOTYPE', 'Prototyper: Generating Prisma Schema...', 'info');
            addLog('PROTOTYPE', 'Prototyper: Generating React Login Component...', 'info');
            
            // Simulating Code Generation typing effect in log
            addLog('PROTOTYPE', '>> model User { id String @id ... }', 'info');
            addLog('PROTOTYPE', '>> function LoginPage() { ... }', 'info');
        }, 17500);

        setTimeout(() => {
             setCurrentStep('COMPLETE');
             setIsRunning(false);
             setGeneratedReqs([
                { id: 'REQ-001', title: 'Biometric Login', content: 'Users shall login using Fingerprint/FaceID via FIDO2.', type: 'Functional', status: 'Verified' },
                { id: 'SEC-001', title: 'Data Encryption', content: 'All PII must be AES-256 encrypted at rest.', type: 'Security', status: 'Verified' },
                { id: 'NFR-001', title: 'Response Time', content: 'API latency must be under 200ms for 99% of requests.', type: 'Non-Functional', status: 'Verified' },
                { id: 'PROTO-001', title: 'Prisma Schema', content: 'Top-tier DB Schema generated.', type: 'Code', status: 'Generated' },
                { id: 'PROTO-002', title: 'Login.tsx', content: 'React Component generated.', type: 'Code', status: 'Generated' },
            ]);
        }, 20500);
    };

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
                            {generatedReqs.length > 0 && <Button size="sm" variant="outline">엑셀 다운로드</Button>}
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
                                <Button variant="outline">재생성 (Retry)</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">프로젝트에 반영 (Approve & Merge)</Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
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
