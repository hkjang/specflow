'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Settings, Save, Loader2, Bot } from 'lucide-react';

interface AgentConfig {
  id: string;
  agentType: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
}

const AGENT_NAMES: Record<string, string> = {
  EXTRACTOR: '요건 추출',
  REFINER: '요건 정제',
  CLASSIFIER: '카테고리 분류',
  EXPANDER: '요건 확장',
  VALIDATOR: '정확도 검증',
  RISK_DETECTOR: '위험 탐지',
};

export default function AgentConfigPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await agentApi.getAllConfigs();
      setConfigs(res.data || []);
    } catch (error) {
      console.error('Failed to fetch configs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (agentType: string, data: Partial<AgentConfig>) => {
    setSaving(agentType);
    try {
      await agentApi.updateConfig(agentType, data);
      setMessage(`${AGENT_NAMES[agentType] || agentType} 설정이 저장되었습니다.`);
      setTimeout(() => setMessage(''), 3000);
      fetchConfigs();
    } catch (error) {
      console.error('Failed to update config', error);
      setMessage('저장 실패. 다시 시도해주세요.');
    } finally {
      setSaving(null);
    }
  };

  const handleFieldChange = (agentType: string, field: keyof AgentConfig, value: any) => {
    setConfigs(prev => prev.map(c =>
      c.agentType === agentType ? { ...c, [field]: value } : c
    ));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">설정을 불러오고 있습니다...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="에이전트 설정 관리"
        description="각 AI 에이전트의 모델, 온도, 토큰 설정을 관리합니다."
        badgeText="CONFIG"
        steps={['관리자', 'AI 에이전트', '설정']}
      />

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.keys(AGENT_NAMES).map(agentType => {
          const config = configs.find(c => c.agentType === agentType);
          const displayName = AGENT_NAMES[agentType];

          return (
            <Card key={agentType} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-slate-600" />
                    <CardTitle className="text-lg">{displayName}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">활성화</span>
                    <Switch
                      checked={config?.isEnabled ?? true}
                      onCheckedChange={(checked) => handleUpdate(agentType, { isEnabled: checked })}
                    />
                  </div>
                </div>
                <Badge variant="outline" className="w-fit">{agentType}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">모델</label>
                  <Input
                    value={config?.modelName || 'gpt-4o-mini'}
                    onChange={(e) => handleFieldChange(agentType, 'modelName', e.target.value)}
                    className="mt-1"
                    placeholder="gpt-4o-mini"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">온도 (0-2)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={config?.temperature ?? 0.3}
                      onChange={(e) => handleFieldChange(agentType, 'temperature', parseFloat(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">최대 토큰</label>
                    <Input
                      type="number"
                      step="100"
                      min="100"
                      max="8000"
                      value={config?.maxTokens ?? 2000}
                      onChange={(e) => handleFieldChange(agentType, 'maxTokens', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => handleUpdate(agentType, {
                    modelName: config?.modelName || 'gpt-4o-mini',
                    temperature: config?.temperature ?? 0.3,
                    maxTokens: config?.maxTokens ?? 2000,
                  })}
                  disabled={saving === agentType}
                >
                  {saving === agentType ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  저장
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
