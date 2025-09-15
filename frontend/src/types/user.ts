export type UserRole = "student" | "professor" | "admin" | "ta";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}

/** 교수/관리자/조교 여부 헬퍼 */
export const isProfOrAdmin = (role?: UserRole | null) =>
  role === "professor" || role === "admin" || role === "ta";

/** 허용된 역할 집합에 포함되는지 */
export const hasRole = (
  role: UserRole | undefined | null,
  allowed: readonly UserRole[]
) => !!role && allowed.includes(role);