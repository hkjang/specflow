'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import {
  Bot, Play, Activity, Settings, BarChart3, Zap,
  FileSearch, Sparkles, Tags, Layers, CheckCircle2, ShieldAlert,
  TrendingUp, Clock, Target, AlertTriangle, FileText
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
  totalTokens: number;
  byAgentType: { agentType: string; count: number; successRate: number; avgMs: number }[];
}

interface AgentHealth {
  agentType: string;
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  successRate: number;
  circuitBreaker: { state: string; failureCount: number };
}

interface HourlyData {
  hour: string;
  count: number;
  successRate: number;
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
  const [health, setHealth] = useState<AgentHealth[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, metricsRes, healthRes, hourlyRes] = await Promise.all([
        agentApi.getAgents(),
        agentApi.getMetrics(7),
        agentApi.getHealth(),
        agentApi.getHourlyTrend(),
      ]);
      setAgents(agentsRes.data.agents || []);
      setMetrics(metricsRes.data);
      setHealth(healthRes.data.agents || []);
      setHourlyData(hourlyRes.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch agent data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const healthyCount = health.filter(h => h.status === 'HEALTHY').length;
  const degradedCount = health.filter(h => h.status === 'DEGRADED').length;
  const unhealthyCount = health.filter(h => h.status === 'UNHEALTHY').length;
  const openCircuits = health.filter(h => h.circuitBreaker.state === 'OPEN').length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="AI 에이전트 대시보드"
          description="6개 자율 AI 에이전트의 현황을 모니터링하고 파이프라인을 실행합니다."
          badgeText="AGENTS"
          steps={['관리자', 'AI 에이전트']}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            <span className="text-gray-600">실시간</span>
            {autoRefresh && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </label>
          {lastUpdate && <span className="text-xs text-gray-400">{lastUpdate.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* System Status Alert */}
      {(unhealthyCount > 0 || openCircuits > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <div className="font-medium text-red-800">시스템 주의 필요</div>
            <div className="text-sm text-red-600">
              {unhealthyCount > 0 && `${unhealthyCount}개 에이전트 비정상`}
              {unhealthyCount > 0 && openCircuits > 0 && ' · '}
              {openCircuits > 0 && `${openCircuits}개 Circuit Breaker 열림`}
            </div>
          </div>
          <Link href="/admin/agents/health">
            <Button variant="outline" size="sm" className="text-red-600 border-red-300">상태 확인</Button>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/agents/pipeline">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Play className="h-4 w-4" /> 파이프라인 실행
          </Button>
        </Link>
        <Link href="/admin/agents/autonomous">
          <Button variant="outline" className="gap-2"><Zap className="h-4 w-4" /> 자율 생성</Button>
        </Link>
        <Link href="/admin/agents/health">
          <Button variant="outline" className={`gap-2 ${unhealthyCount > 0 ? 'border-red-300 text-red-600' : ''}`}>
            <Activity className="h-4 w-4" /> 건강 상태
            {unhealthyCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{unhealthyCount}</span>}
          </Button>
        </Link>
        <Link href="/admin/agents/metrics">
          <Button variant="outline" className="gap-2"><BarChart3 className="h-4 w-4" /> 메트릭스</Button>
        </Link>
        <Link href="/admin/agents/executions">
          <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> 실행 로그</Button>
        </Link>
        <Link href="/admin/agents/config">
          <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" /> 설정</Button>
        </Link>
      </div>

      {/* Metrics Summary with Health Indicator */}
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard title="총 실행 (7일)" value={metrics?.totalExecutions || 0} icon={Activity} color="text-blue-600" />
        <MetricCard title="성공률" value={`${metrics?.successRate || 0}%`} icon={Target} color={metrics && metrics.successRate >= 80 ? "text-green-600" : "text-yellow-600"} />
        <MetricCard title="평균 실행시간" value={`${metrics?.avgExecutionMs || 0}ms`} icon={Clock} color="text-purple-600" />
        <MetricCard title="정상 에이전트" value={`${healthyCount}/${agents.length}`} icon={CheckCircle2} color={healthyCount === agents.length ? "text-green-600" : "text-yellow-600"} />
        <MetricCard title="열린 CB" value={openCircuits} icon={AlertTriangle} color={openCircuits === 0 ? "text-green-600" : "text-red-600"} />
      </div>

      {/* Live Activity Chart */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              최근 24시간 실행 추이
            </CardTitle>
            <Badge variant="outline" className="text-xs">{hourlyData.reduce((a, b) => a + b.count, 0)}개 실행</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-24">
            {hourlyData.slice(-24).map((h, i) => {
              const maxCount = Math.max(...hourlyData.map(x => x.count)) || 1;
              const height = Math.max((h.count / maxCount) * 100, h.count > 0 ? 5 : 0);
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-gray-100 rounded-t h-full flex flex-col justify-end">
                    <div 
                      className={`w-full rounded-t transition-all ${h.successRate >= 80 ? 'bg-blue-500' : h.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  {i % 4 === 0 && <span className="text-[9px] text-gray-400 mt-1">{h.hour.slice(11, 13)}시</span>}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {h.count}건 ({h.successRate}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid with Health Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = AGENT_ICONS[agent.type] || Bot;
          const color = AGENT_COLORS[agent.type] || 'bg-slate-500';
          const agentMetrics = metrics?.byAgentType.find(m => m.agentType === agent.type);
          const agentHealth = health.find(h => h.agentType === agent.type);

          return (
            <Card key={agent.type} className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${agentHealth?.status === 'UNHEALTHY' ? 'border-red-300 bg-red-50/50' : agentHealth?.status === 'DEGRADED' ? 'border-yellow-300 bg-yellow-50/50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color} text-white relative`}>
                    <Icon className="h-5 w-5" />
                    {agentHealth && (
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        agentHealth.status === 'HEALTHY' ? 'bg-green-500' : 
                        agentHealth.status === 'DEGRADED' ? 'bg-yellow-500 animate-pulse' : 
                        'bg-red-500 animate-pulse'
                      }`}></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{agent.type}</Badge>
                      {agentHealth?.circuitBreaker.state === 'OPEN' && (
                        <Badge variant="destructive" className="text-xs">CB OPEN</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mb-4">{agent.description}</CardDescription>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-xs text-slate-500">실행</div>
                    <div className="font-semibold">{agentMetrics?.count || 0}</div>
                  </div>
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-xs text-slate-500">성공률</div>
                    <div className={`font-semibold ${(agentMetrics?.successRate || 0) >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {agentMetrics?.successRate || 0}%
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-xs text-slate-500">평균 지연</div>
                    <div className="font-semibold">{agentMetrics?.avgMs || 0}ms</div>
                  </div>
                </div>
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
            에이전트별 성능 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.byAgentType && metrics.byAgentType.length > 0 ? (
            <div className="space-y-3">
              {metrics.byAgentType.map((m) => {
                const Icon = AGENT_ICONS[m.agentType] || Bot;
                const maxCount = Math.max(...metrics.byAgentType.map(x => x.count));
                return (
                  <div key={m.agentType} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-slate-600 w-6" />
                    <div className="w-28 text-sm font-medium truncate">{m.agentType}</div>
                    <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden relative">
                      <div 
                        className={`h-full ${m.successRate >= 80 ? 'bg-green-500' : m.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(m.count / maxCount) * 100}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                        {m.count}회 · {m.successRate}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 w-16 text-right">{m.avgMs}ms</div>
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
