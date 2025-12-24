
import React from 'react';
import { BookOpen } from 'lucide-react';

interface PageGuideProps {
    title: string;
    description: string;
    purpose?: string;
}

export function PageGuide({ title, description, purpose }: PageGuideProps) {
    return (
        <div className="bg-muted/30 border-b p-4 mb-6">
            <div className="flex items-start gap-4 max-w-5xl mx-auto">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                    {purpose && (
                        <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-border/50 inline-block text-muted-foreground">
                            <span className="font-medium text-foreground mr-1">Purpose:</span>
                            {purpose}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
