'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Share2, History } from 'lucide-react';

export default function DataMartPage() {
    const [datasets, setDatasets] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await adminApi.getDataMartDatasets();
                setDatasets(res.data);
            } catch (error) {
                console.error("Failed to fetch datasets", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Data Mart</h2>
                    <p className="text-gray-500">Manage curated datasets for external consumption.</p>
                </div>
                <Button>
                    <Database className="mr-2 h-4 w-4" /> Create Snapshot
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {datasets.map(ds => (
                    <Card key={ds.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{ds.name}</CardTitle>
                                <Badge variant={ds.status === 'PUBLISHED' ? 'default' : 'secondary'}>{ds.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="text-sm text-gray-500 space-y-2">
                                <div className="flex justify-between">
                                    <span>Version</span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{ds.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Records</span>
                                    <span>{ds.records.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Created</span>
                                    <span>{ds.created}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2 mt-auto">
                                <Button size="sm" variant="outline" className="flex-1">
                                    <Download className="mr-2 h-4 w-4" /> Export
                                </Button>
                                <Button size="sm" variant="ghost">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-4 w-4" /> Access Logs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500 py-4 text-center">
                        No recent external access detected.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
