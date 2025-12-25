'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, CheckCircle, Trash2, Edit2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { partnerApi, projectApi } from '@/lib/api';

export default function PartnerPage() {
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [partners, setPartners] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [allProjects, setAllProjects] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pRes, sRes, projRes] = await Promise.all([
                partnerApi.getAll(),
                partnerApi.getStats(),
                projectApi.getAll()
            ]);
            setPartners(pRes.data);
            setStats(sRes.data);
            setAllProjects(projRes.data);
        } catch(e) { console.error(e); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        
        // Collect checked projects
        const checkedProjects = Array.from(form.querySelectorAll('input[name="projectIds"]:checked'))
            .map((input: any) => input.value);
        
        try {
            setLoading(true);
            await partnerApi.create({ name, type, email, projectIds: checkedProjects });
            await loadData();
            setShowRegisterModal(false);
            form.reset();
        } catch(e) {
            alert('등록 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartner) return;
        
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('edit_name') as HTMLInputElement).value;
        const type = (form.elements.namedItem('edit_type') as HTMLInputElement).value;
        const email = (form.elements.namedItem('edit_email') as HTMLInputElement).value;
        const status = (form.elements.namedItem('edit_status') as HTMLInputElement).value;

        const checkedProjects = Array.from(form.querySelectorAll('input[name="edit_projectIds"]:checked'))
            .map((input: any) => input.value);

        try {
            setLoading(true);
            await partnerApi.update(selectedPartner.id, { name, type, email, status, projectIds: checkedProjects });
            await loadData();
            setShowEditModal(false);
            setSelectedPartner(null);
        } catch(e) {
            alert('수정 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`'${name}' 파트너를 삭제하시겠습니까?`)) return;
        try {
            await partnerApi.delete(id);
            loadData();
        } catch(e) { alert('삭제 실패'); }
    };

    const handleApprove = async (id: string) => {
        try {
            await partnerApi.update(id, { status: 'Active' });
            loadData();
        } catch(e) { alert('승인 실패'); }
    };

    const openEditModal = (partner: any) => {
        setSelectedPartner(partner);
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6 container mx-auto max-w-7xl">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="파트너 포털 (Partner Portal)"
                    description="협력사 관리 및 프로젝트 연동 현황을 확인합니다."
                    badgeText="COLLABORATION"
                />
                <Button onClick={() => setShowRegisterModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
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
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Active: {stats.active}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">진행 중 프로젝트</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{partners.reduce((sum, p) => sum + (p.projects?.length || 0), 0)}</div>
                        <p className="text-xs text-muted-foreground">협업 프로젝트 총계</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">평균 정확도 기여</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">92.4%</div>
                        <p className="text-xs text-muted-foreground">상위 10% 수준 (Simulation)</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>등록된 파트너 (Registered Partners)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {partners.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">등록된 파트너가 없습니다.</div>
                        ) : partners.map(partner => (
                            <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group">
                                <div>
                                    <h4 className="font-bold flex items-center gap-2">
                                        {partner.name}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            partner.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {partner.status}
                                        </span>
                                    </h4>
                                    <p className="text-sm text-gray-500">{partner.type} | Projects: {partner.projects?.length || 0} | {partner.email || 'No Email'}</p>
                                    {partner.projects && partner.projects.length > 0 && (
                                        <div className="mt-1 flex gap-1 flex-wrap">
                                            {partner.projects.map((p: any) => (
                                                <span key={p.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{p.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                     {partner.status !== 'Active' && (
                                         <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                            onClick={() => handleApprove(partner.id)} title="승인 (Approve)">
                                            <Check className="h-4 w-4" />
                                         </Button>
                                     )}
                                     <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        onClick={() => openEditModal(partner)} title="수정 (Edit)">
                                        <Edit2 className="h-4 w-4" />
                                     </Button>
                                     <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(partner.id, partner.name)}>
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Registration Modal */}
            <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>신규 파트너 등록</DialogTitle>
                        <DialogDescription>협력사 정보를 입력해주세요.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">회사명</label>
                            <Input name="name" required placeholder="Company Name" />
                        </div>
                        <div>
                             <label className="text-sm font-medium">담당자 이메일</label>
                             <Input name="email" type="email" placeholder="contact@partner.com" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">업종 (Type)</label>
                            <select name="type" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                <option value="Technology">Technology</option>
                                <option value="Consulting">Consulting</option>
                                <option value="Resource">HR/Resource</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">참여 프로젝트 (Projects)</label>
                            <div className="mt-1 border rounded-md p-2 h-24 overflow-y-auto space-y-1">
                                {allProjects.map(project => (
                                    <div key={project.id} className="flex items-center space-x-2">
                                        <input type="checkbox" name="projectIds" value={project.id} id={`reg-proj-${project.id}`} />
                                        <label htmlFor={`reg-proj-${project.id}`} className="text-sm cursor-pointer">{project.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowRegisterModal(false)}>취소</Button>
                            <Button type="submit" disabled={loading}>등록</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>파너 정보 수정</DialogTitle>
                        <DialogDescription>협력사 정보를 수정합니다.</DialogDescription>
                    </DialogHeader>
                    {selectedPartner && (
                        <form onSubmit={handleUpdate} className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">회사명</label>
                                <Input name="edit_name" required defaultValue={selectedPartner.name} />
                            </div>
                            <div>
                                 <label className="text-sm font-medium">담당자 이메일</label>
                                 <Input name="edit_email" type="email" defaultValue={selectedPartner.email} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">업종 (Type)</label>
                                    <select name="edit_type" defaultValue={selectedPartner.type} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                        <option value="Technology">Technology</option>
                                        <option value="Consulting">Consulting</option>
                                        <option value="Resource">HR/Resource</option>
                                        <option value="Legal">Legal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">상태 (Status)</label>
                                    <select name="edit_status" defaultValue={selectedPartner.status} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                        <option value="Pending">Pending</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">참여 프로젝트 (Projects)</label>
                                <div className="mt-1 border rounded-md p-2 h-24 overflow-y-auto space-y-1">
                                    {allProjects.map(project => (
                                        <div key={project.id} className="flex items-center space-x-2">
                                            <input 
                                                type="checkbox" 
                                                name="edit_projectIds" 
                                                value={project.id} 
                                                id={`edit-proj-${project.id}`} 
                                                defaultChecked={selectedPartner.projects?.some((p: any) => p.id === project.id)}
                                            />
                                            <label htmlFor={`edit-proj-${project.id}`} className="text-sm cursor-pointer">{project.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>취소</Button>
                                <Button type="submit" disabled={loading}>수정 완료</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
