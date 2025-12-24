'use client';

import React, { useState } from 'react';
import { knowledgeApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

type ArtifactType = 'ARCHITECTURE' | 'UI' | 'API' | 'TEST';

export default function ArtifactGenerationPage() {
    const [projectId, setProjectId] = useState('project-123'); // Default for demo
    const [selectedType, setSelectedType] = useState<ArtifactType>('ARCHITECTURE');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent('');
        try {
            const res = await knowledgeApi.generateArtifact(projectId, selectedType);
            setGeneratedContent(res.data.content || JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.error(e);
            setGeneratedContent('아티팩트 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 p-8 h-screen flex flex-col box-border overflow-hidden">
            <PageHeader
                title="산출물 생성기 (Artifact Generator)"
                description="요건을 기반으로 실행 가능한 산출물(설계, UI, API, 테스트 등)을 자동 생성합니다."
                badgeText="GENERATOR"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                {/* Controls Sidebar */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">대상 프로젝트 (Target Project)</label>
                            <input
                                type="text"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">산출물 유형 (Artifact Type)</label>
                            <div className="space-y-2">
                                <ArtifactOption
                                    type="ARCHITECTURE"
                                    label="아키텍처 설계 (Architecture)"
                                    desc="시스템 컴포넌트 및 데이터 흐름"
                                    selected={selectedType === 'ARCHITECTURE'}
                                    onClick={() => setSelectedType('ARCHITECTURE')}
                                />
                                <ArtifactOption
                                    type="UI"
                                    label="UI/UX 정의 (UI Definition)"
                                    desc="화면 레이아웃 및 인터랙션"
                                    selected={selectedType === 'UI'}
                                    onClick={() => setSelectedType('UI')}
                                />
                                <ArtifactOption
                                    type="API"
                                    label="API 명세 (API Spec)"
                                    desc="OpenAPI/Swagger 명세서"
                                    selected={selectedType === 'API'}
                                    onClick={() => setSelectedType('API')}
                                />
                                <ArtifactOption
                                    type="TEST"
                                    label="테스트 케이스 (Test Cases)"
                                    desc="Gherkin/Jest 테스트 시나리오"
                                    selected={selectedType === 'TEST'}
                                    onClick={() => setSelectedType('TEST')}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-md font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex justify-center items-center"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    AI 생성 중... (Thinking)
                                </>
                            ) : (
                                '산출물 생성 (Generate)'
                            )}
                        </button>
                    </div>
                </div>

                {/* Output Area */}
                <div className="lg:col-span-3 bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col max-h-full">
                    <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                        <span className="text-slate-300 text-sm font-mono">Output Preview</span>
                        {generatedContent && (
                            <button className="text-xs text-indigo-400 hover:text-indigo-300">클립보드 복사</button>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto p-6 min-h-0">
                        {generatedContent ? (
                            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{generatedContent}</pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <p>유형을 선택하고 '산출물 생성' 버튼을 클릭하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ArtifactOption({ type, label, desc, selected, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg cursor-pointer border transition-all ${selected
                ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
        >
            <div className="font-medium text-slate-800 text-sm">{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
        </div>
    );
}
