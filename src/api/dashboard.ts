import { http } from "@/api/http";
import type {
  DashboardSummary,
  DashboardStatus,
  DeadlineItem,
} from "@/types/domain";

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