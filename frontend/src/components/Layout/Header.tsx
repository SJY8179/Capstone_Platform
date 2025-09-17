import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Search, User as UserIcon, LogOut, Settings as SettingsIcon } from "lucide-react";
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
import type { AppNotification as Notification } from "@/types/domain";
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/api/notifications";
import { appBus } from "@/lib/app-bus";

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

  /** 외부에서 알림을 제어하고 싶다면 전달(미전달 시 내부 집계 사용) */
  notifications?: Notification[];

  /** 설정 페이지 열기 */
  onOpenSettings?: () => void;
}

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
  onOpenSettings,
}: HeaderProps) {
  // 알림: 외부 제어(notifications prop) 우선, 없으면 내부 집계 사용
  const [internalNotifications, setInternalNotifications] =
    useState<Notification[]>([]);
  const notifications = externalNotifications ?? internalNotifications;

  // 최초 로드 및 브로드캐스트 반영
  useEffect(() => {
    if (externalNotifications) return;
    const load = async () => {
      const list = await fetchNotifications();
      setInternalNotifications(list);
    };
    load();
    const off = appBus.onNotificationsChanged(() => load());
    return () => { try { off?.(); } catch {} };
  }, [externalNotifications]);

  const markAsRead = useCallback(
    (id: string) => {
      if (externalNotifications) return;
      markNotificationAsRead(id);
      setInternalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [externalNotifications]
  );

  const markAllAsRead = useCallback(() => {
    if (externalNotifications) return;
    markAllNotificationsAsRead(internalNotifications.map(n => n.id));
    setInternalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [externalNotifications, internalNotifications]);

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
          notifications={externalNotifications ? externalNotifications : internalNotifications}
          onMarkAsRead={externalNotifications ? undefined : markAsRead}
          onMarkAllAsRead={externalNotifications ? undefined : markAllAsRead}
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
              onClick={onOpenSettings}
              className="cursor-pointer"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>설정</span>
            </DropdownMenuItem>
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