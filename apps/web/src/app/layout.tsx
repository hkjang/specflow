import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { AiGlobalAssistant } from '@/components/ai/AiGlobalAssistant';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '요건 관리 시스템 (Requirement Management)',
    description: '효과적인 요건 관리 및 AI 분석',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <div className="flex h-screen bg-gray-50">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-8 relative">
                        {children}
                        <AiGlobalAssistant />
                    </main>
                </div>
            </body>
        </html>
    );
}
