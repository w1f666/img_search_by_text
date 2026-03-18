import { create } from "zustand";
import { mediaApi } from "@/lib/media-api";
import type {
  CreateGalleryPayload,
  CreateImagePayload,
  GalleryItem,
  HistoryRecord,
  ImageItem,
  UpdateGalleryPayload,
} from "@/types/media";

interface GalleryState {
  galleryList: GalleryItem[];
  activeImages: ImageItem[];
  trashImages: ImageItem[];
  historyRecords: HistoryRecord[];
  initialized: boolean;
  isInitializing: boolean;
  isCreatingGallery: boolean;
  isAddingImage: boolean;
  isClearingTrash: boolean;
  pendingImageIds: string[];
  pendingGalleryIds: string[];
  setGalleryList: (list: GalleryItem[]) => void;
  initLibrary: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  createGallery: (payload: CreateGalleryPayload) => Promise<void>;
  updateGallery: (id: string, payload: UpdateGalleryPayload) => Promise<void>;
  deleteGallery: (id: string) => Promise<void>;
  addImage: (payload: CreateImagePayload) => Promise<void>;
  updateImageGallery: (imageId: string, galleryId: string | null) => Promise<void>;
  moveImageToTrash: (imageId: string) => Promise<void>;
  moveImagesToTrash: (imageIds: string[]) => Promise<void>;
  restoreImage: (imageId: string) => Promise<void>;
  permanentlyDeleteImage: (imageId: string) => Promise<void>;
  clearTrash: () => Promise<void>;
  deleteSearchSession: (sessionId: string) => Promise<void>;
}

const hydrateLibrary = async () => {
  const [galleryList, activeImages, trashImages, historyRecords] = await Promise.all([
    mediaApi.listGalleries(),
    mediaApi.listImages({ status: "active" }),
    mediaApi.listImages({ status: "trash" }),
    mediaApi.listHistory(),
  ]);

  return { galleryList, activeImages, trashImages, historyRecords };
};

export { type GalleryItem } from "@/types/media";

const addPendingId = (ids: string[], id: string) =>
  ids.includes(id) ? ids : [...ids, id];

const removePendingId = (ids: string[], id: string) => 
  ids.filter((entry) => entry !== id);

const addPendingIds = (ids: string[], nextIds: string[]) => {
  const uniqueIds = new Set(ids);

  nextIds.forEach((id) => {
    uniqueIds.add(id);
  });

  return [...uniqueIds];
};

const removePendingIds = (ids: string[], targetIds: string[]) => {
  const targetSet = new Set(targetIds);
  return ids.filter((id) => !targetSet.has(id));
};

export const useGalleryStore = create<GalleryState>((set, get) => ({
  galleryList: [],
  activeImages: [],
  trashImages: [],
  historyRecords: [],
  initialized: false,
  isInitializing: false,
  isCreatingGallery: false,
  isAddingImage: false,
  isClearingTrash: false,
  pendingImageIds: [],
  pendingGalleryIds: [],
  setGalleryList: (list) => set({ galleryList: list }),
  initLibrary: async () => {
    if (get().initialized || get().isInitializing) {
      return;
    }

    set({ isInitializing: true });

    try {
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set({ isInitializing: false });
    }
  },
  refreshLibrary: async () => {
    set({ isInitializing: true });

    try {
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set({ isInitializing: false });
    }
  },
  createGallery: async (payload) => {
    set({ isCreatingGallery: true });

    try {
      await mediaApi.createGallery(payload);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set({ isCreatingGallery: false });
    }
  },
  updateGallery: async (id, payload) => {
    set((state) => ({
      pendingGalleryIds: addPendingId(state.pendingGalleryIds, id),
    }));

    try {
      await mediaApi.updateGallery(id, payload);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingGalleryIds: removePendingId(state.pendingGalleryIds, id),
      }));
    }
  },
  deleteGallery: async (id) => {
    set((state) => ({
      pendingGalleryIds: addPendingId(state.pendingGalleryIds, id),
    }));

    try {
      await mediaApi.deleteGallery(id);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingGalleryIds: removePendingId(state.pendingGalleryIds, id),
      }));
    }
  },
  addImage: async (payload) => {
    set({ isAddingImage: true });

    try {
      await mediaApi.createImage(payload);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set({ isAddingImage: false });
    }
  },
  updateImageGallery: async (imageId, galleryId) => {
    set((state) => ({
      pendingImageIds: addPendingId(state.pendingImageIds, imageId),
    }));

    try {
      await mediaApi.updateImage(imageId, { galleryId });
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingImageIds: removePendingId(state.pendingImageIds, imageId),
      }));
    }
  },
  moveImageToTrash: async (imageId) => {
    set((state) => ({
      pendingImageIds: addPendingId(state.pendingImageIds, imageId),
    }));

    try {
      await mediaApi.moveImageToTrash(imageId);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingImageIds: removePendingId(state.pendingImageIds, imageId),
      }));
    }
  },
  moveImagesToTrash: async (imageIds) => {
    set((state) => ({
      pendingImageIds: addPendingIds(state.pendingImageIds, imageIds),
    }));

    try {
      await mediaApi.moveImagesToTrash(imageIds);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingImageIds: removePendingIds(state.pendingImageIds, imageIds),
      }));
    }
  },
  restoreImage: async (imageId) => {
    set((state) => ({
      pendingImageIds: addPendingId(state.pendingImageIds, imageId),
    }));

    try {
      await mediaApi.restoreImage(imageId);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingImageIds: removePendingId(state.pendingImageIds, imageId),
      }));
    }
  },
  permanentlyDeleteImage: async (imageId) => {
    set((state) => ({
      pendingImageIds: addPendingId(state.pendingImageIds, imageId),
    }));

    try {
      await mediaApi.permanentlyDeleteImage(imageId);
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set((state) => ({
        pendingImageIds: removePendingId(state.pendingImageIds, imageId),
      }));
    }
  },
  clearTrash: async () => {
    set({ isClearingTrash: true });

    try {
      await mediaApi.clearTrash();
      const data = await hydrateLibrary();
      set({ ...data, initialized: true });
    } finally {
      set({ isClearingTrash: false });
    }
  },
  deleteSearchSession: async (sessionId) => {
    await mediaApi.deleteSearchSession(sessionId);
    const data = await hydrateLibrary();
    set({ ...data, initialized: true });
  },
}));
