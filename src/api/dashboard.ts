import { http } from "@/api/http";
<<<<<<< HEAD
import type {
  DashboardSummary,
  DashboardStatus,
  DeadlineItem,
} from "@/types/domain";
=======
import type { DashboardSummary, DashboardStatus, DeadlineItem } from "@/types/domain";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

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
<<<<<<< HEAD
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
=======
return data;
}

export async function getProjectDashboardDeadlines(projectId: number) {
  const { data } = await http.get<DeadlineItem[]>(
    `/projects/${projectId}/dashboard/deadlines`
  );
  return data;
}


>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
