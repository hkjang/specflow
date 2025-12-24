import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component, otherwise use standard HTML button
import { FileQuestion } from 'lucide-react'; // Example icon

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <FileQuestion className="h-12 w-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                페이지를 찾을 수 없습니다 (404)
            </h2>
            <p className="text-slate-500 mb-8 max-w-md">
                요청하신 페이지가 존재하지 않거나, 이동되었거나, 일시적으로 사용할 수 없습니다.
                (The page you are looking for does not exist.)
            </p>
            <Link href="/">
                <Button>
                    홈으로 돌아가기 (Go Home)
                </Button>
            </Link>
        </div>
    );
}
