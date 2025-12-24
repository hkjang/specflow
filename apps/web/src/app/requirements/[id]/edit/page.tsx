'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { FieldHelper } from '@/components/common/FieldHelper';
import { explanationApi } from '@/api/explanation';

export default function EditRequirementPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [explanations, setExplanations] = useState<any>({});

    useEffect(() => {
        if (id) {
            fetchData();
            fetchExplanations();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/requirements/${id}`);
            setTitle(res.data.title);
            setContent(res.data.content);
        } catch (error) {
            console.error('Failed to fetch requirement', error);
            alert('요건을 찾을 수 없습니다.');
            router.push('/admin/assets');
        } finally {
            setLoading(false);
        }
    };

    const fetchExplanations = async () => {
        try {
            const [titleExp, contentExp] = await Promise.all([
                explanationApi.getByKey('field.requirement.title'),
                explanationApi.getByKey('field.requirement.content')
            ]);
            setExplanations({
                title: titleExp || { content: '요건의 핵심 내용을 요약하여 입력하세요.', examples: '사용자 로그인 시스템' },
                content: contentExp || { content: '요건의 상세 내용을 명확하게 기술하세요.', examples: '시스템은 사용자가 이메일로 로그인할 수 있어야 한다...' }
            });
        } catch (e) {
            // fallback
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.patch(`/requirements/${id}`, { title, content });
            router.push('/admin/assets');
        } catch (error) {
            console.error('Failed to update requirement', error);
            alert('업데이트에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">로딩 중... (Loading)</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="요건 수정 (Edit Requirement)"
                description="기존 요건의 정의를 수정하고 업데이트합니다."
                badgeText="EDIT"
            />

            <Card>
                <CardHeader>
                    <CardTitle>요건 상세 정보 (Requirement Details)</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">제목 (Title)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full rounded border p-2 text-sm"
                                required
                            />
                            <FieldHelper
                                description={explanations.title?.content}
                                example={explanations.title?.examples}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">내용 (Content)</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full rounded border p-2 text-sm h-40"
                                required
                            />
                            <FieldHelper
                                description={explanations.content?.content}
                                example={explanations.content?.examples}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>취소 (Cancel)</Button>
                            <Button type="submit" disabled={submitting}>수정 완료 (Update)</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
