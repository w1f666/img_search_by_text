import type {
  CreateGalleryPayload,
  CreateImagePayload,
  GalleryItem,
  GalleryRecord,
  HistoryRecord,
  ImageItem,
  ImageStatus,
  UpdateGalleryPayload,
  UpdateImagePayload,
} from "@/types/media";

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowDate = () => new Date().toISOString().slice(0, 10);

const seedGalleries: GalleryRecord[] = [
  {
    id: "gallery-landscape",
    Galleryname: "风景",
    CreatedTime: "2026-03-10",
    description: "整理山海、日落和旅行途中拍到的自然风景。",
  },
  {
    id: "gallery-portrait",
    Galleryname: "人物",
    CreatedTime: "2026-03-11",
    description: "保留人像、街拍和活动纪念照片。",
  },
  {
    id: "gallery-inspiration",
    Galleryname: "灵感板",
    CreatedTime: "2026-03-12",
    description: "收集可用于后续搜索和分类实验的参考图。",
  },
];

const seedImages: ImageItem[] = [
  {
    id: "img-8200",
    url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "IMG_8200.JPG",
    createdAt: "2026-03-12",
    size: "3.2 MB",
    galleryId: "gallery-landscape",
    status: "active",
    source: "scan",
  },
  {
    id: "img-8203",
    url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "IMG_8203.JPG",
    createdAt: "2026-03-12",
    size: "2.1 MB",
    galleryId: "gallery-landscape",
    status: "active",
    source: "scan",
  },
  {
    id: "img-8212",
    url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "IMG_8212.JPG",
    createdAt: "2026-03-11",
    size: "4.5 MB",
    galleryId: "gallery-landscape",
    status: "active",
    source: "upload",
  },
  {
    id: "img-portrait-01",
    url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "portrait-session-01.JPG",
    createdAt: "2026-03-09",
    size: "5.0 MB",
    galleryId: "gallery-portrait",
    status: "active",
    source: "upload",
  },
  {
    id: "img-portrait-02",
    url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "portrait-session-02.JPG",
    createdAt: "2026-03-09",
    size: "3.7 MB",
    galleryId: "gallery-portrait",
    status: "active",
    source: "scan",
  },
  {
    id: "img-board-01",
    url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "moodboard-ref-01.JPG",
    createdAt: "2026-03-08",
    size: "1.8 MB",
    galleryId: "gallery-inspiration",
    status: "active",
    source: "upload",
  },
  {
    id: "img-loose-01",
    url: "/gallery/landscapes/IMG_8200.JPG",
    filename: "unsorted-01.JPG",
    createdAt: "2026-03-07",
    size: "2.8 MB",
    galleryId: null,
    status: "active",
    source: "scan",
  },
  {
    id: "img-trash-01",
    url: "/gallery/landscapes/IMG_8203.JPG",
    filename: "deleted-landscape.JPG",
    createdAt: "2026-03-05",
    size: "2.4 MB",
    galleryId: "gallery-landscape",
    status: "trash",
    source: "upload",
    deletedAt: "2026-03-12",
  },
  {
    id: "img-trash-02",
    url: "/gallery/landscapes/IMG_8212.JPG",
    filename: "duplicate-candidate.JPG",
    createdAt: "2026-03-04",
    size: "3.1 MB",
    galleryId: null,
    status: "trash",
    source: "scan",
    deletedAt: "2026-03-11",
  },
];

const seedHistory: HistoryRecord[] = [
  {
    id: "history-01",
    title: "查找与海边夕阳相似的照片",
    query: "海边夕阳 橙红天空 倒影",
    summary: "最近一次视觉搜索，命中 18 张相似风景照片。",
    createdAt: "2026-03-13T09:20:00",
    resultCount: 18,
    category: "相似图搜索",
  },
  {
    id: "history-02",
    title: "近 7 天重复图片检测",
    query: "最近七天 重复图片",
    summary: "扫描新增图片后，检测出 4 组重复候选。",
    createdAt: "2026-03-13T08:15:00",
    resultCount: 4,
    category: "重复检测",
  },
  {
    id: "history-03",
    title: "人物侧脸照片集合",
    query: "人物 侧脸 室内 暖光",
    summary: "文本检索结果聚焦在人像相册中的暖色调照片。",
    createdAt: "2026-03-12T21:04:00",
    resultCount: 11,
    category: "自然语言",
  },
  {
    id: "history-04",
    title: "旅行相册封面筛选",
    query: "适合做相册封面的横图",
    summary: "为风景相册挑选宽画幅的候选封面图。",
    createdAt: "2026-03-10T18:40:00",
    resultCount: 7,
    category: "自然语言",
  },
  {
    id: "history-05",
    title: "查找高饱和度参考图",
    query: "高饱和 色块强烈 风景",
    summary: "用于灵感板整理，筛出颜色冲击力较强的图片。",
    createdAt: "2026-03-08T14:22:00",
    resultCount: 9,
    category: "相似图搜索",
  },
];

const database = {
  galleries: [...seedGalleries],
  images: [...seedImages],
  history: [...seedHistory],
};

const sortByNewest = <T extends { createdAt?: string; CreatedTime?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftValue = left.createdAt ?? left.CreatedTime ?? "";
    const rightValue = right.createdAt ?? right.CreatedTime ?? "";
    return rightValue.localeCompare(leftValue);
  });

const buildGalleryList = (): GalleryItem[] => {
  return database.galleries
    .map((gallery) => {
      const images = database.images.filter(
        (image) => image.status === "active" && image.galleryId === gallery.id
      );

      return {
        ...gallery,
        count: images.length,
        imageUrl: images[0]?.url,
      };
    })
    .sort((left, right) => right.CreatedTime.localeCompare(left.CreatedTime));
};

const filterImages = ({
  galleryId,
  status = "active",
  query,
}: {
  galleryId?: string | null;
  status?: ImageStatus;
  query?: string;
}) => {
  const normalizedQuery = query?.trim().toLowerCase();

  return sortByNewest(
    database.images.filter((image) => {
      if (image.status !== status) {
        return false;
      }

      if (galleryId !== undefined && image.galleryId !== galleryId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [image.filename, image.size]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
  );
};

export const mediaApi = {
  async listGalleries() {
    await wait();
    return buildGalleryList();
  },

  async createGallery(payload: CreateGalleryPayload) {
    await wait();
    const record: GalleryRecord = {
      id: createId("gallery"),
      Galleryname: payload.Galleryname.trim(),
      CreatedTime: nowDate(),
      description: payload.description.trim(),
    };

    database.galleries.unshift(record);
    return buildGalleryList().find((gallery) => gallery.id === record.id)!;
  },

  async updateGallery(id: string, payload: UpdateGalleryPayload) {
    await wait();
    database.galleries = database.galleries.map((gallery) => {
      if (gallery.id !== id) {
        return gallery;
      }

      return {
        ...gallery,
        ...(payload.Galleryname ? { Galleryname: payload.Galleryname.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description.trim() }
          : {}),
      };
    });

    return buildGalleryList().find((gallery) => gallery.id === id)!;
  },

  async deleteGallery(id: string) {
    await wait();
    database.galleries = database.galleries.filter((gallery) => gallery.id !== id);
    database.images = database.images.map((image) =>
      image.galleryId === id ? { ...image, galleryId: null } : image
    );
  },

  async listImages(params?: { galleryId?: string | null; status?: ImageStatus; query?: string }) {
    await wait();
    return filterImages({
      galleryId: params?.galleryId,
      status: params?.status ?? "active",
      query: params?.query,
    });
  },

  async createImage(payload: CreateImagePayload) {
    await wait();
    const image: ImageItem = {
      id: createId("image"),
      filename: payload.filename.trim(),
      url: payload.url.trim() || "/gallery/landscapes/IMG_8212.JPG",
      size: payload.size.trim(),
      createdAt: nowDate(),
      galleryId: payload.galleryId ?? null,
      status: "active",
      source: "upload",
    };

    database.images.unshift(image);
    return image;
  },

  async updateImage(id: string, payload: UpdateImagePayload) {
    await wait();
    database.images = database.images.map((image) =>
      image.id === id
        ? {
            ...image,
            ...(payload.galleryId !== undefined ? { galleryId: payload.galleryId } : {}),
          }
        : image
    );

    return database.images.find((image) => image.id === id)!;
  },

  async moveImageToTrash(id: string) {
    await wait();
    database.images = database.images.map((image) =>
      image.id === id
        ? { ...image, status: "trash", deletedAt: nowDate() }
        : image
    );
  },

  async moveImagesToTrash(ids: string[]) {
    await wait();
    const targetIds = new Set(ids);
    database.images = database.images.map((image) =>
      targetIds.has(image.id)
        ? { ...image, status: "trash", deletedAt: nowDate() }
        : image
    );
  },

  async restoreImage(id: string) {
    await wait();
    database.images = database.images.map((image) =>
      image.id === id
        ? { ...image, status: "active", deletedAt: undefined }
        : image
    );
  },

  async permanentlyDeleteImage(id: string) {
    await wait();
    database.images = database.images.filter((image) => image.id !== id);
  },

  async clearTrash() {
    await wait();
    database.images = database.images.filter((image) => image.status !== "trash");
  },

  async listHistory(keyword?: string) {
    await wait();
    const normalizedKeyword = keyword?.trim().toLowerCase();

    if (!normalizedKeyword) {
      return sortByNewest(database.history);
    }

    return sortByNewest(
      database.history.filter((record) =>
        [record.title, record.query, record.summary, record.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword)
      )
    );
  },
};