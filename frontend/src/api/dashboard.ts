import { http } from "@/api/http";
import type {
  DashboardSummary,
  DashboardStatus,
  DeadlineItem,
} from "@/types/domain";

/* ===== 프로젝트 단위 대시보드 ===== */
export async function getProjectDashboardSummary(projectId: number) {
  const { data } = await http.get<DashboardSummary>(
    `/projects/${projectId}/dashboard/summary`
  );
  return data;
}

export async function getProjectDashboardStatus(projectId: number) {
  const { data } = await http.get<DashboardStatus>(
    `/projects/${projectId}/dashboard/status`
  );
  return data;
}

export async function getProjectDashboardDeadlines(
  projectId: number,
  limit = 5
) {
  const { data } = await http.get<DeadlineItem[]>(
    `/projects/${projectId}/dashboard/deadlines`,
    { params: { limit } }
  );
  return data;
}

/* ===== 교수 대시보드 요약 ===== */
export type ProfessorSummary = {
  metrics: {
    runningTeams: number;
    pendingReviews: number;
    courses: number;
    avgProgress: number;
    studentCount: number;
  };
  pendingReviews: Array<{
    assignmentId: number;
    projectId: number;
    projectName: string | null;
    teamName: string | null;
    title: string | null;
    submittedAt: string | null; // ISO
  }>;
  recentSubmissions: Array<{
    assignmentId: number;
    projectId: number;
    projectName: string | null;
    teamName: string | null;
    title: string | null;
    submittedAt: string | null;
    status: string;
  }>;
  topTeams: Array<{
    teamId: number | null;
    teamName: string | null;
    projectId: number;
    projectName: string | null;
    progress: number; // 0~100
  }>;
};

export async function getProfessorSummary() {
  const { data } = await http.get<ProfessorSummary>(`/dashboard/professor/summary`);
  return data;
}