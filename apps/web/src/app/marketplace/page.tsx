
'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Star, Download, TrendingUp, ShieldCheck, Trash2, Edit2 } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';

export default function MarketplacePage() {
    const [services, setServices] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await marketplaceApi.getAll();
            setServices(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        const price = (form.elements.namedItem('price') as HTMLInputElement).value;
        
        try {
            setLoading(true);
            await marketplaceApi.create({
                name,
                type,
                price: price || 'Free',
                provider: 'My Organization',
                description: 'New AI Service', 
                image: (Math.random() + 1).toString(36).substring(7)
            });
            await fetchServices();
            setOpen(false);
            form.reset();
        } catch(err) {
            alert('등록 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 서비스를 삭제하시겠습니까?')) return;
        try {
            await marketplaceApi.delete(id);
            fetchServices();
        } catch(err) { alert('삭제 실패'); }
    }

    return (
        <div className="space-y-6 container mx-auto max-w-7xl">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="마켓플레이스 (AI Services Marketplace)"
                    description="검증된 AI 모델, 데이터셋, 전처리 API를 검색하고 프로젝트에 연동하세요."
                    badgeText="EXTENSION STORE"
                />
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> 서비스 등록 (Publish)
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>새로운 서비스 등록</DialogTitle>
                            <DialogDescription>
                                조직 내부 또는 외부에 공유할 AI 자산을 등록합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddService} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">서비스명</label>
                                <Input name="name" required placeholder="예: Corporate Semantic Search" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">유형</label>
                                    <select name="type" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option value="Model">AI Model</option>
                                        <option value="Dataset">Dataset</option>
                                        <option value="API">API / Tool</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">가격 정책</label>
                                    <Input name="price" placeholder="예: Free, $10/mo" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>등록하기</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-white border shadow-sm p-1">
                        <TabsTrigger value="all" className="px-6 data-[state=active]:bg-slate-100">전체 (All)</TabsTrigger>
                        <TabsTrigger value="models" className="px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">AI Models</TabsTrigger>
                        <TabsTrigger value="datasets" className="px-6 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Datasets</TabsTrigger>
                        <TabsTrigger value="apis" className="px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">APIs & Tools</TabsTrigger>
                    </TabsList>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input className="pl-10" placeholder="서비스, 제공사 검색..." />
                    </div>
                </div>

                <TabsContent value="all" className="space-y-6">
                    <FeaturedSection />
                    <ServiceGrid services={services} onDelete={handleDelete} />
                </TabsContent>
                <TabsContent value="models">
                    <ServiceGrid services={services.filter(s => s.type === 'Model')} onDelete={handleDelete} />
                </TabsContent>
                <TabsContent value="datasets">
                    <ServiceGrid services={services.filter(s => s.type === 'Dataset')} onDelete={handleDelete} />
                </TabsContent>
                <TabsContent value="apis">
                    <ServiceGrid services={services.filter(s => s.type === 'API')} onDelete={handleDelete} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FeaturedSection() {
    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <div className="relative z-10 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-3 text-indigo-300 font-bold text-sm tracking-wider uppercase">
                        <TrendingUp className="h-4 w-4" /> Featured Choice
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2">Enterprise RAG Connector 2.0</h2>
                    <p className="text-slate-300 max-w-xl mb-6">
                        내부 문서와 LLM을 안전하게 연결하는 엔터프라이즈급 커넥터. 
                        향상된 보안 필터와 3배 더 빠른 인덱싱 속도를 경험하세요.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="font-bold">지금 연동하기</Button>
                        <Button variant="ghost" className="text-white hover:bg-white/10">자세히 보기</Button>
                    </div>
                </div>
                {/* Visual Placeholder */}
                <div className="hidden md:block">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-3 w-3 rounded-full bg-red-400"></div>
                            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                            <div className="h-3 w-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="space-y-2 opacity-60">
                            <div className="h-2 w-48 bg-white rounded"></div>
                            <div className="h-2 w-36 bg-white rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServiceGrid({ services, onDelete }: { services: any[], onDelete: (id: string) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(svc => (
                <Card key={svc.id} className="hover:shadow-lg transition-all duration-300 group border-slate-200 hover:border-indigo-200 relative">
                    {/* Delete Button (Visible on Hover) */}
                    <button 
                         onClick={(e) => { e.stopPropagation(); onDelete(svc.id); }}
                         className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 bg-white/80 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                         <Trash2 className="h-4 w-4" />
                    </button>

                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant={
                                svc.type === 'API' ? 'default' : 
                                svc.type === 'Dataset' ? 'secondary' : 'outline'
                            } className="mb-2">
                                {svc.type}
                            </Badge>
                            <div className="flex items-center text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full">
                                <Star className="h-3 w-3 fill-current mr-1" />
                                {svc.rating}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${svc.image}`} />
                                <AvatarFallback>{svc.image?.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg group-hover:text-indigo-700 transition-colors">{svc.name}</CardTitle>
                                <CardDescription className="text-xs">{svc.provider}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="flex justify-between items-center text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <Download className="h-4 w-4 mr-1.5 text-slate-400" />
                                {svc.downloads?.toLocaleString() || 0} 설치
                            </div>
                            <div className="flex items-center font-semibold text-slate-700">
                                {svc.price}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button className="w-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" variant="outline">
                            상세 보기
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
