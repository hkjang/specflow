'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agentApi } from '@/lib/api';

interface AgentHealth {
  agentType: string;
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  successRate: number;
  avgLatencyMs: number;
  lastExecutionAt?: string;
  circuitBreaker: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime?: string;
    nextRetryTime?: string;
  };
}

interface PerformanceSummary {
  todayExecutions: number;
  todaySuccessRate: number;
  weekExecutions: number;
  weekSuccessRate: number;
  avgLatencyChange: number;
  successRateChange: number;
  topAgents: { agentType: string; count: number; successRate: number }[];
}

interface HourlyData {
  hour: string;
  count: number;
  successRate: number;
}

const AGENT_ICONS: Record<string, string> = {
  EXTRACTOR: '🔍', REFINER: '✨', CLASSIFIER: '🏷️',
  EXPANDER: '📑', VALIDATOR: '✅', RISK_DETECTOR: '⚠️',
};

export default function AgentHealthPage() {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'successRate'>('status');

  const fetchHealth = useCallback(async () => {
    try {
      const [healthRes, summaryRes, hourlyRes] = await Promise.all([
        agentApi.getHealth(),
        agentApi.getPerformanceSummary(),
        agentApi.getHourlyTrend(),
      ]);
      setAgents(healthRes.data.agents || []);
      setSummary(summaryRes.data);
      setHourlyData(Array.isArray(hourlyRes.data) ? hourlyRes.data : []);
      setLastUpdate(new Date());
    } catch (e) { console.error('Failed to fetch health', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' && !e.ctrlKey) { e.preventDefault(); fetchHealth(); }
      if (e.key === 'Escape') setSelectedAgent(null);
      if (e.key === 'm') setViewMode(v => v === 'cards' ? 'matrix' : 'cards');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchHealth]);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (sortBy === 'status') {
        const order = { UNHEALTHY: 0, DEGRADED: 1, HEALTHY: 2 };
        return order[a.status] - order[b.status];
      }
      if (sortBy === 'successRate') return a.successRate - b.successRate;
      return a.name.localeCompare(b.name);
    });
  }, [agents, sortBy]);

  const handleResetCircuitBreaker = async (agentType: string) => {
    try {
      await agentApi.resetCircuitBreaker(agentType);
      await fetchHealth();
    } catch (e) { console.error('Failed to reset CB', e); }
  };

  const handleResetAll = async () => {
    const openCBs = agents.filter(a => a.circuitBreaker.state !== 'CLOSED');
    for (const agent of openCBs) {
      await agentApi.resetCircuitBreaker(agent.agentType);
    }
    await fetchHealth();
  };

  const getStatusColor = (s: string) => s === 'HEALTHY' ? 'bg-green-500' : s === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500';
  const getStatusBg = (s: string) => s === 'HEALTHY' ? 'bg-green-50 border-green-200' : s === 'DEGRADED' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const getCBColor = (s: string) => s === 'CLOSED' ? 'text-green-600 bg-green-100' : s === 'HALF_OPEN' ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
  const getTrend = (v: number) => v > 0 ? { icon: '↑', color: 'text-green-600' } : v < 0 ? { icon: '↓', color: 'text-red-600' } : { icon: '→', color: 'text-gray-600' };

  const healthyCount = agents.filter(a => a.status === 'HEALTHY').length;
  const degradedCount = agents.filter(a => a.status === 'DEGRADED').length;
  const unhealthyCount = agents.filter(a => a.status === 'UNHEALTHY').length;
  const openCBCount = agents.filter(a => a.circuitBreaker.state === 'OPEN').length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">에이전트 건강 상태</h1>
          <p className="text-gray-600">
            실시간 모니터링 및 Circuit Breaker 관리
            {lastUpdate && <span className="ml-2 text-sm text-gray-400">· {lastUpdate.toLocaleTimeString()}</span>}
          </p>
          <div className="flex gap-2 mt-2 text-xs text-gray-400">
            <span className="px-1.5 py-0.5 bg-gray-100 rounded">R</span> 새로고침
            <span className="px-1.5 py-0.5 bg-gray-100 rounded">M</span> 뷰 전환
          </div>
        </div>
        <div className="flex items-center gap-3">
          {openCBCount > 0 && (
            <button onClick={handleResetAll} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              🔄 모든 CB 리셋 ({openCBCount})
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            <span className="text-gray-600">자동 (10초)</span>
            {autoRefresh && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </label>
          <button onClick={fetchHealth} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">↻</button>
        </div>
      </div>

      {/* System Alert */}
      {(unhealthyCount > 0 || openCBCount > 0) && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${unhealthyCount > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <span className="text-2xl">{unhealthyCount > 0 ? '🚨' : '⚠️'}</span>
          <div className="flex-1">
            <div className="font-medium">{unhealthyCount > 0 ? '시스템 긴급 점검 필요' : '주의 필요'}</div>
            <div className="text-sm">
              {unhealthyCount > 0 && `${unhealthyCount}개 에이전트 비정상`}
              {unhealthyCount > 0 && openCBCount > 0 && ' · '}
              {openCBCount > 0 && `${openCBCount}개 Circuit Breaker 열림`}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border"><div className="text-sm text-gray-500">전체</div><div className="text-3xl font-bold">{agents.length}</div></div>
        <div className={`p-4 rounded-lg shadow border ${healthyCount === agents.length ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
          <div className="text-sm text-green-700">정상</div><div className="text-3xl font-bold text-green-600">{healthyCount}</div>
        </div>
        <div className={`p-4 rounded-lg shadow border ${degradedCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
          <div className="text-sm text-yellow-700">저하</div><div className="text-3xl font-bold text-yellow-600">{degradedCount}</div>
        </div>
        <div className={`p-4 rounded-lg shadow border ${unhealthyCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className="text-sm text-red-700">비정상</div><div className="text-3xl font-bold text-red-600">{unhealthyCount}</div>
        </div>
        <div className={`p-4 rounded-lg shadow border ${openCBCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
          <div className="text-sm text-orange-700">열린 CB</div><div className="text-3xl font-bold text-orange-600">{openCBCount}</div>
        </div>
      </div>

      {/* Performance Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="font-semibold mb-4 text-gray-700">📊 성능 요약</h2>
          <div className="grid grid-cols-4 gap-4">
            <div><div className="text-sm text-gray-500">오늘 실행</div><div className="text-2xl font-bold">{summary.todayExecutions}</div></div>
            <div><div className="text-sm text-gray-500">오늘 성공률</div><div className={`text-2xl font-bold ${summary.todaySuccessRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{summary.todaySuccessRate}%</div></div>
            <div><div className="text-sm text-gray-500">주간 대비 성공률</div><div className={`text-2xl font-bold flex items-center gap-1 ${getTrend(summary.successRateChange).color}`}>{getTrend(summary.successRateChange).icon} {Math.abs(summary.successRateChange)}%</div></div>
            <div><div className="text-sm text-gray-500">주간 대비 지연</div><div className={`text-2xl font-bold flex items-center gap-1 ${getTrend(-summary.avgLatencyChange).color}`}>{getTrend(-summary.avgLatencyChange).icon} {Math.abs(summary.avgLatencyChange)}%</div></div>
          </div>
        </div>
      )}

      {/* 24h Trend Mini Chart */}
      <div className="bg-white rounded-lg shadow border p-4">
        <h2 className="font-semibold mb-3 text-gray-700">📈 24시간 실행 추이</h2>
        <div className="flex items-end gap-0.5 h-20">
          {hourlyData.slice(-24).map((h, i) => {
            const max = Math.max(...hourlyData.map(x => x.count)) || 1;
            const height = Math.max((h.count / max) * 100, h.count > 0 ? 5 : 0);
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div className="w-full bg-gray-100 h-full flex flex-col justify-end rounded-t">
                  <div className={`w-full rounded-t ${h.successRate >= 80 ? 'bg-green-500' : h.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ height: `${height}%` }}></div>
                </div>
                {i % 6 === 0 && <span className="text-[9px] text-gray-400 mt-1">{h.hour.slice(11, 13)}시</span>}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{h.count}건 ({h.successRate}%)</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">정렬:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="status">상태순</option>
            <option value="successRate">성공률순</option>
            <option value="name">이름순</option>
          </select>
        </div>
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>📋 카드</button>
          <button onClick={() => setViewMode('matrix')} className={`px-3 py-1.5 text-sm ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>📊 매트릭스</button>
        </div>
      </div>

      {/* Agent Cards / Matrix */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-2 gap-4">
          {sortedAgents.map((agent) => (
            <div key={agent.agentType} className={`rounded-lg shadow border overflow-hidden ${getStatusBg(agent.status)} ${selectedAgent === agent.agentType ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedAgent(selectedAgent === agent.agentType ? null : agent.agentType)}>
              <div className="px-4 py-3 border-b border-inherit flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{AGENT_ICONS[agent.agentType] || '🤖'}</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} ${agent.status !== 'HEALTHY' ? 'animate-pulse' : ''}`}></div>
                  <div>
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.agentType}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCBColor(agent.circuitBreaker.state)}`}>CB: {agent.circuitBreaker.state}</span>
                </div>
              </div>
              <div className="px-4 py-3 grid grid-cols-4 gap-4 text-sm">
                <div><div className="text-gray-500 text-xs">성공률</div><div className={`font-semibold ${agent.successRate >= 80 ? 'text-green-600' : agent.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{agent.successRate}%</div></div>
                <div><div className="text-gray-500 text-xs">지연</div><div className="font-semibold">{agent.avgLatencyMs}ms</div></div>
                <div><div className="text-gray-500 text-xs">실패</div><div className={`font-semibold ${agent.circuitBreaker.failureCount > 0 ? 'text-red-600' : ''}`}>{agent.circuitBreaker.failureCount}</div></div>
                <div className="flex items-end justify-end">
                  {agent.circuitBreaker.state !== 'CLOSED' && (
                    <button onClick={(e) => { e.stopPropagation(); handleResetCircuitBreaker(agent.agentType); }} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">리셋</button>
                  )}
                </div>
              </div>
              {selectedAgent === agent.agentType && agent.lastExecutionAt && (
                <div className="px-4 py-2 bg-white/50 border-t border-inherit text-xs text-gray-600">
                  마지막 실행: {new Date(agent.lastExecutionAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">에이전트</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">성공률</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">지연(ms)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">CB</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">실패</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedAgents.map((agent) => (
                <tr key={agent.agentType} className={`${agent.status !== 'HEALTHY' ? getStatusBg(agent.status) : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span>{AGENT_ICONS[agent.agentType]}</span><span className="font-medium">{agent.name}</span></div></td>
                  <td className="px-4 py-3 text-center"><span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></span></td>
                  <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><div className="w-16 h-2 bg-gray-200 rounded"><div className={`h-full rounded ${agent.successRate >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${agent.successRate}%` }}></div></div><span className="text-xs">{agent.successRate}%</span></div></td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{agent.avgLatencyMs}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-xs rounded ${getCBColor(agent.circuitBreaker.state)}`}>{agent.circuitBreaker.state}</span></td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{agent.circuitBreaker.failureCount}</td>
                  <td className="px-4 py-3 text-center">{agent.circuitBreaker.state !== 'CLOSED' && <button onClick={() => handleResetCircuitBreaker(agent.agentType)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">리셋</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
