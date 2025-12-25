'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api, aiApi, classificationApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Layers, Construction, Wand2, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

function CategoryForm({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        name: initialData?.name || '',
        level: initialData?.level || 'Industry',
        description: initialData?.description || ''
    });

    const isEdit = !!initialData;

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) return alert('필수 입력을 확인하세요');
        try {
            setLoading(true);
            if (isEdit) {
                await classificationApi.updateCategory(initialData.id, formData);
                alert('수정되었습니다.');
            } else {
                await classificationApi.createCategory(formData);
                alert('생성되었습니다.');
            }
            onSuccess();
        } catch (e) {
            alert(isEdit ? '수정 실패' : '생성 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>분류 코드 (Unique Code)</Label>
                <Input 
                    placeholder="예: IND-SCM" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                />
            </div>
            <div className="space-y-2">
                <Label>분류 명칭 (Name)</Label>
                <Input 
                    placeholder="예: 공급망 관리 (SCM)" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
             <div className="space-y-2">
                <Label>유형 (Level)</Label>
                <Select value={formData.level} onValueChange={v => setFormData({...formData, level: v})}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Industry">산업/업종 (Industry)</SelectItem>
                        <SelectItem value="Large">대분류 (Function)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>설명 (Description)</Label>
                <Textarea 
                    placeholder="분류에 대한 간략한 설명..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>
            <div className="pt-2 flex justify-end">
                <Button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600">
                    {loading ? '처리 중...' : (isEdit ? '수정 완료' : '생성 완료')}
                </Button>
            </div>
        </div>
    );
}

export default function ClassificationPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [projectId, setProjectId] = useState('default-project-id');
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [openAiDialog, setOpenAiDialog] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchProviders();
    }, [projectId]);

    const fetchCategories = async () => {
        try {
            const res = await classificationApi.getCategories();
            // Filter to top-level industries or large categories
            const topLevel = res.data.filter((c: any) => c.level === 'Industry' || c.level === 'Large');
            setCategories(topLevel);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await aiApi.getProviders();
            const active = res.data.filter((p: any) => p.isActive);
            setProviders(active);
            if (active.length > 0) setSelectedProviderId(active[0].id);
        } catch (err) { console.error(err); }
    };

    const createBusiness = async () => {
        // ... unused for now or redirect to seed logic
        alert('분류 체계는 관리자 페이지에서 수정이 권장됩니다.');
    };

    const handleAutoClassify = async () => {
        try {
            setProcessing(true);
            // Assuming this endpoint triggers the batch job
            await classificationApi.autoClassify({ projectId, providerId: selectedProviderId });
            alert('자동 분류 작업 완료. 요건 목록을 확인하세요.');
            setOpenAiDialog(false);
        } catch (error) {
            alert('자동 분류 요청 실패');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="분류 체계 관리 (Classification)"
                description="비즈니스 도메인 및 기능별 분류 체계를 정의하고 AI 자동 분류를 학습시킵니다."
                badgeText="TAXONOMY"
                steps={['작업장', '분류/태깅']}
            />

            <div className="flex justify-end gap-2">
                <Dialog open={openAiDialog} onOpenChange={setOpenAiDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                            <Wand2 className="h-4 w-4 mr-2" /> AI 자동 분류 실행
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>AI 자동 분류 실행</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <p className="text-sm text-slate-600">
                                등록된 미분류 요건에 대해 AI가 카테고리를 자동 분석합니다.
                            </p>
                            {/* Provider Select */}
                            <div className="space-y-2">
                                <Label>사용할 AI 모델</Label>
                                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="AI 모델 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <span className="font-bold">{p.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAutoClassify} disabled={processing || !selectedProviderId} className="bg-indigo-600 hover:bg-indigo-700">
                                {processing ? '분류 중...' : '분류 시작'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm">
                            <Plus className="h-4 w-4 mr-2" /> 분류 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 분류 체계 추가</DialogTitle>
                        </DialogHeader>
                        <CategoryForm onSuccess={() => {
                            fetchCategories();
                            // Close dialog hack or use controlled state
                        }} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        등록된 분류 체계가 없습니다. (시스템 설정을 확인하세요)
                    </div>
                )}
                {categories.map((cat) => (
                    <Card key={cat.id} className="p-5 hover:shadow-md transition-shadow border-slate-200 relative group">
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>분류 수정</DialogTitle>
                                    </DialogHeader>
                                    <CategoryForm initialData={cat} onSuccess={() => {
                                        fetchCategories();
                                        // Auto-close handled via re-render or explicit state if needed
                                    }} />
                                </DialogContent>
                            </Dialog>
                            
                            <button 
                                className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if(!confirm('정말 삭제하시겠습니까? 하위 분류가 있는 경우 주의하세요.')) return;
                                    try {
                                        await classificationApi.deleteCategory(cat.id);
                                        fetchCategories();
                                    } catch(err) { alert('삭제 실패'); }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-start justify-between mb-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {cat.code}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{cat.name}</h3>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{cat.description}</p>
                        
                        <div className="text-sm text-slate-600 flex flex-col gap-2 bg-slate-50 p-3 rounded h-40 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-1 border-b border-slate-200 pb-1">
                                <Tag className="h-3 w-3 text-slate-400" />
                                <span className="font-semibold text-xs">하위 분류 ({cat.children?.length || 0})</span>
                            </div>
                            {cat.children && cat.children.length > 0 ? (
                                <ul className="space-y-1">
                                    {cat.children.map((child: any) => (
                                        <li key={child.id} className="text-xs">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                <span className="font-medium">{child.name}</span>
                                                {child.code && <span className="p-0.5 bg-slate-100 text-[10px] rounded">{child.code}</span>}
                                            </div>
                                            {/* Nested Children (Level 3) */}
                                            {child.children && child.children.length > 0 && (
                                                <ul className="pl-3 mt-1 space-y-0.5 border-l-2 border-slate-100 ml-0.5">
                                                    {child.children.map((sub: any) => (
                                                        <li key={sub.id} className="text-[11px] text-slate-500">
                                                            - {sub.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">하위 분류 없음</p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
