'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { agentApi } from '@/lib/api';

interface Log { id: string; sessionId: string; agentType: string; success: boolean; error?: string; executionMs: number; tokenCount: number; createdAt: string; input?: any; output?: any; }
interface PagedLogs { logs: Log[]; total: number; page: number; pageSize: number; hasMore: boolean; }
interface Hourly { hour: string; count: number; successRate: number; }
interface SavedFilter { name: string; filter: any; createdAt: string; }
interface Cmd { id: string; label: string; shortcut?: string; action: () => void; cat: string; }

const AGENTS = ['EXTRACTOR', 'REFINER', 'CLASSIFIER', 'EXPANDER', 'VALIDATOR', 'RISK_DETECTOR'];
const CLR: Record<string, string> = { EXTRACTOR: 'bg-blue-100 text-blue-800', REFINER: 'bg-purple-100 text-purple-800', CLASSIFIER: 'bg-green-100 text-green-800', EXPANDER: 'bg-orange-100 text-orange-800', VALIDATOR: 'bg-teal-100 text-teal-800', RISK_DETECTOR: 'bg-red-100 text-red-800' };
const BAR: Record<string, string> = { EXTRACTOR: 'bg-blue-500', REFINER: 'bg-purple-500', CLASSIFIER: 'bg-green-500', EXPANDER: 'bg-orange-500', VALIDATOR: 'bg-teal-500', RISK_DETECTOR: 'bg-red-500' };
const COLS = ['time', 'agent', 'status', 'ms', 'token', 'session', 'actions'] as const;
type Col = typeof COLS[number];

export default function AgentExecutionsPage() {
  const [data, setData] = useState<PagedLogs | null>(null);
  const [hourly, setHourly] = useState<Hourly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Log | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [auto, setAuto] = useState(false);
  const [intv, setIntv] = useState(5);
  const [mode, setMode] = useState<'table' | 'timeline' | 'session' | 'heatmap' | 'analytics' | 'realtime' | 'score' | 'spark'>('table');
  const [filter, setFilter] = useState({ agentType: '', success: undefined as boolean | undefined, fromDate: '', toDate: '', page: 1, pageSize: 20 });
  const [tab, setTab] = useState<'all' | 'failed' | 'slow'>('all');
  const [search, setSearch] = useState('');
  const [compare, setCompare] = useState(false);
  const [cmpList, setCmpList] = useState<string[]>([]);
  const [notifs, setNotifs] = useState<{id: string; msg: string; type: string}[]>([]);
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [fname, setFname] = useState('');
  const [alarm, setAlarm] = useState({ sr: 80, ms: 5000, on: false });
  const [showSet, setShowSet] = useState(false);
  const [real, setReal] = useState<Log[]>([]);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [cmd, setCmd] = useState(false);
  const [cmdQ, setCmdQ] = useState('');
  const [full, setFull] = useState(false);
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>('normal');
  const [cols, setCols] = useState<Set<Col>>(new Set(COLS));
  const [showCols, setShowCols] = useState(false);
  const [quickAct, setQuickAct] = useState<{x: number; y: number; log: Log} | null>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const sRef = useRef<HTMLInputElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);
  const tblRef = useRef<HTMLTableElement>(null);

  useEffect(() => { const s = localStorage.getItem('agFilters'); if (s) setSaved(JSON.parse(s)); const a = localStorage.getItem('agAlarm'); if (a) setAlarm(JSON.parse(a)); const d = localStorage.getItem('agDark'); if (d) setDark(JSON.parse(d)); const p = localStorage.getItem('agPinned'); if (p) setPinned(new Set(JSON.parse(p))); const c = localStorage.getItem('agCols'); if (c) setCols(new Set(JSON.parse(c))); }, []);
  useEffect(() => { localStorage.setItem('agDark', JSON.stringify(dark)); }, [dark]);
  useEffect(() => { localStorage.setItem('agPinned', JSON.stringify([...pinned])); }, [pinned]);
  useEffect(() => { localStorage.setItem('agCols', JSON.stringify([...cols])); }, [cols]);

  const commands: Cmd[] = useMemo(() => [
    { id: 'refresh', label: '새로고침', shortcut: 'R', action: () => fetch_(), cat: '액션' },
    { id: 'dark', label: `다크모드 ${dark ? 'OFF' : 'ON'}`, shortcut: 'D', action: () => setDark(!dark), cat: '테마' },
    { id: 'compare', label: `비교 ${compare ? 'OFF' : 'ON'}`, shortcut: 'C', action: () => setCompare(!compare), cat: '뷰' },
    { id: 'full', label: `전체화면 ${full ? 'OFF' : 'ON'}`, shortcut: 'F', action: () => setFull(!full), cat: '뷰' },
    { id: 'cols', label: '컬럼 설정', action: () => setShowCols(true), cat: '설정' },
    { id: 'save', label: '필터 저장', shortcut: '⌘S', action: () => setShowSave(true), cat: '필터' },
    { id: 'settings', label: '설정', shortcut: ',', action: () => setShowSet(true), cat: '설정' },
    { id: 'csv', label: 'CSV', action: () => exp('csv'), cat: '내보내기' },
    { id: 'json', label: 'JSON', action: () => exp('json'), cat: '내보내기' },
    { id: 'report', label: '리포트', action: () => exp('report'), cat: '내보내기' },
    ...['table', 'timeline', 'session', 'heatmap', 'analytics', 'realtime', 'score', 'spark'].map(m => ({ id: `v-${m}`, label: `${m} 뷰`, action: () => setMode(m as any), cat: '뷰' })),
    ...['all', 'failed', 'slow'].map(t => ({ id: `t-${t}`, label: `${t === 'all' ? '전체' : t === 'failed' ? '실패' : '느림'}`, action: () => setTab(t as any), cat: '탭' })),
    ...AGENTS.map(a => ({ id: `f-${a}`, label: `${a} 필터`, action: () => setFilter(p => ({ ...p, agentType: p.agentType === a ? '' : a })), cat: '에이전트' })),
  ], [dark, compare, full]);

  const fcmds = useMemo(() => { const q = cmdQ.toLowerCase(); return cmdQ ? commands.filter(c => c.label.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q)) : commands; }, [commands, cmdQ]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target !== cmdRef.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmd(true); setTimeout(() => cmdRef.current?.focus(), 50); }
      if (e.key === 'Escape') { setSelected(null); setChecked(new Set()); setCompare(false); setShowSet(false); setCmd(false); setQuickAct(null); setShowCols(false); }
      if (!cmd && !e.ctrlKey) {
        if (e.key === '/') { e.preventDefault(); sRef.current?.focus(); }
        if (e.key === 'r') { e.preventDefault(); fetch_(); }
        if (e.key === 'd') setDark(!dark);
        if (e.key === 'c') setCompare(!compare);
        if (e.key === 'f') setFull(!full);
        if (e.key === ',') setShowSet(true);
        if (e.key === 't') setMode(m => { const ms = ['table', 'timeline', 'session', 'heatmap', 'analytics', 'realtime', 'score', 'spark'] as const; return ms[(ms.indexOf(m) + 1) % ms.length]; });
        if (e.key === '1') setTab('all'); if (e.key === '2') setTab('failed'); if (e.key === '3') setTab('slow');
        // Table keyboard navigation
        if (mode === 'table' && logs.length > 0) {
          if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, logs.length - 1)); }
          if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && focusIdx >= 0) setSelected(logs[focusIdx]);
          if (e.key === ' ' && focusIdx >= 0) { e.preventDefault(); const l = logs[focusIdx]; setChecked(p => { const n = new Set(p); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; }); }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); setShowSave(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dark, compare, full, cmd, mode, focusIdx]);

  const fetch_ = useCallback(async () => {
    if (!auto) setLoading(true);
    try {
      let r;
      if (tab === 'failed') { r = await agentApi.getFailedLogs(7, 50); setData({ logs: r.data, total: r.data.length, page: 1, pageSize: 50, hasMore: false }); if (r.data.length > 0 && !auto) notify(`${r.data.length}개 실패`, 'error'); }
      else if (tab === 'slow') { r = await agentApi.getSlowLogs(3000, 50); setData({ logs: r.data, total: r.data.length, page: 1, pageSize: 50, hasMore: false }); }
      else { r = await agentApi.searchLogs({ agentType: filter.agentType || undefined, success: filter.success, fromDate: filter.fromDate || undefined, toDate: filter.toDate || undefined, page: filter.page, pageSize: filter.pageSize }); setData(r.data); }
      const hr = await agentApi.getHourlyTrend(); setHourly(hr.data || []);
      if (alarm.on && r.data?.length > 0) { const ls = Array.isArray(r.data) ? r.data : r.data.logs; const sr = Math.round((ls.filter((l: Log) => l.success).length / ls.length) * 100); const avg = Math.round(ls.reduce((a: number, b: Log) => a + b.executionMs, 0) / ls.length); if (sr < alarm.sr) notify(`⚠️ SR ${sr}%`, 'warning'); if (avg > alarm.ms) notify(`🐢 ${avg}ms`, 'warning'); }
      if (mode === 'realtime') { const nl = Array.isArray(r.data) ? r.data : r.data.logs; setReal(p => [...nl.slice(0, 5), ...p].slice(0, 50)); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filter, tab, auto, alarm, mode]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { if (!auto) return; const i = window.setInterval(fetch_, intv * 1000); return () => window.clearInterval(i); }, [auto, fetch_, intv]);

  const notify = (msg: string, type: string) => { const id = Date.now().toString(); setNotifs(p => [...p, { id, msg, type }]); setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 4000); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); notify('복사됨', 'success'); };
  const saveF = () => { if (!fname.trim()) return; const n = { name: fname, filter: { ...filter, tab, search }, createdAt: new Date().toISOString() }; const u = [...saved.filter(f => f.name !== fname), n]; setSaved(u); localStorage.setItem('agFilters', JSON.stringify(u)); setShowSave(false); setFname(''); notify(`저장됨`, 'success'); };
  const loadF = (f: SavedFilter) => { setFilter(f.filter); if (f.filter.tab) setTab(f.filter.tab); if (f.filter.search) setSearch(f.filter.search); notify(`적용`, 'info'); };
  const delF = (n: string) => { const u = saved.filter(f => f.name !== n); setSaved(u); localStorage.setItem('agFilters', JSON.stringify(u)); };
  const togglePin = (a: string) => setPinned(p => { const n = new Set(p); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const toggleCmp = (a: string) => setCmpList(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const toggleCol = (c: Col) => setCols(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const logs = useMemo(() => {
    if (!data?.logs) return [];
    let l = data.logs;
    if (search) { const q = search.toLowerCase(); l = l.filter(x => x.agentType.toLowerCase().includes(q) || x.sessionId.toLowerCase().includes(q) || x.error?.toLowerCase().includes(q)); }
    if (compare && cmpList.length > 0) l = l.filter(x => cmpList.includes(x.agentType));
    if (pinned.size > 0) l = [...l].sort((a, b) => (pinned.has(a.agentType) ? 0 : 1) - (pinned.has(b.agentType) ? 0 : 1));
    return l;
  }, [data?.logs, search, compare, cmpList, pinned]);

  const sessions = useMemo(() => { const g: Record<string, Log[]> = {}; logs.forEach(l => { if (!g[l.sessionId]) g[l.sessionId] = []; g[l.sessionId].push(l); }); return Object.entries(g).sort((a, b) => new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime()); }, [logs]);
  const heatmap = useMemo(() => { const m: Record<string, Record<number, { cnt: number; sr: number }>> = {}; AGENTS.forEach(a => { m[a] = {}; for (let h = 0; h < 24; h++) m[a][h] = { cnt: 0, sr: 100 }; }); logs.forEach(l => { const h = new Date(l.createdAt).getHours(); if (m[l.agentType]) m[l.agentType][h].cnt++; }); logs.forEach(l => { const h = new Date(l.createdAt).getHours(); if (!m[l.agentType]) return; const all = logs.filter(x => x.agentType === l.agentType && new Date(x.createdAt).getHours() === h); m[l.agentType][h].sr = all.length > 0 ? Math.round((all.filter(x => x.success).length / all.length) * 100) : 100; }); return m; }, [logs]);

  // Sparkline data by agent
  const sparkData = useMemo(() => {
    const d: Record<string, number[]> = {};
    AGENTS.forEach(a => d[a] = Array(24).fill(0));
    logs.forEach(l => { const h = new Date(l.createdAt).getHours(); if (d[l.agentType]) d[l.agentType][h]++; });
    return d;
  }, [logs]);

  const stats = useMemo(() => {
    if (!logs.length) return null;
    const ok = logs.filter(l => l.success).length, fail = logs.length - ok;
    const avg = Math.round(logs.reduce((a, b) => a + b.executionMs, 0) / logs.length);
    const toks = logs.reduce((a, b) => a + b.tokenCount, 0);
    const by: Record<string, { cnt: number; ok: number; ms: number; toks: number; min: number; max: number }> = {};
    logs.forEach(l => { if (!by[l.agentType]) by[l.agentType] = { cnt: 0, ok: 0, ms: 0, toks: 0, min: Infinity, max: 0 }; const a = by[l.agentType]; a.cnt++; if (l.success) a.ok++; a.ms += l.executionMs; a.toks += l.tokenCount; a.min = Math.min(a.min, l.executionMs); a.max = Math.max(a.max, l.executionMs); });
    const errs: Record<string, number> = {}; logs.filter(l => l.error).forEach(l => { const k = l.error!.substring(0, 40); errs[k] = (errs[k] || 0) + 1; });
    const topErr = Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sorted = [...logs].sort((a, b) => a.executionMs - b.executionMs);
    const p = (pct: number) => sorted[Math.floor(sorted.length * pct)]?.executionMs || 0;
    const srS = Math.min(100, Math.round((ok / logs.length) * 100));
    const latS = Math.max(0, 100 - Math.round((avg / 50)));
    const errS = Math.max(0, 100 - Object.keys(errs).length * 10);
    const score = Math.round((srS * 0.5 + latS * 0.3 + errS * 0.2));
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    return { ok, fail, avg, toks, by, topErr, p50: p(0.5), p90: p(0.9), p99: p(0.99), score, grade, srS, latS, errS };
  }, [logs]);

  const fmtD = (d: string) => new Date(d).toLocaleString('ko-KR');
  const fmtT = (d: string) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtMs = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  const latC = (ms: number) => ms < 1000 ? 'text-green-600' : ms < 3000 ? 'text-yellow-600' : ms < 5000 ? 'text-orange-600' : 'text-red-600';
  const gradeC = (g: string) => g === 'A' ? 'text-green-600' : g === 'B' ? 'text-blue-600' : g === 'C' ? 'text-yellow-600' : g === 'D' ? 'text-orange-600' : 'text-red-600';
  const runCmd = (c: Cmd) => { c.action(); setCmd(false); setCmdQ(''); };

  const exp = (f: 'csv' | 'json' | 'report') => {
    const l = checked.size > 0 ? logs.filter(x => checked.has(x.id)) : logs;
    if (!l.length) return;
    let c: string, t: string, e: string;
    if (f === 'report' && stats) { c = `# 에이전트 분석\n${fmtD(new Date().toISOString())}\n\n## ${stats.grade} (${stats.score}/100)\n\n## 요약\n- ${l.length}건 (성공 ${stats.ok}, 실패 ${stats.fail})\n- P50: ${stats.p50}ms / P90: ${stats.p90}ms / P99: ${stats.p99}ms`; t = 'text/markdown'; e = 'md'; }
    else if (f === 'csv') { c = '\ufeff' + [['ID', '시간', '에이전트', '상태', 'ms', '토큰'], ...l.map(x => [x.id, x.createdAt, x.agentType, x.success ? 'O' : 'X', x.executionMs, x.tokenCount])].map(r => r.join(',')).join('\n'); t = 'text/csv'; e = 'csv'; }
    else { c = JSON.stringify({ exportedAt: new Date().toISOString(), stats, logs: l }, null, 2); t = 'application/json'; e = 'json'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: t })); a.download = `agent-${f}-${new Date().toISOString().slice(0, 10)}.${e}`; a.click();
  };

  const retry = async (l: Log) => { notify(`${l.agentType}...`, 'info'); try { await agentApi.executeWithRetry(l.agentType, l.input?.content || '', undefined); notify('완료', 'success'); fetch_(); } catch { notify('실패', 'error'); } };
  const batchRetry = async () => { for (const l of logs.filter(x => checked.has(x.id) && !x.success)) await retry(l); };

  const th = dark ? { bg: 'bg-gray-900', card: 'bg-gray-800 border-gray-700', text: 'text-gray-100', muted: 'text-gray-400', input: 'bg-gray-800 border-gray-600', hov: 'hover:bg-gray-700' } : { bg: 'bg-gray-50', card: 'bg-white border-gray-200', text: 'text-gray-900', muted: 'text-gray-600', input: 'bg-white', hov: 'hover:bg-gray-50' };
  const pad = density === 'compact' ? 'py-0.5 px-1' : density === 'relaxed' ? 'py-2 px-3' : 'py-1 px-2';

  // Mini sparkline component
  const Spark = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data) || 1;
    return <div className="flex items-end gap-px h-4">{data.map((v, i) => <div key={i} className={`w-1 ${color}`} style={{ height: `${Math.max((v / max) * 100, v > 0 ? 10 : 0)}%` }}></div>)}</div>;
  };

  return (
    <div className={`${full ? 'fixed inset-0 z-40' : ''} min-h-screen p-3 space-y-2 ${th.bg} ${th.text} transition-colors text-xs`}>
      {/* Notifs */}
      <div className="fixed top-2 right-2 z-50 space-y-1">{notifs.map(n => <div key={n.id} className={`px-2 py-1 rounded shadow-lg text-[10px] animate-slide-in ${n.type === 'error' ? 'bg-red-600 text-white' : n.type === 'warning' ? 'bg-yellow-500 text-white' : n.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{n.msg}</div>)}</div>

      {/* Command Palette */}
      {cmd && <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50" onClick={() => setCmd(false)}><div className={`w-80 rounded-lg shadow-2xl ${th.card} overflow-hidden`} onClick={e => e.stopPropagation()}><div className="p-2 border-b"><input ref={cmdRef} type="text" placeholder="명령 검색..." value={cmdQ} onChange={e => setCmdQ(e.target.value)} className={`w-full px-2 py-1 border rounded text-sm ${th.input}`} onKeyDown={e => { if (e.key === 'Enter' && fcmds.length > 0) runCmd(fcmds[0]); }} /></div><div className="max-h-56 overflow-auto">{Object.entries(fcmds.reduce((a, c) => { (a[c.cat] = a[c.cat] || []).push(c); return a; }, {} as Record<string, Cmd[]>)).map(([cat, cs]) => <div key={cat}><div className={`px-2 py-0.5 text-[9px] ${th.muted}`}>{cat}</div>{cs.map(c => <button key={c.id} onClick={() => runCmd(c)} className={`w-full px-2 py-1 text-left text-[11px] ${th.hov} flex justify-between`}><span>{c.label}</span>{c.shortcut && <span className={`text-[9px] ${th.muted}`}>{c.shortcut}</span>}</button>)}</div>)}</div></div></div>}

      {/* Quick Action Menu */}
      {quickAct && <div className="fixed z-50" style={{ left: quickAct.x, top: quickAct.y }} onClick={() => setQuickAct(null)}><div className={`rounded shadow-xl border ${th.card} py-1 min-w-32`}><button onClick={() => { copy(quickAct.log.id); setQuickAct(null); }} className={`w-full px-3 py-1 text-left text-[10px] ${th.hov}`}>📋 ID 복사</button><button onClick={() => { copy(quickAct.log.sessionId); setQuickAct(null); }} className={`w-full px-3 py-1 text-left text-[10px] ${th.hov}`}>🔗 세션ID 복사</button><button onClick={() => { copy(JSON.stringify(quickAct.log, null, 2)); setQuickAct(null); }} className={`w-full px-3 py-1 text-left text-[10px] ${th.hov}`}>📄 JSON 복사</button>{!quickAct.log.success && <button onClick={() => { retry(quickAct.log); setQuickAct(null); }} className={`w-full px-3 py-1 text-left text-[10px] ${th.hov} text-orange-600`}>↻ 재시도</button>}<button onClick={() => { setSelected(quickAct.log); setQuickAct(null); }} className={`w-full px-3 py-1 text-left text-[10px] ${th.hov}`}>🔍 상세보기</button></div></div>}

      {/* Column Settings */}
      {showCols && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCols(false)}><div className={`p-3 rounded-lg ${th.card} w-48`} onClick={e => e.stopPropagation()}><h3 className="font-bold text-sm mb-2">컬럼 설정</h3><div className="space-y-1">{COLS.map(c => <label key={c} className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={cols.has(c)} onChange={() => toggleCol(c)} />{c}</label>)}</div><button onClick={() => setShowCols(false)} className="mt-2 w-full bg-blue-600 text-white rounded py-1 text-xs">닫기</button></div></div>}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div><h1 className="text-sm font-bold">에이전트 로그</h1><div className="flex gap-1 mt-0.5 text-[7px]">{['⌘K', '/', 'R', 'T', 'D', 'F', 'J/K'].map(k => <span key={k} className={`px-0.5 rounded ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>{k}</span>)}</div></div>
        <div className="flex items-center gap-1">
          {saved.length > 0 && <select onChange={e => { const f = saved.find(x => x.name === e.target.value); if (f) loadF(f); }} className={`text-[9px] py-0.5 px-0.5 border rounded ${th.input}`}><option value="">📁</option>{saved.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</select>}
          <button onClick={() => setCmd(true)} className={`px-1 py-0.5 border rounded text-[9px] ${th.hov}`}>⌘K</button>
          <input ref={sRef} type="text" placeholder="/" value={search} onChange={e => setSearch(e.target.value)} className={`px-1 py-0.5 border rounded text-[9px] w-16 focus:w-24 ${th.input}`} />
          <div className="flex items-center gap-0.5 text-[9px]"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} className="w-3 h-3" /><select value={intv} onChange={e => setIntv(+e.target.value)} className={`py-0.5 px-0.5 border rounded text-[9px] ${th.input}`}><option value="3">3</option><option value="5">5</option><option value="10">10</option></select>{auto && <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>}</div>
          <div className="flex border rounded overflow-hidden text-[8px]"><button onClick={() => exp('csv')} className={`px-1 py-0.5 ${th.hov}`}>CSV</button><button onClick={() => exp('json')} className={`px-1 py-0.5 ${th.hov}`}>JSON</button><button onClick={() => exp('report')} className={`px-1 py-0.5 ${th.hov}`}>📄</button></div>
          <select value={density} onChange={e => setDensity(e.target.value as any)} className={`text-[9px] py-0.5 px-0.5 border rounded ${th.input}`}><option value="compact">촘촘</option><option value="normal">보통</option><option value="relaxed">여유</option></select>
          <button onClick={() => setShowCols(true)} className={`px-1 py-0.5 border rounded text-[9px] ${th.hov}`}>≡</button>
          <button onClick={() => setShowSet(true)} className={`px-1 py-0.5 border rounded text-[9px] ${th.hov}`}>⚙️</button>
          <button onClick={() => setDark(!dark)} className={`px-1 py-0.5 border rounded text-[9px] ${th.hov}`}>{dark ? '☀' : '🌙'}</button>
          <button onClick={() => setFull(!full)} className={`px-1 py-0.5 border rounded text-[9px] ${th.hov}`}>{full ? '⊙' : '⛶'}</button>
          <button onClick={fetch_} disabled={loading} className="px-1 py-0.5 bg-blue-600 text-white rounded text-[9px]">{loading ? '⏳' : '↻'}</button>
        </div>
      </div>

      {/* Score Badge */}
      {stats && <div className="flex items-center gap-2"><div className={`px-2 py-0.5 rounded ${th.card} flex items-center gap-1`}><span className={`text-base font-bold ${gradeC(stats.grade)}`}>{stats.grade}</span><span className="text-[9px]">{stats.score}</span></div><div className="flex gap-1 text-[8px]"><span className="px-1 py-0.5 bg-green-100 text-green-800 rounded">SR{stats.srS}</span><span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded">LAT{stats.latS}</span><span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded">ERR{stats.errS}</span></div></div>}

      {/* Stats */}
      {stats && <div className="grid grid-cols-7 gap-1">{[{ l: '총', v: logs.length }, { l: 'OK', v: stats.ok, c: 'text-green-600' }, { l: 'NG', v: stats.fail, c: 'text-red-600' }, { l: '평균', v: fmtMs(stats.avg), c: latC(stats.avg) }, { l: 'P50', v: fmtMs(stats.p50), c: latC(stats.p50) }, { l: 'P90', v: fmtMs(stats.p90), c: latC(stats.p90) }, { l: 'P99', v: fmtMs(stats.p99), c: latC(stats.p99) }].map((s, i) => <div key={i} className={`${pad} rounded border ${th.card}`}><div className={`text-[7px] ${th.muted}`}>{s.l}</div><div className={`text-sm font-bold ${s.c || ''}`}>{s.v}</div></div>)}</div>}

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-0.5">{[['all', '전체'], ['failed', '🔴'], ['slow', '🐢']].map(([k, l]) => <button key={k} onClick={() => setTab(k as any)} className={`px-1 py-0.5 rounded text-[9px] ${tab === k ? 'bg-blue-600 text-white' : th.card}`}>{l}</button>)}</div>
        <div className="flex items-center gap-1">
          {checked.size > 0 && <><span className="text-[8px] text-blue-600">{checked.size}</span><button onClick={batchRetry} className="text-[8px] text-orange-600">再</button><button onClick={() => setChecked(new Set())} className="text-[8px]">×</button></>}
          <button onClick={() => setCompare(!compare)} className={`text-[8px] ${compare ? 'text-blue-600' : ''}`}>🔀</button>
          <div className="flex border rounded overflow-hidden text-[7px]">{[['table', '📋'], ['timeline', '⏱'], ['session', '🔗'], ['heatmap', '🔥'], ['analytics', '📊'], ['realtime', '🔴'], ['score', '🏆'], ['spark', '⚡']].map(([m, i]) => <button key={m} onClick={() => setMode(m as any)} className={`px-1 py-0.5 ${mode === m ? 'bg-blue-600 text-white' : th.card}`}>{i}</button>)}</div>
        </div>
      </div>

      {/* Sparkline View */}
      {mode === 'spark' && <div className={`p-2 rounded border ${th.card}`}><h3 className="text-[10px] font-medium mb-2">⚡ 24시간 스파크라인</h3><div className="space-y-1">{AGENTS.map(a => <div key={a} className="flex items-center gap-2"><span className={`w-8 text-[8px] px-0.5 rounded ${CLR[a]}`}>{a.slice(0, 3)}</span><Spark data={sparkData[a]} color={BAR[a]} /><span className="text-[8px] text-gray-500">{sparkData[a].reduce((x, y) => x + y, 0)}</span></div>)}</div></div>}

      {/* Table */}
      {mode === 'table' && <div className={`rounded border overflow-hidden ${th.card}`}><table ref={tblRef} className="w-full"><thead className={dark ? 'bg-gray-700' : 'bg-gray-50'}><tr><th className={`${pad} w-4`}><input type="checkbox" checked={checked.size === logs.length && logs.length > 0} onChange={() => setChecked(checked.size === logs.length ? new Set() : new Set(logs.map(l => l.id)))} className="w-3 h-3" /></th>{cols.has('time') && <th className={`${pad} text-left text-[9px]`}>시간</th>}{cols.has('agent') && <th className={`${pad} text-left text-[9px]`}>에이전트</th>}{cols.has('status') && <th className={`${pad} text-left text-[9px]`}>상태</th>}{cols.has('ms') && <th className={`${pad} text-left text-[9px]`}>ms</th>}{cols.has('token') && <th className={`${pad} text-left text-[9px]`}>토큰</th>}{cols.has('session') && <th className={`${pad} text-left text-[9px]`}>세션</th>}{cols.has('actions') && <th className={`${pad}`}></th>}</tr></thead><tbody className="divide-y">{logs.map((l, i) => <tr key={l.id} className={`${th.hov} ${!l.success ? (dark ? 'bg-red-900/30' : 'bg-red-50') : ''} ${checked.has(l.id) ? (dark ? 'bg-blue-900/30' : 'bg-blue-50') : ''} ${pinned.has(l.agentType) ? 'border-l-2 border-blue-500' : ''} ${focusIdx === i ? 'ring-1 ring-blue-400' : ''}`} onContextMenu={e => { e.preventDefault(); setQuickAct({ x: e.clientX, y: e.clientY, log: l }); }}><td className={pad}><input type="checkbox" checked={checked.has(l.id)} onChange={() => { const n = new Set(checked); n.has(l.id) ? n.delete(l.id) : n.add(l.id); setChecked(n); }} className="w-3 h-3" /></td>{cols.has('time') && <td className={`${pad} text-[9px]`}>{fmtT(l.createdAt)}</td>}{cols.has('agent') && <td className={pad}><span className={`px-1 py-0.5 text-[8px] rounded ${CLR[l.agentType]}`}>{l.agentType}</span></td>}{cols.has('status') && <td className={pad}>{l.success ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>}{cols.has('ms') && <td className={pad}><span className={`font-mono ${latC(l.executionMs)}`}>{fmtMs(l.executionMs)}</span></td>}{cols.has('token') && <td className={`${pad} font-mono`}>{l.tokenCount}</td>}{cols.has('session') && <td className={`${pad} text-[8px] font-mono cursor-pointer`} onClick={() => copy(l.sessionId)}>{l.sessionId.slice(0, 8)}...</td>}{cols.has('actions') && <td className={`${pad} flex gap-0.5`}><button onClick={() => setSelected(l)} className="text-blue-600 text-[8px]">📋</button>{!l.success && <button onClick={() => retry(l)} className="text-orange-600 text-[8px]">↻</button>}</td>}</tr>)}</tbody></table>{logs.length === 0 && <div className="p-3 text-center text-[10px]">결과 없음</div>}<div className="text-[8px] text-gray-500 px-2 py-1 border-t">💡 J/K: 이동 | Enter: 상세 | Space: 선택 | 우클릭: 퀵메뉴</div></div>}

      {/* Other views... (keeping them shorter for space) */}
      {mode === 'timeline' && <div className={`p-2 rounded border ${th.card}`}><div className="relative ml-2"><div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300"></div><div className="space-y-0.5">{logs.slice(0, 30).map(l => <div key={l.id} className="relative flex gap-1 items-start"><div className={`absolute -left-[3px] w-2 h-2 rounded-full ${l.success ? 'bg-green-500' : 'bg-red-500'}`}></div><div className="text-[8px] w-10">{fmtT(l.createdAt)}</div><div className={`flex-1 ${pad} rounded border text-[9px] ${th.hov} ${!l.success ? 'bg-red-50' : ''} cursor-pointer`} onClick={() => setSelected(l)} onContextMenu={e => { e.preventDefault(); setQuickAct({ x: e.clientX, y: e.clientY, log: l }); }}><span className={`px-1 py-0.5 rounded ${CLR[l.agentType]}`}>{l.agentType.slice(0, 3)}</span> <span className={`font-mono ${latC(l.executionMs)}`}>{fmtMs(l.executionMs)}</span></div></div>)}</div></div></div>}
      {mode === 'session' && <div className="space-y-1">{sessions.slice(0, 20).map(([sid, ls]) => <div key={sid} className={`rounded border overflow-hidden ${th.card}`}><div className={`px-2 py-0.5 flex justify-between ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}><span className="font-mono text-[8px]">{sid.slice(0, 8)}... ({ls.length})</span><span className={ls.every(l => l.success) ? 'text-green-600' : 'text-red-600'}>{ls.filter(l => l.success).length}/{ls.length}</span></div><div className="p-1 flex items-center gap-0.5 overflow-x-auto">{ls.map((l, i) => <><div key={l.id} className={`px-1 py-0.5 rounded border text-[8px] cursor-pointer ${!l.success ? 'bg-red-50' : ''}`} onClick={() => setSelected(l)}><div className="font-medium">{l.agentType.slice(0, 3)}</div><div className={`font-mono ${latC(l.executionMs)}`}>{fmtMs(l.executionMs)}</div></div>{i < ls.length - 1 && <span className="text-[8px]">→</span>}</>)}</div></div>)}</div>}
      {mode === 'heatmap' && <div className={`p-2 rounded border ${th.card} overflow-x-auto`}><table className="w-full text-[7px]"><thead><tr><th></th>{[...Array(24)].map((_, h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{AGENTS.map(a => <tr key={a}><td className="font-medium pr-1">{a.slice(0, 3)}</td>{[...Array(24)].map((_, h) => { const c = heatmap[a]?.[h]; return <td key={h} className={`px-0.5 text-center ${c?.cnt > 0 ? (c.sr >= 80 ? 'bg-green-200' : c.sr >= 50 ? 'bg-yellow-200' : 'bg-red-200') : (dark ? 'bg-gray-700' : 'bg-gray-100')}`}>{c?.cnt > 0 ? c.cnt : ''}</td>; })}</tr>)}</tbody></table></div>}
      {mode === 'analytics' && stats && <div className="grid grid-cols-2 gap-1">{[<div key="a" className={`p-2 rounded border ${th.card}`}><h3 className="text-[9px] font-medium mb-1">에이전트별</h3><div className="space-y-0.5">{Object.entries(stats.by).map(([a, d]) => <div key={a} className="flex items-center gap-1"><span className={`w-7 text-[7px] px-0.5 rounded ${CLR[a]}`}>{a.slice(0, 3)}</span><div className="flex-1 h-1 bg-gray-200 rounded"><div className={`h-full rounded ${BAR[a]}`} style={{ width: `${(d.ok / d.cnt) * 100}%` }}></div></div><span className="text-[7px] w-5">{Math.round((d.ok / d.cnt) * 100)}%</span></div>)}</div></div>,<div key="e" className={`p-2 rounded border ${th.card}`}><h3 className="text-[9px] font-medium mb-1">에러</h3>{stats.topErr.length > 0 ? <div className="space-y-0.5">{stats.topErr.map(([e, c], i) => <div key={i} className="flex gap-1 text-[8px]"><span className="px-0.5 bg-red-100 text-red-700 rounded">{c}</span><span className="truncate">{e}</span></div>)}</div> : <div className="text-center text-green-600 py-2">✓</div>}</div>]}</div>}
      {mode === 'realtime' && <div className={`p-2 rounded border ${th.card}`}><h3 className="text-[9px] font-medium mb-1">🔴 실시간</h3><div className="space-y-0.5">{real.map((l, i) => <div key={`${l.id}-${i}`} className={`flex items-center gap-1 ${pad} rounded text-[9px] animate-fade-in ${!l.success ? 'bg-red-50' : 'bg-gray-50'}`}><span className="w-12 text-[8px] text-gray-500">{fmtT(l.createdAt)}</span><span className={`px-1 py-0.5 rounded ${CLR[l.agentType]}`}>{l.agentType.slice(0, 3)}</span>{l.success ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}<span className={`font-mono ${latC(l.executionMs)}`}>{fmtMs(l.executionMs)}</span></div>)}</div></div>}
      {mode === 'score' && stats && <div className={`p-3 rounded border ${th.card}`}><div className="grid grid-cols-3 gap-3"><div className="text-center"><div className={`text-4xl font-bold ${gradeC(stats.grade)}`}>{stats.grade}</div><div className={`text-2xl font-bold ${gradeC(stats.grade)}`}>{stats.score}/100</div></div><div className="space-y-2">{[['성공률', stats.srS, 'bg-green-500'], ['지연', stats.latS, 'bg-blue-500'], ['에러', stats.errS, 'bg-purple-500']].map(([l, v, c]) => <div key={l as string}><div className="flex justify-between text-[9px]"><span>{l}</span><span>{v}</span></div><div className="h-2 bg-gray-200 rounded"><div className={`h-full rounded ${c}`} style={{ width: `${v}%` }}></div></div></div>)}</div><div className="text-[9px] space-y-0.5"><div className="font-medium">권장</div>{stats.ok / logs.length < 0.8 && <div>• SR→80%</div>}{stats.avg > 3000 && <div>• LAT→3s</div>}{stats.topErr.length > 0 && <div>• 에러 {stats.topErr.length}개</div>}{stats.ok / logs.length >= 0.8 && stats.avg <= 3000 && stats.topErr.length === 0 && <div className="text-green-600">✓ 양호</div>}</div></div></div>}

      {/* Modals */}
      {showSave && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSave(false)}><div className={`p-3 rounded-lg ${th.card} w-48`} onClick={e => e.stopPropagation()}><h3 className="font-bold text-xs mb-2">💾 저장</h3><input type="text" placeholder="이름" value={fname} onChange={e => setFname(e.target.value)} className={`w-full border rounded px-2 py-1 text-[10px] mb-2 ${th.input}`} /><div className="flex gap-1"><button onClick={saveF} className="flex-1 bg-blue-600 text-white rounded py-1 text-[10px]">저장</button><button onClick={() => setShowSave(false)} className="flex-1 border rounded py-1 text-[10px]">취소</button></div></div></div>}
      {showSet && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSet(false)}><div className={`p-3 rounded-lg ${th.card} w-60`} onClick={e => e.stopPropagation()}><h3 className="font-bold text-xs mb-2">⚙️ 설정</h3><div className="space-y-2"><div><div className="text-[9px] font-medium mb-1">🔔 알람</div><label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={alarm.on} onChange={e => setAlarm(p => ({ ...p, on: e.target.checked }))} />ON</label><div className="grid grid-cols-2 gap-1 mt-1"><input type="number" placeholder="SR%" value={alarm.sr} onChange={e => setAlarm(p => ({ ...p, sr: +e.target.value }))} className={`border rounded px-1 py-0.5 text-[9px] ${th.input}`} /><input type="number" placeholder="ms" value={alarm.ms} onChange={e => setAlarm(p => ({ ...p, ms: +e.target.value }))} className={`border rounded px-1 py-0.5 text-[9px] ${th.input}`} /></div></div><div><div className="text-[9px] font-medium mb-1">📌 고정</div><div className="flex flex-wrap gap-0.5">{AGENTS.map(a => <button key={a} onClick={() => togglePin(a)} className={`px-1 py-0.5 text-[8px] rounded border ${pinned.has(a) ? 'bg-blue-600 text-white' : ''}`}>{a.slice(0, 3)}</button>)}</div></div><div><div className="text-[9px] font-medium mb-1">📁 필터</div>{saved.length > 0 ? <div className="space-y-0.5">{saved.map(f => <div key={f.name} className="flex justify-between text-[9px]"><span>{f.name}</span><button onClick={() => delF(f.name)} className="text-red-500">×</button></div>)}</div> : <span className="text-[9px] text-gray-500">없음</span>}</div></div><button onClick={() => { localStorage.setItem('agAlarm', JSON.stringify(alarm)); setShowSet(false); notify('저장됨', 'success'); }} className="mt-2 w-full bg-blue-600 text-white rounded py-1 text-[10px]">저장</button></div></div>}
      {selected && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelected(null)}><div className={`rounded-lg shadow-xl max-w-xs w-full max-h-[80vh] overflow-auto m-3 ${th.card} ${th.text}`} onClick={e => e.stopPropagation()}><div className="p-2 border-b flex justify-between sticky top-0 bg-inherit"><span className="font-bold text-[11px]">상세</span><div className="flex gap-1"><button onClick={() => copy(JSON.stringify(selected, null, 2))} className="text-[9px]">📋</button>{!selected.success && <button onClick={() => { retry(selected); setSelected(null); }} className="px-1 py-0.5 bg-orange-500 text-white text-[9px] rounded">↻</button>}<button onClick={() => setSelected(null)}>×</button></div></div><div className="p-2 space-y-1 text-[9px]"><div className="grid grid-cols-3 gap-2"><div><span className={th.muted}>에이전트</span><div className={`inline-block px-1 py-0.5 rounded ${CLR[selected.agentType]}`}>{selected.agentType}</div></div><div><span className={th.muted}>상태</span><div className={selected.success ? 'text-green-600' : 'text-red-600'}>{selected.success ? '✓' : '✗'}</div></div><div><span className={th.muted}>ms</span><div className={`font-mono ${latC(selected.executionMs)}`}>{fmtMs(selected.executionMs)}</div></div></div>{selected.error && <div><span className={th.muted}>에러</span><div className="bg-red-50 border border-red-200 rounded p-1 text-red-800 font-mono text-[8px] whitespace-pre-wrap">{selected.error}</div></div>}{selected.input && <div><span className={th.muted}>입력</span><pre className={`rounded p-1 text-[8px] overflow-auto max-h-16 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>{JSON.stringify(selected.input, null, 2)}</pre></div>}{selected.output && <div><span className={th.muted}>출력</span><pre className={`rounded p-1 text-[8px] overflow-auto max-h-16 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>{JSON.stringify(selected.output, null, 2)}</pre></div>}</div></div></div>}

      <style jsx>{`@keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slide-in { animation: slide-in 0.3s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.5s ease-out; }`}</style>
    </div>
  );
}
