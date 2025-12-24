
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Loader2, ChevronRight, ChevronDown, Layers, Box, Code } from 'lucide-react';

import { adminApi } from '@/lib/api';

interface Category {
    id: string;
    code: string;
    name: string;
    level: string;
    children?: Category[];
}

export default function RequirementMapPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        adminApi.getCategories()
            .then(res => {
                const data = res.data;
                const buildTree = (cats: any[]) => {
                    const map = new Map();
                    cats.forEach(c => map.set(c.id, { ...c, children: [] }));
                    const tree: any[] = [];
                    cats.forEach(c => {
                        if (c.parentId && map.has(c.parentId)) {
                            map.get(c.parentId).children.push(map.get(c.id));
                        } else if (c.level === 'Industry') { // Only industries as roots
                            tree.push(map.get(c.id));
                        }
                    });
                    return tree;
                };

                setCategories(buildTree(data));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderNode = (node: Category) => {
        const isExpanded = expanded[node.id];
        const hasChildren = node.children && node.children.length > 0;

        let Icon = Layers;
        if (node.level === 'Domain') Icon = Box;
        if (node.level === 'Function') Icon = Code;

        return (
            <div key={node.id} className="ml-6 border-l border-slate-200 pl-4 py-2">
                <div className="flex items-center space-x-2">
                    {hasChildren ? (
                        <Button variant="ghost" size="sm" onClick={() => toggle(node.id)} className="h-6 w-6 p-0 hover:bg-slate-100">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </Button>
                    ) : <div className="w-6" />}

                    <Badge variant="outline" className="flex items-center space-x-1 border-slate-200 bg-white">
                        <Icon className="h-3 w-3 mr-1 text-slate-500" />
                        <span className="text-slate-700">{node.name}</span>
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{node.code}</span>
                    {node.children && node.children.length > 0 && <span className="text-[10px] text-slate-300">({node.children.length})</span>}
                </div>

                {isExpanded && hasChildren && (
                    <div className="mt-2 animate-in slide-in-from-left-2 fade-in duration-200">
                        {node.children!.map(renderNode)}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader
                title="요건 구조도 (Requirement Map)"
                description="산업(Industry) - 도메인(Domain) - 기능(Function)으로 이어지는 요건 분류 계층을 시각화합니다."
                badgeText="HIERARCHY"
                steps={['관리자', '자산 관리', '요건 맵']}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 border border-dashed rounded-lg">
                        정의된 분류 체계가 없습니다.
                    </div>
                )}
                {categories.map(industry => (
                    <Card key={industry.id} className="overflow-hidden border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center text-lg text-slate-800">
                                <Layers className="mr-2 h-5 w-5 text-indigo-600" />
                                {industry.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 bg-white min-h-[200px]">
                            {/* Only render direct children (Domains) here, let them handle Functions */}
                            {industry.children?.map(renderNode)}
                            {(!industry.children || industry.children.length === 0) && (
                                <div className="text-sm text-slate-400 italic pl-4">하위 도메인 없음</div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
