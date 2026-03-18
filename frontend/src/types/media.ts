export type ImageStatus = "active" | "trash";
export type ImageSource = "upload" | "scan";

export interface PaginationRequest {
  start: number;
  end: number;
}

export interface PaginationMeta {
  requestedStart: number;
  requestedEnd: number;
  returnedStart: number;
  returnedEnd: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface GalleryItem {
  id: string;
  name: string;
  description: string;
  coverImageUrl?: string;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryOptionItem {
  id: string;
  name: string;
}

export interface ImageItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  createdAt: string;
  sizeLabel: string;
  sizeBytes: number;
  galleryId: string | null;
  status: ImageStatus;
  source: ImageSource;
  deletedAt?: string;
}

export type SearchQuery =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      filename: string;
      previewUrl?: string;
    };

export type HistoryTurn = [string | ImageItem, ImageItem];

export interface HistoryRecord {
  id: string;
  title: string;
  turns: HistoryTurn[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryPayload {
  name: string;
  description: string;
}

export interface UpdateGalleryPayload {
  name?: string;
  description?: string;
}

export interface CreateImagePayload {
  filename: string;
  sizeLabel: string;
  url: string;
  galleryId?: string | null;
}

export interface UpdateImagePayload {
  galleryId?: string | null;
}

export interface ListGalleriesPageParams extends PaginationRequest {
  query?: string;
  sortBy?: "created_at" | "name" | "image_count";
  sortOrder?: "asc" | "desc";
}

export interface ListImagesPageParams extends PaginationRequest {
  status?: ImageStatus;
  galleryId?: string | null;
  query?: string;
  sortBy?: "created_at" | "filename" | "size_bytes";
  sortOrder?: "asc" | "desc";
}

export interface SearchBestMatchPayload {
  textQuery?: string;
  contextualQuery?: string;
  queryPreview?: string | ImageItem;
  referenceImageFile?: File;
  searchSessionId?: string;
  topK?: number;
  imageWeight?: number;
  textWeight?: number;
}

export interface SearchBestMatchResponse {
  bestMatch: ImageItem | null;
  searchSessionId: string | null;
}

export interface ImageDetailContext {
  image: ImageItem;
  previousImage: ImageItem | null;
  nextImage: ImageItem | null;
  relatedImages: ImageItem[];
}

export interface BackendGallery {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string | null;
  image_count: number;
  created_at: string;
  updated_at: string;
}

export interface BackendImage {
  id: string;
  filename: string;
  image_url: string;
  thumbnail_url?: string | null;
  size_bytes: number;
  size_label: string;
  created_at: string;
  gallery_id: string | null;
  status: ImageStatus;
  source: ImageSource;
  deleted_at?: string | null;
}

export interface BackendSearchTurnItem {
  image_id: string;
  thumbnail_url: string;
  score: number;
}

export interface BackendSearchTurn {
  turn_id: string;
  query: SearchQuery;
  items: BackendSearchTurnItem[];
  created_at: string;
}

export interface BackendSearchSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface BackendHistoryTurn {
  query: SearchQuery;
  matched_image: BackendImage;
}

export interface BackendHistoryRecord {
  session_id: string;
  title: string;
  turns: BackendHistoryTurn[];
  created_at: string;
  updated_at: string;
}