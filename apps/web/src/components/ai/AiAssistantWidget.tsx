
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

interface AiAssistantWidgetProps {
    currentContent: string;
    onApply: (newContent: string) => void;
}

export function AiAssistantWidget({ currentContent, onApply }: AiAssistantWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [reason, setReason] = useState<string | null>(null);
    const [changes, setChanges] = useState<string[]>([]);

    const handlePolish = async () => {
        setIsProcessing(true);
        setIsOpen(true);

        try {
            const response = await api.post('/requirements/ai/improve', {
                content: currentContent
            });

            const data = response.data;
            setSuggestion(data.improved || currentContent);
            setReason(data.reason || 'AI가 개선 제안을 생성했습니다.');
            setChanges(data.changes || []);
        } catch (error) {
            console.error('AI improvement failed:', error);
            setSuggestion(currentContent);
            setReason('AI 호출에 실패했습니다. 다시 시도해주세요.');
            setChanges([]);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen && !isProcessing) {
        return (
            <Button
                onClick={handlePolish}
                className="flex gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg border-0"
            >
                <Sparkles className="h-4 w-4" />
                AI로 요건 다듬기
            </Button>
        );
    }

    return (
        <Card className="p-4 border-violet-100 bg-violet-50/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-violet-100 p-1.5 rounded-md text-violet-600">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">AI 요건 개선 제안</h3>
                </div>
                {!isProcessing && (
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isProcessing ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
                    <span className="text-xs">문맥을 분석하고 표준 표현으로 변환 중...</span>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-white rounded border border-slate-200 opacity-60">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">ORIGINAL</div>
                            {currentContent}
                        </div>
                        <div className="p-3 bg-white rounded border border-violet-200 ring-1 ring-violet-50 relative">
                            <div className="text-[10px] font-bold text-violet-600 mb-1">IMPROVED</div>
                            {suggestion}

                            {/* Visual Diff Highlight (Simple mock) */}
                            <div className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/50 p-3 rounded text-xs text-slate-600 border border-slate-100">
                        <span className="font-bold text-violet-700 mr-2">Why?</span>
                        {reason}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                            취소
                        </Button>
                        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => onApply(suggestion!)}>
                            <Check className="h-3.5 w-3.5" />
                            제안 적용하기
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
