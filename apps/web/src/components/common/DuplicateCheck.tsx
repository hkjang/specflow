import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DuplicateCheckProps {
    content: string;
}

export function DuplicateCheck({ content }: DuplicateCheckProps) {
    const [duplicates, setDuplicates] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        if (!content || content.length < 10) return;
        setLoading(true);
        setDuplicates(null);
        try {
            const res = await adminApi.checkDuplicates(content);
            setDuplicates(res.data);
        } catch (error) {
            console.error('Check failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
                <Button variant="outline" size="sm" onClick={handleCheck} disabled={loading || !content}>
                    {loading ? 'Checking...' : 'Check for Duplicates'}
                </Button>
            </div>

            {duplicates && duplicates.length === 0 && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>No Duplicates Found</AlertTitle>
                    <AlertDescription className="text-green-700">
                        This requirement appears unique among recent entries.
                    </AlertDescription>
                </Alert>
            )}

            {duplicates && duplicates.length > 0 && (
                <div className="space-y-2">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Potential Duplicates Found</AlertTitle>
                        <AlertDescription>
                            We found similar existing requirements. Please review.
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-2">
                        {duplicates.map((dup: any) => (
                            <div key={dup.id} className="p-3 border rounded-md bg-white text-sm">
                                <div className="font-semibold text-gray-800">{dup.code} - {dup.title}</div>
                                <div className="text-gray-600 mt-1">Reason: {dup.reason}</div>
                                <div className="text-xs text-gray-400 mt-1">Confidence: {(dup.confidence * 100).toFixed(0)}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
