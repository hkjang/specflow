'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agentApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart3, Activity, Clock, Target, TrendingUp, Gauge } from 'lucide-react';

interface Metrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionMs: number;
  totalTokens: number;
  byAgentType: { agentType: string; count: number; successRate: number; avgMs: number }[];
  dailyTrend: { date: string; count: number; successRate: number }[];
}

interface DetailedMetric {
  agentType: string;
  totalExecutions: number;
  successRate: number;
  avgExecutionMs: number;
  p50Ms: number;
  p90Ms: number;
  p99Ms: number;
  totalTokens: number;
  lastExecutionAt?: string;
}

export default function AgentMetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetric[]>([]);
  const [days, setDays] = useState('7');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [res, detailedRes] = await Promise.all([
        agentApi.getMetrics(parseInt(days)),
        agentApi.getDetailedMetrics(parseInt(days))
      ]);
      setMetrics(res.data);
      setDetailedMetrics(detailedRes.data || []);
    } catch (error) {
      console.error('Failed to fetch metrics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">메트릭스를 불러오고 있습니다...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="에이전트 메트릭스"
        description="AI 에이전트 실행 통계 및 성능 분석 대시보드입니다."
        badgeText="METRICS"
        steps={['관리자', 'AI 에이전트', '메트릭스']}
      />

      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="14">최근 14일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="총 실행" value={metrics?.totalExecutions || 0} icon={Activity} color="blue" />
        <MetricCard title="성공률" value={`${metrics?.successRate || 0}%`} icon={Target} color="green" />
        <MetricCard title="평균 실행 시간" value={`${metrics?.avgExecutionMs || 0}ms`} icon={Clock} color="purple" />
        <MetricCard title="총 토큰" value={metrics?.totalTokens?.toLocaleString() || 0} icon={BarChart3} color="orange" />
      </div>

      {/* Percentile Metrics */}
      {detailedMetrics.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              지연시간 Percentile (P50 / P90 / P99)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {detailedMetrics.map((m) => (
                <div key={m.agentType} className="bg-slate-50 rounded-lg p-4">
                  <div className="font-medium text-sm mb-3">{m.agentType}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">P50</span>
                      <span className="font-mono text-sm">{m.p50Ms}ms</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(m.p50Ms / 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">P90</span>
                      <span className="font-mono text-sm">{m.p90Ms}ms</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${Math.min(m.p90Ms / 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">P99</span>
                      <span className="font-mono text-sm">{m.p99Ms}ms</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(m.p99Ms / 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Agent Type */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              에이전트별 실행 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.byAgentType && metrics.byAgentType.length > 0 ? (
              <div className="space-y-4">
                {metrics.byAgentType.map((m) => (
                  <div key={m.agentType} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{m.agentType}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{m.count}회</Badge>
                        <Badge variant={m.successRate >= 80 ? 'default' : 'secondary'}>
                          {m.successRate}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${m.successRate >= 80 ? 'bg-green-500' : m.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${m.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-8">데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              일별 실행 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.dailyTrend && metrics.dailyTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-48">
                {metrics.dailyTrend.map((d) => {
                  const maxCount = Math.max(...metrics.dailyTrend.map(x => x.count)) || 1;
                  const height = (d.count / maxCount) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full h-full flex flex-col justify-end">
                        <div
                          className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all relative"
                          style={{ height: `${height}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            {d.count}회
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 -rotate-45 origin-center w-8">
                        {d.date.substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-8">데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${colors[color]} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );
}

