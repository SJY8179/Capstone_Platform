import { http } from "@/api/http";
import type { ProjectListDto, ProjectStatus, ProjectDetailDto, CreateProjectRequest } from "@/types/domain";

/** 상태 문자열을 우리 타입으로 통일 */
function normalizeStatus(raw: any): ProjectStatus {
  const s = String(
    raw?.status ?? raw?.projectStatus ?? raw?.state ?? "in-progress"
  )
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (s.includes("progress") || s.includes("ongoing") || s.includes("running")) return "in-progress";
  if (s.includes("review") || s.includes("check")) return "review";
  if (s.includes("complete") || s.includes("done") || s.includes("finished")) return "completed";
  if (s.includes("plan")) return "planning";
  return "in-progress";
}

function asNumber(v: any, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (typeof v === "number" ? v : NaN);
  return Number.isFinite(n) ? n : fallback;
}
function asString(v: any, fallback = ""): string {
  return v == null ? fallback : String(v);
}

/** 멤버 배열 정규화 */
function normalizeMembers(raw: any): { id: number; name: string }[] {
  const src =
    (Array.isArray(raw?.members) && raw.members) ||
    (Array.isArray(raw?.memberList) && raw.memberList) ||
    (Array.isArray(raw?.teamMembers) && raw.teamMembers) ||
    (Array.isArray(raw?.memberNames) && raw.memberNames.map((n: any) => ({ name: n }))) ||
    (Array.isArray(raw?.team?.members) && raw.team.members) ||
    (Array.isArray(raw?.teamInfo?.members) && raw.teamInfo.members) ||
    [];

  return src
    .map((m: any, idx: number) => {
      if (typeof m === "string") {
        return { id: idx + 1, name: m };
      }
      const name =
        m?.name ??
        m?.username ??
        m?.fullName ??
        (typeof m?.email === "string" ? m.email.split("@")[0] : undefined) ??
        `회원 ${idx + 1}`;

      return {
        id: asNumber(m?.id ?? idx + 1),
        name: asString(name),
      };
    })
    .filter((m: any) => m && m.name);
}

/** 다음 마감 -> {task, date} | null */
function normalizeNextDeadline(raw: any): { task: string; date: string } | null {
  const nx: any =
    raw?.nextDeadline ??
    raw?.nextDue ??
    raw?.upcomingDeadline ??
    raw?.nearestDeadline ??
    raw?.deadline ??
    raw?.upcoming ??
    null;

  if (nx && typeof nx === "object") {
    const task = nx.task ?? nx.title ?? nx.name ?? raw?.nextTaskTitle ?? raw?.nextTaskName ?? null;
    const date = nx.date ?? nx.dueDate ?? nx.deadline ?? raw?.nextTaskDate ?? raw?.nextDueDate ?? null;
    if (task && date) return { task: asString(task), date: asString(date) };
  } else {
    const task2 = raw?.nextTaskTitle ?? raw?.nextTaskName ?? null;
    const date2 = raw?.nextTaskDate ?? raw?.nextDueDate ?? null;
    if (task2 && date2) return { task: asString(task2), date: asString(date2) };
  }
  return null;
}

/** 프로젝트 1개 정규화 (목록) */
function normalizeProject(raw: any): ProjectListDto {
  const teamName =
    asString(
      raw?.team ??
        raw?.teamName ??
        raw?.teamTitle ??
        raw?.teamDto?.name ??
        raw?.team?.name ??
        raw?.team?.title ??
        raw?.teamInfo?.name ??
        raw?.teamInfo?.title ??
        ""
    ) || "N/A";

  const lastUpdate =
    asString(
      raw?.lastUpdate ??
        raw?.updatedAt ??
        raw?.lastUpdatedAt ??
        raw?.modifiedAt ??
        raw?.recentUpdate ??
        raw?.lastActivity ??
        ""
    ) || "";

  // 마일스톤
  let msCompleted = 0;
  let msTotal = 0;

  if (Array.isArray(raw?.milestones)) {
    msTotal = raw.milestones.length;
    msCompleted = raw.milestones.filter((m: any) => {
      const s = String(m?.status ?? m?.state ?? "").toUpperCase();
      return s === "DONE" || s === "COMPLETED" || m?.completed === true;
    }).length;
  } else {
    msCompleted =
      asNumber(
        raw?.milestonesCompleted ??
          raw?.milestoneCompleted ??
          raw?.milestoneCountCompleted ??
          raw?.milestone?.completed ??
          0
      ) || 0;
    msTotal =
      asNumber(
        raw?.milestonesTotal ??
          raw?.milestoneTotal ??
          raw?.milestoneCountTotal ??
          raw?.milestone?.total ??
          0
      ) || 0;
  }

  // 진행률(없으면 마일스톤 기반 계산)
  let progress = asNumber(
    raw?.progressPct ??
      raw?.progress ??
      raw?.completionRate ??
      raw?.percent ??
      raw?.completedPercent ??
      0
  );
  if (!Number.isFinite(progress) || progress <= 0) {
    progress = msTotal > 0 ? Math.round((msCompleted / msTotal) * 100) : 0;
  }
  progress = Math.max(0, Math.min(100, progress));

  const nextDeadline = normalizeNextDeadline(raw);

  const desc = raw?.description;
  const description: string | undefined =
    typeof desc === "string" ? desc : (typeof raw?.summary === "string" ? raw.summary : undefined);

  return {
    id: asNumber(raw?.id ?? raw?.projectId),
    name: asString(raw?.name ?? raw?.title ?? raw?.projectName ?? "프로젝트"),
    description,
    status: normalizeStatus(raw),
    team: teamName,
    lastUpdate,
    progress,
    members: normalizeMembers(raw),
    milestones: { completed: msCompleted, total: msTotal },
    nextDeadline,
  };
}

/** 상세 응답 정규화 */
function normalizeProjectDetail(raw: any): ProjectDetailDto {
  const status = normalizeStatus(raw?.status ? { status: raw.status } : raw);
  const repo =
    raw?.repo ?? (raw?.repoOwner || raw?.githubRepo
      ? { owner: raw?.repoOwner ?? null, name: raw?.githubRepo ?? null, url: raw?.repoOwner && raw?.githubRepo ? `https://github.com/${raw.repoOwner}/${raw.githubRepo}` : null }
      : null);

  return {
    id: asNumber(raw?.id),
    title: asString(raw?.title ?? raw?.name ?? "프로젝트"),
    status,
    team: {
      id: raw?.team?.id ?? null,
      name: raw?.team?.name ?? "N/A",
    },
    professor: raw?.professor
      ? {
          id: asNumber(raw.professor.id),
          name: asString(raw.professor.name),
          email: asString(raw.professor.email),
        }
      : null,
    repo,
    createdAt: raw?.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? null,
    progress: asNumber(raw?.progress ?? 0),
    taskSummary: {
      total: asNumber(raw?.taskSummary?.total ?? 0),
      completed: asNumber(raw?.taskSummary?.completed ?? 0),
      ongoing: asNumber(raw?.taskSummary?.ongoing ?? 0),
      pending: asNumber(raw?.taskSummary?.pending ?? 0),
    },
    tasks: Array.isArray(raw?.tasks)
      ? raw.tasks.map((t: any) => ({
          id: asNumber(t?.id),
          title: asString(t?.title),
          status: (t?.status as "completed" | "ongoing" | "pending") ?? "pending",
          dueDate: t?.dueDate ?? null,
        }))
      : [],
    upcomingEvents: Array.isArray(raw?.upcomingEvents)
      ? raw.upcomingEvents.map((e: any) => ({
          id: asNumber(e?.id),
          title: asString(e?.title),
          type: asString(e?.type ?? "ETC") as any,
          startAt: e?.startAt ?? null,
          endAt: e?.endAt ?? null,
          location: e?.location ?? null,
        }))
      : [],
    links: Array.isArray(raw?.links)
      ? raw.links.map((l: any) => ({ label: asString(l?.label), url: asString(l?.url) }))
      : [],
  };
}

/** 응답 루트에서 리스트 꺼내기 */
function normalizeListPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;

  const arrayKeys = [
    "items",
    "content",
    "data",
    "projects",
    "list",
    "rows",
    "records",
    "results",
    "my",
    "myProjects",
    "projectList",
  ];
  for (const k of arrayKeys) {
    const v = (payload as any)?.[k];
    if (Array.isArray(v)) return v;
  }

  if (payload && typeof payload === "object") {
    const hasProjectShape =
      "id" in payload || "name" in payload || "projectId" in payload || "projectName" in payload;
    if (hasProjectShape) return [payload];
  }
  return [];
}

/** 병합: a가 비어있을 때 b의 값을 보충 */
function mergeProject(a: ProjectListDto, b?: ProjectListDto): ProjectListDto {
  if (!b) return a;
  return {
    id: a.id ?? b.id,
    name: a.name || b.name,
    description: a.description ?? b.description,
    status: a.status || b.status,
    team: a.team && a.team !== "N/A" ? a.team : b.team,
    lastUpdate: a.lastUpdate || b.lastUpdate,
    progress: (a.progress && a.progress > 0) ? a.progress : b.progress,
    members: (a.members?.length ?? 0) > 0 ? a.members : b.members,
    milestones: {
      completed: a.milestones?.completed ?? b.milestones.completed,
      total: a.milestones?.total ?? b.milestones.total,
    },
    nextDeadline: a.nextDeadline ?? b.nextDeadline,
  };
}

/** 목록 중 “정보가 빈” 항목이 있는지 판단 */
function isSparse(p: ProjectListDto): boolean {
  const noMs = !p.milestones || (p.milestones.total === 0 && p.milestones.completed === 0);
  const noNext = !p.nextDeadline;
  const zeroProg = !p.progress || p.progress === 0;
  const noUpdate = !p.lastUpdate;
  return (noMs && zeroProg) || (noNext && zeroProg && noUpdate);
}

/** 관리자: 전체 프로젝트 */
export async function listProjectsAll(): Promise<ProjectListDto[]> {
  const { data } = await http.get("/projects");
  const rows = normalizeListPayload(data);
  return rows.map((r: any) => normalizeProject(r)).filter((p) => Number.isFinite(p.id));
}

/** 비관리자: 내가 속한 프로젝트 */
export async function listMyProjects(): Promise<ProjectListDto[]> {
  let mapped: ProjectListDto[] = [];
  try {
    const { data } = await http.get("/projects/my");
    const rows = normalizeListPayload(data);
    mapped = rows.map((r: any) => normalizeProject(r)).filter((p) => Number.isFinite(p.id));
  } catch (e) {
    // /projects/my 호출 실패 시 보수적으로 빈 배열 반환 (정보 유출 방지)
    return [];
  }

  if (mapped.length === 0) {
    // 팀 멤버가 아닌 계정은 빈 목록이 정상
    return [];
  }

  // 항목이 있을 때만 보강 시도 (같은 ID로만 merge)
  if (mapped.some(isSparse)) {
    try {
      const { data: allData } = await http.get("/projects");
      const allRows = normalizeListPayload(allData).map((r: any) => normalizeProject(r));
      const byId = new Map(allRows.map((p) => [p.id, p]));
      mapped = mapped.map((p) => mergeProject(p, byId.get(p.id)));
    } catch {
      // 전체 조회 실패해도 my 결과만 사용
    }
  }

  return mapped;
}

/** 기본 함수(호환): 관리자면 all, 아니면 my */
export async function listProjects(opts?: { isAdmin?: boolean }): Promise<ProjectListDto[]> {
  if (opts?.isAdmin) return listProjectsAll();
  return listMyProjects();
}

/** 새 프로젝트 생성 */
export async function createProject(request: CreateProjectRequest): Promise<ProjectListDto> {
  const { data } = await http.post("/projects", request);
  return normalizeProject(data);
}

/** 프로젝트 상세 */
export async function getProjectDetail(projectId: number): Promise<ProjectDetailDto> {
  const { data } = await http.get(`/projects/${projectId}`);
  return normalizeProjectDetail(data);
}

/** 깃허브 링크 업데이트 (저장/제거) */
export async function updateProjectRepo(
  projectId: number,
  githubUrl: string | null
): Promise<ProjectDetailDto> {
  const { data } = await http.put(`/projects/${projectId}/repo`, { githubUrl });
  return normalizeProjectDetail(data);
}
