
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageGuide } from '@/components/common/PageGuide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { explanationApi, Explanation } from '@/api/explanation';
import { Pencil, Save, RotateCcw, Plus } from 'lucide-react';

export default function ExplanationAdminPage() {
    const [explanations, setExplanations] = useState<Explanation[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Explanation>>({});

    useEffect(() => {
        loadExplanations();
    }, []);

    const loadExplanations = async () => {
        try {
            const data = await explanationApi.getAll();
            setExplanations(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (exp: Explanation) => {
        setEditingId(exp.id);
        setEditForm(exp);
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            await explanationApi.update(editingId, editForm);
            setEditingId(null);
            loadExplanations();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    // Quick creation for testing
    const handleCreateDefault = async () => {
        try {
            // Use AI to generate defaults for core menu items
            const itemsToGenerate = [
                { category: 'MENU', key: 'menu.requirements', context: 'Menu item' },
                { category: 'MENU', key: 'menu.dashboard', context: 'Menu item' },
                { category: 'SCREEN', key: 'screen.requirements.list', context: 'Requirements Management List Screen' },
                { category: 'FIELD', key: 'field.requirement.title', context: 'Requirement Title Input' },
            ];

            for (const item of itemsToGenerate) {
                await api.post('/explanations/generate', item).catch(() => { });
            }
            loadExplanations();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <PageGuide
                    title="설명 자산 관리 (Explanation Assets)"
                    description="시스템의 모든 한국어 설명 문구를 관리합니다. AI를 사용하여 누락된 설명을 자동 생성할 수 있습니다."
                />
                <Button onClick={handleCreateDefault} variant="outline" size="sm" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" /> 기본값 생성 (Seed Defaults)
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>설명 자산 목록 ({explanations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {explanations.map(exp => (
                            <div key={exp.id} className="border p-4 rounded-lg bg-gray-50/50 flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-gray-200 px-1 rounded text-gray-600">{exp.category}</span>
                                        <span className="text-xs font-mono text-blue-600">{exp.key}</span>
                                    </div>

                                    {editingId === exp.id ? (
                                        <div className="space-y-2 mt-2">
                                            <input
                                                className="w-full p-2 border rounded text-sm font-semibold"
                                                value={editForm.title || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="제목 (Title)"
                                            />
                                            <textarea
                                                className="w-full p-2 border rounded text-sm"
                                                value={editForm.content || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                                placeholder="내용 (Content)"
                                                rows={2}
                                            />
                                            <input
                                                className="w-full p-2 border rounded text-sm text-gray-500"
                                                value={editForm.examples || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, examples: e.target.value }))}
                                                placeholder="예시 (Examples)"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="ghost" onClick={handleCancel}>취소</Button>
                                                <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> 저장</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="font-semibold text-sm">{exp.title}</h3>
                                            <p className="text-sm text-gray-700">{exp.content}</p>
                                            {exp.examples && <p className="text-xs text-gray-500 italic">예시: {exp.examples}</p>}
                                        </>
                                    )}
                                </div>

                                {editingId !== exp.id && (
                                    <div>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {explanations.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                설명 자산이 없습니다. '기본값 생성'을 클릭하여 시작하세요.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
