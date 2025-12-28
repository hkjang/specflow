'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Play, Loader2, FileSearch, Sparkles, Tags, Layers, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';

const AGENTS = [
  { type: 'EXTRACTOR', name: '요건 추출', icon: FileSearch, color: 'bg-blue-500' },
  { type: 'REFINER', name: '요건 정제', icon: Sparkles, color: 'bg-purple-500' },
  { type: 'CLASSIFIER', name: '카테고리 분류', icon: Tags, color: 'bg-green-500' },
  { type: 'EXPANDER', name: '요건 확장', icon: Layers, color: 'bg-orange-500' },
  { type: 'VALIDATOR', name: '정확도 검증', icon: CheckCircle2, color: 'bg-teal-500' },
  { type: 'RISK_DETECTOR', name: '위험 탐지', icon: ShieldAlert, color: 'bg-red-500' },
];

const INDUSTRIES = [
  { value: 'FINANCE', label: '금융/은행' },
  { value: 'HEALTHCARE', label: '헬스케어' },
  { value: 'MANUFACTURING', label: '제조업' },
  { value: 'RETAIL', label: '유통/리테일' },
  { value: 'LOGISTICS', label: '물류/운송' },
  { value: 'PUBLIC', label: '공공기관' },
];

export default function PipelineExecutionPage() {
  const [content, setContent] = useState('');
  const [industry, setIndustry] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENTS.map(a => a.type));
  const [isParallel, setIsParallel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const toggleAgent = (type: string) => {
    setSelectedAgents(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleExecute = async () => {
    if (!content.trim()) {
      setError('문서 내용을 입력해주세요.');
      return;
    }
    if (selectedAgents.length === 0) {
      setError('실행할 에이전트를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;
      if (isParallel) {
        // Parallel: group independent agents
        const groups = [
          ['EXTRACTOR'],
          selectedAgents.filter(a => ['REFINER', 'CLASSIFIER'].includes(a)),
          selectedAgents.filter(a => ['EXPANDER', 'VALIDATOR', 'RISK_DETECTOR'].includes(a)),
        ].filter(g => g.length > 0);
        response = await agentApi.executePipelineParallel(content, groups, industry || undefined);
      } else {
        response = await agentApi.executePipeline(content, selectedAgents, industry || undefined);
      }
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '파이프라인 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="파이프라인 실행"
        description="문서를 입력하고 AI 에이전트 파이프라인을 실행하여 요건을 자동 추출/분석합니다."
        badgeText="PIPELINE"
        steps={['관리자', 'AI 에이전트', '파이프라인']}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>문서 입력</CardTitle>
              <CardDescription>요건을 추출할 문서 내용을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="RFP 문서, 회의록, 기획서 등의 내용을 붙여넣으세요..."
                className="min-h-[200px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-green-800">실행 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {result.results?.map((r: any, i: number) => (
                    <Badge key={i} variant={r.success ? 'default' : 'destructive'}>
                      {r.agentType}: {r.success ? '성공' : '실패'} ({r.executionTime}ms)
                    </Badge>
                  ))}
                </div>
                <div className="text-sm font-medium">추출된 요건: {result.finalCandidates?.length || 0}개</div>
                <div className="max-h-[300px] overflow-auto space-y-2">
                  {result.finalCandidates?.slice(0, 10).map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{c.content}</div>
                      <div className="flex gap-2 mt-2">
                        {c.category && <Badge variant="outline">{c.category}</Badge>}
                        <Badge variant="secondary">신뢰도: {Math.round(c.confidence * 100)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
        </div>

        {/* Config Panel */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>실행 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">산업 분야</label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="산업 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="parallel"
                  checked={isParallel}
                  onCheckedChange={(c) => setIsParallel(!!c)}
                />
                <label htmlFor="parallel" className="text-sm">병렬 실행 (더 빠름)</label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>에이전트 선택</CardTitle>
              <CardDescription>실행할 에이전트를 선택하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {AGENTS.map(agent => {
                const Icon = agent.icon;
                const isSelected = selectedAgents.includes(agent.type);
                return (
                  <div
                    key={agent.type}
                    onClick={() => toggleAgent(agent.type)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-100 border-2 border-blue-500' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${agent.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium text-sm">{agent.name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={handleExecute}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                파이프라인 실행
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
