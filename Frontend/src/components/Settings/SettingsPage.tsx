import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Moon, Sun, User, Save, Upload, Palette, Info
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from "@/types/user"; // 중앙 User 타입 import
import type { AppSettings } from '@/App'; // App.tsx에서 AppSettings 타입 import

// 1. Props 인터페이스 업데이트
interface SettingsPageProps {
    userRole: UserRole;
    currentUser: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        avatarUrl?: string | null;
    };
    appSettings: AppSettings;
    onSettingsChange: (settings: Partial<AppSettings>) => void;
}

export function SettingsPage({ userRole, currentUser, appSettings, onSettingsChange }: SettingsPageProps) {
    // 프로필 설정은 페이지 내부 상태로 유지
    const [profileSettings, setProfileSettings] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        bio: '',
        publicProfile: true
    });

    // --- 업데이트된 부분 시작: 설정 변경 핸들러 함수들 ---
    const handleDarkModeToggle = (checked: boolean) => {
        onSettingsChange({ isDarkMode: checked });
        toast.success(checked ? '다크 모드가 활성화되었습니다' : '라이트 모드가 활성화되었습니다');
    };

    const handleFontSizeChange = (value: AppSettings['fontSize']) => {
        onSettingsChange({ fontSize: value });
        const sizeLabels = { small: '작은', medium: '보통', large: '큰' };
        toast.success(`글꼴 크기가 ${sizeLabels[value]} 크기로 변경되었습니다`);
    };

    const handleSidebarBehaviorChange = (value: AppSettings['sidebarBehavior']) => {
        onSettingsChange({ sidebarBehavior: value });
        const behaviorLabels = {
            auto: '자동',
            'always-expanded': '항상 펼침',
            'always-collapsed': '항상 접음'
        };
        toast.success(`사이드바 동작이 '${behaviorLabels[value]}' 모드로 변경되었습니다`);
    };
    // --- 업데이트된 부분 끝 ---

    const handleSaveProfile = () => {
        // TODO: 여기에 실제 프로필 저장 API 호출 로직 추가
        toast.success('프로필 설정이 저장되었습니다');
    };

    const handleProfileImageUpload = () => {
        toast.info('프로필 이미지 업로드 기능은 개발 중입니다');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">설정</h1>
                <p className="text-muted-foreground">외관과 프로필 설정을 관리하세요</p>
            </div>

            <Tabs defaultValue="appearance" className="space-y-6">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                    <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" />외관</TabsTrigger>
                    <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />프로필</TabsTrigger>
                </TabsList>

                {/* 외관 설정 */}
                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>외관 설정</CardTitle>
                            <CardDescription>테마와 화면 표시 방식을 설정하세요</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>다크 모드</Label>
                                    <p className="text-sm text-muted-foreground">어두운 테마로 눈의 피로를 줄입니다</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4" />
                                    {/* 2. 다크 모드 상태와 핸들러 연결 */}
                                    <Switch
                                        checked={appSettings.isDarkMode}
                                        onCheckedChange={handleDarkModeToggle}
                                    />
                                    <Moon className="h-4 w-4" />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>글꼴 크기</Label>
                                <p className="text-sm text-muted-foreground mb-2">전체 애플리케이션의 글꼴 크기를 변경합니다</p>
                                {/* 3. 글꼴 크기 상태와 핸들러 연결 */}
                                <Select value={appSettings.fontSize} onValueChange={handleFontSizeChange}>
                                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">작게 (14px)</SelectItem>
                                        <SelectItem value="medium">보통 (16px)</SelectItem>
                                        <SelectItem value="large">크게 (18px)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>사이드바 동작</Label>
                                <p className="text-sm text-muted-foreground mb-2">사이드바의 기본 동작을 설정합니다</p>
                                {/* 4. 사이드바 동작 상태와 핸들러 연결 */}
                                <Select value={appSettings.sidebarBehavior} onValueChange={handleSidebarBehaviorChange}>
                                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">자동 (토글 가능)</SelectItem>
                                        <SelectItem value="always-expanded">항상 펼침</SelectItem>
                                        <SelectItem value="always-collapsed">항상 접음</SelectItem>
                                    </SelectContent>
                                </Select>
                                {appSettings.sidebarBehavior !== 'auto' && (
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md mt-2">
                                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            {appSettings.sidebarBehavior === 'always-expanded'
                                                ? '사이드바가 항상 펼쳐진 상태로 고정되며, 토글 버튼이 비활성화됩니다.'
                                                : '사이드바가 항상 접힌 상태로 고정되며, 토글 버튼이 비활성화됩니다.'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 프로필 설정 */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>프로필 설정</CardTitle>
                            <CardDescription>공개 프로필 정보를 관리하세요</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={currentUser?.avatarUrl || undefined} />
                                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <Button onClick={handleProfileImageUpload} variant="outline">
                                        <Upload className="h-4 w-4 mr-2" />
                                        프로필 이미지 변경
                                    </Button>
                                    <p className="text-sm text-muted-foreground">JPG, PNG 파일만 업로드 가능합니다</p>
                                </div>
                            </div>
                            <Separator />
                            {/* ... (프로필 입력 폼 부분은 기존과 동일) ... */}
                            <Button onClick={handleSaveProfile} className="w-fit">
                                <Save className="h-4 w-4 mr-2" />
                                프로필 저장
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}