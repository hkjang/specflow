
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function RequirementEditPage() {
    const params = useParams();
    const id = params.id as string;

    // Mock Data for now - in real app fetch /api/requirements/:id
    const [requirement, setRequirement] = useState({
        id: '1',
        title: 'Login Page',
        content: 'User need log in with email.',
        risk: 'HIGH',
        status: 'DRAFT'
    });

    const [improved, setImproved] = useState<{ suggestion: string, reason: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // In real app: fetch(`/api/requirements/${id}`).then(...)
    }, [id]);

    const handleAIAssist = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/generation/improve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: requirement.content })
            });
            const data = await res.json();
            setImproved(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = () => {
        if (improved) {
            setRequirement({ ...requirement, content: improved.suggestion });
            setImproved(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Requirement</h1>
                    <p className="text-muted-foreground">{id}</p>
                </div>
                <div className="flex space-x-2">
                    <Badge variant={requirement.risk === 'HIGH' ? 'destructive' : 'default'}>
                        {requirement.risk} RISK
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Textarea
                                value={requirement.title}
                                onChange={(e) => setRequirement({ ...requirement, title: e.target.value })}
                                rows={1}
                                className="resize-none font-semibold text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={requirement.content}
                                onChange={(e) => setRequirement({ ...requirement, content: e.target.value })}
                                rows={6}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={handleAIAssist} disabled={loading}>
                                <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                                {loading ? 'Analyzing...' : 'AI Improve'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {improved && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                        <CardHeader>
                            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center">
                                <Sparkles className="mr-2 h-5 w-5" />
                                AI Suggestion
                            </CardTitle>
                            <CardDescription>
                                Better clarity and professional format.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-md border shadow-sm">
                                <p className="font-mono text-sm">{improved.suggestion}</p>
                            </div>

                            <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                                <span>{improved.reason}</span>
                            </div>

                            <Button onClick={applySuggestion} className="w-full">
                                Apply Suggestion <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
