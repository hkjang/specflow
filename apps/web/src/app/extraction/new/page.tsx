"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractionApi, aiApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Link as LinkIcon, Construction } from "lucide-react";

export default function NewExtractionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [perspective, setPerspective] = useState("BUSINESS");

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await aiApi.getProviders();
                const active = res.data.filter((p: any) => p.isActive);
                setProviders(active);
                if (active.length > 0) {
                    setSelectedProviderId(active[0].id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchProviders();
    }, []);

    const handleFileUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', 'mock-project-id');
        formData.append('perspective', perspective);
        if (selectedProviderId) {
            formData.append('providerId', selectedProviderId);
        }

        try {
            setLoading(true);
            const res = await extractionApi.upload(formData);
            if (res.data.jobId) {
                router.push(`/extraction/${res.data.jobId}`);
            }
        } catch (e) {
            console.error(e);
            alert('파일 업로드 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleTextUpload = async () => {
        if (!text) return;
        setLoading(true);
        try {
            const res = await extractionApi.processText({
                content: text,
                perspective,
                projectId: 'mock-project-id',
                providerId: selectedProviderId
            });
            if (res.data.jobId) {
                router.push(`/extraction/${res.data.jobId}`);
            }
        } catch (e) {
            console.error(e);
            alert('텍스트 처리 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">새 추출 작업 (New Extraction)</h1>

            {/* AI Model Selection */}
            <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader className="py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Construction className="h-4 w-4 text-slate-500" />
                        AI 모델 선택 (Select Model)
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                    <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                        <SelectTrigger>
                            <SelectValue placeholder="AI 모델을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            {providers.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({p.models})</span>
                                </SelectItem>
                            ))}
                            {providers.length === 0 && <SelectItem value="none" disabled>활성화된 AI 모델이 없습니다</SelectItem>}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Tabs defaultValue="file" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="file">파일 업로드</TabsTrigger>
                    <TabsTrigger value="text">텍스트 직접 입력</TabsTrigger>
                    <TabsTrigger value="url">외부 URL</TabsTrigger>
                </TabsList>

                <TabsContent value="file">
                    <Card>
                        <CardHeader>
                            <CardTitle>문서 업로드 (Upload Document)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="file">파일 선택</Label>
                                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label>추출 관점 (Perspective)</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-muted">
                                        <input type="radio" name="perspective" value="BUSINESS" checked={perspective === 'BUSINESS'} onChange={() => setPerspective('BUSINESS')} />
                                        <div>
                                            <span className="font-semibold block">비즈니스 분석가 (Business Analyst)</span>
                                            <span className="text-xs text-muted-foreground">목표 및 가치 중심 분석</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-muted">
                                        <input type="radio" name="perspective" value="DEVELOPER" checked={perspective === 'DEVELOPER'} onChange={() => setPerspective('DEVELOPER')} />
                                        <div>
                                            <span className="font-semibold block">시스템 아키텍트 (System Architect)</span>
                                            <span className="text-xs text-muted-foreground">기술 및 보안 중심 분석</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <Button className="mt-4 w-full" onClick={handleFileUpload} disabled={!file || !selectedProviderId}>
                                <Upload className="mr-2 h-4 w-4" />
                                파일 처리 시작
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="text">
                    <Card>
                        <CardHeader>
                            <CardTitle>텍스트 입력 (Paste Text)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="message">원문 내용 (Raw Content)</Label>
                                <Textarea
                                    placeholder="회의록이나 요건 사항을 입력하세요..."
                                    id="message"
                                    className="h-64"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </div>
                            <Button className="mt-4 w-full" onClick={handleTextUpload} disabled={loading || !text || !selectedProviderId}>
                                <FileText className="mr-2 h-4 w-4" />
                                텍스트 처리
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="url">
                    <Card>
                        <CardHeader>
                            <CardTitle>외부 소스 (External Source)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="url">URL</Label>
                                <Input id="url" placeholder="https://..." />
                            </div>
                            <Button className="mt-4 w-full" disabled={true}>
                                <LinkIcon className="mr-2 h-4 w-4" />
                                준비 중 (Coming Soon)
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
