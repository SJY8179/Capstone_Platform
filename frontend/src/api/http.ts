import axios from "axios";

export const http = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    return Promise.reject({
      status,
      message: data?.message ?? err.message,
      data,
    });
  }
);