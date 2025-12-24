'use client';

import { useState } from 'react';
import { AiFloatingButton } from './AiFloatingButton';
import { AiSidebar } from './AiSidebar';
import { AiHistoryLog } from './AiHistoryLog';
import { AiModelTester } from '../admin/ai/AiModelTester'; // Re-use tester as simple chat for now, or build a Chat Interface
// Ideally we want a specialized "Chat" component here, but for now we can put placeholders or reuse History.

export function AiGlobalAssistant() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <AiFloatingButton onClick={() => setIsOpen(!isOpen)} isOpen={isOpen} />
            <AiSidebar isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            I am your AI Assistant. I can help you analyzing requirements, finding trends, or answer questions about the system.
                        </p>
                        {/* Placeholder for standard Chat Interface */}
                        <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-500 text-center border border-dashed">
                            Chat Interface Coming Soon...
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <AiHistoryLog />
                    </div>
                </div>
            </AiSidebar>
        </>
    );
}
