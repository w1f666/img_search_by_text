import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// QueryClient 负责整个前端的服务端状态缓存策略。
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error.message || "操作失败，请稍后重试");
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});