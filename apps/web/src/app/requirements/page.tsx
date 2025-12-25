'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrustBadge } from '@/components/requirements/TrustBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RequirementsPage() {
    const router = useRouter();
    const [requirements, setRequirements] = useState<any[]>([]);

    useEffect(() => {
        fetchReqs();
    }, []);

    const fetchReqs = async () => {
        try {
            const res = await api.get('/requirements');
            // Backend returns { data: [], total: ... }
            const reqData = res.data.data || res.data; 
            setRequirements(Array.isArray(reqData) ? reqData : []);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="요건 정의 및 관리"
                description="비즈니스 요구사항을 등록하고 AI로 분석하여 명확한 기술 요건으로 발전시킵니다."
                steps={['워크스페이스', '요건 정의']}
            />

            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {/* Filters placeholders */}
                    <button className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                        전체 보기
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded">
                        검토 필요 (3)
                    </button>
                </div>

                <Link href="/requirements/new" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all hover:shadow-md">
                    <Plus className="h-4 w-4" /> 신규 요건 등록
                </Link>
            </div>

            <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-4 font-bold w-[120px]">코드 (Code)</th>
                            <th className="px-5 py-4 font-bold">요건 명 / 내용 미리보기</th>
                            <th className="px-5 py-4 font-bold w-[150px]">신뢰도 (Trust)</th>
                            <th className="px-5 py-4 font-bold w-[120px]">분류</th>
                            <th className="px-5 py-4 font-bold w-[120px]">최종 수정일</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Array.isArray(requirements) && requirements.map((req) => (
                            <tr 
                                key={req.id} 
                                className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                onClick={() => router.push(`/requirements/${req.id}`)}
                            >
                                <td className="px-5 py-4 font-medium text-slate-900 font-mono text-xs">{req.code}</td>
                                <td className="px-5 py-4">
                                    <div className="font-bold text-slate-800 mb-0.5">{req.title}</div>
                                    <div className="text-xs text-slate-500 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {req.content}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <TrustBadge
                                        score={req.trustScore?.overallScore || 0}
                                        status={req.maturity || 'DRAFT'} // Mapping maturity to status visual
                                    />
                                </td>
                                <td className="px-5 py-4 text-xs font-medium text-slate-600">
                                    {req.business?.name || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-5 py-4 text-xs text-slate-400">
                                    {new Date(req.updatedAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {requirements.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                                    등록된 요건이 없습니다. '신규 요건 등록' 버튼을 눌러 시작하세요.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

