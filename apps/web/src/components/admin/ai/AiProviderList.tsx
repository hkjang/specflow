import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Assuming Badge exists

interface Provider {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    priority: number;
    models: string;
    endpoint: string;
}

interface AiProviderListProps {
    providers: Provider[];
    onEdit: (provider: Provider) => void;
    onDelete: (id: string) => void;
    onToggleActive: (provider: Provider) => void;
}

export function AiProviderList({ providers, onEdit, onDelete, onToggleActive }: AiProviderListProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
                <Card key={provider.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {provider.name}
                        </CardTitle>
                        <Badge variant={provider.isActive ? "default" : "secondary"}>
                            {provider.type}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{provider.models}</div>
                        <p className="text-xs text-muted-foreground truncate" title={provider.endpoint}>
                            {provider.endpoint || '기본 엔드포인트 (Default)'}
                        </p>
                        <div className="mt-4 flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(provider)}>수정</Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(provider.id)}>삭제</Button>
                            <Button variant="ghost" size="sm" onClick={() => onToggleActive(provider)}>
                                {provider.isActive ? '비활성화' : '활성화'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
