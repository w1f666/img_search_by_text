import axios, { type AxiosRequestConfig } from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000",
  timeout: 60000,
  withCredentials: false,
});

/** Timeout for upload requests (5 minutes) */
export const UPLOAD_TIMEOUT = 5 * 60 * 1000;

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new Error("请求已取消"));
    }

    const message =
      error?.code === "ECONNABORTED"
        ? "请求超时，请稍后重试"
        : error?.response?.data?.detail
          ?? error?.response?.data?.message
          ?? error?.message
          ?? "Request failed";

    return Promise.reject(new Error(message));
  }
);

export const buildRequestParams = <T extends Record<string, unknown>>(params: T) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return Object.fromEntries(entries);
};

export const request = async <TResponse>(config: AxiosRequestConfig) => {
  const response = await httpClient.request<TResponse>(config);
  return response.data;
};