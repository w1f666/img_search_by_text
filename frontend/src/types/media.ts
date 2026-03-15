export type ImageStatus = "active" | "trash";

export interface GalleryRecord {
  id: string;
  Galleryname: string;
  CreatedTime: string;
  description: string;
}

export interface GalleryItem extends GalleryRecord {
  imageUrl?: string;
  count: number;
}

export interface ImageItem {
  id: string;
  url: string;
  filename: string;
  createdAt: string;
  size: string;
  galleryId: string | null;
  status: ImageStatus;
  source: "upload" | "scan";
  deletedAt?: string;
}

export interface HistoryRecord {
  id: string;
  title: string;
  query: string;
  summary: string;
  createdAt: string;
  resultCount: number;
  category: "自然语言" | "相似图搜索" | "重复检测";
}

export interface CreateGalleryPayload {
  Galleryname: string;
  description: string;
}

export interface UpdateGalleryPayload {
  Galleryname?: string;
  description?: string;
}

export interface CreateImagePayload {
  filename: string;
  size: string;
  url: string;
  galleryId?: string | null;
}

export interface UpdateImagePayload {
  galleryId?: string | null;
}