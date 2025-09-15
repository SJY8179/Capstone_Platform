// Header.tsx
import React, { useMemo, useState, useCallback } from "react";
import { Search, User as UserIcon, LogOut } from "lucide-react";
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
import { ProjectSwitcher } from "@/components/Projects/ProjectSwitcher";
import { NotificationDropdown } from "../Notifications/NotificationDropdown";
import type { Notification } from "../Notifications/NotificationCenter";

/* =========================================
 * Types
 * =======================================*/
export interface AppUser {
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

  /** 상단 글로벌 검색 제출 콜백(선택) */
  onSearchSubmit?: (keyword: string) => void;

  /** 알림 아이템 클릭 시(선택) — Dropdown은 무인자 콜백을 기대 */
  onNotificationClick?: () => void;

  /** 프로젝트 스위처 */
  activeProjectId?: number | null;
  onChangeActiveProject?: (id: number) => void;

  /** 외부에서 알림을 제어하고 싶다면 전달(미전달 시 내부 데모 상태 사용) */
  notifications?: Notification[];
}

/* =========================================
 * Demo notifications (내부 기본값)
 * =======================================*/
const demoNotifications: Notification[] = [
  {
    id: "1",
    type: "commit",
    title: "새로운 커밋이 푸시되었습니다",
    message: '김철수님이 "프론트엔드 로그인 기능 구현"을 커밋했습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    priority: "medium",
    author: { name: "김철수" },
  },
  {
    id: "2",
    type: "feedback",
    title: "새로운 피드백이 도착했습니다",
    message: "박교수님이 중간 발표 자료에 피드백을 남겼습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    priority: "high",
    author: { name: "박교수" },
  },
  {
    id: "3",
    type: "schedule",
    title: "오늘 일정 알림",
    message: "오후 2시: 팀 미팅, 오후 4시: 멘토링 세션이 예정되어 있습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
    priority: "medium",
  },
];

/* =========================================
 * Helpers
 * =======================================*/
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

const resolveAvatarSrc = (user: AppUser) =>
  [user?.avatarUrl, user?.avatar]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0) || undefined;

/* =========================================
 * Header (merged)
 * =======================================*/
export function Header({
  user,
  onLogout,
  onSearchSubmit,
  onNotificationClick,
  activeProjectId,
  onChangeActiveProject,
  notifications: externalNotifications,
}: HeaderProps) {
  // 알림: 외부 제어(notifications prop) 우선, 없으면 내부 상태 사용
  const [internalNotifications, setInternalNotifications] =
    useState<Notification[]>(demoNotifications);
  const notifications = externalNotifications ?? internalNotifications;

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = useCallback(
    (id: string) => {
      if (externalNotifications) return; // 외부 제어 시 내부 업데이트 불필요
      setInternalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [externalNotifications]
  );

  const markAllAsRead = useCallback(() => {
    if (externalNotifications) return;
    setInternalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [externalNotifications]);

  const avatarSrc = resolveAvatarSrc(user);

  // 검색
  const [keyword, setKeyword] = useState("");
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = keyword.trim();
      if (!q) return;
      onSearchSubmit?.(q);
    },
    [keyword, onSearchSubmit]
  );

  // Dropdown이 기대하는 시그니처에 맞춘 무인자 핸들러
  const handleNotificationClick = useCallback((): void => {
    onNotificationClick?.();
  }, [onNotificationClick]);

  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
      {/* 좌측: 검색 */}
      <div className="flex items-center gap-4 flex-1">
        <form
          className="relative max-w-md flex-1"
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="전역 검색"
        >
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프로젝트, 팀, 과제 검색…"
            className="pl-10"
          />
        </form>
      </div>

      {/* 우측: 프로젝트 스위처 · 알림 · 유저 */}
      <div className="flex items-center gap-4">
        <ProjectSwitcher
          value={activeProjectId ?? undefined}
          onChange={onChangeActiveProject}
          isAdmin={user.role === "admin"}
        />

        {/* 알림 드롭다운 */}
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onNotificationClick={handleNotificationClick}
        />

        {/* 유저 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-auto p-1 rounded-full"
              aria-label="계정 메뉴 열기"
            >
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
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
