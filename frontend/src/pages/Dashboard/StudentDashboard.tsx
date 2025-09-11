import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarWidget } from "@/components/Dashboard/CalendarWidget";
import { EventEditor } from "@/components/Schedule/EventEditor";
import { scheduleBus } from "@/lib/schedule-bus";
import {
  Calendar, Users, FileText, GitBranch, CheckCircle, AlertCircle, Plus, Video, Clock,
} from "lucide-react";
import { getProjectDashboardSummary } from "@/api/dashboard";
import { listProjectFeedback } from "@/api/feedback";
import { listProjects } from "@/api/projects";
import { listTeams } from "@/api/teams";
import { listSchedulesInRange, invalidateSchedulesCache } from "@/api/schedules";
import type {
  DashboardSummary, FeedbackDto, ProjectListDto, TeamListDto, ScheduleDto,
} from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

/* ===== util ===== */
/** 로컬 시간 기준 YYYY-MM-DD */
const toYMD = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const formatDateK = (isoOrYmd?: string | null) =>
  isoOrYmd ? new Date(isoOrYmd).toLocaleDateString("ko-KR") : "N/A";

/* 탭 타입 */
type STab = "all" | "meeting" | "presentation" | "task" | "deadline";

/* 아이콘/색상 헬퍼 */
function TypeIcon({ type, className = "h-4 w-4" }: { type: ScheduleDto["type"]; className?: string; }) {
  switch (type) {
    case "deadline":
      return <AlertCircle className={`${className} text-red-500`} />;
    case "meeting":
      return <Users className={`${className} text-green-600`} />;
    case "presentation":
      return <Video className={`${className} text-blue-600`} />;
    case "task":
    default:
      return <FileText className={`${className} text-purple-600`} />;
  }
}

/* ===== component ===== */
interface StudentDashboardProps {
  projectId?: number;
}

export function StudentDashboard({ projectId }: StudentDashboardProps) {
  const [project, setProject] = useState<ProjectListDto | null>(null);
  const [team, setTeam] = useState<TeamListDto | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDto[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [tab, setTab] = useState<STab>("all");
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [needProjectOpen, setNeedProjectOpen] = useState(false);

  const refreshSchedules = useCallback(async () => {
    if (!projectId) {
      setSchedules([]);
      return;
    }
    const today = new Date();
    const end = addDays(today, 45);

    const rows = await listSchedulesInRange({
      from: toYMD(today),
      to: toYMD(end),
      projectId,
    });

    const sorted = [...rows].sort((a, b) => {
      const at = `${a.date ?? ""}${a.time ?? ""}`;
      const bt = `${b.date ?? ""}${b.time ?? ""}`;
      return at.localeCompare(bt);
    });
    setSchedules(sorted);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        if (!projectId) {
          setProject(null);
          setTeam(null);
          setSummary(null);
          setFeedback([]);
          setSchedules([]);
          return;
        }

        const [projects, teams, summaryData, feedbackData] = await Promise.all([
          listProjects(),
          listTeams(),
          getProjectDashboardSummary(projectId),
          listProjectFeedback(projectId),
        ]);

        const currentProject =
          projects.find((p: ProjectListDto) => p.id === projectId) ?? null;
        setProject(currentProject);

        if (currentProject?.team) {
          const currentTeam =
            teams.find((t: TeamListDto) => t.name === currentProject.team) ?? null;
          setTeam(currentTeam);
        } else {
          setTeam(null);
        }

        setSummary(summaryData);
        setFeedback(feedbackData);

        await refreshSchedules();
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, refreshSchedules]);

  /* 다른 컴포넌트에서 일정이 변경되면 대시보드도 즉시 갱신 */
  useEffect(() => {
    const handler = async () => {
      if (!projectId) return;
      try { invalidateSchedulesCache(projectId); } catch { }
      await refreshSchedules();
    };

    let off: (() => void) | undefined;

    try {
      // onChanged(handler) 형태 지원
      // @ts-ignore
      off = scheduleBus.onChanged?.(handler);
    } catch { }

    try {
      // on("changed", handler) 형태 지원
      if (!off && typeof (scheduleBus as any).on === "function") {
        // @ts-ignore
        scheduleBus.on("changed", handler);
        off = () => {
          try {
            // @ts-ignore
            scheduleBus.off?.("changed", handler);
          } catch { }
        };
      }
    } catch { }

    return () => { try { off?.(); } catch { } };
  }, [projectId, refreshSchedules]);

  /* 카드 상단 요약 값 */
  const tasksTotal = useMemo(() => {
    if (!summary) return 0;
    const a = summary.assignments;
    return (a?.open ?? 0) + (a?.inProgress ?? 0) + (a?.closed ?? 0);
  }, [summary]);
  const tasksDone = summary?.assignments.closed ?? 0;
  const tasksInProgress = summary?.assignments.inProgress ?? 0;
  const progressRate = summary?.progressPct ?? 0;
  const memberCount = team ? team.members.length : summary?.memberCount ?? undefined;

  const upcomingItems = useMemo((): ScheduleDto[] => {
    const nowYmd = toYMD(new Date());
    const byTab = (s: ScheduleDto) => (tab === "all" ? true : s.type === tab);
    const futureOnly = (s: ScheduleDto) => (s.date ?? "") >= nowYmd;
    return schedules.filter(byTab).filter(futureOnly).slice(0, 5);
  }, [tab, schedules]);

  const handleClickNewSchedule = () => {
    if (projectId) {
      setEditorOpen(true);
    } else {
      setNeedProjectOpen(true);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 상단 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{tasksInProgress}</p>
                <p className="text-sm text-muted-foreground">진행 중인 과제</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{memberCount ?? "N/A"}</p>
                <p className="text-sm text-muted-foreground">팀원 수</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <GitBranch className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-semibold">N/A</p>
                <p className="text-sm text-muted-foreground">레포 상태</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {tasksDone}/{tasksTotal}
                </p>
                <p className="text-sm text-muted-foreground">완료 현황</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 내 프로젝트 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>내 프로젝트 현황</CardTitle>
            <CardDescription>현재 진행 중인 캡스톤 프로젝트</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  {project ? project.name : "참여 중인 프로젝트가 없습니다."}
                </h3>
                <Badge variant="secondary">{progressRate}% 진행</Badge>
              </div>
              <Progress value={progressRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{memberCount ?? "N/A"}명 팀원</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>최종 업데이트: {formatDateK(project?.lastUpdate)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                보고서 작성
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <GitBranch className="h-4 w-4 mr-2" />
                GitHub 연동
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 다가오는 일정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>다가오는 일정</CardTitle>
                <CardDescription>회의 · 발표 · 작업 · 마감</CardDescription>
              </div>
              <Button size="sm" onClick={handleClickNewSchedule}>
                <Plus className="h-4 w-4 mr-1" />
                새 일정
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { v: "all", label: "전체" },
                { v: "meeting", label: "회의" },
                { v: "presentation", label: "발표" },
                { v: "task", label: "작업" },
                { v: "deadline", label: "마감" },
              ] as { v: STab; label: string }[]).map(({ v, label }) => (
                <Button
                  key={v}
                  size="sm"
                  variant={tab === v ? "secondary" : "ghost"}
                  onClick={() => setTab(v)}
                  className="h-7"
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {upcomingItems.map((item) => {
                const dateTime =
                  item.date
                    ? new Date(
                      `${item.date}T${item.time ? item.time : "00:00"}:00`
                    )
                    : null;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <TypeIcon type={item.type} />
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {dateTime && (
                            <>
                              <Clock className="h-3 w-3" />
                              {dateTime.toLocaleDateString("ko-KR")}
                              {item.time &&
                                ` ${item.time}${item.endTime ? ` ~ ${item.endTime}` : ""
                                }`}
                            </>
                          )}
                          {item.location && <span className="ml-2">· {item.location}</span>}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      시작
                    </Button>
                  </div>
                );
              })}

              {upcomingItems.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  해당 분류의 예정 일정이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월간 캘린더 위젯 */}
      <CalendarWidget projectId={projectId} />

      {/* 최근 피드백 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>최근 피드백</CardTitle>
              <CardDescription>교수/멘토로부터의 최신 피드백</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              피드백 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div key={fb.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{fb.author ?? "작성자"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateK(fb.createdAt)}
                  </span>
                </div>
                <p className="text-sm">{fb.content}</p>
              </div>
            ))}
            {feedback.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                등록된 피드백이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 새 일정 모달 */}
      {!!projectId && (
        <EventEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          projectId={projectId}
          onSaved={async () => {
            setEditorOpen(false);
            invalidateSchedulesCache(projectId);
            await refreshSchedules();
            scheduleBus.emitChanged?.();
            // @ts-ignore
            scheduleBus.emit?.("changed");
          }}
        />
      )}

      {!projectId && (
        <Dialog open={needProjectOpen} onOpenChange={setNeedProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로젝트 참여가 필요합니다</DialogTitle>
              <DialogDescription>
                일정을 추가하려면 먼저 프로젝트에 참여하거나 새 프로젝트를 생성하세요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setNeedProjectOpen(false)}>
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}