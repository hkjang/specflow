
'use client';

import React from 'react';
import { DomainProvider, useDomain, DOMAIN_LABELS } from '@/components/common/DomainContext';
import { Building, Stethoscope, Layers, Check } from 'lucide-react';

// Inner component to use the context
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { domain, setDomain, labels } = useDomain();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            {/* Domain Context Bar */}
            <div className="bg-slate-900 text-slate-200 px-6 py-2 flex items-center justify-between text-xs border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">도메인 모드 (Domain Mode)</span>

                    <button
                        onClick={() => setDomain('GENERIC')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${domain === 'GENERIC' ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Layers className="h-3 w-3" />
                        일반 (Generic)
                    </button>

                    <button
                        onClick={() => setDomain('FINANCE')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${domain === 'FINANCE' ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Building className="h-3 w-3" />
                        금융 (Finance)
                    </button>

                    <button
                        onClick={() => setDomain('MEDICAL')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${domain === 'MEDICAL' ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Stethoscope className="h-3 w-3" />
                        의료 (Medical)
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-slate-500">활성 용어집 (Active Terminology): <span className="text-slate-200">{labels.assetName}</span></span>
                    {domain !== 'GENERIC' && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse">
                            <Check className="h-3 w-3" /> 엄격 준수 모드 켜짐 (Strict Mode)
                        </span>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <DomainProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </DomainProvider>
    );
}
