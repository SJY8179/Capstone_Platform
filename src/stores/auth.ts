import { http } from "@/api/http";
import { appBus } from "@/lib/app-bus";

export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type AuthState = {
  user?: User | null;
  loading: boolean;
};

class AuthStore {
  state: AuthState = { user: null, loading: false };

  private set(partial: Partial<AuthState>) {
    this.state = { ...this.state, ...partial };
  }

  async login(email: string, password: string) {
    this.set({ loading: true });
    try {
      const { data } = await http.post("/auth/login", { email, password });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      this.set({ user: data.user, loading: false });
      appBus.emitAuthChanged();
      return data.user as User;
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
      this.set({ user: data });
      return data as User;
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
    appBus.emitAuthChanged();
  }
}

export const authStore = new AuthStore();