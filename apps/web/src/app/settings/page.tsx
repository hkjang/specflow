'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, User } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="환경 설정 (Settings)"
                description="프로필 및 시스템 선호 설정을 관리합니다."
                badgeText="USER"
            />

            <div className="flex flex-col md:flex-row gap-6">
                <Card className="w-full md:w-64 h-fit">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg">John Doe</h3>
                        <p className="text-sm text-gray-500">Product Manager</p>
                        <Button variant="outline" size="sm" className="mt-4 w-full">프로필 이미지 변경</Button>
                    </CardContent>
                </Card>

                <div className="flex-1">
                    <Tabs defaultValue="profile">
                        <TabsList className="mb-4">
                            <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" /> 프로필 (Profile)</TabsTrigger>
                            <TabsTrigger value="security"><Lock className="h-4 w-4 mr-2" /> 보안 (Security)</TabsTrigger>
                            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> 알림 (Notifications)</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile">
                            <Card>
                                <CardHeader>
                                    <CardTitle>프로필 정보 (Profile Information)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>이름 (First Name)</Label>
                                            <Input defaultValue="John" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>성 (Last Name)</Label>
                                            <Input defaultValue="Doe" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>이메일 (Email)</Label>
                                        <Input defaultValue="john@acme.com" type="email" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>소개 (Bio)</Label>
                                        <Input defaultValue="Product enthusiast." />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button>프로필 저장 (Save)</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="security">
                            <Card>
                                <CardHeader>
                                    <CardTitle>비밀번호 및 인증 (Password & Auth)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>현재 비밀번호 (Current Password)</Label>
                                        <Input type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>새 비밀번호 (New Password)</Label>
                                        <Input type="password" />
                                    </div>
                                    <Button variant="outline" className="w-full mt-2">2단계 인증 활성화 (Enable 2FA)</Button>
                                </CardContent>
                                <CardFooter>
                                    <Button>비밀번호 변경 (Update)</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notifications">
                            <Card>
                                <CardHeader>
                                    <CardTitle>이메일 수신 설정 (Email Preferences)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="news">제품 업데이트 소식</Label>
                                        <Switch id="news" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="security">보안 알림</Label>
                                        <Switch id="security" defaultChecked />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
