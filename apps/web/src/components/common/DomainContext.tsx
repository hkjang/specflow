
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DomainType = 'GENERIC' | 'FINANCE' | 'MEDICAL';

interface DomainContextType {
    domain: DomainType;
    setDomain: (domain: DomainType) => void;
    labels: Record<string, string>;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export const DOMAIN_LABELS: Record<DomainType, Record<string, string>> = {
    GENERIC: {
        assetName: '요건 (Requirement)',
        riskLabel: '위험 (Risk)',
        complianceLabel: '규정 (Regulation)',
    },
    FINANCE: {
        assetName: '통제 항목 (Control Item)',
        riskLabel: '재무 리스크 (Financial Risk)',
        complianceLabel: '컴플라이언스 (Compliance)',
    },
    MEDICAL: {
        assetName: '임상 요건 (Clinical Req)',
        riskLabel: '환자 안전 (Patient Safety)',
        complianceLabel: '의료법/GXP (Regulation)',
    }
};

export function DomainProvider({ children }: { children: ReactNode }) {
    const [domain, setDomain] = useState<DomainType>('GENERIC');

    // Persist domain selection
    useEffect(() => {
        const saved = localStorage.getItem('admin_domain_mode') as DomainType;
        if (saved && ['GENERIC', 'FINANCE', 'MEDICAL'].includes(saved)) {
            setDomain(saved);
        }
    }, []);

    const handleSetDomain = (d: DomainType) => {
        setDomain(d);
        localStorage.setItem('admin_domain_mode', d);
        // In a real app, this might trigger a reload or toast
    };

    return (
        <DomainContext.Provider value={{ domain, setDomain: handleSetDomain, labels: DOMAIN_LABELS[domain] }}>
            {children}
        </DomainContext.Provider>
    );
}

export function useDomain() {
    const context = useContext(DomainContext);
    if (context === undefined) {
        throw new Error('useDomain must be used within a DomainProvider');
    }
    return context;
}
