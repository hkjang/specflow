'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, CheckCircle, FileText, Code, BookOpen, AlertCircle } from 'lucide-react';

export default function KnowledgeDashboard() {
    const [assets, setAssets] = useState([
        { id: 1, name: 'User Authentication (OAuth2)', type: 'Code', views: 1200, adoption: 15, grade: 98, status: 'Verified', author: 'SecTeam' },
        { id: 2, name: 'Payment Gateway Integration', type: 'Architecture', views: 850, adoption: 8, grade: 95, status: 'Standard', author: 'PayOps' },
        { id: 3, name: 'Audit Logging Standard', type: 'Document', views: 600, adoption: 12, grade: 92, status: 'Verified', author: 'Compliance' },
        { id: 4, name: 'S3 File Upload Module', type: 'Code', views: 540, adoption: 20, grade: 89, status: 'Draft', author: 'DevOne' },
        { id: 5, name: 'Microservices Pattern Guide', type: 'Document', views: 2100, adoption: 45, grade: 99, status: 'Verified', author: 'ArchTeam' },
    ]);
    const [open, setOpen] = useState(false);

    // Mock Data for now as we don't have an aggregate endpoint yet
    const stats = {
        totalAssets: 1245,
        verifiedAssets: 350,
        avgTrustGrade: 78.5,
        estimatedROI: '$1.25M',
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        const author = 'Me';

        setAssets([{ 
            id: assets.length + 1, 
            name, 
            type,
            views: 0, 
            adoption: 0, 
            grade: 80, 
            status: 'Draft',
            author
        }, ...assets]);
        setOpen(false);
    };

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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assets.map((asset) => (
                                    <TableRow key={asset.id} className="cursor-pointer hover:bg-slate-50">
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{asset.name}</span>
                                                <span className="text-[10px] text-slate-400">by {asset.author}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                {asset.type === 'Code' ? <Code className="h-3 w-3" /> : 
                                                 asset.type === 'Document' ? <FileText className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                                                {asset.type}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={asset.status === 'Verified' ? 'default' : asset.status === 'Draft' ? 'outline' : 'secondary'} className="text-[10px]">
                                                {asset.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-bold ${asset.grade >= 90 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {asset.grade}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500 text-xs">
                                            {asset.adoption}개 PJT
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
