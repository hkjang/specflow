'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card'; // Fallback again if needed

function FallbackCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm mb-4">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            {children}
        </div>
    );
}

function CategoryItem({ category, level = 0 }: { category: any, level?: number }) {
    return (
        <div className="border-l-2 border-gray-200 pl-4 py-1" style={{ marginLeft: level * 12 }}>
            <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{category.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">{category.code}</span>
                <span className="text-xs text-gray-500">[{category.level}]</span>
            </div>
            {category.description && (
                <p className="text-xs text-gray-400 mb-1">{category.description}</p>
            )}
            {category.children && category.children.length > 0 && (
                <div className="mt-1">
                    {category.children.map((child: any) => (
                        <CategoryItem key={child.id} category={child} level={0} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Transform flat list to tree if API returns flat list. 
// But ClassificationService.getCategories uses include: { children: true }, 
// so it returns root categories if we filter for roots, OR all categories with children populated.
// Note: findMany without 'where parentId: null' returns duplicates (parents AND children as top level).
// I should update backend to only return roots, or handle it here.
// For now, let's assume I fetch all and build tree, or ideally update backend to return tree.

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/classification/categories');
            // The backend returns ALL categories.
            // We should filter for those with parentId === null for the top level display
            // But wait, the backend `include: { children: true }` only goes one level deep by default in Prisma unless customized?
            // Actually `include: { children: true }` is just 1 level. 
            // For a full tree, we need recursive queries or fetch all and build tree in JS.
            // Given the task size, let's just render the flat list for now or simple filtering.

            // Let's filter client side for roots logic if possible, 
            // but for now displaying them as a list grouped by Large/Medium/Small might be easier.
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Simple grouping by Level
    const largeCats = categories.filter(c => c.level === 'Large');
    const mediumCats = categories.filter(c => c.level === 'Medium');
    const smallCats = categories.filter(c => c.level === 'Small');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Category Management</h1>

            <FallbackCard title="Categories Overview">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg border-b pb-2">Large (Domain)</h3>
                        {largeCats.map(c => (
                            <div key={c.id} className="p-2 bg-gray-50 rounded border">
                                <span className="font-bold">{c.name}</span> <span className="text-xs text-gray-500">({c.code})</span>
                                <p className="text-xs text-gray-400">{c.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg border-b pb-2">Medium (Group)</h3>
                        {mediumCats.map(c => (
                            <div key={c.id} className="p-2 bg-gray-50 rounded border">
                                <span className="font-bold">{c.name}</span>
                                <p className="text-xs text-gray-400">{c.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg border-b pb-2">Small (Leaf)</h3>
                        {smallCats.map(c => (
                            <div key={c.id} className="p-2 bg-gray-50 rounded border">
                                <span className="font-bold">{c.name}</span>
                                <p className="text-xs text-gray-400">{c.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </FallbackCard>
        </div>
    );
}
