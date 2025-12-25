'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Folder, Calendar, MoreVertical, Edit2, Trash2, Users, Search, Check, ChevronsUpDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { projectApi, partnerApi } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
    const [allPartners, setAllPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Create State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', partnerIds: [] as string[] });

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', partnerIds: [] as string[] });

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProjects(projects);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredProjects(projects.filter(p => 
                p.name.toLowerCase().includes(lower) || 
                p.description?.toLowerCase().includes(lower)
            ));
        }
    }, [searchQuery, projects]);

    const loadData = async () => {
        try {
            const [projRes, partRes] = await Promise.all([
                projectApi.getAll(),
                partnerApi.getAll()
            ]);
            setProjects(projRes.data);
            setFilteredProjects(projRes.data);
            setAllPartners(partRes.data);
        } catch(e) { 
            console.error(e);
            toast.error('데이터를 불러오는데 실패했습니다.');
        }
    };

    const handleCreateChange = (field: string, value: any) => {
        setCreateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditChange = (field: string, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    // MultiSelect Helper
    const togglePartner = (id: string, formType: 'create' | 'edit') => {
        const updater = formType === 'create' ? setCreateForm : setEditForm;
        updater(prev => {
            const ids = prev.partnerIds.includes(id) 
                ? prev.partnerIds.filter(p => p !== id)
                : [...prev.partnerIds, id];
            return { ...prev, partnerIds: ids };
        });
    };

    const handleCreate = async () => {
        if (!createForm.name.trim()) return;
        try {
            setLoading(true);
            await projectApi.create(createForm);
            
            toast.success('프로젝트가 생성되었습니다.');
            await loadData();
            setShowCreateModal(false);
            setCreateForm({ name: '', description: '', partnerIds: [] });
        } catch(e) {
            toast.error('프로젝트 생성 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedProject) return;
        try {
            setLoading(true);
            await projectApi.update(selectedProject.id, editForm);
            
            toast.success('프로젝트가 수정되었습니다.');
            await loadData();
            setShowEditModal(false);
            setSelectedProject(null);
        } catch(e) {
            toast.error('프로젝트 수정 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await projectApi.delete(deleteId);
            toast.success('프로젝트가 삭제되었습니다.');
            loadData();
        } catch(e) { 
            toast.error('프로젝트 삭제 실패'); 
        } finally {
            setDeleteId(null);
        }
    };

    const openEdit = (project: any) => {
        setSelectedProject(project);
        setEditForm({
            name: project.name,
            description: project.description || '',
            partnerIds: project.partners?.map((p: any) => p.id) || []
        });
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6 container mx-auto max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader
                    title="프로젝트 관리 (Project Management)"
                    description="전체 프로젝트 목록을 조회하고 파트너 협업을 관리합니다."
                    badgeText="WORKSPACE"
                />
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                         <Input 
                            placeholder="프로젝트 검색..." 
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                         />
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" /> 생성
                    </Button>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
                    <p className="text-slate-500">
                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <Card key={project.id} className="group hover:show-lg transition-all duration-300 border-slate-200">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        <Folder className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-800">{project.name}</CardTitle>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 group-hover:text-slate-600">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEdit(project)}>
                                            <Edit2 className="mr-2 h-4 w-4" /> 수정
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(project.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> 삭제
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px] mb-4">
                                    {project.description || '설명이 없습니다.'}
                                </p>
                                
                                <div className="flex flex-wrap gap-1 mb-4 min-h-[24px]">
                                    {project.partners?.slice(0, 3).map((p: any) => (
                                        <Badge key={p.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-slate-100 text-slate-600 border-slate-200">
                                            {p.name}
                                        </Badge>
                                    ))}
                                    {(project.partners?.length || 0) > 3 && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                            +{project.partners.length - 3}
                                        </Badge>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Users className="h-3.5 w-3.5" /> 
                                        <span>Partners: {project.partners?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg overflow-visible">
                    <DialogHeader>
                        <DialogTitle>새 프로젝트 생성</DialogTitle>
                        <DialogDescription>새로운 프로젝트 정보를 입력하고 파트너를 초대하세요.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">프로젝트 명 <span className="text-red-500">*</span></label>
                            <Input 
                                placeholder="프로젝트 이름을 입력하세요" 
                                value={createForm.name}
                                onChange={(e) => handleCreateChange('name', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">설명</label>
                            <Textarea 
                                placeholder="프로젝트에 대한 간단한 설명을 입력하세요" 
                                value={createForm.description}
                                onChange={(e) => handleCreateChange('description', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">참여 파트너 (Partners)</label>
                            <PartnerCombobox 
                                partners={allPartners} 
                                selectedIds={createForm.partnerIds} 
                                onToggle={(id) => togglePartner(id, 'create')} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>취소</Button>
                        <Button onClick={handleCreate} disabled={loading || !createForm.name.trim()} className="bg-blue-600">
                            {loading ? '생성 중...' : '프로젝트 생성'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                 <DialogContent className="max-w-lg overflow-visible">
                    <DialogHeader>
                        <DialogTitle>프로젝트 수정</DialogTitle>
                        <DialogDescription>참여 파트너 및 프로젝트 정보를 수정합니다.</DialogDescription>
                    </DialogHeader>
                    {selectedProject && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">프로젝트 명</label>
                                <Input 
                                    value={editForm.name} 
                                    onChange={(e) => handleEditChange('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">설명</label>
                                <Textarea 
                                    value={editForm.description} 
                                    onChange={(e) => handleEditChange('description', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">참여 파트너 (Partners)</label>
                                <PartnerCombobox 
                                    partners={allPartners} 
                                    selectedIds={editForm.partnerIds} 
                                    onToggle={(id) => togglePartner(id, 'edit')} 
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowEditModal(false)}>취소</Button>
                        <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600">
                            {loading ? '저장 중...' : '변경사항 저장'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>프로젝트를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 연동 정보가 영구적으로 삭제될 수 있습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            삭제 확인
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function PartnerCombobox({ partners, selectedIds, onToggle }: { partners: any[], selectedIds: string[], onToggle: (id: string) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedIds.length > 0 ? `${selectedIds.length} partners selected` : "Select partners..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search partners..." />
                        <CommandList>
                            <CommandEmpty>No partner found.</CommandEmpty>
                            <CommandGroup>
                                {partners.map((partner) => (
                                    <CommandItem
                                        key={partner.id}
                                        value={partner.name}
                                        onSelect={() => {
                                            onToggle(partner.id);
                                            // Keep open for multi-select
                                        }}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedIds.includes(partner.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{partner.name}</span>
                                            <span className="text-xs text-muted-foreground">{partner.type}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            
            {/* Selected Tags Display */}
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {selectedIds.map(id => {
                        const p = partners.find(x => x.id === id);
                        if(!p) return null;
                        return (
                            <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                {p.name}
                                <X 
                                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                                    onClick={() => onToggle(id)}
                                />
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
