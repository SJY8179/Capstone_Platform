import React, { useEffect, useState, useCallback } from "react";
import {
  Home,
  FolderOpen,
  Users,
  ClipboardCheck,
  Settings,
  UserCog,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { ActivePage } from "@/App";
import type { UserRole } from "@/types/user";
import { listSchedulesInRange, invalidateSchedulesCache } from "@/api/schedules";
import type { ScheduleDto, SchedulePriority, ScheduleType } from "@/types/domain";
import { scheduleBus } from "@/lib/schedule-bus";
import { fetchNotifications, countUnread } from "@/api/notifications";
import { appBus } from "@/lib/app-bus";

interface SidebarProps {
  userRole: UserRole;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** 현재 프로젝트 id. 없으면 일정 호출 안 함 */
  projectId?: number;
  /** 앱 설정에서 사이드바 동작 고정 시 토글 비활성화 */
  toggleDisabled?: boolean;
}

type UiSchedule = {
  id: string | number;
  title: string;
  date: string;   // YYYY-MM-DD
  time?: string;  // HH:mm
  type: "deadline" | "presentation" | "meeting" | "task";
  priority: "high" | "medium" | "low";
};

const toYMDLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function Sidebar({
  userRole,
  activePage,
  onPageChange,
  collapsed,
  onToggleCollapse,
  projectId,
  toggleDisabled,
}: SidebarProps) {
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [upcoming, setUpcoming] = useState<UiSchedule[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [notifUnread, setNotifUnread] = useState<number>(0);

  const getMenuItems = () => {
    const common = [
      { id: "dashboard" as ActivePage, label: "대시보드", icon: Home },
      { id: "projects" as ActivePage, label: "프로젝트", icon: FolderOpen },
      { id: "assignments" as ActivePage, label: "과제", icon: ListChecks },
    ];
    const student = [...common, { id: "teams" as ActivePage, label: "팀 관리", icon: Users }];
    const professor = [
      ...common,
      { id: "evaluation" as ActivePage, label: "평가 관리", icon: ClipboardCheck },
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },
    ];
    const admin = [
      ...common,
      { id: "users" as ActivePage, label: "사용자 관리", icon: UserCog },
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },           // ⬅ 추가
      { id: "evaluation" as ActivePage, label: "평가 관리", icon: ClipboardCheck },
    ];
    switch (userRole) {
      case "student":
        return student;
      case "professor":
        return professor;
      case "admin":
        return admin;
      default:
        return common;
    }
  };

  /** 일정 로드 – projectId 없으면 호출 안 함, 403은 조용히 처리 */
  const reloadUpcoming = useCallback(async () => {
    if (!projectId) {
      setUpcoming([]);
      return;
    }
    try {
      setLoadingUpcoming(true);

      const from = new Date();
      const to = new Date();
      to.setDate(from.getDate() + 14);

      const rows: ScheduleDto[] = await listSchedulesInRange({
        from: toYMDLocal(from),
        to: toYMDLocal(to),
        projectId,
      });

      const mapType = (t?: ScheduleType): UiSchedule["type"] =>
        t === "deadline" || t === "meeting" || t === "task" || t === "presentation" ? t : "task";
      const mapPriority = (p?: SchedulePriority): UiSchedule["priority"] =>
        p === "high" || p === "medium" || p === "low" ? p : "low";

      const mapped: UiSchedule[] = (rows ?? [])
        .filter((s) => !!s.date)
        .map((s) => ({
          id: s.id,
          title: s.title ?? "(제목 없음)",
          date: s.date!, // YYYY-MM-DD
          time: s.time ?? undefined,
          type: mapType(s.type),
          priority: mapPriority(s.priority),
        }))
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
      // ⬆ 전체를 보관: 렌더 단계에서 상위 3개만 보여주고 나머지 개수 표시

      setUpcoming(mapped);
    } catch (e: any) {
      if (e?.status === 403 || e?.response?.status === 403) {
        setUpcoming([]);
      } else {
        console.debug("Failed to load upcoming schedules:", e);
        setUpcoming([]);
      }
    } finally {
      setLoadingUpcoming(false);
    }
  }, [projectId]);

  const reloadUnread = useCallback(async () => {
    const list = await fetchNotifications({ projectId }).catch(() => []);
    setNotifUnread(countUnread(list));
  }, [projectId]);

  useEffect(() => {
    reloadUpcoming();
    reloadUnread();

    const unsubSchedule = scheduleBus.subscribe?.(() => {
      if (projectId) invalidateSchedulesCache(projectId);
      reloadUpcoming();
    });
    const unsubNotif = appBus.onNotificationsChanged(() => reloadUnread());

    return () => {
      try { unsubSchedule?.(); } catch { }
      try { unsubNotif?.(); } catch { }
    };
  }, [reloadUpcoming, reloadUnread, projectId]);

  useEffect(() => {
    if (showScheduleDropdown) reloadUpcoming();
  }, [showScheduleDropdown, reloadUpcoming]);

  const formatScheduleDate = (dateStr: string) => {
    // YYYY-MM-DD → 타임존 영향 최소화
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(date, today)) return "오늘";
    if (same(date, tomorrow)) return "내일";
    return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  };

  const scheduleIcon = (t: UiSchedule["type"]) => {
    if (t === "deadline") return <AlertCircle className="h-3 w-3 text-red-500" />;
    if (t === "meeting") return <Users className="h-3 w-3 text-green-500" />;
    if (t === "presentation") return <Calendar className="h-3 w-3 text-blue-500" />;
    return <Calendar className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} bg-sidebar border-r border-sidebar-border transition-all duration-300 relative ${toggleDisabled ? "shadow-lg" : ""
        }`}
      aria-label="사이드바"
    >
      {/* 접기/펼치기 토글 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        disabled={toggleDisabled}
        className={`absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-sidebar shadow-md hover:bg-sidebar-accent ${toggleDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        title={
          toggleDisabled
            ? "사이드바 동작이 설정에서 고정되었습니다"
            : collapsed
              ? "사이드바 펼치기"
              : "사이드바 접기"
        }
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <div className={`${collapsed ? "p-2" : "p-6"} transition-all duration-300`}>
        {/* 로고/타이틀 */}
        <div className={`flex items-center gap-2 mb-8 ${collapsed ? "justify-center" : ""}`}>
          <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
          {!collapsed && (
            <div className="leading-5 tracking-tight">
              <h1 className="text-xl font-semibold break-keep">캡스톤 플랫폼</h1>
              <p className="text-sm text-muted-foreground">프로젝트 관리</p>
            </div>
          )}
        </div>

        {/* 메인 메뉴 */}
        <nav className="space-y-2" aria-label="주요 메뉴">
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
                onClick={() => onPageChange(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && item.label}
              </Button>
            );
          })}
        </nav>

        {/* 하단 섹션: 일정 / 공지·메시지 / 설정 */}
        <div className="mt-8 pt-8 border-t border-sidebar-border">
          <div className="space-y-2">
            {/* 일정 관리 */}
            <div>
              <Button
                variant={activePage === "schedule" ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
                onClick={() => {
                  onPageChange("schedule");
                  if (!collapsed) setShowScheduleDropdown((v) => !v);
                }}
                title={collapsed ? "일정 관리" : undefined}
                aria-expanded={!collapsed && showScheduleDropdown ? true : false}
                aria-controls="sidebar-upcoming"
              >
                <Calendar className="h-4 w-4 flex-shrink-0" />
                {!collapsed && "일정 관리"}
              </Button>

              {!collapsed && showScheduleDropdown && (
                <div
                  id="sidebar-upcoming"
                  className="mt-2 ml-4 space-y-1 border-l border-sidebar-border pl-4"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-2">다가오는 일정</div>

                  {loadingUpcoming && (
                    <div className="text-xs text-muted-foreground py-1">불러오는 중…</div>
                  )}

                  {!loadingUpcoming && upcoming.length === 0 && (
                    <div className="text-xs text-muted-foreground py-1">
                      {projectId
                        ? "예정된 일정이 없습니다."
                        : "프로젝트를 선택하면 일정이 표시됩니다."}
                    </div>
                  )}

                  {!loadingUpcoming &&
                    upcoming.slice(0, 3).map((s) => (
                      <div key={s.id} className="p-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          {scheduleIcon(s.type)}
                          <span className="text-xs font-medium truncate">{s.title}</span>
                          {s.priority === "high" && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 leading-4">
                              !
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatScheduleDate(s.date)} {s.time ?? ""}
                          </span>
                        </div>
                      </div>
                    ))}

                  {!loadingUpcoming && upcoming.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground pt-1">
                      + {upcoming.length - 3}개 더
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 공지/메시지 (뱃지 포함) */}
            <Button
              variant={activePage === "notifications" ? "secondary" : "ghost"}
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
              onClick={() => onPageChange("notifications")}
              title={collapsed ? "공지/메시지" : undefined}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span>공지/메시지</span>
                  {notifUnread > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px] leading-5">
                      {notifUnread > 99 ? "99+" : notifUnread}
                    </Badge>
                  )}
                </>
              )}
            </Button>

            {/* 설정 */}
            <Button
              variant={activePage === "settings" ? "secondary" : "ghost"}
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
              onClick={() => onPageChange("settings")}
              title={collapsed ? "설정" : undefined}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "설정"}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}