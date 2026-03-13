import { create } from "zustand";

export interface GalleryItem {
  Galleryname: string;
  CreatedTime: string;
  imageUrl?: string;
  count: number;
}

interface GalleryState {
  galleryList: GalleryItem[];
  loading: boolean;
  setGalleryList: (list: GalleryItem[]) => void;
  setLoading: (v: boolean) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  galleryList: [],
  loading: true,
  setGalleryList: (list) => set({ galleryList: list }),
  setLoading: (v) => set({ loading: v }),
}));
