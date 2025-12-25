'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
    RefreshCw, FileText, Globe, Calendar, Eye, Code, 
    ExternalLink, Database, Clock
} from 'lucide-react';
import { api } from '@/lib/api';

interface CollectedData {
    id: string;
    type: string;
    metadata: {
        url?: string;
        crawlerName?: string;
        crawledAt?: string;
        pagesFound?: number;
        itemsExtracted?: number;
        name?: string;
    } | null;
    createdAt: string;
    content?: string;
}

export default function CollectedDataPage() {
    const [data, setData] = useState<CollectedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<CollectedData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/collection/crawlers/collected?limit=100');
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const viewDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await api.get(`/collection/crawlers/collected/${id}`);
            setSelectedItem(res.data);
        } catch (error) {
            console.error(error);
            alert('상세 조회 실패');
        } finally {
            setDetailLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const extractTitle = (content: string) => {
        const match = content.match(/<title>(.*?)<\/title>/i) || content.match(/<h1>(.*?)<\/h1>/i);
        return match ? match[1] : '제목 없음';
    };

    const formatHtmlPreview = (html: string) => {
        // Strip HTML tags for preview
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) + '...';
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="수집된 데이터 (Collected Data)"
                description="크롤러가 수집한 원본 데이터를 확인합니다. 각 항목을 클릭하면 전체 내용을 볼 수 있습니다."
                badgeText="RAW DATA"
                steps={['관리자', '데이터 수집', '수집 데이터']}
            />

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Database className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-bold text-slate-500">전체 수집 데이터</p>
                        </div>
                        <p className="text-3xl font-extrabold text-blue-600">{data.length}건</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs font-bold text-slate-500">URL 소스</p>
                        </div>
                        <p className="text-3xl font-extrabold text-emerald-600">
                            {data.filter(d => d.type === 'URL').length}건
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-purple-500" />
                            <p className="text-xs font-bold text-slate-500">파일 소스</p>
                        </div>
                        <p className="text-3xl font-extrabold text-purple-600">
                            {data.filter(d => d.type === 'FILE').length}건
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>
            </div>

            {/* Data Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.map((item) => (
                    <Card 
                        key={item.id} 
                        className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => viewDetail(item.id)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <Badge variant="outline" className={item.type === 'URL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700'}>
                                    {item.type === 'URL' ? <Globe className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                                    {item.type}
                                </Badge>
                                <Eye className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <CardTitle className="text-sm font-bold text-slate-800 mt-2 line-clamp-1">
                                {item.metadata?.crawlerName || item.metadata?.name || '수집된 데이터'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {item.metadata?.url && (
                                <p className="text-xs text-blue-600 font-mono truncate mb-2">{item.metadata.url}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(item.createdAt)}
                                </div>
                                {item.metadata?.itemsExtracted && (
                                    <div className="flex items-center gap-1">
                                        <Code className="h-3 w-3" />
                                        {item.metadata.itemsExtracted}건 추출
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {data.length === 0 && !loading && (
                    <Card className="col-span-full border-slate-200 shadow-sm">
                        <CardContent className="text-center py-16 text-slate-400">
                            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>수집된 데이터가 없습니다.</p>
                            <p className="text-xs mt-1">크롤러를 실행하면 수집된 데이터가 여기에 표시됩니다.</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            {selectedItem?.metadata?.crawlerName || '수집 데이터 상세'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : selectedItem && (
                        <div className="flex-1 overflow-auto space-y-4">
                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">소스 URL</p>
                                    <a 
                                        href={selectedItem.metadata?.url} 
                                        target="_blank" 
                                        rel="noopener" 
                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {selectedItem.metadata?.url}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">수집 일시</p>
                                    <p className="text-sm text-slate-700 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(selectedItem.createdAt)}
                                    </p>
                                </div>
                                {selectedItem.metadata?.pagesFound && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 mb-1">발견된 페이지</p>
                                        <p className="text-sm text-slate-700">{selectedItem.metadata.pagesFound}개</p>
                                    </div>
                                )}
                                {selectedItem.metadata?.itemsExtracted && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 mb-1">추출된 항목</p>
                                        <p className="text-sm text-emerald-600 font-bold">{selectedItem.metadata.itemsExtracted}건</p>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                    <Code className="h-3 w-3" />
                                    수집된 원본 내용 (HTML)
                                </p>
                                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-[400px] font-mono text-xs">
                                    <pre className="whitespace-pre-wrap">
                                        {selectedItem.content || '내용 없음'}
                                    </pre>
                                </div>
                            </div>

                            {/* Rendered Preview */}
                            {selectedItem.content && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        렌더링 미리보기
                                    </p>
                                    <div 
                                        className="bg-white border border-slate-200 p-4 rounded-lg overflow-auto max-h-[300px] prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedItem.content }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
