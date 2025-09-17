import axios from "axios";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL /* 배포/프록시 커스텀 */ ??
  "/api";

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true, // 쿠키 기반 인증 병행 시도 대비 (Bearer도 함께 보냄)
});

// ----- 토큰 헬퍼 -----
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

// ----- 요청 인터셉터 : Authorization 달기 -----
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// ----- 401 응답 처리 + 자동 리프레시 -----
let isRefreshing = false;
let waitQueue: ((token: string | null) => void)[] = [];

const flushQueue = (token: string | null) => {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
};

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err.config as any;

    // /auth/* 요청은 제외
    const isAuthApi =
      typeof original?.url === "string" &&
      (original.url.startsWith("/auth/") ||
        original.url.startsWith(`${API_BASE}/auth/`));

    if (status === 401 && !original?._retry && !isAuthApi) {
      original._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(err);
      }

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });

          localStorage.setItem("accessToken", data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem("refreshToken", data.refreshToken);
          }

          flushQueue(data.accessToken);
          isRefreshing = false;

          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return http(original);
        }

        // 이미 리프레시 중이면 큐에 넣었다가 재시도
        return new Promise((resolve, reject) => {
          waitQueue.push((token) => {
            if (!token) return reject(err);
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${token}`;
            resolve(http(original));
          });
        });
      } catch (e) {
        isRefreshing = false;
        flushQueue(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(e);
      }
    }

    return Promise.reject(err);
  }
);

/* ===========================
   공통 에러 파싱 & 권한 문구 헬퍼
   =========================== */

export type ApiError = {
  status?: number;
  code?: string;      // 서버의 message, code, error 중 문자열 값을 코드로 사용
  message: string;
  raw?: unknown;
};

export function getApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const data = e.response?.data as any;
    // 백엔드 GlobalExceptionHandler:
    // - ResponseStatusException: { message: e.getReason() }
    // - 기타: { error?, message? }
    const codeCandidate = data?.code ?? data?.error ?? data?.message;
    const code = typeof codeCandidate === "string" ? codeCandidate : undefined;
    const message =
      (typeof data?.message === "string" && data.message) ||
      e.message ||
      "요청에 실패했습니다.";
    return { status, code, message, raw: e };
  }
  return {
    message: e instanceof Error ? e.message : "요청에 실패했습니다.",
    raw: e,
  };
}

export function isAccessError(err: unknown) {
  const { status, code } = getApiError(err);
  if (status === 403) return true;
  return (
    code === "NOT_ALLOWED_TO_VIEW" ||
    code === "NOT_PROJECT_MEMBER" ||
    code === "NOT_PROJECT_PROFESSOR"
  );
}

export function accessErrorMessage(code?: string): string {
  switch (code) {
    case "NOT_PROJECT_MEMBER":
      return "이 프로젝트 팀 멤버가 아니라 일정을 추가/수정할 수 없어요.";
    case "NOT_PROJECT_PROFESSOR":
      return "담당 교수가 아닌 프로젝트라서 일정 변경 권한이 없어요.";
    case "NOT_ALLOWED_TO_VIEW":
      return "이 프로젝트를 볼 권한이 없어요.";
    default:
      return "접근 권한이 없어요.";
  }
}
