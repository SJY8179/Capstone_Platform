import { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, FileText, CalendarDays, Users, GitBranch, Eye, Edit, MessageSquare,
} from "lucide-react";
import type { UserRole } from "@/types/user";
import { listProjects, getProjectDetail } from "@/api/projects"; // ⬅️ 상세 조회로 repo.url 확인
import type { ProjectListDto, ProjectStatus } from "@/types/domain";
import { useAuth } from "@/stores/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner"; // 안내 토스트
import FeedbackPanel from "@/components/Feedback/FeedbackPanel";
import ProjectDetailPanel from "@/components/Projects/ProjectDetailPanel";

/** 상태 -> 라벨 매핑 */
const STATUS_LABEL: Record<ProjectStatus, string> = {
  "in-progress": "진행중",
  review: "검토중",
  completed: "완료",
  planning: "기획",
};

function formatK(date?: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ProjectManagementProps {
  userRole: UserRole;
}

export function ProjectManagement({ userRole }: ProjectManagementProps) {
  const { user } = useAuth();
  const isAdmin = (user?.role ?? userRole) === "admin";
  const isProfessor = (user?.role ?? userRole) === "professor";
  const canWriteFeedback = isAdmin || isProfessor;

  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<ProjectStatus | "all">("all");
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 피드백 모달
  const [feedbackProjectId, setFeedbackProjectId] = useState<number | null>(null);
  const closeFeedback = () => setFeedbackProjectId(null);

  // 상세(열람) 모달
  const [detailProjectId, setDetailProjectId] = useState<number | null>(null);
  const closeDetail = () => setDetailProjectId(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listProjects({ isAdmin });
        setProjects(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  /** 탭/검색 2차 필터 + 최근 업데이트 정렬 */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const byTab = (p: ProjectListDto) => (tab === "all" ? true : p.status === tab);
    const bySearch = (p: ProjectListDto) => {
      const team = (p.team ?? "").toLowerCase();
      const name = (p.name ?? "").toLowerCase();
      const memberNames = (p.members ?? []).map((m) => (m?.name ?? "").toLowerCase());
      return name.includes(q) || team.includes(q) || memberNames.some((n) => n.includes(q));
    };

    const sorted = [...projects].sort((a, b) => {
      const ta = a.lastUpdate ?? "";
      const tb = b.lastUpdate ?? "";
      return tb.localeCompare(ta);
    });

    return sorted.filter(byTab).filter(bySearch);
  }, [projects, searchQuery, tab]);

  /** 🔗 GitHub 버튼: 링크가 있으면 새 탭, 없으면 안내 토스트 */
  const openGithub = async (projectId: number) => {
    try {
      const detail = await getProjectDetail(projectId);
      const url = detail?.repo?.url ?? null;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast("깃허브 링크가 등록되어 있지 않습니다.", {
          description:
            "프로젝트 상세 > 작업 탭에서 깃허브 링크를 저장하면 여기서 바로 이동할 수 있어요.",
        });
      }
    } catch {
      toast("깃허브 링크 확인에 실패했어요.", {
        description: "잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const renderActions = (p: ProjectListDto) => {
    if (userRole === "student") {
      return (
        <div className="flex gap-2">
          {/* ✅ 학생도 프로젝트 상세(개요서 포함) 열람 가능 */}
          <Button size="sm" variant="outline" onClick={() => setDetailProjectId(p.id)}>
            <Eye className="h-4 w-4 mr-1" />
            열람
          </Button>
          <Button size="sm" variant="outline">
            <FileText className="h-4 w-4 mr-1" />
            보고서 작성
          </Button>
          <Button size="sm" variant="outline" onClick={() => openGithub(p.id)}>
            <GitBranch className="h-4 w-4 mr-1" />
            GitHub
          </Button>
        </div>
      );
    }
    if (userRole === "professor") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailProjectId(p.id)}>
            <Eye className="h-4 w-4 mr-1" />
            열람
          </Button>
          <Button size="sm" variant="outline" onClick={() => openGithub(p.id)}>
            <GitBranch className="h-4 w-4 mr-1" />
            GitHub
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFeedbackProjectId(p.id)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            피드백
          </Button>
        </div>
      );
    }
    // admin
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setDetailProjectId(p.id)}>
          <Eye className="h-4 w-4 mr-1" />
          열람
        </Button>
        <Button size="sm" variant="outline" onClick={() => openGithub(p.id)}>
          <GitBranch className="h-4 w-4 mr-1" />
          GitHub
        </Button>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4 mr-1" />
          편집
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFeedbackProjectId(p.id)}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          피드백
        </Button>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">프로젝트 관리</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "전체 프로젝트를 관리하세요." : "참여 중인 프로젝트를 관리하세요."}
          </p>
        </div>
        {userRole === "student" && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Button>
        )}
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="프로젝트명 또는 팀명으로 검색…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="프로젝트 검색"
          />
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="in-progress">진행중</TabsTrigger>
          <TabsTrigger value="review">검토중</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <div className="space-y-4">
            {filtered.map((p) => {
              const progress = Math.max(0, Math.min(100, p.progress ?? 0));
              const msCompleted = p.milestones?.completed ?? 0;
              const msTotal = p.milestones?.total ?? 0;
              const nextTask = p.nextDeadline?.task ?? null;
              const nextDate = p.nextDeadline?.date ?? null;
              const teamName = p.team ?? "N/A";

              return (
                <Card key={p.id}>
                  {/* 상단 */}
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {p.name}
                        <Badge className="rounded-full px-2 py-0.5 text-xs" variant="outline">
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </CardTitle>

                      {p.description && (
                        <CardDescription className="text-sm">
                          {p.description}
                        </CardDescription>
                      )}

                      <CardDescription className="text-sm">
                        <span className="inline-flex items-center gap-1 mr-3">
                          <Users className="h-4 w-4" />
                          {teamName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          최근 업데이트: {formatK(p.lastUpdate)}
                        </span>
                      </CardDescription>
                    </div>

                    {renderActions(p)}
                  </CardHeader>

                  {/* 진행률 */}
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">프로젝트 진행률</span>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />

                    {/* 하단 정보 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                        마일스톤 {msCompleted}/{msTotal}
                      </Badge>

                      {nextTask && nextDate ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          다음 마감: {nextTask} · {formatK(nextDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">다음 마감 없음</span>
                      )}

                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        팀원: {(p.members ?? []).map((m) => m.name).join(", ") || "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                표시할 프로젝트가 없습니다.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 피드백 모달 — 너비는 유지, 높이 제한 + 다이얼로그 자체 스크롤 */}
      <Dialog open={feedbackProjectId != null} onOpenChange={(o) => !o && closeFeedback()}>
        <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[85vh] overflow-y-auto p-0">
          {/* 헤더는 스크롤 중에도 보이도록 고정 */}
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 pb-4 border-b">
            <DialogTitle>프로젝트 피드백</DialogTitle>
            <DialogDescription className="sr-only">
              이 대화 상자에서는 프로젝트의 피드백을 조회하고, 권한이 있으면 작성/수정/삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-4">
            {feedbackProjectId != null && (
              <FeedbackPanel
                projectId={feedbackProjectId}
                canWrite={canWriteFeedback}
                initialLimit={10}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 상세(열람) 모달 — 다이얼로그 자체 스크롤 */}
      <Dialog open={detailProjectId != null} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent
          style={{ maxWidth: "none", width: "96vw", maxHeight: "92vh" }}
          className="sm:max-w-none overflow-y-auto p-0"
        >
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 pb-4 border-b">
            <DialogTitle>프로젝트 상세</DialogTitle>
            <DialogDescription className="sr-only">
              프로젝트의 세부 작업 현황, 진행률, 일정, 링크를 확인합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-4">
            {detailProjectId != null && <ProjectDetailPanel projectId={detailProjectId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
