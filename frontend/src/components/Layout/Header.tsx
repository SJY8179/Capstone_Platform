import React, { useState } from "react";
import { Bell, Search, User as UserIcon, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { NotificationDropdown } from '../Notifications/NotificationDropdown';
import { Notification } from '../Notifications/NotificationCenter';
import { ProjectSwitcher } from "@/components/Projects/ProjectSwitcher";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  avatarUrl?: string | null;
}

interface HeaderProps {
  user: AppUser;
  onLogout?: () => void;
  /** 프로젝트 스위처 */
    activeProjectId?: number | null;
    onChangeActiveProject?: (id: number) => void;
}

// 데모 알림 데이터
const demoNotifications: Notification[] = [
  {
    id: '1',
    type: 'commit',
    title: '새로운 커밋이 푸시되었습니다',
    message: '김철수님이 "프론트엔드 로그인 기능 구현"을 커밋했습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    priority: 'medium',
    author: { name: '김철수' }
  },
  {
    id: '2',
    type: 'feedback',
    title: '새로운 피드백이 도착했습니다',
    message: '박교수님이 중간 발표 자료에 피드백을 남겼습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    priority: 'high',
    author: { name: '박교수' }
  },
  {
    id: '3',
    type: 'schedule',
    title: '오늘 일정 알림',
    message: '오후 2시: 팀 미팅, 오후 4시: 멘토링 세션이 예정되어 있습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
    priority: 'medium'
  }
];

export function Header({ user, onLogout, activeProjectId, onNotificationClick }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getRoleBadgeVariant = (role: string) => {
      switch (role) {
        case "admin":
          return "destructive";
        case "professor":
          return "default";
        case "student":
          return "secondary";
        default:
          return "outline";
      }
    };

    const getRoleLabel = (role: string) => {
      switch (role) {
        case "admin":
          return "관리자";
        case "professor":
          return "교수";
        case "student":
          return "학생";
        default:
          return role;
      }
    };

    const avatarSrc =
        (user as any).avatarUrl ?? (user as any).avatar ?? undefined;

  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="프로젝트, 팀, 과제 검색…" className="pl-10" />
        </div>
      </div>

      <div className="flex items-center gap-4">

        {/* 프로젝트 스위처 (모바일에서도 표시) */}
        <ProjectSwitcher
          value={activeProjectId ?? undefined}
          onChange={onChangeActiveProject}
          isAdmin={user.role === "admin"}
        />

        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
            <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-[10px] leading-3 text-destructive-foreground flex items-center justify-center">
                    3
                </span>
        </Button>

        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={onNotificationClick}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 h-auto p-1 rounded-full">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Avatar>
                <AvatarImage src={avatarSrc} alt={user.name} />
                <AvatarFallback>
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}