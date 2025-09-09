<<<<<<< HEAD
﻿import { useEffect, useMemo, useState, useCallback } from "react";
=======
﻿// src/pages/Schedule/ScheduleManagement.tsx
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
<<<<<<< HEAD
import { Calendar, FileText, Users, AlertCircle, Video, Trash2 } from "lucide-react";
import { UserRole } from "@/App";
import { listSchedules } from "@/api/schedules";
import type { ScheduleDto, ScheduleType, EventType } from "@/types/domain";
import { EventEditor } from "@/components/Schedule/EventEditor";
import { deleteEvent } from "@/api/events";
import { listProjects } from "@/api/projects";
import { scheduleBus } from "@/lib/schedule-bus"; //사이드바 즉시 갱신용
=======
import { Calendar, Clock, Plus, Search, FileText, Users } from "lucide-react";
import { UserRole } from "@/App";
import { listSchedules } from "@/api/schedules";
import type { ScheduleDto } from "@/types/domain";
import { useEffect, useMemo, useState } from "react";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

interface ScheduleManagementProps {
  userRole: UserRole;
}

<<<<<<< HEAD
function isEventId(id: string) {
  return id.startsWith("E-");
}
function parseEventId(id: string): number | null {
  const m = id.match(/^E-(\d+)$/);
  return m ? Number(m[1]) : null;
}
function scheduleTypeToEventType(t?: ScheduleType): EventType {
  switch (t) {
    case "meeting": return "MEETING";
    case "deadline": return "DEADLINE";
    case "presentation": return "PRESENTATION";
    case "task":
    default: return "ETC";
  }
}

export function ScheduleManagement({ userRole }: ScheduleManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"upcoming" | "all" | "past">("upcoming");
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectId, setProjectId] = useState<number | null>(null);

  // editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleDto | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSchedules();
      setSchedules(rows);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 첫 프로젝트 id 확보 (일정 생성/이벤트 수정/삭제에 필요)
  useEffect(() => {
    (async () => {
      try {
        const ps = await listProjects();
        setProjectId(ps?.[0]?.id ?? null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const getTypeIcon = (type?: ScheduleType) => {
    switch (type) {
      case "deadline": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "meeting": return <Users className="h-4 w-4 text-green-500" />;
      case "presentation": return <Video className="h-4 w-4 text-blue-500" />;
      case "task": default: return <FileText className="h-4 w-4 text-purple-500" />;
    }
  };

  const formatDate = (dateString?: string | null) => {
=======
export function ScheduleManagement({ userRole }: ScheduleManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"upcoming" | "all" | "past">(
    "upcoming"
  );
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await listSchedules();
        setSchedules(data);
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 아이콘은 단일 타입으로 표시(백엔드에 type 필드가 없기 때문)
  const getTypeIcon = () => <FileText className="h-4 w-4 text-purple-500" />;

  const formatDate = (dateString?: string) => {
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
    if (!dateString) return "날짜 없음";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "오늘";
    if (date.toDateString() === tomorrow.toDateString()) return "내일";
<<<<<<< HEAD
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
=======
    return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
  };

  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = schedules.filter((s) => {
      const matches =
        (s.title?.toLowerCase().includes(q) ?? false) ||
<<<<<<< HEAD
        (s.assignee?.toLowerCase().includes(q) ?? false) ||
        (s.location?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;

      const d = s.date ? new Date(s.date) : undefined;
      if (selectedTab === "all") return true;
      if (!d) return selectedTab === "past";
=======
        (s.assignee?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;

      const d = s.dueDate ? new Date(s.dueDate) : undefined;
      if (selectedTab === "all") return true;
      if (!d) return selectedTab === "past"; // 날짜가 없으면 과거로 분류
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      return selectedTab === "upcoming" ? d >= today : d < today;
    });

    return filtered.sort((a, b) => {
<<<<<<< HEAD
      const aT = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
=======
      const aT = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      return aT - bT;
    });
  }, [schedules, searchQuery, selectedTab]);

<<<<<<< HEAD
  const onCreateClick = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const onEditClick = (row: ScheduleDto) => {
    if (!isEventId(row.id)) return;
    setEditing(row);
    setEditorOpen(true);
  };

  const onDeleteClick = async (row: ScheduleDto) => {
    if (!isEventId(row.id)) return;
    const idNum = parseEventId(row.id);
    if (!idNum || !projectId) return;

    if (!confirm(`"${row.title}" 일정을 삭제할까요?`)) return;

    try {
      await deleteEvent(projectId, idNum);
      await refresh();
      scheduleBus.emitChanged(); //사이드바/다른 위젯 즉시 갱신
    } catch (e: any) {
      alert(e?.message ?? "삭제에 실패했습니다.");
    }
  };

=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">일정 관리</h1>
          <p className="text-muted-foreground">
            {userRole === "student"
              ? "내 프로젝트 일정을 확인하고 관리하세요."
              : userRole === "professor"
<<<<<<< HEAD
                ? "담당 과목/프로젝트의 일정을 관리하세요."
                : "전체 일정 현황을 확인하고 관리하세요."}
          </p>
        </div>
        <Button onClick={onCreateClick} disabled={!projectId}>새 일정 추가</Button>
=======
              ? "담당 과목/프로젝트의 일정을 관리하세요."
              : "전체 일정 현황을 확인하고 관리하세요."}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 일정 추가
        </Button>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
<<<<<<< HEAD
        <Input
          placeholder="일정 제목/담당자/위치로 검색…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-3"
=======
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="일정 제목 또는 담당자로 검색…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
        />
      </div>

      {/* 탭 & 목록 */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList>
          <TabsTrigger value="upcoming">다가오는 일정</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="past">지난 일정</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <div className="space-y-4">
            {filteredSorted.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
<<<<<<< HEAD
                    <div className="flex-shrink-0 mt-1">{getTypeIcon(s.type)}</div>
=======
                    <div className="flex-shrink-0 mt-1">{getTypeIcon()}</div>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{s.title ?? "제목 없음"}</h3>
<<<<<<< HEAD
                            <Badge variant="outline">{s.status}</Badge>
=======
                            <Badge variant="outline">상태 API 필요</Badge>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                          </div>
                          <p className="text-sm text-muted-foreground">
                            담당자: {s.assignee ?? "정보 없음"}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
<<<<<<< HEAD
                            <span>{formatDate(s.date)}</span>
                            {s.time && (
                              <span className="ml-1">
                                {s.time}
                                {s.endTime ? ` ~ ${s.endTime}` : ""}
                              </span>
                            )}
=======
                            <span>{formatDate(s.dueDate)}</span>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
<<<<<<< HEAD
                          위치: {s.location ?? "-"}
                        </div>
                        <div className="flex gap-2">
                          {isEventId(s.id) ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => onEditClick(s)}>
                                편집
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onDeleteClick(s)}>
                                <Trash2 className="h-3 w-3 mr-1" />
                                삭제
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              과제
                            </Button>
                          )}
=======
                          상세 정보(상태, 메모 등) 연동 필요
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            편집
                          </Button>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSorted.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedTab === "upcoming"
                  ? "다가오는 일정이 없습니다."
                  : selectedTab === "past"
<<<<<<< HEAD
                    ? "지난 일정이 없습니다."
                    : "검색 조건에 맞는 일정이 없습니다."}
=======
                  ? "지난 일정이 없습니다."
                  : "검색 조건에 맞는 일정이 없습니다."}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
<<<<<<< HEAD

      {/* 이벤트 생성/수정 모달 */}
      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId ?? 0}
        initial={
          editing
            ? {
              id: parseEventId(editing.id) ?? undefined,
              title: editing.title ?? "",
              date: editing.date ?? "",
              startTime: editing.time ?? "",
              endTime: editing.endTime ?? "",
              type: scheduleTypeToEventType(editing.type),
              location: editing.location ?? "",
            }
            : undefined
        }
        onSaved={async () => {
          setEditorOpen(false);
          await refresh();
          scheduleBus.emitChanged(); //저장 직후 전역 갱신
        }}
      />
    </div>
  );
}
=======
    </div>
  );
}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
