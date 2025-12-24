import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface AiResponsePanelProps {
    title?: string;
    content: string;
    onApply?: () => void;
    isLoading?: boolean;
}

export function AiResponsePanel({ title = 'AI Suggestion', content, onApply, isLoading }: AiResponsePanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm font-medium text-blue-800">{title}</CardTitle>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 whitespace-pre-wrap">
                {content}

                {onApply && (
                    <div className="mt-4 flex justify-end">
                        <Button size="sm" onClick={onApply}>Apply to Field</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
