import { useEffect, useState } from 'react';
import { AiResponsePanel } from '@/components/ai/AiResponsePanel';
import { adminApi } from '@/lib/api';

export function AiTrendSummary() {
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const res = await adminApi.getTrendSummary('daily');
                setSummary(res.data.summary);
            } catch (e) {
                console.error('Failed to load trend summary', e);
                setSummary('Failed to load analysis.');
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    if (!summary && !loading) return null;

    return (
        <div className="mb-6">
            <AiResponsePanel
                title="AI Trend Analysis"
                content={summary}
                isLoading={loading}
            />
        </div>
    );
}
