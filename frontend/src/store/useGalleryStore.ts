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
  loading: boolean;
  initialized: boolean;
  setGalleryList: (list: GalleryItem[]) => void;
  setLoading: (value: boolean) => void;
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

export const useGalleryStore = create<GalleryState>((set, get) => ({
  galleryList: [],
  activeImages: [],
  trashImages: [],
  historyRecords: [],
  loading: true,
  initialized: false,
  setGalleryList: (list) => set({ galleryList: list }),
  setLoading: (value) => set({ loading: value }),
  initLibrary: async () => {
    if (get().initialized) {
      return;
    }

    set({ loading: true });
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  refreshLibrary: async () => {
    set({ loading: true });
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  createGallery: async (payload) => {
    set({ loading: true });
    await mediaApi.createGallery(payload);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  updateGallery: async (id, payload) => {
    set({ loading: true });
    await mediaApi.updateGallery(id, payload);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  deleteGallery: async (id) => {
    set({ loading: true });
    await mediaApi.deleteGallery(id);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  addImage: async (payload) => {
    set({ loading: true });
    await mediaApi.createImage(payload);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  updateImageGallery: async (imageId, galleryId) => {
    set({ loading: true });
    await mediaApi.updateImage(imageId, { galleryId });
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  moveImageToTrash: async (imageId) => {
    set({ loading: true });
    await mediaApi.moveImageToTrash(imageId);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  moveImagesToTrash: async (imageIds) => {
    set({ loading: true });
    await mediaApi.moveImagesToTrash(imageIds);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  restoreImage: async (imageId) => {
    set({ loading: true });
    await mediaApi.restoreImage(imageId);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  permanentlyDeleteImage: async (imageId) => {
    set({ loading: true });
    await mediaApi.permanentlyDeleteImage(imageId);
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
  clearTrash: async () => {
    set({ loading: true });
    await mediaApi.clearTrash();
    const data = await hydrateLibrary();
    set({ ...data, loading: false, initialized: true });
  },
}));
