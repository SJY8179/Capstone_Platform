import { useEffect, useState, useMemo } from "react";
import { getProjectDetail } from "@/api/projects";
import type { ProjectDetailDto } from "@/types/domain";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Users, User, GitBranch, CalendarDays, Link as LinkIcon, CheckCircle2, Timer, AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatK(date?: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_KR: Record<string, string> = {
  "in-progress": "진행중",
  review: "검토중",
  completed: "완료",
  planning: "기획",
};

const TASK_BADGE: Record<"completed" | "ongoing" | "pending", { label: string; variant: "default" | "secondary" | "outline" }> = {
  completed: { label: "완료", variant: "default" },
  ongoing:   { label: "진행중", variant: "secondary" },
  pending:   { label: "대기", variant: "outline" },
};

export default function ProjectDetailPanel({ projectId }: { projectId: number }) {
  const [data, setData] = useState<ProjectDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const d = await getProjectDetail(projectId);
        if (mounted) { setData(d); setErr(null); }
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "불러오기에 실패했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  const progress = Math.max(0, Math.min(100, data?.progress ?? 0));
  const tasks = data?.tasks ?? [];
  const events = data?.upcomingEvents ?? [];
  const links  = data?.links ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-2 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }
  if (err || !data) {
    return <div className="text-sm text-destructive">상세 정보를 불러오지 못했습니다. {err}</div>;
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{data.title}</h2>
            <Badge variant="outline">{STATUS_KR[data.status] ?? data.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center gap-1 mr-3">
              <Users className="h-4 w-4" />
              {data.team?.name ?? "N/A"}
            </span>
            {data.professor && (
              <span className="inline-flex items-center gap-1 mr-3">
                <User className="h-4 w-4" />
                {data.professor.name} ({data.professor.email})
              </span>
            )}
            {data.updatedAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                최근 업데이트: {formatK(data.updatedAt)}
              </span>
            )}
          </p>
        </div>

        {data.repo?.url && (
          <a
            className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
            href={data.repo.url}
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch className="h-4 w-4" />
            GitHub
          </a>
        )}
      </div>

      {/* 진행률 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">프로젝트 진행률</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 본문 그리드 */}
      <div className="grid md:grid-cols-2 gap-6 min-w-0">
        {/* 작업 요약 & 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">세부 작업 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">전체 {data.taskSummary.total}</Badge>
              <Badge>{`완료 ${data.taskSummary.completed}`}</Badge>
              <Badge variant="secondary">{`진행중 ${data.taskSummary.ongoing}`}</Badge>
              <Badge variant="outline">{`대기 ${data.taskSummary.pending}`}</Badge>
            </div>

            <Separator />

            {/* 중첩 스크롤 제거: max-h/overflow 삭제 */}
            <div className="space-y-3">
              {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground">등록된 작업이 없습니다.</p>
              )}
              {tasks.map((t) => {
                const meta = TASK_BADGE[t.status];
                return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : t.status === "ongoing" ? (
                        <Timer className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          마감 {new Date(t.dueDate).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 다가오는 일정 & 링크 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">다가오는 일정 & 링크</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">다가오는 일정</p>
              {/* 중첩 스크롤 제거 */}
              <div className="space-y-2">
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
                )}
                {events.map((e) => (
                  <div key={e.id} className="text-sm flex items-center justify-between">
                    <span className="truncate mr-2">{e.title}</span>
                    <span className="text-muted-foreground">
                      {e.startAt ? new Date(e.startAt).toLocaleDateString("ko-KR") : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">관련 링크</p>
              {links.length === 0 && <p className="text-sm text-muted-foreground">등록된 링크가 없습니다.</p>}
              <div className="space-y-1">
                {links.map((l, i) => (
                  <a
                    key={`${l.url}-${i}`}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm inline-flex items-center gap-2 underline underline-offset-4"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
