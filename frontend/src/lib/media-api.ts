import { buildRequestParams, request, UPLOAD_TIMEOUT } from "@/lib/request";
import type {
  AutoClassifyPayload,
  AutoClassifyResponse,
  BackendGallery,
  BackendHistoryRecord,
  BackendImage,
  CreateGalleryPayload,
  GalleryItem,
  HistoryRecord,
  ImageDetailContext,
  ImageItem,
  ImageStatus,
  ListGalleriesPageParams,
  ListImagesPageParams,
  PaginatedResult,
  PaginationMeta,
  SearchBestMatchPayload,
  SearchTopKResponse,
  UpdateGalleryPayload,
  UpdateImagePayload,
} from "@/types/media";

const DEFAULT_PAGE_SIZE = 12;

const toDateOnly = (iso: string) => iso.slice(0, 10);

const toImageItem = (image: BackendImage): ImageItem => ({
  id: image.id,
  url: image.image_url,
  thumbnailUrl: image.thumbnail_url ?? undefined,
  filename: image.filename,
  createdAt: toDateOnly(image.created_at),
  sizeLabel: image.size_label,
  sizeBytes: image.size_bytes,
  galleryId: image.gallery_id,
  status: image.status,
  source: image.source,
  deletedAt: image.deleted_at ?? undefined,
});

const toGalleryItem = (gallery: BackendGallery): GalleryItem => ({
  id: gallery.id,
  name: gallery.name,
  description: gallery.description,
  coverImageUrl: gallery.cover_image_url ?? undefined,
  imageCount: gallery.image_count,
  createdAt: toDateOnly(gallery.created_at),
  updatedAt: gallery.updated_at,
});

const toHistoryRecord = (record: BackendHistoryRecord): HistoryRecord => ({
  id: record.session_id,
  title: record.title,
  turns: record.turns.map((turn) => [turn.query, toImageItem(turn.matched_image)]),
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

type BackendPaginationMeta = {
  requested_start: number;
  requested_end: number;
  returned_start: number;
  returned_end: number;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_previous: boolean;
  has_next: boolean;
};

type BackendPaginatedResult<T> = {
  items: T[];
  meta: BackendPaginationMeta;
};

type BackendImageDetailContextResponse = {
  image: BackendImage;
  previous_image: BackendImage | null;
  next_image: BackendImage | null;
  related_images: BackendImage[];
};

const toPaginationMeta = (meta: BackendPaginationMeta): PaginationMeta => ({
  requestedStart: meta.requested_start,
  requestedEnd: meta.requested_end,
  returnedStart: meta.returned_start,
  returnedEnd: meta.returned_end,
  total: meta.total,
  page: meta.page,
  pageSize: meta.page_size,
  totalPages: meta.total_pages,
  hasPrevious: meta.has_previous,
  hasNext: meta.has_next,
});

const buildRange = (page: number, pageSize = DEFAULT_PAGE_SIZE) => ({
  start: (page - 1) * pageSize + 1,
  end: page * pageSize,
});

export const mediaApi = {
  buildRange,

  async searchTopK(payload: SearchBestMatchPayload): Promise<SearchTopKResponse> {
    const formData = new FormData();
    formData.append("type", payload.type);
    if (payload.textQuery?.trim()) formData.append("text_query", payload.textQuery.trim());
    if (payload.referenceImageFile) formData.append("image_file", payload.referenceImageFile);
    if (payload.searchSessionId) formData.append("search_session_id", payload.searchSessionId);
    formData.append("top_k", String(payload.topK ?? 12));
    formData.append("search_strategy", payload.searchStrategy ?? "balanced");

    const response = await request<{ results: BackendImage[]; search_session_id: string }>({
      url: "/api/search/top-k",
      method: "POST",
      data: formData,
    });

    return {
      results: response.results.map(toImageItem),
      searchSessionId: response.search_session_id,
    };
  },

  async getSearchSessionResults(sessionId: string): Promise<ImageItem[]> {
    const response = await request<{ results: BackendImage[] }>({
      url: `/api/search/sessions/${encodeURIComponent(sessionId)}/results`,
      method: "GET",
    });

    return response.results.map(toImageItem);
  },

  async getSearchImageDetailContext(sessionId: string, imageId: string): Promise<ImageDetailContext | null> {
    const results = await this.getSearchSessionResults(sessionId);
    const index = results.findIndex((r) => r.id === imageId);
    if (index === -1) {
      return null;
    }

    return {
      image: results[index],
      previousImage: index > 0 ? results[index - 1] : null,
      nextImage: index < results.length - 1 ? results[index + 1] : null,
      relatedImages: results.filter((_, i) => i !== index).slice(0, 8),
    };
  },

  async listGalleries() {
    const response = await request<{ items: BackendGallery[] }>({
      url: "/api/galleries/all",
      method: "GET",
    });

    return response.items.map(toGalleryItem);
  },

  async listGalleriesPage(params: ListGalleriesPageParams): Promise<PaginatedResult<GalleryItem>> {
    const response = await request<BackendPaginatedResult<BackendGallery>>({
      url: "/api/galleries",
      method: "GET",
      params: buildRequestParams({
        start: params.start,
        end: params.end,
        query: params.query,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
      }),
    });

    return {
      items: response.items.map(toGalleryItem),
      meta: toPaginationMeta(response.meta),
    };
  },

  async createGallery(payload: CreateGalleryPayload) {
    const response = await request<BackendGallery>({
      url: "/api/galleries",
      method: "POST",
      data: {
        name: payload.name.trim(),
        description: payload.description.trim(),
      },
    });

    return toGalleryItem(response);
  },

  async updateGallery(id: string, payload: UpdateGalleryPayload) {
    const response = await request<BackendGallery>({
      url: `/api/galleries/${id}`,
      method: "PATCH",
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
      },
    });

    return toGalleryItem(response);
  },

  async deleteGallery(id: string) {
    await request<{ gallery_id: string; deleted: boolean; moved_to_ungrouped_count: number }>({
      url: `/api/galleries/${id}`,
      method: "DELETE",
    });
  },

  async listImages(params?: { galleryId?: string | null; status?: ImageStatus; query?: string }) {
    if ((params?.status ?? "active") === "trash") {
      const response = await request<BackendPaginatedResult<BackendImage>>({
        url: "/api/trash/images",
        method: "GET",
        params: buildRequestParams({
          start: 1,
          end: 200,
          query: params?.query,
          sort_by: "deleted_at",
          sort_order: "desc",
        }),
      });

      return response.items.map(toImageItem);
    }

    const response = await request<{ items: BackendImage[] }>({
      url: "/api/images/all",
      method: "GET",
      params: buildRequestParams({
        status: params?.status ?? "active",
        gallery_id: params?.galleryId,
        query: params?.query,
      }),
    });

    return response.items.map(toImageItem);
  },

  async listImagesPage(params: ListImagesPageParams): Promise<PaginatedResult<ImageItem>> {
    if ((params.status ?? "active") === "trash") {
      const response = await request<BackendPaginatedResult<BackendImage>>({
        url: "/api/trash/images",
        method: "GET",
        params: buildRequestParams({
          start: params.start,
          end: params.end,
          query: params.query,
          sort_by: "deleted_at",
          sort_order: params.sortOrder,
        }),
      });

      return {
        items: response.items.map(toImageItem),
        meta: toPaginationMeta(response.meta),
      };
    }

    const response = await request<BackendPaginatedResult<BackendImage>>({
      url: "/api/images",
      method: "GET",
      params: buildRequestParams({
        start: params.start,
        end: params.end,
        status: params.status ?? "active",
        gallery_id: params.galleryId,
        query: params.query,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
      }),
    });

    return {
      items: response.items.map(toImageItem),
      meta: toPaginationMeta(response.meta),
    };
  },

  async batchUploadImages(files: File[], galleryId?: string | null, signal?: AbortSignal) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    if (galleryId) {
      formData.append("gallery_id", galleryId);
    }

    const response = await request<{ items: BackendImage[]; uploaded_count: number }>({
      url: "/api/images/batch-upload",
      method: "POST",
      data: formData,
      timeout: UPLOAD_TIMEOUT,
      signal,
    });

    return {
      items: response.items.map(toImageItem),
      uploadedCount: response.uploaded_count,
    };
  },

  async updateImage(id: string, payload: UpdateImagePayload) {
    const response = await request<{ id: string; gallery_id: string | null; updated_at: string }>({
      url: `/api/images/${id}`,
      method: "PATCH",
      data: {
        ...(payload.galleryId !== undefined ? { gallery_id: payload.galleryId } : {}),
      },
    });

    return response;
  },

  async moveImageToTrash(id: string) {
    await request<{ id: string; status: "trash"; deleted_at: string }>({
      url: `/api/images/${id}/trash`,
      method: "POST",
    });
  },

  async restoreImage(id: string) {
    await request<{ id: string; status: "active"; deleted_at: null }>({
      url: `/api/images/${id}/restore`,
      method: "POST",
    });
  },

  async permanentlyDeleteImage(id: string) {
    await request<{ id: string; deleted: true }>({
      url: `/api/images/${id}`,
      method: "DELETE",
    });
  },

  async clearTrash() {
    await request<{ deleted_count: number }>({
      url: "/api/trash",
      method: "DELETE",
    });
  },

  async getImageDetailContext(imageId: string, galleryId?: string): Promise<ImageDetailContext | null> {
    const response = await request<BackendImageDetailContextResponse>({
      url: `/api/images/${imageId}/detail-context`,
      method: "GET",
      params: buildRequestParams({ gallery_id: galleryId }),
    });

    return {
      image: toImageItem(response.image),
      previousImage: response.previous_image ? toImageItem(response.previous_image) : null,
      nextImage: response.next_image ? toImageItem(response.next_image) : null,
      relatedImages: response.related_images.map(toImageItem),
    };
  },

  async prefetchImageDetailContext(imageId: string, galleryId?: string) {
    return this.getImageDetailContext(imageId, galleryId);
  },

  async listHistory(keyword?: string) {
    const response = await request<{ items: BackendHistoryRecord[] }>({
      url: "/api/history",
      method: "GET",
      params: buildRequestParams({ keyword }),
    });

    return response.items.map(toHistoryRecord);
  },

  async renameSearchSession(sessionId: string, title: string) {
    await request<{ session_id: string; title: string; updated_at: string }>({
      url: `/api/history/${sessionId}`,
      method: "PATCH",
      data: { title: title.trim() },
    });
  },

  async deleteSearchSession(sessionId: string) {
    await request<{ session_id: string; deleted: boolean }>({
      url: `/api/history/${sessionId}`,
      method: "DELETE",
    });
  },

  async autoClassifyImages(payload: AutoClassifyPayload): Promise<AutoClassifyResponse> {
    const response = await request<{
      classified: Array<{ image_id: string; gallery_id: string; gallery_name: string; confidence: number }>;
      skipped: string[];
      total_processed: number;
    }>({
      url: "/api/images/auto-classify",
      method: "POST",
      data: {
        image_ids: payload.imageIds,
        scope: payload.scope,
      },
    });

    return {
      classified: response.classified.map((item) => ({
        imageId: item.image_id,
        galleryId: item.gallery_id,
        galleryName: item.gallery_name,
        confidence: item.confidence,
      })),
      skipped: response.skipped,
      totalProcessed: response.total_processed,
    };
  },
};

export type MediaApi = typeof mediaApi;
export default mediaApi;
