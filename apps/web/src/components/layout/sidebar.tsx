'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Home, List, Settings, Users, FileText, Brain,
    LayoutDashboard, Library, Globe, Activity, Database, Shield,
    ChevronDown, ChevronRight, Layers, CreditCard, Folder
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ExplanationTooltip } from '@/components/common/ExplanationTooltip';
import { explanationApi, Explanation } from '@/api/explanation';

type NavItem = {
    name: string; // Korean Standard Name
    engName?: string; // English Name for reference (tooltip)
    href: string;
    icon?: any;
    children?: NavItem[];
    actionDesc?: string; // e.g., "Define new requirements"
};

// --- USER MENU (Practitioner) - Workflow-oriented ---
const userNavItems: NavItem[] = [
    { name: '홈', engName: 'Home', href: '/', icon: Home, actionDesc: 'My workspace overview' },
    
    // 요건 작업 (Core Work)
    { 
        name: '요건 작업', 
        engName: 'Requirements Work', 
        href: '/requirements', 
        icon: FileText,
        children: [
            { name: '요건 목록', href: '/requirements' },
            { name: '새 요건 작성', href: '/requirements/new' },
            { name: '내 할당 요건', href: '/requirements?filter=assigned' },
        ]
    },
    
    // AI 도구 (AI Tools)
    { 
        name: 'AI 도구', 
        engName: 'AI Tools', 
        href: '/extraction', 
        icon: Brain,
        children: [
            { name: 'AI 추출', href: '/extraction' },
            { name: 'AI 생성', href: '/generation' },
            { name: '분류/태깅', href: '/classification' },
        ]
    },
    
    // 협업 (Collaboration)
    { 
        name: '협업', 
        engName: 'Collaboration', 
        href: '/projects', 
        icon: Users,
        children: [
            { name: '프로젝트', href: '/projects' },
            { name: '지식 자산', href: '/knowledge' },
            { name: '팀원 관리', href: '/users' },
        ]
    },
    
    // 마켓플레이스 & 파트너
    { name: '마켓플레이스', engName: 'Marketplace', href: '/marketplace', icon: CreditCard },
    { name: '파트너 포털', engName: 'Partner', href: '/partner', icon: Globe },
    
    // 설정
    { name: '환경 설정', engName: 'Settings', href: '/settings', icon: Settings },
];

// --- ADMIN MENU (Manager/Operator) - Role & Function oriented ---
const adminNavItems: NavItem[] = [
    // 1. 현황 파악 (Situation Awareness)
    {
        name: '현황 파악',
        engName: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
        children: [
            { name: '운영 대시보드', href: '/admin' },
            { name: '추세 분석', href: '/admin/analysis' },
            { name: '최근 활동', href: '/admin/dashboard' },
        ]
    },
    
    // 2. 품질 관리 (Quality Management)
    {
        name: '품질 관리',
        engName: 'Quality',
        href: '/admin/quality',
        icon: Shield,
        children: [
            { name: '품질 플랫폼', href: '/admin/quality' },
            { name: '정확도 분석', href: '/admin/quality/accuracy' },
            { name: '빠른 검토', href: '/admin/review' },
        ]
    },
    
    // 3. 자산 관리 (Asset Management)
    {
        name: '자산 관리',
        engName: 'Assets',
        href: '/admin/assets',
        icon: Library,
        children: [
            { name: '전체 요건 조회', href: '/admin/assets' },
            { name: '요건 맵 (Tree)', href: '/admin/requirements/map' },
            { name: '변경 이력', href: '/admin/assets/diff' },
        ]
    },
    
    // 4. 분류 체계 (Taxonomy)
    {
        name: '분류 체계',
        engName: 'Taxonomy',
        href: '/admin/classification',
        icon: Layers,
        children: [
            { name: '분류 개요', href: '/admin/classification' },
            { name: '카테고리 관리', href: '/admin/categories' },
            { name: '정확도 히트맵', href: '/admin/classification/heatmap' },
            { name: '미분류 처리', href: '/admin/classification/override' },
        ]
    },
    
    // 5. AI & 데이터 (AI & Data)
    {
        name: 'AI & 데이터',
        engName: 'AI & Data',
        href: '/admin/ai',
        icon: Brain,
        children: [
            { name: 'AI 모델 설정', href: '/admin/ai-settings' },
            { name: '추출 모델', href: '/admin/ai/extraction' },
            { name: '분류 모델', href: '/admin/ai/classification' },
            { name: '데이터 수집', href: '/admin/collection' },
            { name: '크롤러 상태', href: '/admin/collection/crawlers' },
        ]
    },
    
    // 6. 거버넌스 (Governance)
    {
        name: '거버넌스',
        engName: 'Governance',
        href: '/admin/operations',
        icon: Activity,
        children: [
            { name: '알림/인박스', href: '/admin/operations' },
            { name: '규칙 엔진', href: '/admin/operations/rules' },
            { name: '감사 로그', href: '/admin/governance/audit-logs' },
            { name: 'SLA 모니터링', href: '/admin/operations/sla' },
        ]
    },
    
    // 7. 시스템 설정 (System)
    {
        name: '시스템 설정',
        engName: 'System',
        href: '/admin/settings',
        icon: Settings,
        children: [
            { name: '시스템 개요', href: '/admin/settings' },
            { name: '사용자/권한', href: '/admin/settings/users' },
            { name: '웹훅 설정', href: '/admin/settings/webhooks' },
        ]
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');
    const [explanations, setExplanations] = useState<Record<string, Explanation>>({});

    useEffect(() => {
        // Fetch menu explanations on mount
        explanationApi.getAll('MENU').then(data => {
            const map: Record<string, Explanation> = {};
            data.forEach(exp => {
                map[exp.key] = exp;
            });
            setExplanations(map);
        }).catch(console.error);
    }, []);

    const navItems = isAdmin ? adminNavItems : userNavItems;

    return (
        <div className="flex h-screen flex-col justify-between border-r bg-white w-64 flex-shrink-0 font-sans">
            <div className="flex flex-col h-full">
                <div className="px-4 py-6">
                    <span className={clsx(
                        "grid h-10 w-full place-content-center rounded-lg text-sm font-extrabold transition-all tracking-tight",
                        isAdmin ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-700"
                    )}>
                        {isAdmin ? '전사 관리자 (Enterprise Admin)' : 'SpecFlow 작업장 (Workspace)'}
                    </span>
                    <p className="text-[10px] text-center mt-2 text-gray-400">
                        {isAdmin ? '전사 표준 관리 콘솔' : '실무자용 요건 관리 워크스페이스'}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
                    {/* Role Indicator */}
                    <div className="mb-4 px-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {isAdmin ? '관리 (Management)' : '워크스페이스 (Workspace)'}
                        </span>
                    </div>

                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.name}
                                item={item}
                                pathname={pathname}
                                explanations={explanations}
                            />
                        ))}
                    </ul>
                </div>

                {/* Toggle Link */}
                <div className="border-t p-4 bg-gray-50">
                    <Link
                        href={isAdmin ? '/' : '/admin'}
                        className="flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
                    >
                        <Shield className="h-4 w-4" />
                        {isAdmin ? '실무자 화면으로 전환 (Workspace)' : '관리자 콘솔로 전환 (Admin)'}
                    </Link>
                </div>

                <div className="border-t border-gray-100 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm flex items-center justify-center text-white text-xs font-bold">
                            U
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-700 truncate">홍길동 (Admin)</p>
                            <p className="text-[10px] text-slate-400 truncate">user@specflow.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SidebarItem({ item, pathname, explanations }: { item: NavItem, pathname: string | null, explanations: Record<string, Explanation> }) {
    const isExact = pathname === item.href;
    const isChildActive = item.children?.some(child => pathname === child.href);
    const isExpanded = isExact || isChildActive; // Auto expand logic

    const [isOpen, setIsOpen] = useState(isExpanded);
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    // Use name for key, but consider english name if available for consistent IDs
    const safeKey = (item.engName || item.name).toLowerCase().replace(/\s+/g, '_');
    const key = `menu.${safeKey}`;
    const explanation = explanations[key];

    if (!hasChildren) {
        return (
            <li>
                <div className="flex items-center group relative">
                    <Link
                        href={item.href}
                        className={clsx(
                            "flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                            isExact
                                ? "bg-slate-100 text-slate-900 font-bold shadow-sm"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"
                        )}
                    >
                        {Icon && <Icon className={clsx("h-[18px] w-[18px]", isExact ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />}
                        <span>{item.name}</span>
                    </Link>
                    {/* Internal Tooltip approach: Only show if explanation exists? Or use browser title? 
                        Let's keep existing tooltip for now but clean it up.
                     */}
                </div>
            </li>
        );
    }

    return (
        <li className="mb-1">
            <div className="flex items-center">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "flex-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold transition-all hover:bg-slate-50",
                        isChildActive ? "text-slate-800" : "text-slate-500"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {Icon && <Icon className={clsx("h-[18px] w-[18px]", isChildActive ? "text-blue-600" : "text-slate-400")} />}
                        {item.name}
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                </button>
            </div>

            {isOpen && (
                <ul className="mt-1 space-y-0.5 pl-4 relative before:absolute before:left-[21px] before:top-0 before:h-full before:w-px before:bg-slate-100">
                    {item.children!.map((child) => {
                        const isChildActive = pathname === child.href;

                        return (
                            <li key={child.name} className="flex items-center relative pl-5">
                                {/* Connector line */}
                                <div className={clsx("absolute left-0 top-1/2 h-px w-3", isChildActive ? "bg-blue-200" : "bg-slate-100")} />

                                <Link
                                    href={child.href}
                                    className={clsx(
                                        "block flex-1 rounded px-3 py-2 text-[13px] transition-colors",
                                        isChildActive
                                            ? "text-blue-700 font-bold bg-blue-50/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    {child.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </li>
    );
}
