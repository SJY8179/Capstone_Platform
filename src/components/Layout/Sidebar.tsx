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
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  ListChecks,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ActivePage } from "../../App";
import type { UserRole } from "@/types/user";
import { listSchedulesInRange, invalidateSchedulesCache } from "@/api/schedules";
import type { ScheduleDto, SchedulePriority, ScheduleType } from "@/types/domain";
import { scheduleBus } from "@/lib/schedule-bus";

interface SidebarProps {
  userRole: UserRole;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** 현재 프로젝트 id. 없으면 일정 호출 안 함 */
  projectId?: number;
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
}: SidebarProps) {
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [upcoming, setUpcoming] = useState<UiSchedule[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const getMenuItems = () => {
    const common = [
      { id: "dashboard" as ActivePage, label: "대시보드", icon: Home },
      { id: "projects" as ActivePage, label: "프로젝트", icon: FolderOpen },
      { id: "assignments" as ActivePage, label: "과제", icon: ListChecks },
    ];
    const student = [
      ...common,
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },
    ];
    const professor = [
      ...common,
      { id: "evaluation" as ActivePage, label: "평가 관리", icon: ClipboardCheck },
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },
    ];
    const admin = [
      ...common,
      { id: "users" as ActivePage, label: "사용자 관리", icon: UserCog },
      // ✅ 용어 통일: “평가 관리”
      { id: "evaluation" as ActivePage, label: "평가 관리", icon: ClipboardCheck },
    ];
    switch (userRole) {
      case "student": return student;
      case "professor": return professor;
      case "admin": return admin;
      default: return common;
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
          date: s.date!,
          time: s.time ?? undefined,
          type: mapType(s.type),
          priority: mapPriority(s.priority),
        }))
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
        .slice(0, 3);

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

  useEffect(() => {
    reloadUpcoming();
    const unsub = scheduleBus.subscribe(() => {
      if (projectId) invalidateSchedulesCache(projectId);
      reloadUpcoming();
    });
    return () => {
      try { void unsub(); } catch { }
    };
  }, [reloadUpcoming, projectId]);

  useEffect(() => {
    if (showScheduleDropdown) {
      reloadUpcoming();
    }
  }, [showScheduleDropdown, reloadUpcoming]);

  const formatScheduleDate = (dateStr: string) => {
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
    <div
      className={`${collapsed ? "w-16" : "w-64"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 relative`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-sidebar shadow-md hover:bg-sidebar-accent"
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <div className={`${collapsed ? "p-2" : "p-6"} transition-all duration-300`}>
        <div className={`flex items-center gap-2 mb-8 ${collapsed ? "justify-center" : ""}`}>
          <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
          {!collapsed && (
            <div className="leading-5 tracking-tight">
              <h1 className="text-xl font-semibold break-keep">캡스톤 플랫폼</h1>
              <p className="text-sm text-muted-foreground">프로젝트 관리</p>
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activePage === item.id ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
                onClick={() => onPageChange(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && item.label}
              </Button>
            );
          })}
        </nav>

        <div className="mt-8 pt-8 border-t border-sidebar-border">
          <div className="space-y-2">
            <div>
              <Button
                variant={activePage === "schedule" ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
                onClick={() => {
                  onPageChange("schedule");
                  if (!collapsed) setShowScheduleDropdown((v) => !v);
                }}
                title={collapsed ? "일정 관리" : undefined}
              >
                <Calendar className="h-4 w-4 flex-shrink-0" />
                {!collapsed && "일정 관리"}
              </Button>

              {!collapsed && showScheduleDropdown && (
                <div className="mt-2 ml-4 space-y-1 border-l border-sidebar-border pl-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    다가오는 일정
                  </div>

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

                  {upcoming.map((s) => (
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
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
              title={collapsed ? "공지/메시지" : undefined}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "공지/메시지"}
            </Button>

            <Button
              variant="ghost"
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
              title={collapsed ? "설정" : undefined}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "설정"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
