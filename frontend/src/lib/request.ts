import axios, { type AxiosRequestConfig } from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080",
  timeout: 60000,
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
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return Object.fromEntries(entries);
};

export const request = async <TResponse>(config: AxiosRequestConfig) => {
  const response = await httpClient.request<TResponse>(config);
  return response.data;
};