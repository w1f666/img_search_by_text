import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { mediaApi } from "./media-api";
import type {
  AutoClassifyPayload,
  CreateGalleryPayload,
  ListGalleriesPageParams,
  ListImagesPageParams,
  SearchBestMatchPayload,
  UpdateGalleryPayload,
  UpdateImagePayload,
} from "@/types/media";

// 所有服务端状态 key 都集中定义，后续失效和预取都依赖这份命名约定。
export const mediaQueryKeys = {
  galleries: {
    all: ["galleries", "all"] as const,
    pages: ["galleries", "page"] as const,
    page: (params: ListGalleriesPageParams) => ["galleries", "page", params] as const,
  },
  images: {
    lists: ["images", "page"] as const,
    page: (params: ListImagesPageParams) => ["images", "page", params] as const,
    trash: ["images", "trash"] as const,
    detail: (imageId: string, galleryId?: string) => ["images", "detail", galleryId ?? "all", imageId] as const,
  },
  history: {
    lists: ["history", "list"] as const,
    list: (keyword = "") => ["history", "list", keyword] as const,
  },
  search: {
    results: (sessionId: string) => ["search", "results", sessionId] as const,
    detail: (sessionId: string, imageId: string) => ["search", "detail", sessionId, imageId] as const,
  },
};

// 图集变更会连带影响图片归属和回收站统计，所以这里统一失效相关查询。
const invalidateGalleryQueries = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.galleries.all }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.galleries.pages }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.images.lists }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.images.trash }),
  ]);

// 图片变更同样会影响图集封面、数量和详情上下文。
const invalidateImageQueries = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.images.lists }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.images.trash }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.galleries.all }),
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.galleries.pages }),
  ]);

export const useGalleryListQuery = () =>
  useQuery({
    queryKey: mediaQueryKeys.galleries.all,
    queryFn: () => mediaApi.listGalleries(),
  });

export const useGalleriesPageQuery = (params: ListGalleriesPageParams) =>
  useQuery({
    queryKey: mediaQueryKeys.galleries.page(params),
    queryFn: () => mediaApi.listGalleriesPage(params),
    // 翻页时保留上一页数据，避免列表瞬间闪空。
    placeholderData: keepPreviousData,
  });

export const useImagesPageQuery = (params: ListImagesPageParams) =>
  useQuery({
    queryKey: mediaQueryKeys.images.page(params),
    queryFn: () => mediaApi.listImagesPage(params),
    placeholderData: keepPreviousData,
  });

export const useTrashImagesQuery = () =>
  useQuery({
    queryKey: mediaQueryKeys.images.trash,
    queryFn: () => mediaApi.listImages({ status: "trash" }),
  });

export const useHistoryListQuery = (keyword?: string) =>
  useQuery({
    queryKey: mediaQueryKeys.history.list(keyword ?? ""),
    queryFn: () => mediaApi.listHistory(keyword),
    // 搜索历史输入变化时继续保留旧结果，等新结果回来再替换。
    placeholderData: keepPreviousData,
  });

export const useImageDetailContextQuery = (imageId?: string, galleryId?: string) =>
  useQuery({
    queryKey: mediaQueryKeys.images.detail(imageId ?? "missing", galleryId),
    queryFn: () => mediaApi.getImageDetailContext(imageId!, galleryId),
    enabled: Boolean(imageId),
  });

export const useSearchTopKMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SearchBestMatchPayload) => mediaApi.searchTopK(payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        mediaQueryKeys.search.results(data.searchSessionId),
        data.results
      );
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.history.lists });
    },
  });
};

export const useSearchSessionResultsQuery = (sessionId?: string) =>
  useQuery({
    queryKey: mediaQueryKeys.search.results(sessionId ?? ""),
    queryFn: () => mediaApi.getSearchSessionResults(sessionId!),
    enabled: Boolean(sessionId),
  });

export const useSearchImageDetailContextQuery = (sessionId?: string, imageId?: string) =>
  useQuery({
    queryKey: mediaQueryKeys.search.detail(sessionId ?? "", imageId ?? ""),
    queryFn: () => mediaApi.getSearchImageDetailContext(sessionId!, imageId!),
    enabled: Boolean(sessionId) && Boolean(imageId),
  });

export const useCreateGalleryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGalleryPayload) => mediaApi.createGallery(payload),
    onSuccess: async () => {
      await invalidateGalleryQueries(queryClient);
    },
  });
};

export const useUpdateGalleryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGalleryPayload }) =>
      mediaApi.updateGallery(id, payload),
    onSuccess: async () => {
      await invalidateGalleryQueries(queryClient);
    },
  });
};

export const useDeleteGalleryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaApi.deleteGallery(id),
    onSuccess: async () => {
      await invalidateGalleryQueries(queryClient);
    },
  });
};

export const useBatchUploadImagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ files, galleryId }: { files: File[]; galleryId?: string | null }) =>
      mediaApi.batchUploadImages(files, galleryId),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
    },
  });
};

export const useUpdateImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateImagePayload }) =>
      mediaApi.updateImage(id, payload),
    onSuccess: async (_, variables) => {
      await invalidateImageQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["images", "detail"] });
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.images.detail(variables.id) });
    },
  });
};

export const useMoveImageToTrashMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaApi.moveImageToTrash(id),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["images", "detail"] });
    },
  });
};

export const useRestoreImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaApi.restoreImage(id),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
    },
  });
};

export const useDeleteImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaApi.permanentlyDeleteImage(id),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
    },
  });
};

export const useClearTrashMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mediaApi.clearTrash(),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
    },
  });
};

export const useRenameHistoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      mediaApi.renameSearchSession(sessionId, title),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.history.lists });
    },
  });
};

export const useDeleteHistoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => mediaApi.deleteSearchSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.history.lists });
    },
  });
};

export const useAutoClassifyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AutoClassifyPayload) => mediaApi.autoClassifyImages(payload),
    onSuccess: async () => {
      await invalidateImageQueries(queryClient);
      await invalidateGalleryQueries(queryClient);
    },
  });
};
