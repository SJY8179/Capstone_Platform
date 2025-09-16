﻿﻿﻿import { useEffect, useMemo, useState } from "react";
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
  Archive, RotateCcw, Trash2, MoreHorizontal,
} from "lucide-react";
import type { UserRole } from "@/types/user";
import { listProjects, getProjectDetail, listArchivedProjects, restoreProject } from "@/api/projects";
import type { ProjectListDto, ProjectStatus } from "@/types/domain";
import { useAuth } from "@/stores/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import FeedbackPanel from "@/components/Feedback/FeedbackPanel";
import ProjectDetailPanel from "@/components/Projects/ProjectDetailPanel";
import CreateProjectModal from "@/components/Projects/CreateProjectModal";
import ArchiveConfirmModal from "@/components/Projects/ArchiveConfirmModal";
import PurgeConfirmModal from "@/components/Projects/PurgeConfirmModal";
import { listTeams } from "@/api/teams";

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
  const [tab, setTab] = useState<ProjectStatus | "all" | "archived">("all");
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ProjectListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // 피드백 모달
  const [feedbackProjectId, setFeedbackProjectId] = useState<number | null>(null);
  const closeFeedback = () => setFeedbackProjectId(null);

  // 상세(열람) 모달
  const [detailProjectId, setDetailProjectId] = useState<number | null>(null);
  const [detailIntent, setDetailIntent] = useState<{ tab?: string; edit?: boolean } | null>(null);
  const closeDetail = () => { setDetailProjectId(null); setDetailIntent(null); };

  // 타입 캐스팅(추가 prop 허용)
  const PDP: any = ProjectDetailPanel;

  // 프로젝트 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Archive/Purge modals
  const [archiveProject, setArchiveProject] = useState<ProjectListDto | null>(null);
  const [purgeProject, setPurgeProject] = useState<ProjectListDto | null>(null);

  const handleProjectCreated = (newProject: ProjectListDto) => {
    // 새 프로젝트를 목록에 추가 (맨 앞에 추가)
    setProjects(prev => [newProject, ...prev]);
  };

  const handleCreateProjectClick = async () => {
    try {
      // 팀 목록 확인
      const teams = await listTeams();
      if (teams.length === 0) {
        toast.error("프로젝트를 생성하려면 먼저 팀을 생성해야 합니다.", {
          description: "팀 관리 페이지에서 새 팀을 생성한 후 다시 시도해주세요.",
        });
        return;
      }
      // 팀이 있으면 모달 열기
      setShowCreateModal(true);
    } catch (error) {
      console.error("팀 목록 확인 실패:", error);
      toast.error("팀 목록을 확인하는데 실패했습니다.");
    }
  };

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

  /** 대시보드에서 `/projects?open=overview&edit=1&projectId=123` 로 들어온 경우 처리 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    const edit = params.get("edit");
    const pidStr = params.get("projectId");
    const pid = pidStr ? Number(pidStr) : NaN;
    if (open && Number.isFinite(pid) && pid > 0) {
      setDetailProjectId(pid);
      setDetailIntent({ tab: open, edit: edit === "1" || edit === "true" });
    }
  }, []);

  // Load archived projects when archived tab is selected
  useEffect(() => {
    if (tab === "archived" && archivedProjects.length === 0) {
      (async () => {
        try {
          setLoadingArchived(true);
          const data = await listArchivedProjects();
          setArchivedProjects(data ?? []);
        } catch (error) {
          console.error("Failed to load archived projects:", error);
          toast.error("아카이브된 프로젝트를 불러오는데 실패했습니다.");
        } finally {
          setLoadingArchived(false);
        }
      })();
    }
  }, [tab, archivedProjects.length]);

  /** 탭/검색 2차 필터 + 최근 업데이트 정렬 */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const bySearch = (p: ProjectListDto) => {
      const team = (p.team ?? "").toLowerCase();
      const name = (p.name ?? "").toLowerCase();
      const memberNames = (p.members ?? []).map((m) => (m?.name ?? "").toLowerCase());
      return name.includes(q) || team.includes(q) || memberNames.some((n) => n.includes(q));
    };

    // Choose data source based on tab
    let sourceProjects: ProjectListDto[];
    if (tab === "archived") {
      sourceProjects = archivedProjects;
    } else {
      const byTab = (p: ProjectListDto) => (tab === "all" ? true : p.status === tab);
      sourceProjects = projects.filter(byTab);
    }

    const sorted = [...sourceProjects].sort((a, b) => {
      const ta = a.lastUpdate ?? "";
      const tb = b.lastUpdate ?? "";
      return tb.localeCompare(ta);
    });

    return sorted.filter(bySearch);
  }, [projects, archivedProjects, searchQuery, tab]);

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

  /** '보고서 작성' 퀵 액션 (관리자/교수 등에서 사용 가능) */
  const quickWriteReport = (projectId: number) => {
    setDetailProjectId(projectId);
    setDetailIntent({ tab: "overview", edit: true });
  };

  /** Handle successful archive/restore/purge operations */
  const handleProjectArchived = (projectId: number) => {
    // Remove from active projects and add to archived
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // Refresh archived list if it's loaded
    if (archivedProjects.length > 0) {
      setArchivedProjects([]); // Force reload on next view
    }
  };

  const handleProjectRestored = async (projectId: number) => {
    try {
      await restoreProject(projectId);

      // Remove from archived projects
      setArchivedProjects(prev => prev.filter(p => p.id !== projectId));

      // Refresh active projects list
      const data = await listProjects({ isAdmin });
      setProjects(data ?? []);

      // Switch to "all" tab to show the restored project
      setTab("all");

      toast.success("프로젝트가 복원되었습니다.", {
        description: "복원된 프로젝트를 확인하려면 전체 탭을 확인하세요.",
      });
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error("복원에 실패했습니다.");
    }
  };

  const handleProjectPurged = (projectId: number) => {
    // Remove from archived projects
    setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const renderActions = (p: ProjectListDto) => {
    const isArchived = tab === "archived";

    if (isArchived) {
      // Actions for archived projects
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetailProjectId(p.id)}
            aria-label="프로젝트 열람"
            title="프로젝트 열람"
          >
            <Eye className="h-4 w-4 mr-1" />
            열람
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleProjectRestored(p.id)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            복원
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPurgeProject(p)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            영구삭제
          </Button>
        </div>
      );
    }
    // Actions for active projects
    const commonActions = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDetailProjectId(p.id)}>
          <Eye className="h-4 w-4 mr-1" />
          열람
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openGithub(p.id)}
          aria-label="GitHub 열기"
          title="GitHub 열기"
        >
          <GitBranch className="h-4 w-4 mr-1" />
          GitHub
        </Button>
      </>
    );

    if (userRole === "student") {
      return (
        <div className="flex gap-2">
          {commonActions}
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickWriteReport(p.id)}
          >
            <FileText className="h-4 w-4 mr-1" />
            보고서 작성
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setArchiveProject(p)}>
                <Archive className="h-4 w-4 mr-2" />
                휴지통으로 이동
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    if (userRole === "professor") {
      return (
        <div className="flex gap-2">
          {commonActions}
          <Button size="sm" variant="outline" onClick={() => setFeedbackProjectId(p.id)}>
            <MessageSquare className="h-4 w-4 mr-1" />
            피드백
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setArchiveProject(p)}>
                <Archive className="h-4 w-4 mr-2" />
                휴지통으로 이동
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // admin
    return (
      <div className="flex gap-2">
        {commonActions}
        <Button
          size="sm"
          variant="outline"
          onClick={() => quickWriteReport(p.id)}
        >
          <Edit className="h-4 w-4 mr-1" />
          편집
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFeedbackProjectId(p.id)}
          aria-label="피드백 열기"
          title="피드백 열기"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          피드백
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setArchiveProject(p)}>
              <Archive className="h-4 w-4 mr-2" />
              아카이브
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPurgeProject(p)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              영구삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        {(userRole === "student" || userRole === "professor" || userRole === "admin") && (
          <Button
            onClick={handleCreateProjectClick}
            aria-label="새 프로젝트 만들기"
            title="새 프로젝트 만들기"
          >
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
          <TabsTrigger value="archived" className="text-muted-foreground">
            <Archive className="h-4 w-4 mr-1" />
            휴지통
          </TabsTrigger>
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

              const isArchived = tab === "archived";

              return (
                <Card key={p.id} className={isArchived ? "border-muted bg-muted/20" : ""}>
                  {/* 상단 */}
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {isArchived && <Archive className="h-4 w-4 text-muted-foreground" />}
                        {p.name}
                        <Badge className="rounded-full px-2 py-0.5 text-xs" variant={isArchived ? "secondary" : "outline"}>
                          {isArchived ? "휴지통" : STATUS_LABEL[p.status]}
                        </Badge>
                      </CardTitle>

                      {p.description && (
                        <CardDescription className="text-sm">{p.description}</CardDescription>
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

            {(loadingArchived && tab === "archived") && (
              <div className="text-center text-muted-foreground py-12">
                아카이브된 프로젝트를 불러오는 중...
              </div>
            )}

            {!loading && !loadingArchived && filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                {tab === "archived" ? (
                  <div className="space-y-2">
                    <Archive className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-lg">휴지통이 비어있습니다</p>
                    <p className="text-sm">삭제된 프로젝트가 여기에 표시됩니다</p>
                  </div>
                ) : (
                  "표시할 프로젝트가 없습니다."
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 피드백 모달 */}
      <Dialog open={feedbackProjectId != null} onOpenChange={(o) => !o && closeFeedback()}>
        <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[85vh] overflow-y-auto p-0">
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

      {/* 상세(열람) 모달 */}
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
            {detailProjectId != null && (
              <PDP
                projectId={detailProjectId}
                initialTab={detailIntent?.tab}
                forceEdit={detailIntent?.edit}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 프로젝트 생성 모달 */}
      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleProjectCreated}
      />

      {/* Archive confirmation modal */}
      <ArchiveConfirmModal
        open={archiveProject !== null}
        onOpenChange={(open) => !open && setArchiveProject(null)}
        project={archiveProject}
        onSuccess={handleProjectArchived}
        onRestore={handleProjectRestored}
      />

      {/* Purge confirmation modal */}
      <PurgeConfirmModal
        open={purgeProject !== null}
        onOpenChange={(open) => !open && setPurgeProject(null)}
        project={purgeProject}
        onSuccess={handleProjectPurged}
      />
    </div>
  );
}