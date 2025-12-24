import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Select } from '@/components/ui/select'; // Assuming Select exists, if not use native select

interface AiProviderFormProps {
    initialData?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function AiProviderForm({ initialData, onSubmit, onCancel }: AiProviderFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: initialData?.type || 'OPENAI',
        endpoint: initialData?.endpoint || '',
        apiKey: initialData?.apiKey || '',
        models: initialData?.models || '',
        priority: initialData?.priority || 1,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            priority: Number(formData.priority),
        });
    };

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>{initialData ? 'AI 모델 수정 (Edit Provider)' : '새 AI 모델 추가 (Add New AI Provider)'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">공급자 명칭 (Provider Name)</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">공급자 유형 (Type)</Label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="OPENAI">OpenAI</option>
                            <option value="VLLM">vLLM</option>
                            <option value="OLLAMA">Ollama</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="endpoint">API 엔드포인트 URL (Endpoint)</Label>
                        <Input id="endpoint" name="endpoint" value={formData.endpoint} onChange={handleChange} placeholder="https://api.openai.com/v1" />
                        <p className="text-xs text-muted-foreground">vLLM/Ollama의 경우 전체 Base URL을 입력하세요 (예: http://localhost:11434/v1)</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="models">모델 명 (Model Name)</Label>
                        <Input id="models" name="models" value={formData.models} onChange={handleChange} placeholder="예: gpt-4, llama3" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="apiKey">API 키 (API Key)</Label>
                        <Input id="apiKey" name="apiKey" type="password" value={formData.apiKey} onChange={handleChange} placeholder="sk-..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priority">우선순위 (Priority)</Label>
                        <Input id="priority" name="priority" type="number" value={formData.priority} onChange={handleChange} />
                    </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button" onClick={onCancel}>취소</Button>
                    <Button type="submit">저장</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
