'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                오류가 발생했습니다 (Something went wrong)
            </h2>
            <p className="text-slate-500 mb-8 max-w-md">
                일시적인 시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.<br />
                문제가 지속되면 관리자에게 문의하세요.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()} variant="default">
                    다시 시도 (Try again)
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="outline">
                    홈으로 이동 (Go Home)
                </Button>
            </div>
        </div>
    );
}
