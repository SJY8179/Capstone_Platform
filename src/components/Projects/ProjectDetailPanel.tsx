import { memo, useEffect, useMemo, useState } from "react";
import { getProjectDetail } from "@/api/projects";
import type { ProjectDetailDto, ProjectOverviewDto } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  User,
  GitBranch,
  CalendarDays,
  Link as LinkIcon,
  CheckCircle2,
  Timer,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/stores/auth";

import {
  getOverview,
  saveOverview,
  submitOverviewProposal,
  approveOverviewProposal,
  rejectOverviewProposal,
  listDocs,
  createDoc,
  deleteDoc,
  listRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  listDecisions,
  createDecision,
  updateDecision,
  deleteDecision,
} from "@/api/projectDetails";

/* ------------------------------------------------
 * 권한 타입 및 조회 함수
 * ----------------------------------------------*/
type ProjectPermissions = {
  isMember: boolean;
  isProfessor: boolean;
  isAdmin: boolean;
  canView: boolean;
  canCreateDoc: boolean;
  canDeleteDoc: boolean;
  canRequestReview: boolean;
  canModerateAssignments: boolean;
};

async function fetchPermissions(projectId: number): Promise<ProjectPermissions | null> {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`/api/projects/${projectId}/me/permissions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return (await res.json()) as ProjectPermissions;
  } catch {
    return null;
  }
}

/* ------------------------------------------------
 * 유틸/상수
 * ----------------------------------------------*/
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

const TASK_BADGE: Record<
  "completed" | "ongoing" | "pending",
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  completed: { label: "완료", variant: "default" },
  ongoing: { label: "진행중", variant: "secondary" },
  pending: { label: "대기", variant: "outline" },
};

/* ------------------------------------------------
 * 메인 컴포넌트
 * ----------------------------------------------*/
export default function ProjectDetailPanel({ projectId }: { projectId: number }) {
  const { user, me } = useAuth();

  // 로그인 복원(새로고침 등)
  useEffect(() => {
    if (!user) {
      me().catch(() => {});
    }
  }, [user, me]);

  const [perms, setPerms] = useState<ProjectPermissions | null>(null);

  const [data, setData] = useState<ProjectDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 탭 상태
  const [tab, setTab] =
    useState<"overview" | "work" | "risks" | "decisions" | "files">("overview");

  // 서버 데이터(섹션별)
  const [overview, setOverview] = useState<ProjectOverviewDto | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const d = await getProjectDetail(projectId);
        if (!mounted) return;
        setData(d);
        setErr(null);

        const [ov, dcs, rsk, dcn, prm] = await Promise.allSettled([
          getOverview(projectId),
          listDocs(projectId),
          listRisks(projectId),
          listDecisions(projectId),
          fetchPermissions(projectId),
        ]);

        if (!mounted) return;

        if (ov.status === "fulfilled") setOverview(ov.value);
        if (dcs.status === "fulfilled") setDocs(dcs.value ?? []);
        if (rsk.status === "fulfilled") setRisks(rsk.value ?? []);
        if (dcn.status === "fulfilled") setDecisions(dcn.value ?? []);
        if (prm.status === "fulfilled") setPerms(prm.value);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "불러오기에 실패했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  // 권한 기반: 교수/관리자는 게시/승인/반려 가능, 학생(팀 멤버)은 검토 요청만 가능
  const canPublish = !!perms?.canModerateAssignments;
  const canCreateDoc = !!perms?.canCreateDoc;
  const canDeleteDoc = !!perms?.canDeleteDoc;
  const canRequestReview = !!perms?.canRequestReview;

  const progress = Math.max(0, Math.min(100, data?.progress ?? 0));
  const tasks = data?.tasks ?? [];
  const events = data?.upcomingEvents ?? [];
  const links = data?.links ?? [];

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
    return (
      <div className="text-sm text-destructive">
        상세 정보를 불러오지 못했습니다. {err}
      </div>
    );
  }

  // ⬇개요서 버전/펜딩 유무가 바뀌면 섹션을 리마운트하여 로컬 상태 초기화
  const overviewKey = `${overview?.version ?? 0}-${overview?.pendingMarkdown ? 1 : 0}`;

  return (
    <div className="space-y-6 min-w-0">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{data.title}</h2>
            <Badge variant="outline">
              {STATUS_KR[data.status] ?? data.status}
            </Badge>
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

      {/* 서브 탭 */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="min-w-0">
        <TabsList>
          <TabsTrigger value="overview">개요서</TabsTrigger>
          <TabsTrigger value="work">작업</TabsTrigger>
          <TabsTrigger value="risks">리스크</TabsTrigger>
          <TabsTrigger value="decisions">결정</TabsTrigger>
          <TabsTrigger value="files">파일</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewSection
            key={overviewKey} // 리마운트용 key
            projectId={projectId}
            overview={overview}
            canPublish={canPublish}
            canRequestReview={canRequestReview}
            onOverviewChange={setOverview}
          />
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          <WorkSection tasks={tasks} events={events} links={links} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <RisksSection projectId={projectId} risks={risks} setRisks={setRisks} />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <DecisionsSection
            projectId={projectId}
            decisions={decisions}
            setDecisions={setDecisions}
            userId={user?.id}
            userName={user?.name ?? null}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <FilesSection
            projectId={projectId}
            docs={docs}
            setDocs={setDocs}
            canCreateDoc={canCreateDoc}
            canDeleteDoc={canDeleteDoc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------
 * 섹션 컴포넌트들
 * ----------------------------------------------*/

/** 개요서 */
const OverviewSection = memo(function OverviewSection({
  projectId,
  overview,
  canPublish,
  canRequestReview,
  onOverviewChange,
}: {
  projectId: number;
  overview: ProjectOverviewDto | null;
  canPublish: boolean;
  canRequestReview: boolean;
  onOverviewChange: (next: ProjectOverviewDto) => void;
}) {
  const [text, setText] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 초안 존재 여부로 검토대기 판단
  const hasPending =
    !!overview?.pendingMarkdown && (overview.pendingMarkdown ?? "").length > 0;

  // 서버에서 내려온 값 → 에디터에 반영
  useEffect(() => {
    setText(overview?.pendingMarkdown ?? overview?.markdown ?? "");
  }, [
    overview?.markdown,
    overview?.pendingMarkdown,
    overview?.status,
    overview?.updatedAt,
    overview?.version, // 버전 변경 시에도 동기화
  ]);

  // 공통: 서버 최신 개요서 재조회해서 상태/에디터 동기화
  const reloadOverview = async () => {
    const fresh = await getOverview(projectId);
    onOverviewChange(fresh);
    setText(fresh.pendingMarkdown ?? fresh.markdown ?? "");
  };

  const onSavePublish = async () => {
    if (!text.trim()) return;
    try {
      setSaving(true);
      await saveOverview(projectId, text);
      await reloadOverview(); // 저장 후 재조회
    } finally {
      setSaving(false);
    }
  };

  const onSubmitForApproval = async () => {
    if (!text.trim()) return;
    try {
      setSaving(true);
      await submitOverviewProposal(projectId, text);
      await reloadOverview(); // 제안 후 재조회
    } finally {
      setSaving(false);
    }
  };

  const onApprove = async () => {
    try {
      setSaving(true);
      await approveOverviewProposal(projectId);
      await reloadOverview(); // 승인 후 재조회
    } finally {
      setSaving(false);
    }
  };

  const onReject = async () => {
    try {
      setSaving(true);
      await rejectOverviewProposal(projectId);
      await reloadOverview(); // 반려 후 재조회
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">프로젝트 개요서</h3>
          {hasPending ? (
            <Badge variant="secondary">검토 대기</Badge>
          ) : (
            <Badge variant="outline">게시됨</Badge>
          )}
          {overview?.updatedAt && (
            <span className="text-xs text-muted-foreground">
              업데이트: {formatK(overview.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canPublish ? (
            <>
              <Button size="sm" onClick={onSavePublish} disabled={saving}>
                게시 저장
              </Button>
              {hasPending && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onApprove}
                    disabled={saving}
                  >
                    제안 승인
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onReject}
                    disabled={saving}
                  >
                    제안 반려
                  </Button>
                </>
              )}
            </>
          ) : canRequestReview ? (
            <Button size="sm" onClick={onSubmitForApproval} disabled={saving}>
              검토 요청
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">개요서 내용 (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h[200px] min-h-[200px] border rounded-md bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="프로젝트 배경, 목표, 범위, 이해관계자, 핵심 기능, 비기능 요구사항, 성공 기준 등을 Markdown으로 작성하세요."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {!canPublish && canRequestReview && (
            <p className="mt-2 text-xs text-muted-foreground">
              게시 권한이 없는 사용자는 작성 후 <b>검토 요청</b>을 눌러 승인 프로세스를 진행하세요.
            </p>
          )}
        </CardContent>
      </Card>

      {hasPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">제안된 변경(검토 대기)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1 text-muted-foreground">현재 게시본</p>
                <pre className="text-xs whitespace-pre-wrap border rounded-md p-3 bg-muted/30">
                  {overview?.markdown ?? ""}
                </pre>
              </div>
              <div>
                <p className="text-xs mb-1 text-muted-foreground">제안본</p>
                <pre className="text-xs whitespace-pre-wrap border rounded-md p-3 bg-muted/30">
                  {overview?.pendingMarkdown ?? ""}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

/** 작업/일정/링크(보기용) */
const WorkSection = memo(function WorkSection({
  tasks,
  events,
  links,
}: {
  tasks: ProjectDetailDto["tasks"];
  events: ProjectDetailDto["upcomingEvents"];
  links: ProjectDetailDto["links"];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6 min-w-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">세부 작업 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">다가오는 일정 & 링크</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">다가오는 일정</p>
            <div className="space-y-2">
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
              )}
              {events.map((e) => (
                <div key={e.id} className="text-sm flex items-center justify-between">
                  <span className="truncate mr-2">{e.title}</span>
                  <span className="text-muted-foreground">
                    {e.startAt
                      ? new Date(e.startAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">관련 링크</p>
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground">등록된 링크가 없습니다.</p>
            )}
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
  );
});

/** 파일/링크 */
const FilesSection = memo(function FilesSection({
  projectId,
  docs,
  setDocs,
  canCreateDoc,
  canDeleteDoc,
}: {
  projectId: number;
  docs: any[];
  setDocs: React.Dispatch<React.SetStateAction<any[]>>;
  canCreateDoc: boolean;
  canDeleteDoc: boolean;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] =
    useState<"SPEC" | "REPORT" | "PRESENTATION" | "OTHER">("OTHER");
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!title.trim() || !url.trim()) return;
    try {
      setBusy(true);
      const created = await createDoc(projectId, { title, url, type });
      setDocs((prev) => [created, ...prev]);
      setTitle("");
      setUrl("");
      setType("OTHER");
    } finally {
      setBusy(false);
    }
  };
  const onDelete = async (id: number) => {
    const old = docs;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      setBusy(true);
      await deleteDoc(id);
    } catch {
      setDocs(old);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canCreateDoc && (
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <select
              className="h-9 px-2 rounded-md border bg-background text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="SPEC">명세</option>
              <option value="REPORT">보고서</option>
              <option value="PRESENTATION">발표</option>
              <option value="OTHER">기타</option>
            </select>
            <Button onClick={onCreate} disabled={busy}>
              추가
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            등록된 파일/링크가 없습니다.
          </p>
        )}
        {docs.map((d) => (
          <Card key={d.id}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <a
                  className="text-xs text-muted-foreground underline underline-offset-4 break-all"
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{d.type}</Badge>
                {canDeleteDoc && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(d.id)}
                    disabled={busy}
                  >
                    삭제
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

/** 리스크 */
const RisksSection = memo(function RisksSection({
  projectId,
  risks,
  setRisks,
}: {
  projectId: number;
  risks: any[];
  setRisks: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const score = (i: number, l: number) => i * l;

  const [draft, setDraft] = useState({
    title: "",
    impact: 3 as 1 | 2 | 3 | 4 | 5,
    likelihood: 3 as 1 | 2 | 3 | 4 | 5,
    mitigation: "",
    owner: "",
    dueDate: "",
  });
  const [busy, setBusy] = useState(false);

  const onCreateRisk = async () => {
    if (!draft.title.trim()) return;
    try {
      setBusy(true);
      const created = await createRisk(projectId, {
        title: draft.title,
        impact: draft.impact,
        likelihood: draft.likelihood,
        mitigation: draft.mitigation || null,
        owner: draft.owner || null,
        dueDate: draft.dueDate ? new Date(draft.dueDate) : null,
        status: "OPEN",
      });
      setRisks((prev) => [created, ...prev]);
      setDraft({
        title: "",
        impact: 3,
        likelihood: 3,
        mitigation: "",
        owner: "",
        dueDate: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const onToggleStatus = async (r: any) => {
    const next =
      r.status === "OPEN"
        ? "MITIGATING"
        : r.status === "MITIGATING"
        ? "CLOSED"
        : "OPEN";
    const prev = risks;
    setRisks((p) => p.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    try {
      await updateRisk(r.id, { status: next });
    } catch {
      setRisks(prev);
    }
  };

  const onDeleteRisk = async (id: number) => {
    const old = risks;
    setRisks((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteRisk(id);
    } catch {
      setRisks(old);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="grid md:grid-cols-5 gap-2">
            <Input
              placeholder="리스크 제목"
              value={draft.title}
              onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
            />
            <select
              className="h-9 px-2 rounded-md border bg-background text-sm"
              value={draft.impact}
              onChange={(e) =>
                setDraft((s) => ({ ...s, impact: Number(e.target.value) as any }))
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  영향 {n}
                </option>
              ))}
            </select>
            <select
              className="h-9 px-2 rounded-md border bg-background text-sm"
              value={draft.likelihood}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  likelihood: Number(e.target.value) as any,
                }))
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  가능성 {n}
                </option>
              ))}
            </select>
            <Input
              placeholder="대응(요약)"
              value={draft.mitigation}
              onChange={(e) => setDraft((s) => ({ ...s, mitigation: e.target.value }))}
            />
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft((s) => ({ ...s, dueDate: e.target.value }))}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <Input
              placeholder="담당자"
              value={draft.owner}
              onChange={(e) => setDraft((s) => ({ ...s, owner: e.target.value }))}
            />
            <Button className="justify-self-end" onClick={onCreateRisk} disabled={busy}>
              리스크 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {risks.length === 0 && (
          <p className="text-sm text-muted-foreground">등록된 리스크가 없습니다.</p>
        )}
        {risks.map((r) => (
          <Card key={r.id}>
            <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-0.5">
                  <span>영향 {r.impact}</span>
                  <span>가능성 {r.likelihood}</span>
                  <span>점수 {score(r.impact, r.likelihood)}</span>
                  {r.owner && <span>담당 {r.owner}</span>}
                  {r.dueDate && (
                    <span>기한 {new Date(r.dueDate).toLocaleDateString("ko-KR")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    r.status === "CLOSED"
                      ? "outline"
                      : r.status === "MITIGATING"
                      ? "secondary"
                      : "default"
                  }
                >
                  {r.status}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleStatus(r)}
                  disabled={busy}
                >
                  상태 전환
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteRisk(r.id)}
                  disabled={busy}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

/** 결정(ADR) */
const DecisionsSection = memo(function DecisionsSection({
  projectId,
  decisions,
  setDecisions,
  userId,
  userName,
}: {
  projectId: number;
  decisions: any[];
  setDecisions: React.Dispatch<React.SetStateAction<any[]>>;
  userId?: number | string;
  userName?: string | null;
}) {
  const [draft, setDraft] = useState({
    title: "",
    context: "",
    options: "",
    decision: "",
    consequences: "",
  });
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!draft.title.trim()) return;
    try {
      setBusy(true);
      const created = await createDecision(projectId, draft);
      setDecisions((prev) => [created, ...prev]);
      setDraft({
        title: "",
        context: "",
        options: "",
        decision: "",
        consequences: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const onSaveOne = async (id: number, patch: any) => {
    try {
      setBusy(true);
      const saved = await updateDecision(id, patch);
      setDecisions((prev) => prev.map((d) => (d.id === id ? saved : d)));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteOne = async (id: number) => {
    const old = decisions;
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDecision(id);
    } catch {
      setDecisions(old);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="grid gap-2">
            <Input
              placeholder="제목"
              value={draft.title}
              onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
            />
            <Input
              placeholder="배경/문맥"
              value={draft.context}
              onChange={(e) => setDraft((s) => ({ ...s, context: e.target.value }))}
            />
            <Input
              placeholder="대안들(콤마/문장 나열)"
              value={draft.options}
              onChange={(e) => setDraft((s) => ({ ...s, options: e.target.value }))}
            />
            <Input
              placeholder="최종 결정"
              value={draft.decision}
              onChange={(e) => setDraft((s) => ({ ...s, decision: e.target.value }))}
            />
            <Input
              placeholder="결정으로 인한 영향"
              value={draft.consequences}
              onChange={(e) =>
                setDraft((s) => ({ ...s, consequences: e.target.value }))
              }
            />
            <div className="flex justify-end">
              <Button onClick={onCreate} disabled={busy}>
                결정 추가
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {decisions.length === 0 && (
          <p className="text-sm text-muted-foreground">등록된 결정이 없습니다.</p>
        )}
        {decisions.map((d) => (
          <Card key={d.id}>
            <CardContent className="py-3 px-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{d.title}</div>

                  <div className="text-xs text-muted-foreground">
                    {d.decidedAt ? formatK(d.decidedAt) : "-"}
                    {d.decidedBy ? ` · ${d.decidedBy.name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const idNum = userId != null ? Number(userId) : NaN;
                      onSaveOne(d.id, {
                        decidedAt: new Date(),
                        decidedById: Number.isFinite(idNum) ? idNum : null,
                      });
                    }}
                    disabled={busy}
                  >
                    확정 시간 갱신
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeleteOne(d.id)}
                    disabled={busy}
                  >
                    삭제
                  </Button>
                </div>
              </div>

              <EditableRow
                label="문맥"
                value={d.context}
                onSave={(v) => onSaveOne(d.id, { context: v })}
              />
              <EditableRow
                label="대안"
                value={d.options}
                onSave={(v) => onSaveOne(d.id, { options: v })}
              />
              <EditableRow
                label="결정"
                value={d.decision}
                onSave={(v) => onSaveOne(d.id, { decision: v })}
              />
              <EditableRow
                label="영향"
                value={d.consequences}
                onSave={(v) => onSaveOne(d.id, { consequences: v })}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------
 * 인라인 편집 행
 * ----------------------------------------------*/
function EditableRow({
  label,
  value,
  onSave,
}: {
  label: string;
  value?: string | null;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVal(value ?? "");
  }, [value]);

  const onSubmit = async () => {
    setBusy(true);
    await onSave(val);
    setBusy(false);
    setEditing(false);
  };
  return (
    <div className="grid md:grid-cols-[140px_1fr_auto] gap-2 items-start">
      <div className="text-xs text-muted-foreground pt-2">{label}</div>
      {editing ? (
        <textarea
          className="w-full min-h-[80px] border rounded-md bg-background p-2 text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      ) : (
        <pre className="text-xs whitespace-pre-wrap border rounded-md p-2 bg-muted/30">
          {val || "-"}
        </pre>
      )}
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={onSubmit} disabled={busy}>
              저장
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setVal(value ?? "");
                setEditing(false);
              }}
              disabled={busy}
            >
              취소
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            편집
          </Button>
        )}
      </div>
    </div>
  );
}
