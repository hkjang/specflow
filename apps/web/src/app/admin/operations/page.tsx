'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, Play } from 'lucide-react';

export default function OperationsPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getOperations();
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to fetch operations", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleProcess = async (id: string, action: 'APPROVE' | 'REJECT' | 'RESOLVE') => {
        if (!confirm(`Are you sure you want to ${action} this task?`)) return;
        try {
            await adminApi.processOperation(id, action);
            fetchTasks(); // Refresh list
        } catch (error) {
            console.error("Failed to process operation", error);
            alert("Failed to process operation");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Operations Inbox</h2>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white">Total: {tasks.length}</Badge>
                    <Badge variant="destructive">Critical: {tasks.filter(t => t.priority >= 2).length}</Badge>
                </div>
            </div>

            <div className="grid gap-4">
                {tasks.map(task => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${getPriorityBg(task.priority)}`}>
                                    {getIcon(task.type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className="text-[10px]">{task.type}</Badge>
                                        <span className="text-xs text-gray-500 font-mono">#{task.id.substring(0, 8)}</span>
                                        <Badge variant="outline" className="text-[10px]">{task.targetType}: {task.targetId?.substring(0, 8)}</Badge>
                                    </div>
                                    <h4 className="font-medium text-gray-900">{task.reason || 'No description provided'}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Created {new Date(task.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {task.type === 'REVIEW' && (
                                    <>
                                        <Button size="sm" onClick={() => handleProcess(task.id, 'APPROVE')} className="text-xs h-8 gap-1 bg-green-600 hover:bg-green-700">
                                            <CheckCircle className="h-3 w-3" /> Approve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleProcess(task.id, 'REJECT')} className="text-xs h-8 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700">
                                            <XCircle className="h-3 w-3" /> Reject
                                        </Button>
                                    </>
                                )}
                                {task.type !== 'REVIEW' && (
                                    <Button size="sm" variant="default" className="text-xs h-8 gap-1">
                                        <Play className="h-3 w-3" /> Process
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!loading && tasks.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed text-sm">
                        No pending operations. Queue is empty.
                    </div>
                )}
            </div>
        </div>
    );
}

function getPriorityBg(priority: number) {
    if (priority >= 2) return 'bg-red-100 text-red-600';
    if (priority === 1) return 'bg-orange-100 text-orange-600';
    return 'bg-blue-100 text-blue-600';
}

function getIcon(type: string) {
    switch (type) {
        case 'REVIEW': return <Clock className="h-5 w-5" />;
        case 'APPROVAL': return <CheckCircle className="h-5 w-5" />;
        case 'CONFLICT_RESOLUTION': return <AlertTriangle className="h-5 w-5" />;
        default: return <Clock className="h-5 w-5" />;
    }
}
