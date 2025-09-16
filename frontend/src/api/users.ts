import { http } from "@/api/http";
import type { AdminUser, AdminUserSummary } from "@/types/domain";

export type AdminUserQuery = {
  q?: string;
  role?: "STUDENT" | "PROFESSOR" | "ADMIN" | "TA";
  page?: number;
  size?: number;
  activeDays?: number;
};

export async function getAdminUsers(params: AdminUserQuery = {}) {
  const { data } = await http.get<AdminUser[]>("/admin/users", { params });
  return data;
}

export async function getAdminUsersSummary(activeDays = 30) {
  const { data } = await http.get<AdminUserSummary>("/admin/users/summary", {
    params: { activeDays },
  });
  return data;
}