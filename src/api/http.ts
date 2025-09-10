﻿import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL /* 배포/프록시 커스텀 */ ??
  "/api";    

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
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