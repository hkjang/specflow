'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: { email: string };
    sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    sentimentScore?: number;
}

export function CommentSection({ requirementId }: { requirementId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [requirementId]);

    const fetchComments = async () => {
        try {
            const res = await adminApi.getComments(requirementId);
            setComments(res.data);
        } catch (e) {
            console.error('Failed to fetch comments');
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setLoading(true);
        try {
            await adminApi.addComment(requirementId, newComment);
            setNewComment('');
            fetchComments();
        } catch (e) {
            console.error('Failed to post comment');
        } finally {
            setLoading(false);
        }
    };

    const getSentimentBadge = (sentiment?: string) => {
        if (!sentiment) return null;
        switch (sentiment) {
            case 'POSITIVE': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive</Badge>;
            case 'NEGATIVE': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>;
            default: return <Badge variant="outline" className="text-gray-500">Neutral</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="font-semibold text-lg">의견 및 피드백 (Comments)</h3>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Textarea
                        placeholder="리뷰나 의견을 남겨주세요... (Add your review)"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleSubmit} disabled={loading || !newComment.trim()}>
                            {loading ? '등록 중...' : '댓글 등록'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 mt-6">
                    {comments.map(comment => (
                        <div key={comment.id} className="p-4 rounded-lg border bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{comment.author?.email || '알 수 없는 사용자'}</span>
                                    <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                </div>
                                {getSentimentBadge(comment.sentiment)}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">아직 댓글이 없습니다. 첫 번째 리뷰를 남겨보세요.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
