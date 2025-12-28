'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import {
  Bot, Play, Activity, Settings, BarChart3, Zap,
  FileSearch, Sparkles, Tags, Layers, CheckCircle2, ShieldAlert,
  TrendingUp, Clock, Target
} from 'lucide-react';

interface Agent {
  type: string;
  name: string;
  description: string;
}

interface Metrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionMs: number;
  byAgentType: { agentType: string; count: number; successRate: number }[];
}

const AGENT_ICONS: Record<string, any> = {
  EXTRACTOR: FileSearch,
  REFINER: Sparkles,
  CLASSIFIER: Tags,
  EXPANDER: Layers,
  VALIDATOR: CheckCircle2,
  RISK_DETECTOR: ShieldAlert,
};

const AGENT_COLORS: Record<string, string> = {
  EXTRACTOR: 'bg-blue-500',
  REFINER: 'bg-purple-500',
  CLASSIFIER: 'bg-green-500',
  EXPANDER: 'bg-orange-500',
  VALIDATOR: 'bg-teal-500',
  RISK_DETECTOR: 'bg-red-500',
};

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, metricsRes] = await Promise.all([
          agentApi.getAgents(),
          agentApi.getMetrics(7),
        ]);
        setAgents(agentsRes.data.agents || []);
        setMetrics(metricsRes.data);
      } catch (error) {
        console.error('Failed to fetch agent data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">AI 에이전트 데이터를 불러오고 있습니다...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 에이전트 대시보드"
        description="6개 자율 AI 에이전트의 현황을 모니터링하고 파이프라인을 실행합니다."
        badgeText="AGENTS"
        steps={['관리자', 'AI 에이전트']}
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/agents/pipeline">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Play className="h-4 w-4" />
            파이프라인 실행
          </Button>
        </Link>
        <Link href="/admin/agents/autonomous">
          <Button variant="outline" className="gap-2">
            <Zap className="h-4 w-4" />
            자율 생성
          </Button>
        </Link>
        <Link href="/admin/agents/metrics">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            메트릭스
          </Button>
        </Link>
        <Link href="/admin/agents/config">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            설정 관리
          </Button>
        </Link>
      </div>

      {/* Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="총 실행 횟수"
          value={metrics?.totalExecutions || 0}
          icon={Activity}
          color="text-blue-600"
        />
        <MetricCard
          title="성공률"
          value={`${metrics?.successRate || 0}%`}
          icon={Target}
          color="text-green-600"
        />
        <MetricCard
          title="평균 실행 시간"
          value={`${metrics?.avgExecutionMs || 0}ms`}
          icon={Clock}
          color="text-purple-600"
        />
        <MetricCard
          title="등록된 에이전트"
          value={agents.length}
          icon={Bot}
          color="text-slate-600"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = AGENT_ICONS[agent.type] || Bot;
          const color = AGENT_COLORS[agent.type] || 'bg-slate-500';
          const agentMetrics = metrics?.byAgentType.find(m => m.agentType === agent.type);

          return (
            <Card key={agent.type} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{agent.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mb-4">{agent.description}</CardDescription>
                {agentMetrics && (
                  <div className="flex gap-4 text-sm text-slate-600">
                    <span>실행: <strong>{agentMetrics.count}</strong></span>
                    <span>성공률: <strong>{agentMetrics.successRate}%</strong></span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            최근 에이전트 활동
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.byAgentType && metrics.byAgentType.length > 0 ? (
            <div className="space-y-3">
              {metrics.byAgentType.map((m) => {
                const Icon = AGENT_ICONS[m.agentType] || Bot;
                return (
                  <div key={m.agentType} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Icon className="h-5 w-5 text-slate-600" />
                    <div className="flex-1">
                      <span className="font-medium">{m.agentType}</span>
                    </div>
                    <Badge variant={m.successRate >= 80 ? 'default' : 'secondary'}>
                      {m.count}회 / {m.successRate}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center py-4">최근 실행 기록이 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );
}
