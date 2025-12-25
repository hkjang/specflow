'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Clock, User, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AuditLogsPage() {
    // Placeholder audit logs
    const [logs] = useState([
        { id: '1', action: 'CREATE', resource: 'Requirement', user: '홍길동', timestamp: new Date().toISOString(), details: '새 요건 생성: REQ-001' },
        { id: '2', action: 'UPDATE', resource: 'Requirement', user: '김철수', timestamp: new Date(Date.now() - 3600000).toISOString(), details: '요건 수정: REQ-002' },
        { id: '3', action: 'APPROVE', resource: 'Requirement', user: '이영희', timestamp: new Date(Date.now() - 7200000).toISOString(), details: '요건 승인: REQ-003' },
        { id: '4', action: 'DELETE', resource: 'Category', user: '박민수', timestamp: new Date(Date.now() - 86400000).toISOString(), details: '카테고리 삭제: Payment' },
    ]);

    const getActionBadge = (action: string) => {
        const colors: Record<string, string> = {
            CREATE: 'bg-green-100 text-green-700',
            UPDATE: 'bg-blue-100 text-blue-700',
            DELETE: 'bg-red-100 text-red-700',
            APPROVE: 'bg-purple-100 text-purple-700',
        };
        return colors[action] || 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="감사 로그 (Audit Logs)"
                description="시스템 내 모든 변경 이력과 사용자 활동을 추적합니다."
                badgeText="GOVERNANCE"
                steps={['관리자', '거버넌스', '감사 로그']}
            />

            {/* Search and Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="로그 검색..." className="pl-10" />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                    <Filter className="h-4 w-4" />
                    필터
                </button>
            </div>

            {/* Logs Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">최근 활동 로그</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <Badge className={getActionBadge(log.action)}>{log.action}</Badge>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-700">{log.details}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {log.resource}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {log.user}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
