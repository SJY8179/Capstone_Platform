import { http } from "@/api/http";
import { appBus } from "@/lib/app-bus";
import { useSyncExternalStore } from "react";
import type { User, UserRole } from "@/types/user";

export type AuthState = {
  user?: User | null;
  loading: boolean;
};

class AuthStore {
  state: AuthState = { user: null, loading: false };

  private set(partial: Partial<AuthState>) {
    this.state = { ...this.state, ...partial };
  }

  private normalizeRole(role: unknown): UserRole {
    const r = String(role ?? "").toLowerCase();
    if (r === "student" || r === "professor" || r === "admin") return r as UserRole;
    // 백엔드가 "STUDENT/PROFESSOR/ADMIN"을 내려도 커버됨
    if (r === "student".toUpperCase().toLowerCase()) return "student";
    return r === "professor".toUpperCase().toLowerCase()
      ? "professor"
      : r === "admin".toUpperCase().toLowerCase()
      ? "admin"
      : "student"; // 안전한 기본값
  }

  private toUser(raw: any): User {
    return {
      id: String(raw?.id),
      name: String(raw?.name ?? ""),
      email: String(raw?.email ?? ""),
      role: this.normalizeRole(raw?.role),
      avatarUrl: raw?.avatarUrl ?? raw?.avatar ?? null,
    };
  }

  async login(email: string, password: string) {
    this.set({ loading: true });
    try {
      const { data } = await http.post("/auth/login", { email, password });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      const user = this.toUser(data.user);
      this.set({ user, loading: false });
      appBus.emitAuthChanged?.();
      return user;
    } finally {
      this.set({ loading: false });
    }
  }

  async register(name: string, email: string, password: string) {
    this.set({ loading: true });
    try {
      await http.post("/auth/register", { name, email, password });
      return await this.login(email, password);
    } finally {
      this.set({ loading: false });
    }
  }

  async me() {
    if (!localStorage.getItem("accessToken")) return null;
    try {
      const { data } = await http.get("/auth/me");
      const user = this.toUser(data);
      this.set({ user });
      appBus.emitAuthChanged?.();
      return user;
    } catch {
      return null;
    }
  }

  async refresh() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    const { data } = await http.post("/auth/refresh", { refreshToken });
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken as string;
  }

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    this.set({ user: null });
    appBus.emitAuthChanged?.();
  }
}

export const authStore = new AuthStore();

/** 전역 인증 상태 구독 훅 */
const subscribe = (onChange: () => void) => {
  try {
    // @ts-ignore
    if (typeof appBus.onAuthChanged === "function") {
      // @ts-ignore
      const off = appBus.onAuthChanged(onChange);
      return () => {
        try {
          off?.();
          // @ts-ignore
          appBus.offAuthChanged?.(onChange);
        } catch {}
      };
    }
    // @ts-ignore
    if (typeof appBus.on === "function") {
      // @ts-ignore
      appBus.on("auth-changed", onChange);
      return () => {
        try {
          // @ts-ignore
          appBus.off?.("auth-changed", onChange);
        } catch {}
      };
    }
  } catch {}
  return () => {};
};

const getSnapshot = (): AuthState => authStore.state;
const getServerSnapshot = (): AuthState => ({ user: null, loading: true });

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...state,
    login: authStore.login.bind(authStore),
    register: authStore.register.bind(authStore),
    me: authStore.me.bind(authStore),
    refresh: authStore.refresh.bind(authStore),
    logout: authStore.logout.bind(authStore),
  };
}