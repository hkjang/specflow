"use client"

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Shield, User, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState<any>({ role: 'USER' });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newUser.name || !newUser.email) return;
        try {
            await api.post('/users', {
                ...newUser,
                password: 'password123' // Default password
            });
            setOpen(false);
            setNewUser({ role: 'USER' });
            fetchUsers();
        } catch (error) {
            alert('사용자 생성에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="사용자 권한 관리 (User & Roles)"
                description="시스템 접근 권한을 가진 사용자를 등록하고 역할을 배정합니다."
                badgeText="SYSTEM"
                steps={['관리자', '설정', '사용자']}
            />

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-800">등록된 사용자</CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchUsers} className="h-8 w-8 p-0">
                            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                                <Plus className="mr-2 h-4 w-4" /> 사용자 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>새 사용자 등록</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>이름 (Name)</Label>
                                    <Input placeholder="홍길동" value={newUser.name || ''} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>이메일 (Email)</Label>
                                    <Input type="email" placeholder="user@company.com" value={newUser.email || ''} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>역할 (Role)</Label>
                                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="역할 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USER">일반 사용자 (User)</SelectItem>
                                            <SelectItem value="PLANNER">기획자 (Planner)</SelectItem>
                                            <SelectItem value="DEVELOPER">개발자 (Developer)</SelectItem>
                                            <SelectItem value="ADMIN">관리자 (Admin)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">등 록</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">Role</TableHead>
                                <TableHead>이름</TableHead>
                                <TableHead>이메일</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-slate-50">
                                    <TableCell>
                                        {user.role === 'ADMIN' ?
                                            <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit border border-purple-100">
                                                <Shield className="h-3 w-3" /> ADMIN
                                            </span>
                                            :
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit flex items-center gap-1">
                                                <User className="h-3 w-3" /> {user.role}
                                            </span>
                                        }
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-700">{user.name}</TableCell>
                                    <TableCell className="text-slate-500 font-mono text-xs">{user.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(user.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                                        등록된 사용자가 없습니다.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

