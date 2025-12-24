'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, RefreshCw, ChevronRight, ChevronDown, Folder, FolderOpen, Layers, GitBranch, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/layout/PageHeader';

// Mock Tree Data Structure
interface TreeNode {
    id: string;
    name: string;
    type: 'BUSINESS' | 'INDUSTRY' | 'FUNCTION' | 'MENU';
    count: number;
    accuracy?: number;
    children?: TreeNode[];
}

export default function ClassificationPage() {
    const [stats, setStats] = useState<any[]>([]);
    const [treeData, setTreeData] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await adminApi.getClassificationStats();
            setStats(res.data);

            // Transform linear stats to mock tree for visualization
            // In real scenario, API should return tree
            const mockTree: TreeNode[] = [
                {
                    id: 'biz-1', name: '금융 (Finance)', type: 'BUSINESS', count: 45, children: [
                        {
                            id: 'ind-1', name: '은행 (Banking)', type: 'INDUSTRY', count: 20, children: [
                                { id: 'fun-1', name: '여신 관리', type: 'FUNCTION', count: 12 },
                                { id: 'fun-2', name: '수신 관리', type: 'FUNCTION', count: 8 }
                            ]
                        },
                        {
                            id: 'ind-2', name: '보험 (Insurance)', type: 'INDUSTRY', count: 25, children: [
                                { id: 'fun-3', name: '계약 관리', type: 'FUNCTION', count: 15 },
                                { id: 'fun-4', name: '보상 처리', type: 'FUNCTION', count: 10 }
                            ]
                        }
                    ]
                },
                {
                    id: 'biz-2', name: '의료 (Healthcare)', type: 'BUSINESS', count: 32, children: [
                        {
                            id: 'ind-3', name: '병원 (Hospital)', type: 'INDUSTRY', count: 32, children: [
                                { id: 'fun-5', name: '환자 접수', type: 'FUNCTION', count: 20 },
                                { id: 'fun-6', name: '진료 기록', type: 'FUNCTION', count: 12 }
                            ]
                        }
                    ]
                }
            ];
            setTreeData(mockTree);

        } catch (error) {
            console.error("Failed to fetch classification stats", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="분류 체계 관리 (Taxonomy Manager)"
                description="비즈니스-산업-기능으로 이어지는 표준 분류 체계를 시각화하고 관리합니다."
                badgeText="ADMIN"
                steps={['관리자 콘솔', '자산 분류']}
            />

            <div className="grid gap-6 md:grid-cols-3 h-[calc(100vh-200px)] min-h-[600px]">
                {/* Left: Tree Visualization */}
                <Card className="col-span-1 md:col-span-2 border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="border-b border-slate-100 py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <GitBranch className="h-4 w-4 text-blue-500" />
                                분류 구조 (Tree View)
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><RefreshCw className="h-3.5 w-3.5 text-slate-400" onClick={fetchStats} /></Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-2 bg-slate-50/50">
                        <div className="space-y-1 p-2">
                            {treeData.map(node => (
                                <TreeNodeItem key={node.id} node={node} level={0} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Insights & Actions */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                분류 정확도 및 제안
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <div className="text-xs font-bold text-amber-800 mb-1">오분류 의심 항목 (3)</div>
                                <ul className="text-xs text-amber-700 space-y-1 pl-3 list-disc">
                                    <li>'환자 접수' 기능이 '금융'으로 분류됨</li>
                                    <li>'여신 관리' 카테고리 깊이 부족</li>
                                </ul>
                                <Button variant="outline" size="sm" className="w-full mt-3 bg-white text-xs h-7 border-amber-200 text-amber-700 hover:bg-amber-100">
                                    자세히 보기
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-500">계층별 분포</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Business</span>
                                        <span className="font-mono">2</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full"><div className="bg-blue-500 h-1.5 rounded-full w-[20%]"></div></div>

                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Industry</span>
                                        <span className="font-mono">3</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full"><div className="bg-emerald-500 h-1.5 rounded-full w-[30%]"></div></div>

                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Function</span>
                                        <span className="font-mono">6</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full"><div className="bg-amber-500 h-1.5 rounded-full w-[60%]"></div></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function TreeNodeItem({ node, level }: { node: TreeNode; level: number }) {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const Icon = node.type === 'BUSINESS' ? Layers : (node.type === 'INDUSTRY' ? Folder : (hasChildren ? Folder : Check));
    const typeColors = {
        'BUSINESS': 'text-blue-600 bg-blue-50',
        'INDUSTRY': 'text-emerald-600 bg-emerald-50',
        'FUNCTION': 'text-slate-600 bg-slate-100',
        'MENU': 'text-slate-400'
    };

    return (
        <div className="select-none">
            <div
                className={clsx(
                    "flex items-center gap-2 p-1.5 rounded hover:bg-white hover:shadow-sm transition-all cursor-pointer group",
                    level === 0 ? "mb-1" : ""
                )}
                style={{ marginLeft: `${level * 16}px` }}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 flex items-center justify-center text-slate-400">
                    {hasChildren && (
                        isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    )}
                </div>

                <div className={clsx("p-1 rounded", typeColors[node.type] || 'text-slate-500')}>
                    <Icon className="w-3.5 h-3.5" />
                </div>

                <span className={clsx("text-sm", level === 0 ? "font-bold text-slate-800" : "text-slate-700")}>
                    {node.name}
                </span>

                <span className="text-[10px] text-slate-400 bg-white px-1.5 rounded border border-slate-100 font-mono ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {node.count} items
                </span>

                <Edit3 className="w-3 h-3 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 hover:text-blue-500" />
            </div>

            {hasChildren && isOpen && (
                <div className="border-l border-slate-200 ml-[11px]">
                    {node.children!.map(child => (
                        <TreeNodeItem key={child.id} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
