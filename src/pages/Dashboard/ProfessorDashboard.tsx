// src/pages/Dashboard/ProfessorDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarWidget } from "@/components/Dashboard/CalendarWidget";
import {
  Users,
  FileText,
  Star,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";
import { getProfessorSummary, type ProfessorSummary } from "@/api/dashboard";
import { changeAssignmentStatus } from "@/api/assignments";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TEXTS = {
  loading: "로딩중...",
  headerTitle: "교수 대시보드",
  headerDescription: "담당 강좌 및 프로젝트 현황을 확인하세요.",
  teams: "진행 팀",
  pendingReviews: "검토 대기",
  students: "수강 학생",
  avgProgress: "평균 진도",
  pendingItemsTitle: "검토 대기 항목",
  pendingItemsDescription: "평가가 필요한 제출물들",
  pendingItemsAction: "일괄 검토",
  pendingItemsEmpty: "검토 대기 목록이 비어 있습니다.",
  recentSubmissionsTitle: "최근 제출물",
  recentSubmissionsDescription: "최근 업데이트된 제출물",
  recentSubmissionsEmpty: "최근 제출물이 없습니다.",
  topTeamsTitle: "상위 성과 팀",
  topTeamsDescription: "현재 높은 성과를 보이는 팀들",
  topTeamsEmpty: "표시할 팀이 없습니다.",
  newSchedule: "새 일정",
  needProjectTitle: "프로젝트 연결 필요",
  needProjectDesc:
    "새 일정을 추가하려면 먼저 담당하거나 참여 중인 프로젝트가 필요합니다.",
  confirm: "확인",
  noProjectCallout:
    "담당/참여 중인 프로젝트가 없습니다. 프로젝트를 생성하거나 팀에 초대를 요청하세요.",
  createProject: "프로젝트 생성",
  requestInvite: "초대 요청",
};

interface ProfessorDashboardProps {
  projectId?: number;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export function ProfessorDashboard({ projectId }: ProfessorDashboardProps) {
  const [data, setData] = useState<ProfessorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [needProjectOpen, setNeedProjectOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getProfessorSummary();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const approve = async (assignmentId: number, projectIdForRow: number) => {
    try {
      await changeAssignmentStatus(projectIdForRow, assignmentId, "COMPLETED");
      toast.success("승인 완료");
      setData((prev) =>
        prev
          ? {
              ...prev,
              pendingReviews: prev.pendingReviews.filter(
                (p) => p.assignmentId !== assignmentId
              ),
            }
          : prev
      );
    } catch {
      toast.error("승인 실패");
    }
  };

  const reject = async (assignmentId: number, projectIdForRow: number) => {
    try {
      await changeAssignmentStatus(projectIdForRow, assignmentId, "PENDING");
      toast.success("반려 처리");
      setData((prev) =>
        prev
          ? {
              ...prev,
              pendingReviews: prev.pendingReviews.filter(
                (p) => p.assignmentId !== assignmentId
              ),
            }
          : prev
      );
    } catch {
      toast.error("반려 실패");
    }
  };

  const onBulkApprove = async () => {
    const items = data?.pendingReviews ?? [];
    if (!items.length) return;

    if (!window.confirm(`검토 대기 ${items.length}건을 모두 승인할까요?`)) return;

    setBulkLoading(true);
    let ok = 0;
    let fail = 0;
    for (const it of items) {
      try {
        await changeAssignmentStatus(it.projectId, it.assignmentId, "COMPLETED");
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkLoading(false);

    if (ok) {
      setData((prev) =>
        prev ? { ...prev, pendingReviews: [] } : prev
      );
    }
    toast.success(`일괄 검토 완료 — 성공 ${ok}건, 실패 ${fail}건`);
  };

  if (loading) return <div>{TEXTS.loading}</div>;

  const metrics = data?.metrics;
  const noProject =
    (metrics?.runningTeams ?? 0) === 0 &&
    (data?.recentSubmissions?.length ?? 0) === 0 &&
    (data?.topTeams?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{TEXTS.headerTitle}</h2>
          <p className="text-muted-foreground">{TEXTS.headerDescription}</p>
        </div>
        <Button
          size="sm"
          onClick={() => (projectId ? null : setNeedProjectOpen(true))}
        >
          <Plus className="h-4 w-4 mr-2" />
          {TEXTS.newSchedule}
        </Button>
      </div>

      {/* 프로젝트 없음 콜아웃 */}
      {noProject && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{TEXTS.noProjectCallout}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => toast.info("프로젝트 생성은 추후 연결 예정입니다.")}
              >
                {TEXTS.createProject}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info("초대 요청은 추후 연결 예정입니다.")}
              >
                {TEXTS.requestInvite}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 진행 팀 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {metrics?.runningTeams ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">{TEXTS.teams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 검토 대기 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <FileText className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {metrics?.pendingReviews ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {TEXTS.pendingReviews}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수강 학생 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Star className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {metrics?.studentCount ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {TEXTS.students}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 평균 진도 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {metrics ? `${metrics.avgProgress}%` : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {TEXTS.avgProgress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검토 대기 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{TEXTS.pendingItemsTitle}</CardTitle>
              <CardDescription>{TEXTS.pendingItemsDescription}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkLoading || !(data?.pendingReviews?.length)}
              onClick={onBulkApprove}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              {TEXTS.pendingItemsAction}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {data?.pendingReviews?.length ? (
            data.pendingReviews.map((item) => (
              <div
                key={item.assignmentId}
                className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card hover:bg-muted/30 transition"
              >
                <div className="space-y-1">
                  <div className="font-medium">{item.title ?? "제목 없음"}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.projectName ?? "프로젝트"}
                    {item.teamName ? ` • ${item.teamName}` : ""}{" "}
                    {item.submittedAt ? `• ${fmtDateTime(item.submittedAt)}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => reject(item.assignmentId, item.projectId)}
                  >
                    반려
                  </Button>
                  <Button
                    onClick={() => approve(item.assignmentId, item.projectId)}
                  >
                    승인
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{TEXTS.pendingItemsEmpty}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 제출물 / 상위 성과 팀 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{TEXTS.recentSubmissionsTitle}</CardTitle>
            <CardDescription>
              {TEXTS.recentSubmissionsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-2">
            {data?.recentSubmissions?.length ? (
              data.recentSubmissions.map((s) => (
                <div
                  key={s.assignmentId}
                  className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card hover:bg-muted/30 transition"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{s.title ?? "제목 없음"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.projectName ?? "프로젝트"}
                      {s.teamName ? ` • ${s.teamName}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary">{s.status}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {TEXTS.recentSubmissionsEmpty}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{TEXTS.topTeamsTitle}</CardTitle>
            <CardDescription>{TEXTS.topTeamsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-2">
            {data?.topTeams?.length ? (
              data.topTeams.map((t) => (
                <div
                  key={`${t.teamId}-${t.projectId}`}
                  className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card hover:bg-muted/30 transition"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{t.teamName ?? "팀"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.projectName ?? "프로젝트"}
                    </div>
                  </div>
                  <Badge>{t.progress}%</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {TEXTS.topTeamsEmpty}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 주간 캘린더(선택된 프로젝트 있을 때 하단 노출) */}
      <CalendarWidget projectId={projectId} />

      {/* 프로젝트 필요 안내 다이얼로그 */}
      {!projectId && (
        <Dialog open={needProjectOpen} onOpenChange={setNeedProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{TEXTS.needProjectTitle}</DialogTitle>
              <DialogDescription>{TEXTS.needProjectDesc}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNeedProjectOpen(false)}>
                {TEXTS.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
