/** ------------ Projects ------------- */
export type ProjectStatus = "in-progress" | "review" | "completed" | "planning";

export interface ProjectListDto {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  team: string;
  lastUpdate: string;          // ISO
  progress: number;            // 0~100
  members: { id: number; name: string }[];
  milestones: { completed: number; total: number };
  nextDeadline: { task: string; date: string } | null;
}

/** ------------- Teams --------------- */
export interface TeamListDto {
  id: number;
  name: string;
  project: string;
  description?: string;
  leader: { name: string; email: string; avatar?: string } | null;
  members: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: "leader" | "member";
    status: "active" | "inactive";
  }[];
  stats: {
    commits: number;
    meetings: number;
    tasks: { completed: number; total: number };
  };
  createdAt?: string | null;
  lastActivity?: string | null;
}

/** 피드백 (기존 페이지 호환) */
export interface FeedbackDto {
  id: number;
  projectId?: number;
  author?: string;
  content?: string;
  rating?: number;
  createdAt?: string; // ISO
}

/** ----- Dashboard DTO (백엔드와 1:1) ----- */
export interface DashboardSummary {
  progressPct: number;
  memberCount: number;
  commitsThisWeek: number;
  assignments: {
    open: number;
    inProgress: number;
    closed: number;
  };
  milestone: { title: string; date: string } | null;
}

export interface DashboardStatus {
  progressPct: number;
  lastUpdate: string; // ISO
  actions: string[];  // 추천 액션 문자열
}

export interface DeadlineItem {
  title: string;
  dueDate: string; // ISO
}

/** ----- Schedule DTO (백엔드 ScheduleDto) ----- */
export type ScheduleType = "deadline" | "meeting" | "task" | "presentation";
export type ScheduleStatus = "completed" | "in-progress" | "pending" | "scheduled";
export type SchedulePriority = "high" | "medium" | "low";

export interface ScheduleDto {
  id: string;                  // "A-1" | "E-2"
  title: string;
  description?: string | null;
  type: ScheduleType;
  status: ScheduleStatus;
  priority: SchedulePriority;
  date?: string | null;        // "yyyy-MM-dd"
  time?: string | null;        // "HH:mm"
  endTime?: string | null;     // "HH:mm" (이벤트만)
  assignee?: string | null;
  location?: string | null;
  /** 백엔드 필드는 projectTitle 이고, 기존 일부 코드가 projectName을 쓸 수 있어 둘 다 허용 */
  projectTitle?: string | null;
  projectName?: string | null;
}

/** ----- Assignment DTO (assignments API) ----- */
export interface Assignment {
  id: number;
  projectId: number;
  title: string;
  dueDate: string;                         // ISO
  status: "COMPLETED" | "ONGOING" | "PENDING";
}

/** ----- Event DTO (events API) ----- */
/**
 * NOTE:
 *  - 기존 합의는 MEETING | DEADLINE | ETC (→ meeting|deadline|task) 였으나
 *  - 현재 DB에 PRESENTATION 이 존재하므로 프론트 타입에 포함합니다.
 */
export type EventType = "MEETING" | "DEADLINE" | "ETC" | "PRESENTATION";

export interface EventDto {
  id: number;
  projectId: number;
  title: string;
  startAt?: string; // ISO
  endAt?: string;   // ISO
  type?: EventType;
  location?: string | null;
}

/** ----- Professor Review Workflow ----- */
export type ReviewAction = "APPROVE" | "REJECT";

export interface ProfessorPendingReviewItem {
  assignmentId: number;
  projectId: number;
  projectName?: string | null;
  teamName?: string | null;
  title?: string | null;
  submittedAt?: string | null; // ISO
  dueDate?: string | null;     // ISO
  status?: "PENDING" | "ONGOING" | "COMPLETED";
}

export interface BulkReviewResult {
  successCount: number;
  failCount: number;
  failedIds: number[];
}

/** ----- User DTO (teams API) ----- */
export interface UserDto {
  id: number;
  name: string;
  email: string;
}