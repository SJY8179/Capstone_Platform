// src/pages/Schedule/ScheduleManagement.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  FileText,
  Users,
  AlertCircle,
  Video,
  Trash2,
  Plus,
} from "lucide-react";
import type { UserRole } from "@/types/user";
import {
  listSchedulesInRange,
  invalidateSchedulesCache,
  probeScheduleAccess,
} from "@/api/schedules";
import type { ScheduleDto, ScheduleType, EventType } from "@/types/domain";
import { EventEditor } from "@/components/Schedule/EventEditor";
import { deleteEvent } from "@/api/events";
import { scheduleBus } from "@/lib/schedule-bus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { accessErrorMessage, getApiError, isAccessError } from "@/api/http";
import { listProjects } from "@/api/projects";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/stores/auth";
import { getProfessorSummary } from "@/api/dashboard";

export interface ScheduleManagementProps {
  userRole: UserRole;
  projectId?: number; // 있더라도 교수/관리자에겐 초기 선택값으로만 사용
}

type ProjectOption = { id: number; name: string; members?: any[] };

function toYMD(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isEventId(id: string) {
  return id.startsWith("E-");
}
function parseEventId(id: string): number | null {
  const m = id.match(/^E-(\d+)$/);
  return m ? Number(m[1]) : null;
}
function scheduleTypeToEventType(t?: ScheduleType): EventType {
  switch (t) {
    case "meeting":
      return "MEETING";
    case "deadline":
      return "DEADLINE";
    case "presentation":
      return "PRESENTATION";
    case "task":
    default:
      return "ETC";
  }
}

export function ScheduleManagement({
  userRole,
  projectId,
}: ScheduleManagementProps) {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] =
    useState<"upcoming" | "all" | "past">("upcoming");
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 교수/관리자는 항상 프로젝트 전환 가능
  const canSwitchProject = userRole === "admin" || userRole === "professor";

  // 드롭다운에 넣을 프로젝트 목록
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  // 선택된 프로젝트 (문자열 상태)
  const [pickedProjectId, setPickedProjectId] = useState<string>("");

  // editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleDto | null>(null);

  // 프로젝트 필요 안내 모달
  const [needProjectOpen, setNeedProjectOpen] = useState(false);

  // 최종 사용할 프로젝트 ID: picked > prop(projectId)
  const resolvedProjectId = useMemo<number | undefined>(() => {
    const n = Number(pickedProjectId);
    if (Number.isFinite(n) && n > 0) return n;
    if (projectId) return projectId;
    return undefined;
  }, [pickedProjectId, projectId]);

  // 탭에 따라 조회 기간 설정
  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (selectedTab) {
      case "upcoming":
        return { from: toYMD(today), to: toYMD(addDays(today, 60)) };
      case "past":
        return { from: toYMD(addDays(today, -180)), to: toYMD(today) };
      case "all":
      default:
        return {
          from: toYMD(addDays(today, -180)),
          to: toYMD(addDays(today, 180)),
        };
    }
  }, [selectedTab]);

  // --- 학생만 권한 프로브 사용 ---
  const shouldProbe = userRole === "student";

  // 드롭다운을 보여줄지 여부: 교수/관리자 true, 학생은 projectId가 없을 때만
  const showProjectPicker = canSwitchProject || !projectId;

  // 프로젝트 옵션 로더(안전 폴백 + **학생만** 권한 프로브)
  useEffect(() => {
    if (!showProjectPicker) return;

    const normalize = (arr: any[] | undefined): ProjectOption[] =>
      (arr ?? []).map((p: any) => ({
        id: p.id,
        name: p.name ?? p.title ?? `프로젝트 #${p.id}`,
        members: Array.isArray(p.members) ? p.members : [],
      }));

    (async () => {
      try {
        // 1) 기본 목록 (관리자는 전체, 그 외는 my)
        let base = normalize(await listProjects({ isAdmin: userRole === "admin" }));

        // 학생이면 내가 속한 프로젝트만 필터(멤버십 기준)
        if (userRole === "student") {
          const myId = user?.id ? String(user.id) : undefined;
          const myEmail = user?.email?.toLowerCase();
          const myName = user?.name;
          base = base.filter((p) =>
            (p.members ?? []).some(
              (m: any) =>
                (myId && m?.id != null && String(m.id) === myId) ||
                (myEmail && m?.email && String(m.email).toLowerCase() === myEmail) ||
                (myName && m?.name && String(m.name) === myName)
            )
          );
        }

        // 2) 폴백: 교수/관리자이고 기본 목록이 비면 교수 대시보드 요약에서 추출
        if ((userRole === "admin" || userRole === "professor") && base.length === 0) {
          try {
            const sum = await getProfessorSummary();
            const map = new Map<number, string>();

            sum.topTeams?.forEach?.((t: any) =>
              map.set(t.projectId, t.projectName ?? `프로젝트 #${t.projectId}`)
            );
            sum.recentSubmissions?.forEach?.((s: any) =>
              map.set(s.projectId, s.projectName ?? `프로젝트 #${s.projectId}`)
            );
            sum.pendingReviews?.forEach?.((r: any) =>
              map.set(r.projectId, r.projectName ?? `프로젝트 #${r.projectId}`)
            );

            base = Array.from(map, ([id, name]) => ({ id, name }));
          } catch {
            // 요약 API가 없거나 권한이 없으면 무시
          }
        }

        // 3) **학생만** 접근권한 프로브로 최종 필터링
        let finalOptions: ProjectOption[] = base;
        if (shouldProbe) {
          const probed = await Promise.allSettled(
            base.map(async (p) => ({
              p,
              ok: await probeScheduleAccess(p.id).catch(() => false),
            }))
          );
          finalOptions = probed
            .map((r) => (r.status === "fulfilled" ? r.value : null))
            .filter(Boolean)
            .filter((v: any) => v.ok)
            .map((v: any) => v.p as ProjectOption);
        }

        setProjectOptions(finalOptions);

        // 기본 선택 자동 지정(이전에 선택한 값이 없다면): prop(projectId) 우선
        if (!pickedProjectId) {
          if (projectId) {
            setPickedProjectId(String(projectId));
          } else if (finalOptions.length > 0) {
            setPickedProjectId(String(finalOptions[0].id));
          }
        }
      } catch (e) {
        console.error(e);
        setProjectOptions([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProjectPicker, userRole, user?.id, user?.email, user?.name, shouldProbe, projectId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!resolvedProjectId) {
        setSchedules([]);
        return;
      }
      const rows = await listSchedulesInRange({
        from: range.from,
        to: range.to,
        projectId: resolvedProjectId,
      });
      setSchedules(rows);
    } catch (error) {
      // 여기로 거의 안 들어오지만(위에서 401/403을 빈 배열로 처리)
      console.error("Failed to fetch schedules:", error);
      setSchedules([]); // 조용히 비움
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, resolvedProjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTypeIcon = (type?: ScheduleType) => {
    switch (type) {
      case "deadline":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "meeting":
        return <Users className="h-4 w-4 text-green-500" />;
      case "presentation":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "task":
      default:
        return <FileText className="h-4 w-4 text-purple-500" />;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "날짜 없음";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    today.setHours(0, 0, 0, 0);

    if (date.toDateString() === today.toDateString()) return "오늘";
    if (date.toDateString() === tomorrow.toDateString()) return "내일";
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = schedules.filter((s) => {
      const matches =
        (s.title?.toLowerCase().includes(q) ?? false) ||
        (s.assignee?.toLowerCase().includes(q) ?? false) ||
        (s.location?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;

      const d = s.date ? new Date(s.date) : undefined;
      if (selectedTab === "all") return true;
      if (!d) return selectedTab === "past";
      return selectedTab === "upcoming" ? d >= today : d < today;
    });

    return filtered.sort((a, b) => {
      const aT = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return aT - bT;
    });
  }, [schedules, searchQuery, selectedTab]);

  const onCreateClick = () => {
    if (!resolvedProjectId) {
      toast.info("프로젝트를 먼저 선택하세요.");
      setNeedProjectOpen(true);
      return;
    }
    setEditing(null);
    setEditorOpen(true);
  };

  const onEditClick = (row: ScheduleDto) => {
    if (!isEventId(row.id)) return;
    if (!resolvedProjectId) return;
    setEditing(row);
    setEditorOpen(true);
  };

  const onDeleteClick = async (row: ScheduleDto) => {
    if (!isEventId(row.id)) return;
    if (!resolvedProjectId) return;
    const idNum = parseEventId(row.id);
    if (!idNum) return;

    if (!confirm(`"${row.title}" 일정을 삭제할까요?`)) return;

    try {
      await deleteEvent(resolvedProjectId, idNum);
      invalidateSchedulesCache(resolvedProjectId);
      await refresh();
      scheduleBus.emitChanged();
      toast.success("일정을 삭제했어요.");
    } catch (e: any) {
      const err = getApiError(e);
      if (isAccessError(err)) {
        toast.error(accessErrorMessage(err.code));
      } else {
        toast.error(err.message || "삭제에 실패했습니다.");
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">일정 관리</h1>
          <p className="text-muted-foreground">
            {userRole === "student"
              ? "내 프로젝트 일정을 확인하고 관리하세요."
              : userRole === "professor"
                ? "담당 과목/프로젝트의 일정을 관리하세요."
                : "전체 일정 현황을 확인하고 관리하세요."}
          </p>
        </div>

        {/* 프로젝트 선택 (교수/관리자는 항상 노출, 학생은 projectId 없을 때만) */}
        {showProjectPicker ? (
          <div className="flex items-end gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">프로젝트</Label>
              <Select
                value={pickedProjectId}
                onValueChange={async (v) => {
                  setPickedProjectId(v);
                  if (shouldProbe) {
                    // 학생만 선택 시 권한 재확인
                    const ok = await probeScheduleAccess(Number(v)).catch(() => false);
                    if (!ok) {
                      toast.error("이 프로젝트에 접근 권한이 없습니다.");
                      setSchedules([]);
                      return;
                    }
                  }
                  setTimeout(() => refresh(), 0);
                }}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue
                    placeholder={
                      projectOptions.length
                        ? "프로젝트 선택"
                        : "표시할 프로젝트가 없습니다."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              새 일정 추가
            </Button>
          </div>
        ) : (
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            새 일정 추가
          </Button>
        )}
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Input
          placeholder="일정 제목/담당자/위치로 검색…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-3"
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
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(s.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">
                              {s.title ?? "제목 없음"}
                            </h3>
                            <Badge variant="outline">{s.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            담당자: {s.assignee ?? "정보 없음"}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(s.date)}</span>
                            {s.time && (
                              <span className="ml-1">
                                {s.time}
                                {s.endTime ? ` ~ ${s.endTime}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          위치: {s.location ?? "-"}
                        </div>
                        <div className="flex gap-2">
                          {isEventId(s.id) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEditClick(s)}
                              >
                                편집
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDeleteClick(s)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                삭제
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              과제
                            </Button>
                          )}
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
                {!resolvedProjectId
                  ? "오른쪽 상단에서 프로젝트를 선택해 주세요."
                  : selectedTab === "upcoming"
                    ? "다가오는 일정이 없습니다."
                    : selectedTab === "past"
                      ? "지난 일정이 없습니다."
                      : "검색 조건에 맞는 일정이 없습니다."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 이벤트 생성/수정 모달 */}
      {resolvedProjectId && (
        <EventEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          projectId={resolvedProjectId}
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
            invalidateSchedulesCache(resolvedProjectId);
            await refresh();
            scheduleBus.emitChanged();
          }}
        />
      )}

      {/* 프로젝트 안내 모달 (미지정) */}
      {!resolvedProjectId && (
        <Dialog open={needProjectOpen} onOpenChange={setNeedProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로젝트 선택이 필요합니다</DialogTitle>
              <DialogDescription>
                일정을 추가하려면 먼저 상단에서 프로젝트를 선택하거나 프로젝트에
                참여하세요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNeedProjectOpen(false)}
              >
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ScheduleManagement;
