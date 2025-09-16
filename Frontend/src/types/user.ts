import { http } from "@/api/http";
import type { UserDto } from "@/types/domain";

/** 기존 타입/헬퍼 유지 (호환) */
export type UserRole = "student" | "professor" | "admin" | "ta";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export const isProfOrAdmin = (role?: UserRole | null) =>
  role === "professor" || role === "admin" || role === "ta";

export const hasRole = (
  role: UserRole | undefined | null,
  allowed: readonly UserRole[]
) => !!role && allowed.includes(role);

/** --- 추가: 사용자 목록/검색 --- */
export async function listUsers(params?: { q?: string; size?: number }) {
  const { q, size } = params ?? {};
  const { data } = await http.get<UserDto[]>("/users", { params: { q, size } });
  return data;
}

/** --- 추가: 팀별 초대 가능 사용자 목록 --- */
export async function listInvitableUsers(teamId: number) {
  const { data } = await http.get<UserDto[]>(
    `/teams/${teamId}/invitable-users`
  );
  return data;
}
