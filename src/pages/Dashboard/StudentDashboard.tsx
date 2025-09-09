<<<<<<< HEAD
﻿import { useEffect, useMemo, useState, useCallback } from "react";
=======
﻿import React, { useState, useEffect } from "react";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarWidget } from "@/components/Dashboard/CalendarWidget";
<<<<<<< HEAD
import { EventEditor } from "@/components/Schedule/EventEditor";
import { scheduleBus } from "@/lib/schedule-bus";
=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
import {
  Calendar,
  Users,
  FileText,
  GitBranch,
<<<<<<< HEAD
  CheckCircle,
  AlertCircle,
  Plus,
  Video,
  Clock,
} from "lucide-react";
import { getProjectDashboardSummary } from "@/api/dashboard";
import { listProjectFeedback } from "@/api/feedback";
import { listProjects } from "@/api/projects";
import { listTeams } from "@/api/teams";
import { listSchedulesInRange } from "@/api/schedules";
import type {
  DashboardSummary,
  FeedbackDto,
  ProjectListDto,
  TeamListDto,
  ScheduleDto,
} from "@/types/domain";

/* ===== util ===== */
const toYMD = (d: Date) => d.toISOString().split("T")[0];
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
function TypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: ScheduleDto["type"];
  className?: string;
}) {
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
=======
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  getProjectDashboardSummary,
  getProjectDashboardDeadlines,
} from "@/api/dashboard";
import { listProjectFeedback } from "@/api/feedback";
import { listProjects } from "@/api/projects";
import { listTeams } from "@/api/teams";
import type {
  DashboardSummary,
  DeadlineItem,
  FeedbackDto,
  ProjectListDto,
  TeamListDto,
} from "@/types/domain";

>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
interface StudentDashboardProps {
  projectId: number;
}

export function StudentDashboard({ projectId }: StudentDashboardProps) {
  const [project, setProject] = useState<ProjectListDto | null>(null);
  const [team, setTeam] = useState<TeamListDto | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
<<<<<<< HEAD
  const [feedback, setFeedback] = useState<FeedbackDto[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [tab, setTab] = useState<STab>("all");
  const [loading, setLoading] = useState(true);

  const refreshSchedules = useCallback(async () => {
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

        // 프로젝트/팀/대시보드/피드백 병렬 호출
        const [projects, teams, summaryData, feedbackData] = await Promise.all([
          listProjects(),
          listTeams(),
          getProjectDashboardSummary(projectId),
          listProjectFeedback(projectId),
        ]);
=======
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projects, teams, summaryData, deadlinesData, feedbackData] =
          await Promise.all([
            listProjects(),
            listTeams(),
            getProjectDashboardSummary(projectId),
            getProjectDashboardDeadlines(projectId),
            listProjectFeedback(projectId),
          ]);
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

        const currentProject = projects.find((p) => p.id === projectId) ?? null;
        setProject(currentProject);

<<<<<<< HEAD
        if (currentProject?.team) {
          const currentTeam =
            teams.find((t) => t.name === currentProject.team) ?? null;
=======
        if (currentProject?.teamId) {
          const currentTeam = teams.find((t) => t.id === currentProject.teamId) ?? null;
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
          setTeam(currentTeam);
        }

        setSummary(summaryData);
<<<<<<< HEAD
        setFeedback(feedbackData);

        // 일정
        await refreshSchedules();
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
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

  /* ============ 다가오는 일정 탭 필터 ============ */
  const upcomingItems = useMemo(() => {
    const nowYmd = toYMD(new Date());
    const byTab = (s: ScheduleDto) => (tab === "all" ? true : s.type === tab);
    const futureOnly = (s: ScheduleDto) => (s.date ?? "") >= nowYmd; // 오늘 이후
    return schedules.filter(byTab).filter(futureOnly).slice(0, 5);
  }, [tab, schedules]);

  // 모달 (새 일정)
  const [editorOpen, setEditorOpen] = useState(false);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 상단 요약 */}
=======
        setDeadlines(deadlinesData);
        setFeedback(feedbackData);
      } catch (error) {
        console.error("Failed to fetch student dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 상단 요약 카드 */}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
<<<<<<< HEAD
                <p className="text-2xl font-semibold">{tasksInProgress}</p>
=======
                <p className="text-2xl font-semibold">
                  {summary?.tasksTotal ?? "N/A"}
                </p>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD
                <p className="text-2xl font-semibold">{memberCount ?? "N/A"}</p>
=======
                <p className="text-2xl font-semibold">
                  {team?.memberCount ?? "N/A"}
                </p>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD
                  {tasksDone}/{tasksTotal}
=======
                  {summary?.tasksDone ?? 0}/{summary?.tasksTotal ?? 0}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
                  {project?.name ?? "프로젝트명을 불러오는 중…"}
                </h3>
<<<<<<< HEAD
                <Badge variant="secondary">{progressRate}% 진행</Badge>
              </div>
              <Progress value={progressRate} className="h-2" />
=======
                <Badge variant="secondary">
                  {summary?.progressRate ?? 0}% 진행
                </Badge>
              </div>
              <Progress value={summary?.progressRate ?? 0} className="h-2" />
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
<<<<<<< HEAD
                <span>{memberCount ?? "N/A"}명 팀원</span>
=======
                <span>{team?.memberCount ?? "N/A"}명 팀원</span>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
<<<<<<< HEAD
                  최종 업데이트: {formatDateK(project?.lastUpdate)}
=======
                  최종 업데이트:{" "}
                  {project?.updatedAt
                    ? new Date(project.updatedAt).toLocaleDateString("ko-KR")
                    : "N/A"}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                </span>
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

<<<<<<< HEAD
        {/* 다가오는 일정 - 탭 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>다가오는 일정</CardTitle>
                <CardDescription>회의 · 발표 · 작업 · 마감</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditorOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                새 일정
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { v: "all",    label: "전체" },
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
                              {item.time && ` ${item.time}${item.endTime ? ` ~ ${item.endTime}` : ""}`}
                            </>
                          )}
                          {item.location && (
                            <span className="ml-2">· {item.location}</span>
                          )}
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
=======
        {/* 다가오는 일정 */}
        <Card>
          <CardHeader>
            <CardTitle>다가오는 일정</CardTitle>
            <CardDescription>마감일이 임박한 과제들</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deadlines.map((task, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        마감:{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("ko-KR")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    시작
                  </Button>
                </div>
              ))}
              {deadlines.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  예정된 마감이 없습니다.
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

<<<<<<< HEAD
      {/* 월간 캘린더 위젯 */}
=======
      {/* 캘린더 위젯 */}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      <CalendarWidget />

      {/* 최근 피드백 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>최근 피드백</CardTitle>
<<<<<<< HEAD
              <CardDescription>교수/멘토로부터의 최신 피드백</CardDescription>
=======
              <CardDescription>
                교수/멘토로부터의 최신 피드백
              </CardDescription>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD
                    {formatDateK(fb.createdAt)}
=======
                    {fb.createdAt
                      ? new Date(fb.createdAt).toLocaleDateString("ko-KR")
                      : "N/A"}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD

      {/* 새 일정 모달 (저장 후 재조회) */}
      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        onSaved={async () => {
          setEditorOpen(false);
          await refreshSchedules();
          scheduleBus.emitChanged();
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
