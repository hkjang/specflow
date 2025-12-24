import { useEffect, useState } from 'react';
import { aiApi } from '@/lib/api';
// import { ScrollArea } from '@/components/ui/scroll-area';

interface Log {
    id: string;
    actionContext: string;
    status: string;
    createdAt: string;
    totalTokens: number;
}

export function AiHistoryLog() {
    const [logs, setLogs] = useState<Log[]>([]);

    useEffect(() => {
        aiApi.getLogs().then(res => setLogs(res.data)).catch(console.error);
    }, []);

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold mb-2">Recent Activities</h4>
            <div className="space-y-2">
                {logs.map(log => (
                    <div key={log.id} className="text-xs border-b pb-2">
                        <div className="flex justify-between">
                            <span className="font-medium">{log.actionContext || 'General Inquiry'}</span>
                            <span className={log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                                {log.status}
                            </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                            <span>{log.totalTokens} tokens</span>
                        </div>
                    </div>
                ))}
                {logs.length === 0 && <p className="text-xs text-muted-foreground p-2">No history yet.</p>}
            </div>
        </div>
    );
}
