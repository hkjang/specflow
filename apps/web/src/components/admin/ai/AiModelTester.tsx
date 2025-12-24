import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aiApi } from '@/lib/api';

export function AiModelTester() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        if (!prompt) return;
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await aiApi.testProvider(prompt);
            setResponse(JSON.stringify(res.data, null, 2));
        } catch (err: any) {
            setError(err.message || '응답을 받지 못했습니다. (Failed to get response)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>AI 연결 테스트 (Connection Tester)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex space-x-2">
                    <Input
                        placeholder="테스트 프롬프트를 입력하세요..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Button onClick={handleTest} disabled={loading}>
                        {loading ? '테스트 중...' : '전송'}
                    </Button>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                {response && (
                    <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-[300px]">
                        <pre className="text-xs">{response}</pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
