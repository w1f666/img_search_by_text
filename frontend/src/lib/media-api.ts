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

const getTurnQueryLabel = (query: string | ImageItem) =>
  typeof query === "string" ? query : "图片搜索";

const getHistoryTitleFromTurns = (turns: [string | ImageItem, ImageItem][]) => {
  const firstTurn = turns[0];
  if (!firstTurn) {
    return "新搜索";
  }

  return getTurnQueryLabel(firstTurn[0]);
};

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
    title: "海边夕阳 橙红天空",
    turns: [
      ["海边夕阳 橙红天空", seedImages[0]],
      ["加入倒影和广角构图", seedImages[1]],
    ],
    createdAt: "2026-03-13T09:20:00",
  },
  {
    id: "history-02",
    title: "图片搜索",
    turns: [
      [seedImages[2], seedImages[2]],
      ["只看色调接近蓝绿色", seedImages[5]],
    ],
    createdAt: "2026-03-13T08:15:00",
  },
  {
    id: "history-03",
    title: "人物 侧脸 室内 暖光",
    turns: [["人物 侧脸 室内 暖光", seedImages[3]]],
    createdAt: "2026-03-12T21:04:00",
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
        [
          record.title,
          ...record.turns.map((turn) => {
            const [query, result] = turn;
            return [
              getTurnQueryLabel(query),
              result.filename,
              result.createdAt,
              result.size,
            ].join(" ");
          }),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword)
      )
    );
  },

  async createHistory(turn: [string | ImageItem, ImageItem]) {
    await wait();

    const turns: [string | ImageItem, ImageItem][] = [turn];
    const record: HistoryRecord = {
      id: createId("history"),
      title: getHistoryTitleFromTurns(turns),
      turns,
      createdAt: new Date().toISOString(),
    };

    database.history.unshift(record);
    return record;
  },

  async appendHistoryTurn(historyId: string, turn: [string | ImageItem, ImageItem]) {
    await wait();
    let updatedRecord: HistoryRecord | undefined;

    database.history = database.history.map((record) => {
      if (record.id !== historyId) {
        return record;
      }

      const nextTurns: [string | ImageItem, ImageItem][] = [...record.turns, turn];
      updatedRecord = {
        ...record,
        turns: nextTurns,
        title: getHistoryTitleFromTurns(nextTurns),
        createdAt: new Date().toISOString(),
      };

      return updatedRecord;
    });

    if (!updatedRecord) {
      return this.createHistory(turn);
    }

    return updatedRecord;
  },
};