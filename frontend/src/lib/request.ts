import axios, { type AxiosRequestConfig } from "axios";

// HTTP 请求统一从这里出发，页面和 query hooks 不再各自拼 baseURL、超时和报错格式。

const USE_HTTP_API =
  import.meta.env.VITE_USE_HTTP_API === "true" || Boolean(import.meta.env.VITE_BACKEND_URL);

export const hasHttpBackend = USE_HTTP_API;

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? "",
  timeout: 15000,
  withCredentials: false,
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail
      ?? error?.response?.data?.message
      ?? error?.message
      ?? "Request failed";

    return Promise.reject(new Error(message));
  }
);

export const buildRequestParams = <T extends Record<string, unknown>>(params: T) => {
  // 只保留后端真正需要的查询参数，避免把空字符串和 null 传给接口。
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return Object.fromEntries(entries);
};

export const request = async <TResponse>(config: AxiosRequestConfig) => {
  const response = await httpClient.request<TResponse>(config);
  return response.data;
};