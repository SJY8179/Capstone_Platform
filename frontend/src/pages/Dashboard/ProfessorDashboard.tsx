// src/pages/Dashboard/ProfessorDashboard.tsx
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
  // 아래 API는 "검토 이력" 조회용입니다.
  getReviewHistory,
  type ReviewHistoryItem,
  type ReviewAction,
} from "@/api/professorReview";
import { scheduleBus } from "@/lib/schedule-bus";

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
    return iso;
  }
}

/** 상태 배지 스타일(신규 컴포넌트 없이 클래스만 통일) */
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

  /** 공통 로더 */
  const load = async () => {
    const res = await getProfessorSummary();
    setData(res);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ★ 일정 변경 버스 구독 → 자동 새로고침
  useEffect(() => {
    const handler = () => {
      // 과도한 호출 방지: 약간 지연 후 새로고침
      setTimeout(() => {
        refreshSummary();
      }, 120);
    };
    let off: (() => void) | undefined;
    try {
      // onChanged(handler) 형태
      // @ts-ignore
      off = scheduleBus.onChanged?.(handler);
    } catch {}
    try {
      // on("changed", h)/off("changed", h) 형태
      // @ts-ignore
      if (!off && typeof scheduleBus.on === "function") {
        // @ts-ignore
        scheduleBus.on("changed", handler);
        off = () => {
          try {
            // @ts-ignore
            scheduleBus.off?.("changed", handler);
          } catch {}
        };
      }
    } catch {}
    return () => {
      try {
        off?.();
      } catch {}
    };
  }, []);

  const refreshSummary = async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /** ------- 로컬 즉시 반영 유틸 ------- */

  // pendingReviews 카운트를 안전하게 감소
  function decPendingCount(prev: ProfessorSummary | null, dec: number) {
    if (!prev?.metrics) return prev;
    const cur = Number(prev.metrics.pendingReviews ?? 0);
    const next = Math.max(0, cur - dec);
    // @ts-ignore(백엔드 DTO 구조 그대로 사용)
    return { ...prev, metrics: { ...prev.metrics, pendingReviews: next } };
  }

  // 최근 제출물의 단일 아이템 상태 패치
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

  // 여러 아이템을 COMPLETED로 패치
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

  /** ------- 액션 처리 (핵심) ------- */

  // 단건 승인/반려: 낙관적 업데이트(즉시 제거/상태반영) + 서버 재조회로 일관성 보정
  const handleSingle = async (
    action: ReviewAction,
    assignmentId: number,
    projectIdForRow: number
  ) => {
    // 1) 즉시 반영: 두 경우 모두 '검토 대기'에서 제거 + 카운트 감소
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
      // 성공/실패 모두 최종 싱크
      await refreshSummary();
    }
  };

  // 메모 입력을 통한 확정 처리 (메모 저장 포함)
  // 승인/반려 + 메모 전송
  const submitDecisionWithMemo = async () => {
    if (!memoTarget || !memoAction) return;

    const comment = memoText.trim();
    // 반려일 때는 코멘트 필수
    if (memoAction === "REJECT" && !comment) {
      toast.error("반려 사유를 입력하세요.");
      return;
    }

    setMemoBusy(true);
    try {
      // 1) 일괄 검토 API로 코멘트 포함 전송
      await bulkReview(memoAction, [
        {
          assignmentId: memoTarget.assignmentId,
          projectId: memoTarget.projectId,
          comment: comment || undefined, // 비어있으면 undefined
        },
      ]);

      toast.success(memoAction === "APPROVE" ? "승인 완료" : "반려 처리");

      // 2) 로컬 즉시 반영 (카운트/목록/최근 제출물 갱신 등)
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
      // 서버 진실원천으로 싱크
      await refreshSummary();
    }
  };

  // 일괄 승인: 전부 성공이면 로컬 즉시 반영, 그래도 마지막엔 재조회로 싱크
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
        // (옵션) 즉시 반영
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
      await refreshSummary(); // 항상 최종 싱크
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
    (metrics?.runningTeams ?? 0) === 0 &&
    (data?.recentSubmissions?.length ?? 0) === 0 &&
    (data?.topTeams?.length ?? 0) === 0;

  /** 최근 제출물 탭 필터링(프론트에서만 적용) */
  const recentFiltered =
    data?.recentSubmissions?.filter((s) =>
      recentTab === "ALL" ? true : s.status === recentTab
    ) ?? [];

  // 이력 항목 색상/라벨
  const historyActionLabel = (a?: string) =>
    a === "APPROVE" ? "승인" : a === "REJECT" ? "반려" : a === "REQUEST" ? "검토요청" : "기타";
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
            onClick={refreshSummary}
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
              if (!projectId) {
                // ★ 프로젝트 미지정: 토스트 + 다이얼로그 동시 노출
                toast.info("프로젝트 참여가 필요합니다.");
                setNeedProjectOpen(true);
              } else {
                // 프로젝트가 지정되어 있다면, 스케줄 탭으로 이동/연결하는 로직을 여기에 추가할 수 있습니다.
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
                onClick={() =>
                  toast.info("프로젝트 생성은 추후 연결 예정입니다.")
                }
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

            {/* 최근 제출물 상태 탭(ALL/PENDING/ONGOING/COMPLETED) */}
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
              <Button
                variant="outline"
                onClick={() => setNeedProjectOpen(false)}
              >
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
            {/* Description은 항상 채워두세요 */}
            <DialogDescription>
              작성한 메모는 과제의 검토 이력에 저장되며 팀원/교수에게 공유됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              대상: <span className="font-medium">{memoTarget?.title ?? "제목 없음"}</span>
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
                <p className="mt-1 text-xs text-amber-600">반려 사유를 입력해야 합니다.</p>
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
              {memoBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
              {TEXTS.historyTitle} <span className="font-normal">{historyTitle}</span>
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
                    <Badge className={historyActionClass(h.action)}>{historyActionLabel(h.action)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(h.at)}
                    </span>
                  </div>
                  {h.actorName && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      담당자: <span className="font-medium text-foreground">{h.actorName}</span>
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
    </div>
  );
}
