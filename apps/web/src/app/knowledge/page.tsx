'use client';

import React, { useState } from 'react';
import { knowledgeApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

export default function KnowledgeDashboard() {
    // Mock Data for now as we don't have an aggregate endpoint yet
    const stats = {
        totalAssets: 1240,
        verifiedAssets: 350,
        avgTrustGrade: 78.5,
        estimatedROI: '$1.2M',
    };

    return (
        <div className="space-y-6 p-8">
            <PageHeader
                title="지식 운영 대시보드 (Knowledge Operation)"
                description="지식 자산의 현황과 가치를 한눈에 파악합니다."
                badgeText="DASHBOARD"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <KpiCard title="총 지식 자산 (Total Assets)" value={stats.totalAssets} change="전월 대비 +12%" />
                <KpiCard title="검증된 자산 (Verified)" value={stats.verifiedAssets} change="전체 중 28%" />
                <KpiCard title="평균 신뢰도 (Avg Trust)" value={stats.avgTrustGrade} change="+2.4 포인트" />
                <KpiCard title="예상 ROI (Est. ROI)" value={stats.estimatedROI} change="재사용률 기반 산정" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Maturity Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">자산 성숙도 모델 (Asset Maturity)</h2>
                    <div className="space-y-4">
                        <ProgressBar label="초안 (Draft - Initial)" value={45} color="bg-gray-300" />
                        <ProgressBar label="표준 (Standard - Reusable)" value={30} color="bg-blue-500" />
                        <ProgressBar label="검증됨 (Verified - Guaranteed)" value={25} color="bg-emerald-500" />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                        목표: 4분기까지 검증된 자산 40% 달성
                    </p>
                </div>

                {/* Top Assets */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">고가치 자산 TOP 5 (High-Value Assets)</h2>
                    <ul className="space-y-3">
                        <AssetItem name="User Authentication (OAuth2)" views={1200} adoption={15} grade={98} />
                        <AssetItem name="Payment Gateway Integration" views={850} adoption={8} grade={95} />
                        <AssetItem name="Audit Logging Standard" views={600} adoption={12} grade={92} />
                        <AssetItem name="S3 File Upload" views={540} adoption={20} grade={89} />
                    </ul>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, change }: { title: string, value: string | number, change: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
            <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-bold text-slate-900">{value}</span>
            </div>
            <p className="mt-1 text-sm text-emerald-600 font-medium">{change}</p>
        </div>
    );
}

function ProgressBar({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div>
            <div className="flex justify-between text-sm font-medium mb-1 text-slate-700">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
            </div>
        </div>
    );
}

function AssetItem({ name, views, adoption, grade }: { name: string, views: number, adoption: number, grade: number }) {
    return (
        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            <div>
                <h4 className="font-medium text-slate-900 text-sm">{name}</h4>
                <p className="text-xs text-slate-500">{views} views • {adoption}개 프로젝트에서 사용됨</p>
            </div>
            <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Grade {grade}
                </span>
            </div>
        </div>
    );
}
