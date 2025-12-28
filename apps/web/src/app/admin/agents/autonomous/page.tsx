'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Zap, Loader2, Sparkles, Info } from 'lucide-react';

const INDUSTRIES = [
  { value: 'FINANCE', label: '금융/은행' },
  { value: 'HEALTHCARE', label: '헬스케어' },
  { value: 'MANUFACTURING', label: '제조업' },
  { value: 'RETAIL', label: '유통/리테일' },
  { value: 'LOGISTICS', label: '물류/운송' },
  { value: 'PUBLIC', label: '공공기관' },
  { value: 'EDUCATION', label: '교육' },
  { value: 'TELECOM', label: '통신' },
];

const SYSTEM_TYPES = [
  { value: 'SAAS', label: 'SaaS 서비스' },
  { value: 'INTERNAL', label: '내부 시스템' },
  { value: 'B2C', label: 'B2C 앱' },
  { value: 'B2B', label: 'B2B 플랫폼' },
];

const MATURITY_LEVELS = [
  { value: 'STARTUP', label: '스타트업' },
  { value: 'MID', label: '중견기업' },
  { value: 'ENTERPRISE', label: '엔터프라이즈' },
];

const REGULATION_LEVELS = [
  { value: 'HIGH', label: '높음 (금융, 의료 등)' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

export default function AutonomousGenerationPage() {
  const [config, setConfig] = useState({
    industry: '',
    systemType: '',
    organizationMaturity: '',
    regulationLevel: '',
    maxRequirements: 20,
    includeNonFunctional: true,
    includeSecurityRequirements: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!config.industry || !config.systemType || !config.organizationMaturity || !config.regulationLevel) {
      setError('모든 필수 항목을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await agentApi.generateAutonomous(config);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '요건 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="자율 요건 생성"
        description="산업 및 시스템 유형에 맞는 요건을 AI가 자동으로 생성합니다."
        badgeText="AUTONOMOUS"
        steps={['관리자', 'AI 에이전트', '자율 생성']}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Config Panel */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              생성 설정
            </CardTitle>
            <CardDescription>요건 생성에 필요한 컨텍스트를 설정하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">산업 분야 *</label>
              <Select value={config.industry} onValueChange={(v) => setConfig({ ...config, industry: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">시스템 유형 *</label>
              <Select value={config.systemType} onValueChange={(v) => setConfig({ ...config, systemType: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">조직 규모 *</label>
              <Select value={config.organizationMaturity} onValueChange={(v) => setConfig({ ...config, organizationMaturity: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {MATURITY_LEVELS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">규제 수준 *</label>
              <Select value={config.regulationLevel} onValueChange={(v) => setConfig({ ...config, regulationLevel: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {REGULATION_LEVELS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">최대 요건 수</label>
              <Input
                type="number"
                min="5"
                max="50"
                value={config.maxRequirements}
                onChange={(e) => setConfig({ ...config, maxRequirements: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nfr"
                  checked={config.includeNonFunctional}
                  onCheckedChange={(c) => setConfig({ ...config, includeNonFunctional: !!c })}
                />
                <label htmlFor="nfr" className="text-sm">비기능 요건 포함</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="security"
                  checked={config.includeSecurityRequirements}
                  onCheckedChange={(c) => setConfig({ ...config, includeSecurityRequirements: !!c })}
                />
                <label htmlFor="security" className="text-sm">보안 요건 포함</label>
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button className="w-full gap-2" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? '생성 중...' : '요건 생성'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2">
          {result ? (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-green-800">생성된 요건 ({result.requirements?.length || 0}개)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-auto">
                {result.requirements?.map((req: any, i: number) => (
                  <div key={i} className="p-4 bg-white rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800">{req.title}</div>
                    <div className="text-sm text-slate-600 mt-1">{req.content}</div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {req.category && <Badge variant="outline">{req.category}</Badge>}
                      {req.type && <Badge variant="secondary">{req.type}</Badge>}
                      <Badge>신뢰도: {Math.round((req.confidence || 0.8) * 100)}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                <Info className="h-12 w-12 mb-4 opacity-50" />
                <p>설정을 완료하고 요건 생성 버튼을 클릭하세요.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
