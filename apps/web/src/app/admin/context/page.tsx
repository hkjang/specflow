'use client';

import React, { useState } from 'react';
import { knowledgeApi } from '@/lib/api';

export default function ContextSettings() {
    const [projectId, setProjectId] = useState('global-default'); // Managing for a default/global context or specific project
    const [techStack, setTechStack] = useState('{\n  "frontend": "React",\n  "backend": "NestJS",\n  "database": "PostgreSQL"\n}');
    const [styleGuide, setStyleGuide] = useState('{\n  "tone": "formal",\n  "language": "Korean"\n}');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await knowledgeApi.updateProjectContext(projectId, {
                techStack: JSON.parse(techStack),
                styleGuide: JSON.parse(styleGuide),
            });
            alert('Context settings saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save settings. Check JSON format.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-2 text-slate-800">Organization Context Settings</h1>
            <p className="text-slate-500 mb-8">
                Define the technological and stylistic constraints for your organization.
                The Adaptation Engine uses this to automatically transform requirements.
            </p>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Project ID</label>
                    <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md bg-slate-50"
                        disabled // For now, let's fix it to a default or allow selection later
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Standard Tech Stack (JSON)</label>
                    <p className="text-xs text-slate-400 mb-2">Define allowed frameworks, languages, and databases.</p>
                    <textarea
                        value={techStack}
                        onChange={(e) => setTechStack(e.target.value)}
                        rows={6}
                        className="w-full p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Linguistic Style Guide (JSON)</label>
                    <p className="text-xs text-slate-400 mb-2">Define tone, terminology, and formatting rules.</p>
                    <textarea
                        value={styleGuide}
                        onChange={(e) => setStyleGuide(e.target.value)}
                        rows={6}
                        className="w-full p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save Context Standard'}
                    </button>
                </div>
            </div>
        </div>
    );
}
