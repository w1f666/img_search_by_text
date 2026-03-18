import type {
  BackendGallery,
  BackendHistoryRecord,
  BackendImage,
  CreateGalleryPayload,
  CreateImagePayload,
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
  SearchBestMatchResponse,
  SearchQuery,
  UpdateGalleryPayload,
  UpdateImagePayload,
} from "@/types/media";

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_PAGE_SIZE = 12;

const tokenise = (text: string) =>
  text
    .toLowerCase()
    .split(/[\s,.;:!?，。！？、]+/)
    .map((token) => token.trim())
    .filter(Boolean);

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

const toDateOnly = (iso: string) => iso.slice(0, 10);

const parseSizeLabel = (value: string) => {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();

  if (unit === "KB") {
    return Math.round(amount * 1024);
  }

  if (unit === "MB") {
    return Math.round(amount * 1024 * 1024);
  }

  return Math.round(amount * 1024 * 1024 * 1024);
};

const getQueryLabel = (query: SearchQuery) =>
  query.type === "text" ? query.text : "图片搜索";

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
  turns: record.turns.map((turn) => {
    const query: string | ImageItem = turn.query.type === "text"
      ? turn.query.text
      : {
          id: `query-${record.session_id}`,
          url: turn.query.previewUrl ?? turn.matched_image.thumbnail_url ?? turn.matched_image.image_url,
          thumbnailUrl: turn.query.previewUrl ?? turn.matched_image.thumbnail_url ?? undefined,
          filename: turn.query.filename,
          createdAt: toDateOnly(record.created_at),
          sizeLabel: "0 MB",
          sizeBytes: 0,
          galleryId: null,
          status: "active",
          source: "upload",
        };

    return [query, toImageItem(turn.matched_image)];
  }),
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const sortByNewest = <T extends { created_at?: string; updated_at?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftValue = left.updated_at ?? left.created_at ?? "";
    const rightValue = right.updated_at ?? right.created_at ?? "";
    return rightValue.localeCompare(leftValue);
  });

const buildPaginationMeta = (
  total: number,
  requestedStart: number,
  requestedEnd: number,
  returnedCount: number
): PaginationMeta => {
  const pageSize = Math.max(1, requestedEnd - requestedStart + 1);
  const returnedStart = returnedCount > 0 ? requestedStart : 0;
  const returnedEnd = returnedCount > 0 ? requestedStart + returnedCount - 1 : 0;
  const page = Math.floor((requestedStart - 1) / pageSize) + 1;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    requestedStart,
    requestedEnd,
    returnedStart,
    returnedEnd,
    total,
    page,
    pageSize,
    totalPages,
    hasPrevious: requestedStart > 1 && total > 0,
    hasNext: requestedEnd < total,
  };
};

const paginateItems = <T>(items: T[], start: number, end: number): PaginatedResult<T> => {
  const requestedStart = Math.max(1, start);
  const requestedEnd = Math.max(requestedStart, end);
  const sliced = items.slice(requestedStart - 1, requestedEnd);

  return {
    items: sliced,
    meta: buildPaginationMeta(items.length, requestedStart, requestedEnd, sliced.length),
  };
};

const createSearchQuery = (query: string | ImageItem): SearchQuery => {
  if (typeof query === "string") {
    return {
      type: "text",
      text: query,
    };
  }

  return {
    type: "image",
    filename: query.filename,
    previewUrl: query.url,
  };
};

const getHistoryTitle = (query: SearchQuery) =>
  query.type === "text" ? query.text : "图片搜索";

const seedGalleries: BackendGallery[] = [
  {
    id: "gallery-landscape",
    name: "风景",
    description: "整理山海、日落和旅行途中拍到的自然风景。",
    cover_image_url: "/gallery/landscapes/IMG_8200.JPG",
    image_count: 3,
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
  {
    id: "gallery-portrait",
    name: "人物",
    description: "保留人像、街拍和活动纪念照片。",
    cover_image_url: "/gallery/landscapes/IMG_8200.JPG",
    image_count: 2,
    created_at: "2026-03-11T00:00:00Z",
    updated_at: "2026-03-11T00:00:00Z",
  },
  {
    id: "gallery-inspiration",
    name: "灵感板",
    description: "收集可用于后续搜索和分类实验的参考图。",
    cover_image_url: "/gallery/landscapes/IMG_8212.JPG",
    image_count: 1,
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
  },
];

const seedImages: BackendImage[] = [
  {
    id: "img-8200",
    image_url: "/gallery/landscapes/IMG_8200.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "IMG_8200.JPG",
    created_at: "2026-03-12T00:00:00Z",
    size_bytes: 3355443,
    size_label: "3.2 MB",
    gallery_id: "gallery-landscape",
    status: "active",
    source: "scan",
  },
  {
    id: "img-8203",
    image_url: "/gallery/landscapes/IMG_8203.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "IMG_8203.JPG",
    created_at: "2026-03-12T00:00:00Z",
    size_bytes: 2202009,
    size_label: "2.1 MB",
    gallery_id: "gallery-landscape",
    status: "active",
    source: "scan",
  },
  {
    id: "img-8212",
    image_url: "/gallery/landscapes/IMG_8212.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "IMG_8212.JPG",
    created_at: "2026-03-11T00:00:00Z",
    size_bytes: 4718592,
    size_label: "4.5 MB",
    gallery_id: "gallery-landscape",
    status: "active",
    source: "upload",
  },
  {
    id: "img-portrait-01",
    image_url: "/gallery/landscapes/IMG_8200.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "portrait-session-01.JPG",
    created_at: "2026-03-09T00:00:00Z",
    size_bytes: 5242880,
    size_label: "5.0 MB",
    gallery_id: "gallery-portrait",
    status: "active",
    source: "upload",
  },
  {
    id: "img-portrait-02",
    image_url: "/gallery/landscapes/IMG_8203.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "portrait-session-02.JPG",
    created_at: "2026-03-09T00:00:00Z",
    size_bytes: 3879731,
    size_label: "3.7 MB",
    gallery_id: "gallery-portrait",
    status: "active",
    source: "scan",
  },
  {
    id: "img-board-01",
    image_url: "/gallery/landscapes/IMG_8212.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "moodboard-ref-01.JPG",
    created_at: "2026-03-08T00:00:00Z",
    size_bytes: 1887437,
    size_label: "1.8 MB",
    gallery_id: "gallery-inspiration",
    status: "active",
    source: "upload",
  },
  {
    id: "img-loose-01",
    image_url: "/gallery/landscapes/IMG_8200.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "unsorted-01.JPG",
    created_at: "2026-03-07T00:00:00Z",
    size_bytes: 2936013,
    size_label: "2.8 MB",
    gallery_id: null,
    status: "active",
    source: "scan",
  },
  {
    id: "img-trash-01",
    image_url: "/gallery/landscapes/IMG_8203.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "deleted-landscape.JPG",
    created_at: "2026-03-05T00:00:00Z",
    size_bytes: 2516582,
    size_label: "2.4 MB",
    gallery_id: "gallery-landscape",
    status: "trash",
    source: "upload",
    deleted_at: "2026-03-12T00:00:00Z",
  },
  {
    id: "img-trash-02",
    image_url: "/gallery/landscapes/IMG_8212.JPG",
    thumbnail_url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "duplicate-candidate.JPG",
    created_at: "2026-03-04T00:00:00Z",
    size_bytes: 3250586,
    size_label: "3.1 MB",
    gallery_id: null,
    status: "trash",
    source: "scan",
    deleted_at: "2026-03-11T00:00:00Z",
  },
];

const seedHistory: BackendHistoryRecord[] = [
  {
    session_id: "history-01",
    title: "海边夕阳 橙红天空",
    turns: [
      {
        query: { type: "text", text: "海边夕阳 橙红天空" },
        matched_image: seedImages[0],
      },
      {
        query: { type: "text", text: "加入倒影和广角构图" },
        matched_image: seedImages[1],
      },
    ],
    created_at: "2026-03-13T09:20:00Z",
    updated_at: "2026-03-13T09:20:00Z",
  },
  {
    session_id: "history-02",
    title: "图片搜索",
    turns: [
      {
        query: { type: "image", filename: "IMG_8212.JPG", previewUrl: "/gallery/landscapes/IMG_8212.JPG" },
        matched_image: seedImages[2],
      },
      {
        query: { type: "text", text: "只看色调接近蓝绿色" },
        matched_image: seedImages[5],
      },
    ],
    created_at: "2026-03-13T08:15:00Z",
    updated_at: "2026-03-13T08:15:00Z",
  },
  {
    session_id: "history-03",
    title: "人物 侧脸 室内 暖光",
    turns: [
      {
        query: { type: "text", text: "人物 侧脸 室内 暖光" },
        matched_image: seedImages[3],
      },
    ],
    created_at: "2026-03-12T21:04:00Z",
    updated_at: "2026-03-12T21:04:00Z",
  },
];

const database = {
  galleries: [...seedGalleries],
  images: [...seedImages],
  histories: [...seedHistory],
};

const syncGalleryImageCounts = () => {
  database.galleries = database.galleries.map((gallery) => {
    const activeImages = database.images.filter(
      (image) => image.status === "active" && image.gallery_id === gallery.id
    );

    return {
      ...gallery,
      image_count: activeImages.length,
      cover_image_url: activeImages[0]?.thumbnail_url ?? activeImages[0]?.image_url ?? null,
    };
  });
};

const getFilteredGalleries = (params?: Pick<ListGalleriesPageParams, "query" | "sortBy" | "sortOrder">) => {
  const normalizedQuery = params?.query?.trim().toLowerCase();

  const filtered = database.galleries.filter((gallery) => {
    if (!normalizedQuery) {
      return true;
    }

    return [gallery.name, gallery.description]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const sortBy = params?.sortBy ?? "created_at";
  const sortOrder = params?.sortOrder ?? "desc";
  const factor = sortOrder === "asc" ? 1 : -1;

  return [...filtered].sort((left, right) => {
    if (sortBy === "name") {
      return left.name.localeCompare(right.name, "zh-Hans-CN") * factor;
    }

    if (sortBy === "image_count") {
      return (left.image_count - right.image_count) * factor;
    }

    return left.created_at.localeCompare(right.created_at) * factor;
  });
};

const getFilteredImages = (params?: Omit<ListImagesPageParams, "start" | "end">) => {
  const normalizedQuery = params?.query?.trim().toLowerCase();
  const status = params?.status ?? "active";
  const sortBy = params?.sortBy ?? "created_at";
  const sortOrder = params?.sortOrder ?? "desc";
  const factor = sortOrder === "asc" ? 1 : -1;

  return [...database.images]
    .filter((image) => {
      if (image.status !== status) {
        return false;
      }

      if (params?.galleryId !== undefined && image.gallery_id !== params.galleryId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [image.filename, image.size_label]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (sortBy === "filename") {
        return left.filename.localeCompare(right.filename) * factor;
      }

      if (sortBy === "size_bytes") {
        return (left.size_bytes - right.size_bytes) * factor;
      }

      return left.created_at.localeCompare(right.created_at) * factor;
    });
};

const getFilteredHistories = (keyword?: string) => {
  const normalizedKeyword = keyword?.trim().toLowerCase();

  if (!normalizedKeyword) {
    return sortByNewest(database.histories);
  }

  return sortByNewest(
    database.histories.filter((record) =>
      [
        record.title,
        ...record.turns.map((turn) => {
          const queryLabel = getQueryLabel(turn.query);
          return [queryLabel, turn.matched_image.filename, turn.matched_image.size_label].join(" ");
        }),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword)
    )
  );
};

const runLocalBestMatch = ({
  textQuery,
  contextualQuery,
  referenceImageFile,
}: SearchBestMatchPayload): BackendImage | null => {
  const semanticText = [contextualQuery, textQuery].filter(Boolean).join(" ");
  const semanticTokens = tokenise(semanticText);
  const fileStem = referenceImageFile?.name.split(".")[0]?.toLowerCase() ?? "";
  const activeImages = database.images.filter((image) => image.status === "active");

  if (activeImages.length === 0) {
    return null;
  }

  const ranked = [...activeImages].sort((left, right) => {
    const score = (image: BackendImage) => {
      const base = (hashString(`${image.id}-${semanticText}`) % 100) / 100;
      const searchable = [image.filename, image.created_at, image.size_label].join(" ").toLowerCase();

      let overlap = 0;
      semanticTokens.forEach((token) => {
        if (searchable.includes(token)) {
          overlap += 1.2;
        }
      });

      let imageBoost = 0;
      if (fileStem) {
        if (searchable.includes(fileStem.slice(0, 8))) {
          imageBoost += 2.2;
        }
        if (searchable.includes(fileStem.slice(-6))) {
          imageBoost += 0.8;
        }
      }

      return base + overlap + imageBoost;
    };

    return score(right) - score(left);
  });

  return ranked[0] ?? null;
};

const persistMockSearchHistory = (
  sessionId: string,
  queryPreview: string | ImageItem,
  matchedImage: BackendImage
) => {
  const query = createSearchQuery(queryPreview);
  const now = nowIso();
  const existing = database.histories.find((record) => record.session_id === sessionId);

  if (!existing) {
    database.histories.unshift({
      session_id: sessionId,
      title: getHistoryTitle(query),
      turns: [
        {
          query,
          matched_image: matchedImage,
        },
      ],
      created_at: now,
      updated_at: now,
    });
    return;
  }

  existing.turns = [...existing.turns, { query, matched_image: matchedImage }];
  existing.updated_at = now;
};

const buildRange = (page: number, pageSize = DEFAULT_PAGE_SIZE) => ({
  start: (page - 1) * pageSize + 1,
  end: page * pageSize,
});

export const mediaApi = {
  buildRange,

  async searchBestMatch(payload: SearchBestMatchPayload): Promise<SearchBestMatchResponse> {
    const endpointBase = import.meta.env.VITE_BACKEND_URL;

    if (endpointBase) {
      try {
        const isFirstTurn = !payload.searchSessionId;
        const endpoint = isFirstTurn
          ? "/search/sessions"
          : `/search/sessions/${payload.searchSessionId}/turns`;

        const formData = new FormData();
        if (payload.textQuery?.trim()) {
          formData.append("text_query", payload.textQuery.trim());
        }
        if (payload.referenceImageFile) {
          formData.append("reference_image", payload.referenceImageFile);
        }
        formData.append("top_k", String(payload.topK ?? 24));
        formData.append("image_weight", String(payload.imageWeight ?? 0.7));
        formData.append("text_weight", String(payload.textWeight ?? 0.3));

        const response = await fetch(`${endpointBase}${endpoint}`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const body = await response.json();
          const firstItem = body?.data?.turn?.items?.[0];
          const nextSessionId = body?.data?.session?.session_id ?? payload.searchSessionId ?? null;

          if (firstItem) {
            const imageById = database.images.find(
              (image) => String(image.id) === String(firstItem.image_id)
            );
            const imageByUrl = database.images.find(
              (image) =>
                image.thumbnail_url === firstItem.thumbnail_url || image.image_url === firstItem.thumbnail_url
            );

            return {
              bestMatch: imageById ? toImageItem(imageById) : imageByUrl ? toImageItem(imageByUrl) : null,
              searchSessionId: nextSessionId,
            };
          }

          return {
            bestMatch: null,
            searchSessionId: nextSessionId,
          };
        }
      } catch {
        // Fall through to local mock result.
      }
    }

    await wait();
    const bestMatch = runLocalBestMatch(payload);
    const nextSessionId = payload.searchSessionId ?? createId("history");

    if (bestMatch && payload.queryPreview) {
      persistMockSearchHistory(nextSessionId, payload.queryPreview, bestMatch);
    }

    return {
      bestMatch: bestMatch ? toImageItem(bestMatch) : null,
      searchSessionId: bestMatch ? nextSessionId : payload.searchSessionId ?? null,
    };
  },

  async listGalleries() {
    await wait();
    syncGalleryImageCounts();
    return getFilteredGalleries({ sortBy: "created_at", sortOrder: "desc" }).map(toGalleryItem);
  },

  async listGalleriesPage(params: ListGalleriesPageParams): Promise<PaginatedResult<GalleryItem>> {
    await wait();
    syncGalleryImageCounts();
    const filtered = getFilteredGalleries(params);
    const paginated = paginateItems(filtered, params.start, params.end);

    return {
      items: paginated.items.map(toGalleryItem),
      meta: paginated.meta,
    };
  },

  async createGallery(payload: CreateGalleryPayload) {
    await wait();
    const now = nowIso();
    const record: BackendGallery = {
      id: createId("gallery"),
      name: payload.name.trim(),
      description: payload.description.trim(),
      cover_image_url: null,
      image_count: 0,
      created_at: now,
      updated_at: now,
    };

    database.galleries.unshift(record);
    return toGalleryItem(record);
  },

  async updateGallery(id: string, payload: UpdateGalleryPayload) {
    await wait();
    const now = nowIso();
    database.galleries = database.galleries.map((gallery) => {
      if (gallery.id !== id) {
        return gallery;
      }

      return {
        ...gallery,
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
        updated_at: now,
      };
    });

    const next = database.galleries.find((gallery) => gallery.id === id);
    return next ? toGalleryItem(next) : null;
  },

  async deleteGallery(id: string) {
    await wait();
    database.galleries = database.galleries.filter((gallery) => gallery.id !== id);
    database.images = database.images.map((image) =>
      image.gallery_id === id ? { ...image, gallery_id: null } : image
    );
    syncGalleryImageCounts();
  },

  async listImages(params?: { galleryId?: string | null; status?: ImageStatus; query?: string }) {
    await wait();
    return getFilteredImages({
      galleryId: params?.galleryId,
      status: params?.status ?? "active",
      query: params?.query,
      sortBy: "created_at",
      sortOrder: "desc",
    }).map(toImageItem);
  },

  async listImagesPage(params: ListImagesPageParams): Promise<PaginatedResult<ImageItem>> {
    await wait();
    const filtered = getFilteredImages(params);
    const paginated = paginateItems(filtered, params.start, params.end);

    return {
      items: paginated.items.map(toImageItem),
      meta: paginated.meta,
    };
  },

  async createImage(payload: CreateImagePayload) {
    await wait();
    const now = nowIso();
    const image: BackendImage = {
      id: createId("image"),
      filename: payload.filename.trim(),
      image_url: payload.url.trim() || "/gallery/landscapes/IMG_8212.JPG",
      thumbnail_url: payload.url.trim() || "/gallery/landscapes/IMG_8212.JPG",
      size_bytes: parseSizeLabel(payload.sizeLabel),
      size_label: payload.sizeLabel.trim(),
      created_at: now,
      gallery_id: payload.galleryId ?? null,
      status: "active",
      source: "upload",
    };

    database.images.unshift(image);
    syncGalleryImageCounts();
    return toImageItem(image);
  },

  async updateImage(id: string, payload: UpdateImagePayload) {
    await wait();
    database.images = database.images.map((image) =>
      image.id === id
        ? {
            ...image,
            ...(payload.galleryId !== undefined ? { gallery_id: payload.galleryId } : {}),
          }
        : image
    );
    syncGalleryImageCounts();
    const next = database.images.find((image) => image.id === id);
    return next ? toImageItem(next) : null;
  },

  async moveImageToTrash(id: string) {
    await wait();
    const deletedAt = nowIso();
    database.images = database.images.map((image) =>
      image.id === id
        ? { ...image, status: "trash", deleted_at: deletedAt }
        : image
    );
    syncGalleryImageCounts();
  },

  async moveImagesToTrash(ids: string[]) {
    await wait();
    const targetIds = new Set(ids);
    const deletedAt = nowIso();
    database.images = database.images.map((image) =>
      targetIds.has(image.id)
        ? { ...image, status: "trash", deleted_at: deletedAt }
        : image
    );
    syncGalleryImageCounts();
  },

  async restoreImage(id: string) {
    await wait();
    database.images = database.images.map((image) =>
      image.id === id
        ? { ...image, status: "active", deleted_at: null }
        : image
    );
    syncGalleryImageCounts();
  },

  async permanentlyDeleteImage(id: string) {
    await wait();
    database.images = database.images.filter((image) => image.id !== id);
    syncGalleryImageCounts();
  },

  async clearTrash() {
    await wait();
    database.images = database.images.filter((image) => image.status !== "trash");
    syncGalleryImageCounts();
  },

  async getImageDetailContext(imageId: string, galleryId?: string): Promise<ImageDetailContext | null> {
    await wait();
    const image = database.images.find((entry) => entry.id === imageId);

    if (!image) {
      return null;
    }

    const collection = getFilteredImages({
      status: "active",
      galleryId: galleryId ?? undefined,
      sortBy: "created_at",
      sortOrder: "desc",
    });
    const currentIndex = collection.findIndex((entry) => entry.id === imageId);
    const previousImage = currentIndex > 0 ? collection[currentIndex - 1] : null;
    const nextImage = currentIndex >= 0 && currentIndex < collection.length - 1
      ? collection[currentIndex + 1]
      : null;
    const relatedSource = image.gallery_id
      ? getFilteredImages({ status: "active", galleryId: image.gallery_id })
      : getFilteredImages({ status: "active" });

    return {
      image: toImageItem(image),
      previousImage: previousImage ? toImageItem(previousImage) : null,
      nextImage: nextImage ? toImageItem(nextImage) : null,
      relatedImages: relatedSource
        .filter((entry) => entry.id !== image.id)
        .slice(0, 4)
        .map(toImageItem),
    };
  },

  async listHistory(keyword?: string) {
    await wait();
    return getFilteredHistories(keyword).map(toHistoryRecord);
  },

  async deleteSearchSession(sessionId: string) {
    await wait();
    database.histories = database.histories.filter((record) => record.session_id !== sessionId);
  },
};