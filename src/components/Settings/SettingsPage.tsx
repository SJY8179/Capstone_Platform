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
    Moon,
    Sun,
    User,
    Save,
    Upload,
    Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/types/user';

interface SettingsPageProps {
    userRole: UserRole;
    currentUser?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        avatarUrl?: string | null;
    };
}

export function SettingsPage({ userRole, currentUser }: SettingsPageProps) {
    // 다크모드 상태
    const [isDarkMode, setIsDarkMode] = useState(false);

    // 프로필 설정
    const [profileSettings, setProfileSettings] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        bio: '',
        publicProfile: true
    });

    const handleDarkModeToggle = (checked: boolean) => {
        setIsDarkMode(checked);
        // 실제 다크모드 적용
        if (checked) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        toast.success(checked ? '다크 모드가 활성화되었습니다' : '라이트 모드가 활성화되었습니다');
    };

    const handleSave = (section: string) => {
        toast.success(`${section} 설정이 저장되었습니다`);
    };

    const handleProfileImageUpload = () => {
        toast.info('프로필 이미지 업로드 기능은 개발 중입니다');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1>설정</h1>
                <p className="text-muted-foreground">외관과 프로필 설정을 관리하세요</p>
            </div>

            <Tabs defaultValue="appearance" className="space-y-6">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        외관
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        프로필
                    </TabsTrigger>
                </TabsList>

                {/* 외관 설정 */}
                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                외관 설정
                            </CardTitle>
                            <CardDescription>
                                테마와 화면 표시 방식을 설정하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>다크 모드</Label>
                                    <p className="text-sm text-muted-foreground">
                                        어두운 테마로 전환하여 눈의 피로를 줄입니다
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4" />
                                    <Switch
                                        checked={isDarkMode}
                                        onCheckedChange={handleDarkModeToggle}
                                    />
                                    <Moon className="h-4 w-4" />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>글꼴 크기</Label>
                                <Select defaultValue="medium">
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">작음</SelectItem>
                                        <SelectItem value="medium">보통</SelectItem>
                                        <SelectItem value="large">큼</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>사이드바 동작</Label>
                                <Select defaultValue="auto">
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">자동</SelectItem>
                                        <SelectItem value="always-expanded">항상 펼침</SelectItem>
                                        <SelectItem value="always-collapsed">항상 접음</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={() => handleSave('외관')} className="w-fit">
                                <Save className="h-4 w-4 mr-2" />
                                저장
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 프로필 설정 */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                프로필 설정
                            </CardTitle>
                            <CardDescription>
                                공개 프로필 정보를 관리하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={currentUser?.avatarUrl || undefined} />
                                    <AvatarFallback>
                                        <User className="h-8 w-8" />
                                    </AvatarFallback>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="profile-name">이름</Label>
                                    <Input
                                        id="profile-name"
                                        value={profileSettings.name}
                                        onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                                        placeholder="이름을 입력하세요"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile-email">이메일</Label>
                                    <Input
                                        id="profile-email"
                                        type="email"
                                        value={profileSettings.email}
                                        onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                                        placeholder="이메일을 입력하세요"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-bio">자기소개</Label>
                                <Input
                                    id="profile-bio"
                                    value={profileSettings.bio}
                                    onChange={(e) => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                                    placeholder="간단한 자기소개를 작성하세요"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>프로필 공개</Label>
                                    <p className="text-sm text-muted-foreground">다른 사용자가 내 프로필을 볼 수 있습니다</p>
                                </div>
                                <Switch
                                    checked={profileSettings.publicProfile}
                                    onCheckedChange={(checked) =>
                                        setProfileSettings({ ...profileSettings, publicProfile: checked })
                                    }
                                />
                            </div>

                            <Button onClick={() => handleSave('프로필')} className="w-fit">
                                <Save className="h-4 w-4 mr-2" />
                                저장
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}  