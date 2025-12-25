'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Edit2, Trash2, User as UserIcon, Mail, Shield, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Create/Edit State
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        role: 'USER',
        password: '' // Only for create
    });

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await userApi.getAll();
            setUsers(res.data);
        } catch(e) { 
            console.error(e);
            toast.error('사용자 목록을 불러오는데 실패했습니다.');
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('이름과 이메일은 필수입니다.');
            return;
        }

        try {
            setLoading(true);
            if (isEdit && selectedUser) {
                // Remove password if empty (or handle separately)
                const { password, ...updateData } = formData;
                await userApi.update(selectedUser.id, updateData);
                toast.success('사용자 정보가 수정되었습니다.');
            } else {
                if (!formData.password) {
                     toast.error('비밀번호는 필수입니다.');
                     return;
                }
                await userApi.create(formData);
                toast.success('새 사용자가 생성되었습니다.');
            }
            
            await loadData();
            setShowModal(false);
            resetForm();
        } catch(e) {
            console.error(e);
            toast.error(isEdit ? '수정 실패' : '생성 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
         if (!deleteId) return;
        try {
            await userApi.delete(deleteId);
            toast.success('사용자가 삭제되었습니다.');
            loadData();
        } catch(e) { 
            toast.error('삭제 실패'); 
        } finally {
            setDeleteId(null);
        }
    };

    const openCreate = () => {
        setIsEdit(false);
        resetForm();
        setShowModal(true);
    };

    const openEdit = (user: any) => {
        setSelectedUser(user);
        setIsEdit(true);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '' // Normally don't fill password
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', role: 'USER', password: '' });
        setSelectedUser(null);
    };

    return (
        <div className="space-y-6 container mx-auto max-w-7xl animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="사용자 관리 (Users)"
                    description="시스템 접근 권한을 가진 사용자를 관리합니다."
                    badgeText="ADMIN"
                />
                <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> 사용자 추가
                </Button>
            </div>

            <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-6 py-4 font-bold">사용자 정보</th>
                            <th className="px-6 py-4 font-bold">역할 (Role)</th>
                            <th className="px-6 py-4 font-bold">상태</th>
                            <th className="px-6 py-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <UserIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{user.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'} className="font-mono">
                                        {user.role}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                     <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEdit(user)}>
                                                <Edit2 className="mr-2 h-4 w-4" /> 수정
                                            </DropdownMenuItem>
                                            {user.role !== 'ADMIN' && (
                                                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(user.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> 삭제
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? '사용자 정보 수정' : '새 사용자 추가'}</DialogTitle>
                        <DialogDescription>
                            사용자 정보를 입력하세요. {isEdit ? '비밀번호는 변경 시에만 입력하세요.' : '초기 비밀번호를 설정하세요.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">이름</label>
                            <Input 
                                className="col-span-3" 
                                value={formData.name} 
                                onChange={e => handleChange('name', e.target.value)} 
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">이메일</label>
                            <Input 
                                className="col-span-3" 
                                type="email"
                                value={formData.email} 
                                onChange={e => handleChange('email', e.target.value)} 
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">역할</label>
                            <Select 
                                value={formData.role} 
                                onValueChange={val => handleChange('role', val)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">USER</SelectItem>
                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         {!isEdit && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">비밀번호</label>
                                <Input 
                                    className="col-span-3" 
                                    type="password"
                                    value={formData.password} 
                                    onChange={e => handleChange('password', e.target.value)} 
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
                        <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600">
                            {loading ? '처리 중...' : isEdit ? '수정' : '생성'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>사용자를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 해당 사용자의 접근 권한이 즉시 차단됩니다.
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
