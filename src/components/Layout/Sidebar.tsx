<<<<<<< HEAD
﻿import React, { useEffect, useState } from "react";
=======
﻿import React, { useState } from "react";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { UserRole, ActivePage } from "../../App";
<<<<<<< HEAD
import { listSchedulesInRange } from "@/api/schedules";
import type { ScheduleDto, SchedulePriority, ScheduleType } from "@/types/domain";
=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

interface SidebarProps {
  userRole: UserRole;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
<<<<<<< HEAD
  /** 현재 보고 있는 프로젝트 id (없으면 백엔드 첫 프로젝트 기준) */
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

=======
}

>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
export function Sidebar({
  userRole,
  activePage,
  onPageChange,
  collapsed,
  onToggleCollapse,
<<<<<<< HEAD
  projectId,
}: SidebarProps) {
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [upcoming, setUpcoming] = useState<UiSchedule[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  /* 메뉴 구성 */
  const getMenuItems = () => {
    const common = [
      { id: "dashboard" as ActivePage, label: "대시보드", icon: Home },
      { id: "projects" as ActivePage, label: "프로젝트", icon: FolderOpen },
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
      { id: "evaluation" as ActivePage, label: "평가 시스템", icon: ClipboardCheck },
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
=======
}: SidebarProps) {
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  const getMenuItems = () => {
    const commonItems = [
      { id: "dashboard" as ActivePage, label: "대시보드", icon: Home },
      { id: "projects" as ActivePage, label: "프로젝트", icon: FolderOpen },
    ];

    const studentItems = [
      ...commonItems,
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },
    ];

    const professorItems = [
      ...commonItems,
      { id: "evaluation" as ActivePage, label: "평가 관리", icon: ClipboardCheck },
      { id: "teams" as ActivePage, label: "팀 관리", icon: Users },
    ];

    const adminItems = [
      ...commonItems,
      { id: "users" as ActivePage, label: "사용자 관리", icon: UserCog },
      { id: "evaluation" as ActivePage, label: "평가 시스템", icon: ClipboardCheck },
    ];

    switch (userRole) {
      case "student":
        return studentItems;
      case "professor":
        return professorItems;
      case "admin":
        return adminItems;
      default:
        return commonItems;
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
    }
  };

  const menuItems = getMenuItems();

<<<<<<< HEAD
  /* 다가오는 일정 로드 (백엔드) */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingUpcoming(true);

        const from = new Date();
        const to = new Date();
        to.setDate(from.getDate() + 14); // 2주

        const rows: ScheduleDto[] = await listSchedulesInRange({
          from: toYMDLocal(from),
          to: toYMDLocal(to),
          projectId, // 명시적으로 전달. 없으면 백엔드 첫 프로젝트 사용
        });

        if (!alive) return;

        const mapType = (t?: ScheduleType): UiSchedule["type"] =>
          t === "deadline" || t === "meeting" || t === "task" || t === "presentation" ? t : "task";
        const mapPriority = (p?: SchedulePriority): UiSchedule["priority"] =>
          p === "high" || p === "medium" || p === "low" ? p : "low";

        const mapped: UiSchedule[] = (rows ?? [])
          .filter((s) => !!s.date)
          .map((s) => ({
            id: s.id,
            title: s.title ?? "(제목 없음)",
            date: s.date!, // 필터링됨
            time: s.time ?? undefined,
            type: mapType(s.type),
            priority: mapPriority(s.priority),
          }))
          .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
          .slice(0, 3);

        setUpcoming(mapped);
      } catch (e) {
        console.error("Failed to load upcoming schedules:", e);
        setUpcoming([]);
      } finally {
        if (alive) setLoadingUpcoming(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const formatScheduleDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00"); // 로컬 렌더 안전
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
=======
  // 예시: 다가오는 일정 (실제 데이터는 props/context로 교체)
  const upcomingSchedules = [
    {
      id: 1,
      title: "중간 보고서 제출",
      date: "2025-09-15",
      time: "23:59",
      type: "deadline",
      priority: "high",
    },
    {
      id: 2,
      title: "팀 Alpha 발표",
      date: "2025-09-18",
      time: "14:00",
      type: "presentation",
      priority: "high",
    },
    {
      id: 3,
      title: "멘토링 미팅",
      date: "2025-09-22",
      time: "15:30",
      type: "meeting",
      priority: "medium",
    },
  ];

  const formatScheduleDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "내일";
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "numeric",
        day: "numeric",
      });
    }
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-sidebar border-r border-sidebar-border transition-all duration-300 relative`}
    >
<<<<<<< HEAD
      {/* 접기/펼치기 */}
=======
      {/* 접기/펼치기 버튼 */}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-sidebar shadow-md hover:bg-sidebar-accent"
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
<<<<<<< HEAD
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <div className={`${collapsed ? "p-2" : "p-6"} transition-all duration-300`}>
        {/* 로고/타이틀 */}
        <div className={`flex items-center gap-2 mb-8 ${collapsed ? "justify-center" : ""}`}>
          <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
          {!collapsed && (
            <div className="leading-5 tracking-tight">
              <h1 className="text-xl font-semibold break-keep">캡스톤 관리 플랫폼</h1>
=======
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      <div className={`${collapsed ? "p-2" : "p-6"} transition-all duration-300`}>
        <div
          className={`flex items-center gap-2 mb-8 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-semibold">캡스톤 관리 플랫폼</h1>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
              <p className="text-sm text-muted-foreground">프로젝트 관리</p>
            </div>
          )}
        </div>

<<<<<<< HEAD
        {/* 메뉴 */}
=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activePage === item.id ? "secondary" : "ghost"}
<<<<<<< HEAD
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
=======
                className={`w-full ${
                  collapsed ? "justify-center px-2" : "justify-start gap-3"
                }`}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                onClick={() => onPageChange(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && item.label}
              </Button>
            );
          })}
        </nav>

<<<<<<< HEAD
        {/* 하단: 일정/공지/설정 */}
=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
        <div className="mt-8 pt-8 border-t border-sidebar-border">
          <div className="space-y-2">
            <div>
              <Button
                variant={activePage === "schedule" ? "secondary" : "ghost"}
<<<<<<< HEAD
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
=======
                className={`w-full ${
                  collapsed ? "justify-center px-2" : "justify-start gap-3"
                }`}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                onClick={() => {
                  onPageChange("schedule");
                  if (!collapsed) setShowScheduleDropdown((v) => !v);
                }}
                title={collapsed ? "일정 관리" : undefined}
              >
                <Calendar className="h-4 w-4 flex-shrink-0" />
                {!collapsed && "일정 관리"}
              </Button>

<<<<<<< HEAD
              {!collapsed && showScheduleDropdown && (
                <div className="mt-2 ml-4 space-y-1 border-l border-sidebar-border pl-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">다가오는 일정</div>

                  {loadingUpcoming && (
                    <div className="text-xs text-muted-foreground py-1">불러오는 중…</div>
                  )}

                  {!loadingUpcoming && upcoming.length === 0 && (
                    <div className="text-xs text-muted-foreground py-1">예정된 일정이 없습니다.</div>
                  )}

                  {upcoming.map((s) => (
                    <div key={s.id} className="p-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        {scheduleIcon(s.type)}
                        <span className="text-xs font-medium truncate">{s.title}</span>
                        {s.priority === "high" && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1 leading-4">
=======
              {/* 일정 드롭다운 */}
              {!collapsed && showScheduleDropdown && (
                <div className="mt-2 ml-4 space-y-1 border-l border-sidebar-border pl-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    다가오는 일정
                  </div>
                  {upcomingSchedules.slice(0, 3).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-2 rounded-md hover:bg-sidebar-accent cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {schedule.type === "deadline" && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        {schedule.type === "presentation" && (
                          <Calendar className="h-3 w-3 text-blue-500" />
                        )}
                        {schedule.type === "meeting" && (
                          <Users className="h-3 w-3 text-green-500" />
                        )}
                        <span className="text-xs font-medium truncate">
                          {schedule.title}
                        </span>
                        {schedule.priority === "high" && (
                          <Badge variant="destructive" className="text-xs h-4 px-1">
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                            !
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
<<<<<<< HEAD
                          {formatScheduleDate(s.date)} {s.time ?? ""}
=======
                          {formatScheduleDate(schedule.date)} {schedule.time}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                        </span>
                      </div>
                    </div>
                  ))}
<<<<<<< HEAD
=======
                  {upcomingSchedules.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      +{upcomingSchedules.length - 3}개 더 보기
                    </div>
                  )}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                </div>
              )}
            </div>

            <Button
              variant="ghost"
<<<<<<< HEAD
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
=======
              className={`w-full ${
                collapsed ? "justify-center px-2" : "justify-start gap-3"
              }`}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
              title={collapsed ? "공지/메시지" : undefined}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "공지/메시지"}
            </Button>

            <Button
              variant="ghost"
<<<<<<< HEAD
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
=======
              className={`w-full ${
                collapsed ? "justify-center px-2" : "justify-start gap-3"
              }`}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD
}
=======
}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
