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

/** 공통: 커서 페이지 응답 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: number | null;
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

/** 피드백 (서버 정식 DTO와 1:1) */
export interface FeedbackDto {
  id: number;
  author: string;
  content: string;
  createdAt: string | null;   // ISO
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

/** ----- Schedule DTO ----- */
export type ScheduleType = "deadline" | "meeting" | "task" | "presentation";
export type ScheduleStatus = "completed" | "in-progress" | "pending" | "scheduled";
export type SchedulePriority = "high" | "medium" | "low";

export interface ScheduleDto {
  id: string;
  title: string;
  description?: string | null;
  type: ScheduleType;
  status: ScheduleStatus;
  priority: SchedulePriority;
  date?: string | null;
  time?: string | null;
  endTime?: string | null;
  assignee?: string | null;
  location?: string | null;
  projectTitle?: string | null;
  projectName?: string | null;
}

/** ----- Assignment DTO ----- */
export interface Assignment {
  id: number;
  projectId: number;
  title: string;
  dueDate: string;
  status: "COMPLETED" | "ONGOING" | "PENDING";
}

/** ----- Event DTO ----- */
export type EventType = "MEETING" | "DEADLINE" | "ETC" | "PRESENTATION";

export interface EventDto {
  id: number;
  projectId: number;
  title: string;
  startAt?: string;
  endAt?: string;
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
  submittedAt?: string | null;
  dueDate?: string | null;
  status?: "PENDING" | "ONGOING" | "COMPLETED";
}

export interface BulkReviewResult {
  successCount: number;
  failCount: number;
  failedIds: number[];
}