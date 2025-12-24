import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming standard utils

interface AiFloatingButtonProps {
    onClick: () => void;
    isOpen: boolean;
}

export function AiFloatingButton({ onClick, isOpen }: AiFloatingButtonProps) {
    return (
        <Button
            onClick={onClick}
            className={cn(
                "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform hover:scale-105",
                isOpen && "rotate-180"
            )}
            size="icon"
        >
            <Brain className="h-6 w-6" />
        </Button>
    );
}
