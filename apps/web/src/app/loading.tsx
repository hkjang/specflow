import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600 font-medium">로딩 중... (Loading)</p>
            <p className="text-sm text-slate-400 mt-1">잠시만 기다려주세요.</p>
        </div>
    );
}
