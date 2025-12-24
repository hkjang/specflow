
import React from 'react';

interface FieldHelperProps {
    description?: string;
    example?: string;
}

export function FieldHelper({ description, example }: FieldHelperProps) {
    if (!description && !example) return null;

    return (
        <div className="mt-1.5 space-y-1">
            {description && (
                <p className="text-[13px] text-muted-foreground">
                    {description}
                </p>
            )}
            {example && (
                <p className="text-xs text-muted-foreground/80 italic pl-2 border-l-2 border-primary/20">
                    Ex: {example}
                </p>
            )}
        </div>
    );
}
