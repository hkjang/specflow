'use client';


import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusCircle, FileText, Activity, Trash2, Loader2, ArrowRight } from "lucide-react";
import { useEffect, useState } from 'react';
import { extractionApi } from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ExtractionDashboard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        fetchJobs();
        // Auto-refresh every 5 seconds if there are active jobs
        const interval = setInterval(() => {
            setJobs(currentJobs => {
                const hasActive = currentJobs.some(j => j.status === 'PROCESSING' || j.status === 'PENDING');
                if (hasActive) {
                    fetchJobs(true); // Silent fetch
                }
                return currentJobs;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await extractionApi.getAllJobs();
            setJobs(res.data);
        } catch (e) {
            console.error(e);
            if (!silent) toast.error("Failed to load extraction jobs");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await extractionApi.deleteJob(id);
            setJobs(prev => prev.filter(j => j.id !== id));
            toast.success("Extraction job deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete job");
        } finally {
            setDeletingId(null);
        }
    };

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = (job.source?.metadata?.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              job.id.includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Calculate metrics locally from jobs
    const activeJobs = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length;
    // Calculate stats across all drafts in all jobs
    const allDrafts = jobs.flatMap(j => j.drafts || []);
    const totalRequirements = allDrafts.length;
    const pendingReview = allDrafts.filter((d: any) => d.status === 'PENDING').length;
    
    // Average confidence calculation
    const confidenceSum = allDrafts.reduce((acc: number, d: any) => acc + (d.confidence || 0), 0);
    const avgConfidence = totalRequirements > 0 ? Math.round(confidenceSum / totalRequirements) : 0;

    // Distribution Stats (By Type)
    // Assuming 'type' field exists on drafts or defaulting to 'Functional'
    // Let's deduce type from content if missing or use a placeholder logic
    const distribution = allDrafts.reduce((acc: any, draft: any) => {
        const type = draft.type || 'Functional'; 
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Normalize keys for chart
    const distKeys = Object.keys(distribution);
    const totalDist = totalRequirements || 1; // avoid div by 0

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="AI 추출 대시보드 (Extraction)"
                description="문서로부터 요건을 자동으로 추출하고 상태를 모니터링합니다."
                badgeText="AI JOB"
                steps={['작업장', 'AI 추출']}
            />

            <div className="flex justify-end">
                <Link href="/extraction/new">
                    <Button className="font-bold bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> 신규 추출 작업
                    </Button>
                </Link>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">진행 중인 작업 (Active)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{activeJobs}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">검토 대기 (Pending)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-600">{pendingReview}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">평균 신뢰도 (Confidence)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{avgConfidence}%</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">총 추출 요건</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totalRequirements}</div></CardContent>
                </Card>
            </div>

            {/* Real Data Visualization: Distribution */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">요건 유형 분포 (Requirement Distribution)</CardTitle>
                </CardHeader>
                <CardContent>
                    {totalRequirements === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다.</div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(distribution).map(([type, count]) => {
                                const percentage = Math.round(((count as number) / totalDist) * 100);
                                let colorClass = 'bg-blue-500';
                                if (type.includes('Security')) colorClass = 'bg-red-500';
                                if (type.includes('Non')) colorClass = 'bg-slate-400';
                                
                                return (
                                    <div key={type} className="flex items-center">
                                        <div className="w-32 text-sm font-bold text-slate-700 capitalize truncate">{type}</div>
                                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <div className="w-16 text-sm text-right font-mono text-slate-600">{count} ({percentage}%)</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-slate-500" />
                        추출 작업 이력
                    </h3>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input 
                            placeholder="파일명 검색..." 
                            className="h-9 w-[200px] bg-white" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 w-[130px] bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="PROCESSING">Processing</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => fetchJobs()} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '새로고침'}
                        </Button>
                    </div>
                </div>
                
                {filteredJobs.length === 0 ? (
                    <div className="text-sm text-slate-500 py-16 text-center">
                        {loading ? '데이터를 불러오는 중입니다...' : (searchTerm || statusFilter !== 'ALL') ? '검색 결과가 없습니다.' : '아직 수행된 추출 작업이 없습니다.'}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>소스 유형</TableHead>
                                <TableHead>파일명/출처</TableHead>
                                <TableHead>상태 (Status)</TableHead>
                                <TableHead>추출된 요건</TableHead>
                                <TableHead>생성일</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredJobs.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {job.id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{job.source?.type || 'UNKNOWN'}</Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {job.source?.metadata?.filename || 'Untitled Source'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' :
                                            job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' :
                                            job.status === 'FAILED' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' :
                                            'bg-slate-100 text-slate-800 border-slate-200'
                                        }>
                                            {job.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {job.drafts?.length || 0} 개
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(job.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/extraction/${job.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <ArrowRight className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            </Link>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            이 작업과 관련된 모든 추출 데이터(Drafts)가 영구적으로 삭제됩니다.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handleDelete(job.id)}
                                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                        >
                                                            {deletingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
