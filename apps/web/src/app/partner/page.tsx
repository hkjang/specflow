
'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, CheckCircle } from 'lucide-react';

export default function PartnerPage() {
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [partners, setPartners] = useState([
        { id: 1, name: 'Alpha Solutions', type: 'Technology', status: 'Active', projects: 3 },
        { id: 2, name: 'Global Finance IT', type: 'Consulting', status: 'Active', projects: 12 },
        { id: 3, name: 'NextGen AI', type: 'AI Provider', status: 'Pending', projects: 0 },
    ]);

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Registration
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        
        setPartners([...partners, { 
            id: partners.length + 1, 
            name, 
            type, 
            status: 'Pending', 
            projects: 0 
        }]);
        setShowRegisterModal(false);
        alert('파트너 등록 요청이 접수되었습니다.');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="파트너 포털 (Partner Portal)"
                    description="협력사 관리 및 프로젝트 연동 현황을 확인합니다."
                    badgeText="COLLABORATION"
                />
                <Button onClick={() => setShowRegisterModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> 파트너 등록 (Register)
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 파트너사</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{partners.length}</div>
                        <p className="text-xs text-muted-foreground">Active: {partners.filter(p => p.status === 'Active').length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">진행 중 프로젝트</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">15</div>
                        <p className="text-xs text-muted-foreground">지난달 대비 +2</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">평균 정확도 기여</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">92.4%</div>
                        <p className="text-xs text-muted-foreground">상위 10% 수준</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>등록된 파트너 (Registered Partners)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {partners.map(partner => (
                            <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h4 className="font-bold">{partner.name}</h4>
                                    <p className="text-sm text-gray-500">{partner.type} | Projects: {partner.projects}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    partner.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {partner.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[400px] bg-white">
                        <CardHeader>
                            <CardTitle>신규 파트너 등록</CardTitle>
                            <CardDescription>협력사 정보를 입력해주세요.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">회사명</label>
                                    <input name="name" required className="w-full border p-2 rounded" placeholder="Company Name" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">업종 (Type)</label>
                                    <select name="type" className="w-full border p-2 rounded">
                                        <option value="Technology">Technology</option>
                                        <option value="Consulting">Consulting</option>
                                        <option value="Resource">HR/Resource</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button type="button" variant="outline" onClick={() => setShowRegisterModal(false)}>취소</Button>
                                    <Button type="submit">등록</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
