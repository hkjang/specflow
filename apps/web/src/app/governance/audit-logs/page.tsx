
'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import { Calendar, User, FileText, Search, Activity, ShieldAlert } from 'lucide-react';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            // Using endpoint from Phase 7 (AuditController)
            const res = await api.get('/governance/audit-logs');
            setLogs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="감사 로그 (Audit Logs)"
                description="시스템에서 발생한 모든 주요 변경 사항과 접근 이력을 투명하게 기록하고 추적합니다."
                badgeText="SECURITY"
                steps={['운영 관리', '감사']}
            />

            {/* Filters (Mock) */}
            <div className="flex gap-2 items-center mb-6 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="작업자 ID 또는 리소스 코드로 검색..."
                        className="w-full pl-9 pr-4 py-2 text-sm border-none focus:ring-0 text-slate-700 placeholder:text-slate-300"
                    />
                </div>
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                <select className="text-sm border-none text-slate-600 font-medium focus:ring-0 cursor-pointer">
                    <option>모든 작업 (All Actions)</option>
                    <option>CREATE (생성)</option>
                    <option>UPDATE (수정)</option>
                    <option>DELETE (삭제)</option>
                    <option>APPROVE (승인)</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-4 font-bold w-[180px]">일시 (Time)</th>
                            <th className="px-5 py-4 font-bold w-[150px]">작업자 (Actor)</th>
                            <th className="px-5 py-4 font-bold w-[120px]">액션 (Action)</th>
                            <th className="px-5 py-4 font-bold">대상 리소스 & 변경 내용</th>
                            <th className="px-5 py-4 font-bold w-[100px]">상태</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 text-slate-500 text-xs font-mono">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 opacity-50" />
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-slate-700 font-medium">{log.userId || 'System'}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <ActionBadge action={log.action} />
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold text-slate-700 flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                                            {log.resourceType}: {log.resourceId}
                                        </div>
                                        {log.diff && (
                                            <div className="text-xs text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 w-fit max-w-md truncate">
                                                {JSON.stringify(log.diff)}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100">
                                        SUCCESS
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                    <ShieldAlert className="h-8 w-8 text-slate-200" />
                                    <span>기록된 감사 로그가 없습니다.</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ActionBadge({ action }: { action: string }) {
    let color = "bg-slate-100 text-slate-600 border-slate-200";
    if (action === 'CREATE') color = "bg-blue-50 text-blue-600 border-blue-100";
    if (action === 'UPDATE') color = "bg-amber-50 text-amber-600 border-amber-100";
    if (action === 'DELETE') color = "bg-rose-50 text-rose-600 border-rose-100";
    if (action === 'APPROVE') color = "bg-violet-50 text-violet-600 border-violet-100";

    return (
        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold border ${color}`}>
            {action}
        </span>
    );
}
