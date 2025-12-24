'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DuplicateCheck } from '@/components/common/DuplicateCheck';
import { api } from '@/lib/api';
import { FieldHelper } from '@/components/common/FieldHelper';
import { PageHeader } from '@/components/layout/PageHeader';
import { explanationApi, Explanation } from '@/api/explanation';
import { FileText, Sparkles } from 'lucide-react';

export default function NewRequirementPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [explanations, setExplanations] = useState<Record<string, Explanation>>({});

    useEffect(() => {
        // Fetch explanations for this screen fields
        Promise.all([
            explanationApi.getByKey('screen.requirements.new'),
            explanationApi.getByKey('field.requirement.title'),
            explanationApi.getByKey('field.requirement.content')
        ]).then(([screenExp, titleExp, contentExp]) => {
            setExplanations({
                screen: screenExp || { title: '신규 요건 등록', content: '새로운 비즈니스 요건을 정의합니다.' },
                title: titleExp || { content: '요건을 식별할 수 있는 간결한 제목을 입력하세요.', examples: '예: 사용자 로그인 인증 시스템' },
                content: contentExp || { content: '요건의 상세 기능과 제약사항을 기술하세요.', examples: '예: 시스템은 사용자가 이메일과 비밀번호를 사용하여 로그인할 수 있도록 해야 합니다.' }
            } as any);
        }).catch(() => {
            // Fallback
            setExplanations({
                screen: { title: '신규 요건 등록', content: '새로운 비즈니스 요건을 정의합니다.' },
                title: { content: '요건을 식별할 수 있는 간결한 제목을 입력하세요.', examples: '예: 사용자 로그인 인증 시스템' },
                content: { content: '요건의 상세 기능과 제약사항을 기술하세요.', examples: '예: 시스템은 사용자가 이메일과 비밀번호를 사용하여 로그인할 수 있도록 해야 합니다.' }
            } as any);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/requirements', { title, content });
            router.push('/requirements');
        } catch (error) {
            console.error('Failed to create requirement', error);
            alert('요건 등록에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="신규 요건 등록 (New Requirement)"
                description="새로운 비즈니스 요건을 등록하고 AI 중복 검사를 수행합니다."
                badgeText="DRAFT"
                steps={['요건 정의', '신규 등록']}
            />

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                <FileText className="h-4 w-4 text-blue-500" />
                                요건 기본 정보
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                        요건 명 (Title) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full rounded-md border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
                                        placeholder="예: 클라우드 비용 모니터링 대시보드"
                                        required
                                    />
                                    <FieldHelper
                                        description={explanations.title?.content}
                                        example={explanations.title?.examples}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                        상세 내용 (Content) <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        className="w-full rounded-md border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm min-h-[200px] leading-relaxed resize-none p-3"
                                        placeholder="요건의 배경, 목적, 주요 기능을 상세히 기술하세요..."
                                        required
                                    />
                                    <FieldHelper
                                        description={explanations.content?.content}
                                        example={explanations.content?.examples}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-6">
                                    <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">취소</Button>
                                    <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 font-bold px-6">
                                        {submitting ? '등록 중...' : '요건 등록하기'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                AI 품질 가이드 (AI Assistant)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-indigo-700 leading-relaxed bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                                요건을 등록하기 전에 유사한 요건이 있는지 확인하여 중복을 방지하세요.
                            </p>
                            <DuplicateCheck content={content} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
