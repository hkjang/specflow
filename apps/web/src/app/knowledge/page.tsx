'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, CheckCircle, FileText, Code, BookOpen, AlertCircle, Trash2, Search } from 'lucide-react';

export default function KnowledgeDashboard() {
    const [assets, setAssets] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        totalAssets: 0,
        verifiedAssets: 0,
        avgTrustGrade: 0,
        estimatedROI: '$0',
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await knowledgeApi.getAssets();
            setAssets(res.data);
            calculateStats(res.data);
        } catch (err) { console.error(err); }
    };

    const calculateStats = (data: any[]) => {
        const verified = data.filter(a => a.grade >= 90 || a.status === 'APPROVED' || a.maturity === 'VERIFIED').length;
        const totalTrust = data.reduce((acc, curr) => acc + (curr.trustGrade || 0), 0);
        setStats({
            totalAssets: data.length,
            verifiedAssets: verified,
            avgTrustGrade: data.length ? (totalTrust / data.length) : 0,
            estimatedROI: 'Calculating...', // Placeholder
        });
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const title = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        const desc = (form.elements.namedItem('description') as HTMLTextAreaElement)?.value;

        try {
            await knowledgeApi.createAsset({ title, content: desc, type }); // Type mapping logic needed in backend if we want to store it separate
            await fetchAssets();
            setOpen(false);
            form.reset();
        } catch(err) { alert('등록 실패'); }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm('정말 삭제하시겠습니까?')) {
            await knowledgeApi.deleteAsset(id);
            fetchAssets();
        }
    };

    const filteredAssets = assets.filter(a => 
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 container mx-auto max-w-7xl">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="지식 운영 대시보드 (Knowledge Operation)"
                    description="조직의 지식 자산을 중앙에서 관리하고 재사용성을 극대화합니다."
                    badgeText="KNOWLEDGE BASE"
                />
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Upload className="mr-2 h-4 w-4" /> 자산 등록 (Upload)
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>지식 자산 등록</DialogTitle>
                            <DialogDescription>
                                코드, 아키텍처, 문서를 등록하여 자산화합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">자산명 (Title)</label>
                                <Input name="name" required placeholder="예: JWT 인증 모듈" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">유형</label>
                                    <select name="type" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                        <option value="Code">Code Snippet</option>
                                        <option value="Document">Design Document</option>
                                        <option value="Architecture">Architecture</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">태그</label>
                                    <Input placeholder="예: Java, Security" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">설명</label>
                                <Textarea placeholder="자산에 대한 설명을 입력하세요." />
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">업로드</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard title="총 지식 자산" value={stats.totalAssets.toLocaleString()} change="+12%" icon={BookOpen} color="text-blue-600" />
                <KpiCard title="검증된 자산" value={stats.verifiedAssets.toLocaleString()} change="28%" icon={CheckCircle} color="text-emerald-600" />
                <KpiCard title="평균 신뢰도" value={stats.avgTrustGrade} change="+2.4" icon={Code} color="text-purple-600" />
                <KpiCard title="예상 ROI" value={stats.estimatedROI} change="YTD" icon={AlertCircle} color="text-amber-600" />
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="지식 자산 검색 (제목, 코드, 태그)..." 
                    className="pl-9 bg-white max-w-md"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Table Area */}
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>최신 자산 현황 (Recent Assets)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>자산명</TableHead>
                                    <TableHead>유형</TableHead>
                                    <TableHead>상태</TableHead>
                                    <TableHead>평가</TableHead>
                                    <TableHead className="text-right">활용도</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssets.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                            검색 결과가 없습니다.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredAssets.map((asset) => (
                                    <TableRow key={asset.id} className="cursor-pointer hover:bg-slate-50 group">
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{asset.title || asset.name}</span>
                                                <span className="text-[10px] text-slate-400">by {asset.creator?.name || asset.author || 'Unknown'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                {asset.type === 'Code' ? <Code className="h-3 w-3" /> : 
                                                 asset.type === 'Document' ? <FileText className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                                                {asset.type || 'Standard'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={asset.status === 'Verified' ? 'default' : asset.status === 'Draft' ? 'outline' : 'secondary'} className="text-[10px]">
                                                {asset.status || asset.maturity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-bold ${asset.trustGrade >= 90 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {asset.trustGrade || asset.grade || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500 text-xs">
                                            {asset.adoption || asset.assetMetric?.adoptionRate || 0}개 PJT
                                        </TableCell>
                                        <TableCell>
                                            <button 
                                                onClick={(e) => handleDelete(asset.id, e)}
                                                className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Side Panel: Maturity */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">자산 성숙도 (Maturity)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <ProgressBar label="검증됨 (Verified)" value={28} color="bg-emerald-500" description="즉시 재사용 가능" />
                            <ProgressBar label="표준 (Standard)" value={35} color="bg-blue-500" description="프로젝트 표준" />
                            <ProgressBar label="초안 (Draft)" value={37} color="bg-slate-400" description="검토 대기 중" />
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white border-none">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-lg mb-2">지식 자산화 캠페인</h3>
                            <p className="text-sm text-indigo-200 mb-4">
                                4분기 우수 지식 자산 등록자에게는 특별한 혜택이 주어집니다.
                            </p>
                            <Button variant="secondary" size="sm" className="w-full">캠페인 참여하기</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, change, icon: Icon, color }: { title: string, value: string | number, change: string, icon: any, color: string }) {
    return (
        <Card className="border-slate-100 shadow-sm">
            <CardContent className="p-6 flex justify-between items-start">
                <div>
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-2xl font-bold text-slate-900">{value}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-emerald-600">{change}</p>
                </div>
                <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function ProgressBar({ label, value, color, description }: { label: string, value: number, color: string, description: string }) {
    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="text-xs text-slate-500">{value}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${value}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400">{description}</p>
        </div>
    );
}
