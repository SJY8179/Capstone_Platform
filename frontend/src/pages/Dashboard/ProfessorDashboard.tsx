import React, { useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  History,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { getProfessorSummary, type ProfessorSummary } from "@/api/dashboard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bulkReview,
  getReviewHistory,
  type ReviewHistoryItem,
  type ReviewAction,
} from "@/api/professorReview";
import {
  listPendingProfessorRequests,
  approveProfessorRequest,
  rejectProfessorRequest,
  type ProfessorRequest,
} from "@/api/professorRequests";
import { scheduleBus } from "@/lib/schedule-bus";
import { CreateProjectModal } from "@/components/Projects/CreateProjectModal";
import { EventEditor } from "@/components/Schedule/EventEditor";
import type { ProjectListDto } from "@/types/domain";

const TEXTS = {
  loading: "로딩중...",
  headerTitle: "교수 대시보드",
  headerDescription: "담당 강좌 및 프로젝트 현황을 확인하세요.",
  projects: "진행 프로젝트",
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
  memoDialogApproveTitle: "승인 메모 (선택)",
  memoDialogRejectTitle: "반려 사유 (필수)",
  memoDialogDesc:
    "해당 제출물에 대한 검토 의견을 남길 수 있습니다. 반려 시 사유 입력이 필요합니다.",
  memoPlaceholder: "예: 형식 보완 후 재제출 바랍니다.",
  memoCancel: "취소",
  memoSubmit: "확인",
  historyTitle: "검토 이력",
  historyEmpty: "이력이 없습니다.",
  historyLoadError: "이력을 불러오지 못했습니다.",

  // 담당 교수 배정 요청
  assignReqTitle: "담당 교수 지정 요청",
  assignReqDesc: "본인에게 들어온 담당 교수 배정 요청입니다.",
  assignReqEmpty: "대기 중인 배정 요청이 없습니다.",
  approve: "승인",
  reject: "거절",
};

type ReviewStatus = "PENDING" | "ONGOING" | "COMPLETED";
type RecentTab = "ALL" | ReviewStatus;

interface ProfessorDashboardProps {
  projectId?: number;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso ?? "";
  }
}

/** 상태 배지 스타일 */
function statusBadgeClass(s?: string | null) {
  switch (s) {
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "ONGOING":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:
      return "bg-muted text-foreground";
  }
}

export function ProfessorDashboard({ projectId }: ProfessorDashboardProps) {
  const [data, setData] = useState<ProfessorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [needProjectOpen, setNeedProjectOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentTab, setRecentTab] = useState<RecentTab>("ALL");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

  // 메모 입력 다이얼로그
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoBusy, setMemoBusy] = useState(false);
  const [memoAction, setMemoAction] = useState<ReviewAction>("APPROVE");
  const [memoTarget, setMemoTarget] = useState<{
    assignmentId: number;
    projectId: number;
    title?: string | null;
  } | null>(null);
  const [memoText, setMemoText] = useState("");

  // 이력 다이얼로그
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyItems, setHistoryItems] = useState<ReviewHistoryItem[]>([]);
  const [historyTitle, setHistoryTitle] = useState<string>("");

  // 담당 교수 배정 요청 (교수 본인 수신함)
  const [reqLoading, setReqLoading] = useState(false);
  const [requests, setRequests] = useState<ProfessorRequest[]>([]);
  const [actBusyId, setActBusyId] = useState<number | null>(null);

  /** 데이터 로더 */
  const loadSummary = async () => {
    const res = await getProfessorSummary();
    setData(res);
  };
  const loadRequests = async () => {
    setReqLoading(true);
    try {
      const rows = await listPendingProfessorRequests();
      setRequests(rows ?? []);
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadSummary(), loadRequests()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 일정 변경 버스 구독 → 자동 새로고침
  useEffect(() => {
    const handler = () => setTimeout(() => refreshAll(), 120);
    let off: (() => void) | undefined;
    try {
      // @ts-ignore
      off = scheduleBus.onChanged?.(handler);
    } catch { }
    try {
      // @ts-ignore
      if (!off && typeof scheduleBus.on === "function") {
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
    return () => {
      try {
        off?.();
      } catch { }
    };
  }, []);

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadSummary(), loadRequests()]);
    } finally {
      setRefreshing(false);
    }
  };

  /** ------- 로컬 즉시 반영 유틸 ------- */

  function decPendingCount(prev: ProfessorSummary | null, dec: number) {
    if (!prev?.metrics) return prev;
    const cur = Number(prev.metrics.pendingReviews ?? 0);
    const next = Math.max(0, cur - dec);
    // @ts-ignore
    return { ...prev, metrics: { ...prev.metrics, pendingReviews: next } };
  }

  function patchRecentStatus(
    prev: ProfessorSummary,
    assignmentId: number,
    status: ReviewStatus
  ): ProfessorSummary {
    const recent = prev.recentSubmissions?.map((s) =>
      s.assignmentId === assignmentId ? { ...s, status } : s
    );
    return { ...prev, recentSubmissions: recent ?? prev.recentSubmissions };
  }

  function patchRecentStatusesCompleted(
    prev: ProfessorSummary,
    ids: number[]
  ): ProfessorSummary {
    const idSet = new Set(ids);
    const recent = prev.recentSubmissions?.map((s) =>
      idSet.has(s.assignmentId) ? { ...s, status: "COMPLETED" } : s
    );
    return { ...prev, recentSubmissions: recent ?? prev.recentSubmissions };
  }

  /** ------- 검토 액션 ------- */

  const handleSingle = async (
    action: ReviewAction,
    assignmentId: number,
    projectIdForRow: number
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const afterDec = decPendingCount(prev, 1) as ProfessorSummary;
      const afterRemove = {
        ...afterDec,
        pendingReviews: afterDec.pendingReviews.filter(
          (p) => p.assignmentId !== assignmentId
        ),
      } as ProfessorSummary;
      const statusAfter: ReviewStatus =
        action === "APPROVE" ? "COMPLETED" : "ONGOING";
      return patchRecentStatus(afterRemove, assignmentId, statusAfter);
    });
    try {
      setBulkLoading(true);
      await bulkReview(action, [{ assignmentId, projectId: projectIdForRow }]);
    } finally {
      setBulkLoading(false);
      await refreshAll();
    }
  };

  const submitDecisionWithMemo = async () => {
    if (!memoTarget || !memoAction) return;
    const comment = memoText.trim();
    if (memoAction === "REJECT" && !comment) {
      toast.error("반려 사유를 입력하세요.");
      return;
    }
    setMemoBusy(true);
    try {
      await bulkReview(memoAction, [
        {
          assignmentId: memoTarget.assignmentId,
          projectId: memoTarget.projectId,
          comment: comment || undefined,
        },
      ]);
      toast.success(memoAction === "APPROVE" ? "승인 완료" : "반려 처리");
      setData((prev) => {
        if (!prev) return prev;
        const afterDec = decPendingCount(prev, 1) as ProfessorSummary;
        const afterRemove = {
          ...afterDec,
          pendingReviews: afterDec.pendingReviews.filter(
            (p) => p.assignmentId !== memoTarget.assignmentId
          ),
        } as ProfessorSummary;
        const statusAfter: ReviewStatus =
          memoAction === "APPROVE" ? "COMPLETED" : "ONGOING";
        return patchRecentStatus(afterRemove, memoTarget.assignmentId, statusAfter);
      });
    } catch (e) {
      console.error(e);
      toast.error(memoAction === "APPROVE" ? "승인 실패" : "반려 실패");
    } finally {
      setMemoBusy(false);
      setMemoOpen(false);
      setMemoText("");
      await refreshAll();
    }
  };

  const onBulkApprove = async () => {
    const items = data?.pendingReviews ?? [];
    if (!items.length) return;
    if (!window.confirm(`검토 대기 ${items.length}건을 모두 승인할까요?`)) return;

    const payload = items.map((it) => ({
      assignmentId: it.assignmentId,
      projectId: it.projectId,
    }));

    try {
      setBulkLoading(true);
      const { successCount, failCount } = await bulkReview("APPROVE", payload);
      if (successCount === items.length) {
        const ids = payload.map((p) => p.assignmentId);
        setData((prev) => {
          if (!prev) return prev;
          const afterMetrics = decPendingCount(prev, successCount)! as ProfessorSummary;
          const patchedRecent = patchRecentStatusesCompleted(afterMetrics, ids);
          return { ...patchedRecent, pendingReviews: [] };
        });
      }
      toast.success(`일괄 검토 완료 — 성공 ${successCount}건, 실패 ${failCount}건`);
    } catch (e) {
      console.error(e);
      toast.error("일괄 검토 실패");
    } finally {
      setBulkLoading(false);
      await refreshAll();
    }
  };

  /** ------- 메모/이력 UI 핸들러 ------- */

  const openMemo = (
    action: ReviewAction,
    row: { assignmentId: number; projectId: number; title?: string | null }
  ) => {
    setMemoAction(action);
    setMemoTarget({
      assignmentId: row.assignmentId,
      projectId: row.projectId,
      title: row.title,
    });
    setMemoText("");
    setMemoOpen(true);
  };

  const openHistory = async (row: {
    assignmentId: number;
    title?: string | null;
  }) => {
    setHistoryTitle(row.title || "제목 없음");
    setHistoryItems([]);
    setHistoryOpen(true);
    try {
      setHistoryBusy(true);
      const items = await getReviewHistory(row.assignmentId);
      setHistoryItems(items ?? []);
    } catch (e) {
      console.error(e);
      toast.error(TEXTS.historyLoadError);
    } finally {
      setHistoryBusy(false);
    }
  };

  if (loading) return <div>{TEXTS.loading}</div>;

  const metrics = data?.metrics;
  const noProject =
    (metrics?.courses ?? 0) === 0 &&
    (data?.recentSubmissions?.length ?? 0) === 0 &&
    (data?.topTeams?.length ?? 0) === 0;

  /** 최근 제출물 탭 필터링(프론트에서만 적용) */
  const recentFiltered =
    data?.recentSubmissions?.filter((s) =>
      (["ALL", "PENDING", "ONGOING", "COMPLETED"] as RecentTab[]).includes(
        recentTab
      )
        ? recentTab === "ALL"
          ? true
          : s.status === recentTab
        : true
    ) ?? [];

  /** 이력 항목 색상/라벨 */
  const historyActionLabel = (a?: string) =>
    a === "APPROVE"
      ? "승인"
      : a === "REJECT"
        ? "반려"
        : a === "REQUEST"
          ? "검토요청"
          : "기타";
  const historyActionClass = (a?: string) =>
    a === "APPROVE"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : a === "REJECT"
        ? "bg-amber-100 text-amber-800 border border-amber-200"
        : "bg-slate-100 text-slate-800 border border-slate-200";

  return (
    <div className="space-y-6">
      {/* 헤더 + 새로고침 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">{TEXTS.headerTitle}</h2>
          {refreshing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground hidden md:block">
            {TEXTS.headerDescription}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAll}
            disabled={refreshing || bulkLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // 교수가 담당하는 프로젝트가 있는지 확인
              const projectCount = metrics?.courses ?? 0;
              if (projectCount === 0) {
                toast.info("프로젝트를 먼저 생성하거나 담당 교수로 배정받아야 합니다.");
                setNeedProjectOpen(true);
              } else {
                // EventEditor에서 프로젝트를 선택할 수 있도록 projectId 없이 열기
                setSelectedProjectId(projectId);
                setEventEditorOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {TEXTS.newSchedule}
          </Button>
        </div>
      </div>

      {/* 프로젝트 없음 콜아웃 */}
      {noProject && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {TEXTS.noProjectCallout}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setCreateProjectOpen(true)}
              >
                {TEXTS.createProject}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.info("초대 요청은 추후 연결 예정입니다.")
                }
              >
                {TEXTS.requestInvite}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 변경: 진행 프로젝트 수 표시 (metrics.courses) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {metrics?.courses ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">{TEXTS.projects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">{TEXTS.students}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

      {/* 담당 교수 지정 요청 (대기 목록) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{TEXTS.assignReqTitle}</CardTitle>
              <CardDescription>{TEXTS.assignReqDesc}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={reqLoading}
            >
              {reqLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {requests.length ? (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card"
              >
                <div className="space-y-1">
                  <div className="font-medium">{r.projectTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    요청 시각 • {fmtDateTime(r.requestedAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actBusyId === r.id}
                    onClick={async () => {
                      setActBusyId(r.id);
                      try {
                        await approveProfessorRequest(r.id);
                        toast.success("담당 교수로 승인했어요.");
                      } catch (e) {
                        console.error(e);
                        toast.error("승인에 실패했습니다.");
                      } finally {
                        setActBusyId(null);
                        await refreshAll();
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {TEXTS.approve}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actBusyId === r.id}
                    onClick={async () => {
                      setActBusyId(r.id);
                      try {
                        await rejectProfessorRequest(r.id);
                        toast.success("요청을 거절했어요.");
                      } catch (e) {
                        console.error(e);
                        toast.error("거절에 실패했습니다.");
                      } finally {
                        setActBusyId(null);
                        await refreshAll();
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {TEXTS.reject}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{TEXTS.assignReqEmpty}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                    size="sm"
                    onClick={() =>
                      openHistory({
                        assignmentId: item.assignmentId,
                        title: item.title,
                      })
                    }
                    title="검토 이력 보기"
                  >
                    <History className="h-4 w-4 mr-1" />
                    이력
                  </Button>
                  <Button
                    variant="outline"
                    disabled={bulkLoading || refreshing}
                    onClick={() =>
                      openMemo("REJECT", {
                        assignmentId: item.assignmentId,
                        projectId: item.projectId,
                        title: item.title,
                      })
                    }
                  >
                    반려
                  </Button>
                  <Button
                    disabled={bulkLoading || refreshing}
                    onClick={() =>
                      openMemo("APPROVE", {
                        assignmentId: item.assignmentId,
                        projectId: item.projectId,
                        title: item.title,
                      })
                    }
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
          <CardHeader className="flex flex-col gap-3">
            <div>
              <CardTitle>{TEXTS.recentSubmissionsTitle}</CardTitle>
              <CardDescription>
                {TEXTS.recentSubmissionsDescription}
              </CardDescription>
            </div>

            {/* 최근 제출물 상태 탭 */}
            <div className="w-full">
              <div className="inline-flex items-center gap-1 rounded-lg border p-1">
                {(["ALL", "PENDING", "ONGOING", "COMPLETED"] as RecentTab[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRecentTab(t)}
                      className={[
                        "px-3 py-1.5 rounded-md text-sm transition",
                        recentTab === t
                          ? "bg-primary text-primary-foreground shadow"
                          : "hover:bg-muted text-foreground/80",
                      ].join(" ")}
                    >
                      {t === "ALL"
                        ? "전체"
                        : t === "PENDING"
                          ? "대기"
                          : t === "ONGOING"
                            ? "진행"
                            : "완료"}
                    </button>
                  )
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-2">
            {recentFiltered.length ? (
              recentFiltered.map((s) => (
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
                  <Badge className={statusBadgeClass(s.status)}>{s.status}</Badge>
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

      {/* 주간 캘린더 */}
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

      {/* 메모 입력 다이얼로그 */}
      <Dialog open={memoOpen} onOpenChange={setMemoOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {memoAction === "APPROVE"
                ? TEXTS.memoDialogApproveTitle
                : TEXTS.memoDialogRejectTitle}
            </DialogTitle>
            <DialogDescription>{TEXTS.memoDialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              대상:{" "}
              <span className="font-medium">
                {memoTarget?.title ?? "제목 없음"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">메모</span>
              </div>
              <textarea
                className="w-full min-h-[100px] rounded-md border bg-background p-2 text-sm"
                placeholder={
                  memoAction === "REJECT"
                    ? "예: 형식 보완 후 재제출 바랍니다."
                    : "예: 수고했어요! 요건 충족으로 승인합니다."
                }
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                disabled={memoBusy}
              />
              {memoAction === "REJECT" && !memoText.trim() && (
                <p className="mt-1 text-xs text-amber-600">
                  반려 사유를 입력해야 합니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemoOpen(false)}
              disabled={memoBusy}
            >
              {TEXTS.memoCancel}
            </Button>
            <Button
              onClick={submitDecisionWithMemo}
              disabled={memoBusy || (memoAction === "REJECT" && !memoText.trim())}
            >
              {memoBusy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {TEXTS.memoSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이력 보기 다이얼로그 */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {TEXTS.historyTitle}{" "}
              <span className="font-normal">{historyTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto space-y-3">
            {historyBusy ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                불러오는 중…
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {TEXTS.historyEmpty}
              </div>
            ) : (
              historyItems.map((h) => (
                <div
                  key={`${h.id || ""}-${h.at || Math.random()}`}
                  className="rounded-lg border p-3 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <Badge className={historyActionClass(h.action)}>
                      {historyActionLabel(h.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(h.at)}
                    </span>
                  </div>
                  {h.actorName && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      담당자:{" "}
                      <span className="font-medium text-foreground">
                        {h.actorName}
                      </span>
                    </div>
                  )}
                  {h.note && (
                    <div className="mt-2 text-sm whitespace-pre-wrap">
                      {h.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 프로젝트 생성 모달 */}
      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={(newProject: ProjectListDto) => {
          toast.success("프로젝트가 생성되었습니다!");
          refreshAll();
        }}
      />

      {/* 일정 추가 모달 */}
      <EventEditor
        open={eventEditorOpen}
        onOpenChange={setEventEditorOpen}
        projectId={selectedProjectId}
        onSaved={() => {
          toast.success("일정이 추가되었습니다!");
          refreshAll();
        }}
      />
    </div>
  );
}