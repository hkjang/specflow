import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function AiSidebar({ isOpen, onClose, children }: AiSidebarProps) {
    return (
        <div
            className={cn(
                "fixed top-0 right-0 h-full w-[400px] bg-background border-l shadow-2xl z-40 transform transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        AI Assistant
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>

                {/* Optional Footer for Input area if managed externally or here */}
            </div>
        </div>
    );
}
