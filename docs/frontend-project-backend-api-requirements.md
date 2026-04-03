# 前端项目后端 API 清单

## 1. 约束

- `history_id = session_id`
- 图集详情路由使用 `/gallery/:galleryId`
- 所有图片列表、图集列表、图集图片列表均使用分页接口
- 分页请求必须显式传 `start` 和 `end`
- 纯文字搜索时，历史标题默认取第一轮文字查询
- 纯图片搜索和图文联合搜索时，历史标题默认取 `图片搜索`
- 对话标题支持后续手动修改，修改后覆盖默认标题

## 2. 接口清单

### 2.1 搜索

#### `POST /api/search/best-match`

请求 JSON:

```json
{
  "type": "mixed",
  "text_query": "海边夕阳",
  "image_url": "https://example.com/query.jpg",
  "search_session_id": "history_001",
  "top_k": 24,
  "search_strategy": "balanced"
}
```

响应 JSON:

```json
{
  "best_match": {
    "id": "image_001",
    "filename": "IMG_8200.JPG",
    "image_url": "/gallery/landscapes/IMG_8200.JPG",
    "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
    "size_bytes": 3355443,
    "size_label": "3.2 MB",
    "created_at": "2026-03-12T00:00:00Z",
    "gallery_id": "gallery_001",
    "status": "active",
    "source": "scan",
    "deleted_at": null
  },
  "search_session_id": "history_001"
}
```

说明:

- `type`、`text_query`、`image_url` 三者组合决定本轮检索输入
- `type = text`: 纯文字搜索，只需要 `text_query`
- `type = image`: 纯图片搜索，只需要 `image_url`
- `type = mixed`: 图文联合搜索，需要同时传 `text_query` 和 `image_url`
- `text_query`、`image_url` 至少传一个，且要与 `type` 匹配
- 前端不再传 `contextual_query`，后端根据 `search_session_id` 自己拼接历史上下文后再执行 refine
- `search_strategy` 只表达前端选择的检索模式，例如 `balanced`、`image-first`、`text-first`，具体权重占比由后端内部处理
- 搜索成功后后端直接写入历史，返回的 `search_session_id` 就是历史记录 ID

### 2.2 历史

#### `GET /api/history`

请求 JSON:

```json
{
  "keyword": "夕阳"
}
```

说明:

- 这是“搜索历史记录列表”接口，不是执行搜索的接口
- 前端首页右上角当前会话、左侧历史、历史页面列表都依赖这类数据

#### `GET /api/history/{session_id}`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "session_id": "history_001",
  "title": "图片搜索",
  "turns": [
    {
      "query": {
        "type": "mixed",
        "text_query": "海边夕阳",
        "image_url": "https://example.com/query.jpg"
      },
      "matched_image": {
        "id": "image_001",
        "filename": "IMG_8200.JPG",
        "image_url": "/gallery/landscapes/IMG_8200.JPG",
        "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
        "size_bytes": 3355443,
        "size_label": "3.2 MB",
        "created_at": "2026-03-12T00:00:00Z",
        "gallery_id": "gallery_001",
        "status": "active",
        "source": "scan",
        "deleted_at": null
      }
    }
  ],
  "created_at": "2026-03-13T09:20:00Z",
  "updated_at": "2026-03-13T09:30:00Z"
}
```

响应 JSON:

```json
{
  "items": [
    {
      "session_id": "history_001",
      "title": "图片搜索",
      "turns": [
        {
          "query": {
            "type": "mixed",
            "text_query": "海边夕阳",
            "image_url": "https://example.com/query.jpg"
          },
          "matched_image": {
            "id": "image_001",
            "filename": "IMG_8200.JPG",
            "image_url": "/gallery/landscapes/IMG_8200.JPG",
            "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
            "size_bytes": 3355443,
            "size_label": "3.2 MB",
            "created_at": "2026-03-12T00:00:00Z",
            "gallery_id": "gallery_001",
            "status": "active",
            "source": "scan",
            "deleted_at": null
          }
        }
      ],
      "created_at": "2026-03-13T09:20:00Z",
      "updated_at": "2026-03-13T09:30:00Z"
    }
  ]
}
```

#### `PATCH /api/history/{session_id}`

请求 JSON:

```json
{
  "title": "更改后的对话名称"
}
```

说明:

- `session_id` 不是从搜索输入框里取，而是当前会话唯一 ID
- 前端当前实现里，这个 ID 来自 URL 查询参数 `?history=<session_id>`

响应 JSON:

```json
{
  "session_id": "history_001",
  "title": "更改后的对话名称",
  "updated_at": "2026-03-18T10:30:00Z"
}
```

#### `DELETE /api/history/{session_id}`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "session_id": "history_001",
  "deleted": true
}
```

### 2.3 图集

#### `GET /api/galleries/all`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "items": [
    {
      "id": "gallery_001",
      "name": "风景",
      "description": "整理风景照片",
      "cover_image_url": "/gallery/landscapes/IMG_8200.JPG",
      "image_count": 23,
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-18T09:00:00Z"
    }
  ]
}
```

#### `GET /api/galleries`

请求 JSON:

```json
{
  "start": 1,
  "end": 12,
  "query": "旅行",
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

响应 JSON:

```json
{
  "items": [
    {
      "id": "gallery_001",
      "name": "旅行精选",
      "description": "2025 年旅行高质量照片",
      "cover_image_url": "/gallery/landscapes/IMG_8200.JPG",
      "image_count": 12,
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-18T09:00:00Z"
    }
  ],
  "meta": {
    "requested_start": 1,
    "requested_end": 12,
    "returned_start": 1,
    "returned_end": 12,
    "total": 33,
    "page": 1,
    "page_size": 12,
    "total_pages": 3,
    "has_previous": false,
    "has_next": true
  }
}
```

#### `POST /api/galleries`

请求 JSON:

```json
{
  "name": "旅行精选",
  "description": "2025 年旅行高质量照片"
}
```

响应 JSON:

```json
{
  "id": "gallery_001",
  "name": "旅行精选",
  "description": "2025 年旅行高质量照片",
  "cover_image_url": null,
  "image_count": 0,
  "created_at": "2026-03-18T10:10:00Z",
  "updated_at": "2026-03-18T10:10:00Z"
}
```

#### `PATCH /api/galleries/{gallery_id}`

请求 JSON:

```json
{
  "name": "旅行精选",
  "description": "更新后的图集说明"
}
```

响应 JSON:

```json
{
  "id": "gallery_001",
  "name": "旅行精选",
  "description": "更新后的图集说明",
  "cover_image_url": "/gallery/landscapes/IMG_8200.JPG",
  "image_count": 12,
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-18T10:15:00Z"
}
```

#### `DELETE /api/galleries/{gallery_id}`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "gallery_id": "gallery_001",
  "deleted": true,
  "moved_to_ungrouped_count": 12
}
```

### 2.4 图片

#### `GET /api/images/all`

请求 JSON:

```json
{
  "status": "active",
  "gallery_id": null,
  "query": "IMG_82"
}
```

响应 JSON:

```json
{
  "items": [
    {
      "id": "image_001",
      "filename": "IMG_8200.JPG",
      "image_url": "/gallery/landscapes/IMG_8200.JPG",
      "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
      "size_bytes": 3355443,
      "size_label": "3.2 MB",
      "created_at": "2026-03-12T00:00:00Z",
      "gallery_id": "gallery_001",
      "status": "active",
      "source": "scan",
      "deleted_at": null
    }
  ]
}
```

#### `GET /api/images`

请求 JSON:

```json
{
  "start": 1,
  "end": 20,
  "status": "active",
  "gallery_id": "gallery_001",
  "query": "sunset",
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

响应 JSON:

```json
{
  "items": [
    {
      "id": "image_001",
      "filename": "IMG_8200.JPG",
      "image_url": "/gallery/landscapes/IMG_8200.JPG",
      "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
      "size_bytes": 3355443,
      "size_label": "3.2 MB",
      "created_at": "2026-03-12T00:00:00Z",
      "gallery_id": "gallery_001",
      "status": "active",
      "source": "scan",
      "deleted_at": null
    }
  ],
  "meta": {
    "requested_start": 1,
    "requested_end": 20,
    "returned_start": 1,
    "returned_end": 20,
    "total": 68,
    "page": 1,
    "page_size": 20,
    "total_pages": 4,
    "has_previous": false,
    "has_next": true
  }
}
```

#### `POST /api/images`

请求 JSON:

```json
{
  "filename": "IMG_8200.JPG",
  "size_label": "3.2 MB",
  "url": "/gallery/landscapes/IMG_8200.JPG",
  "gallery_id": "gallery_001"
}
```

响应 JSON:

```json
{
  "id": "image_001",
  "filename": "IMG_8200.JPG",
  "image_url": "/gallery/landscapes/IMG_8200.JPG",
  "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
  "size_bytes": 3355443,
  "size_label": "3.2 MB",
  "created_at": "2026-03-18T10:20:00Z",
  "gallery_id": "gallery_001",
  "status": "active",
  "source": "upload",
  "deleted_at": null
}
```

#### `PATCH /api/images/{image_id}`

请求 JSON:

```json
{
  "gallery_id": null
}
```

说明:

- `gallery_id` 表示这张图片当前要归属到哪个图集
- 传具体图集 ID: 把图片移动到该图集
- 传 `null`: 把图片移出图集，变成未归类图片

响应 JSON:

```json
{
  "id": "image_001",
  "gallery_id": null,
  "updated_at": "2026-03-18T10:21:00Z"
}
```

#### `POST /api/images/{image_id}/trash`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "id": "image_001",
  "status": "trash",
  "deleted_at": "2026-03-18T10:22:00Z"
}
```

### 2.5 回收站

#### `GET /api/trash/images`

请求 JSON:

```json
{
  "start": 1,
  "end": 20,
  "query": "duplicate",
  "sort_by": "deleted_at",
  "sort_order": "desc"
}
```

响应 JSON:

```json
{
  "items": [
    {
      "id": "image_901",
      "filename": "duplicate-candidate.JPG",
      "image_url": "/gallery/landscapes/IMG_8212.JPG",
      "thumbnail_url": "/gallery/landscapes/IMG_8212.JPG",
      "size_bytes": 3250586,
      "size_label": "3.1 MB",
      "created_at": "2026-03-04T00:00:00Z",
      "gallery_id": null,
      "status": "trash",
      "source": "scan",
      "deleted_at": "2026-03-11T00:00:00Z"
    }
  ],
  "meta": {
    "requested_start": 1,
    "requested_end": 20,
    "returned_start": 1,
    "returned_end": 1,
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "has_previous": false,
    "has_next": false
  }
}
```

说明:

- 这个接口是必须的，当前项目里回收站页面需要明确的 trash 列表能力
- 如果后端想复用 `GET /api/images`，至少也要稳定支持 `status = trash` 的分页查询

#### `POST /api/images/batch-trash`

请求 JSON:

```json
{
  "image_ids": ["image_001", "image_002", "image_003"]
}
```

响应 JSON:

```json
{
  "image_ids": ["image_001", "image_002", "image_003"],
  "deleted_count": 3
}
```

#### `POST /api/images/{image_id}/restore`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "id": "image_001",
  "status": "active",
  "deleted_at": null
}
```

#### `DELETE /api/images/{image_id}`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "id": "image_001",
  "deleted": true
}
```

#### `DELETE /api/trash`

请求 JSON:

```json
{}
```

响应 JSON:

```json
{
  "deleted_count": 18
}
```

#### `GET /api/images/{image_id}/detail-context`

请求 JSON:

```json
{
  "gallery_id": "gallery_001"
}
```

响应 JSON:

```json
{
  "image": {
    "id": "image_001",
    "filename": "IMG_8200.JPG",
    "image_url": "/gallery/landscapes/IMG_8200.JPG",
    "thumbnail_url": "/gallery/landscapes/IMG_8200.JPG",
    "size_bytes": 3355443,
    "size_label": "3.2 MB",
    "created_at": "2026-03-12T00:00:00Z",
    "gallery_id": "gallery_001",
    "status": "active",
    "source": "scan",
    "deleted_at": null
  },
  "previous_image": null,
  "next_image": {
    "id": "image_002",
    "filename": "IMG_8203.JPG",
    "image_url": "/gallery/landscapes/IMG_8203.JPG",
    "thumbnail_url": "/gallery/landscapes/IMG_8203.JPG",
    "size_bytes": 2202009,
    "size_label": "2.1 MB",
    "created_at": "2026-03-12T00:00:00Z",
    "gallery_id": "gallery_001",
    "status": "active",
    "source": "scan",
    "deleted_at": null
  },
  "related_images": []
}
```

### 2.6 智能分类

#### `POST /api/images/auto-classify`

说明:

- 根据已有图集名称，利用 CLIP 对未分类图片进行语义匹配，自动将图片归入最匹配的图集
- `scope = "all-unclassified"` 时处理所有 `gallery_id = null` 且 `status = active` 的图片
- `scope = "selected"` 时只处理 `image_ids` 中指定的图片
- 后端流程：
  1. 获取所有非删除图集的名称列表
  2. 对每个图集名称用 CLIP text encoder 编码为文本向量
  3. 对目标图片用 CLIP image encoder 编码为图像向量（若已有缓存向量可直接使用）
  4. 计算每张图片向量与所有图集名称向量的余弦相似度
  5. 取最高相似度的图集，若 confidence ≥ 阈值（建议 0.2）则归入该图集，否则跳过
  6. 批量更新图片的 `gallery_id`
  7. 同步更新各图集的 `image_count` 和 `cover_image_url`
- 对外返回每张图片的分类结果，包含匹配到的图集 ID、名称和置信度

请求 JSON:

```json
{
  "image_ids": ["image_001", "image_002"],
  "scope": "selected"
}
```

```json
{
  "scope": "all-unclassified"
}
```

响应 JSON:

```json
{
  "classified": [
    {
      "image_id": "image_001",
      "gallery_id": "gallery_001",
      "gallery_name": "风景",
      "confidence": 0.82
    },
    {
      "image_id": "image_002",
      "gallery_id": "gallery_003",
      "gallery_name": "人像",
      "confidence": 0.67
    }
  ],
  "skipped": ["image_003"],
  "total_processed": 3
}
```

说明:

- `classified` 数组：每一项表示一张被成功归类的图片
  - `image_id`: 图片 ID
  - `gallery_id`: 被分配到的图集 ID
  - `gallery_name`: 图集名称（方便前端直接展示，无需二次查询）
  - `confidence`: CLIP 相似度分数（0~1），越高表示语义匹配越好
- `skipped` 数组：无法达到阈值的图片 ID 列表，这些图片保持未归类
- `total_processed`: 总共处理的图片数量

## 3. 后端结构定义

### 3.1 分页

```ts
interface PaginationRequest {
  start: number;
  end: number;
}

interface PaginationMeta {
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
}

interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
```

### 3.2 图集

```ts
interface BackendGallery {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string | null;
  image_count: number;
  created_at: string;
  updated_at: string;
}
```

### 3.3 图片

```ts
type ImageStatus = "active" | "trash";
type ImageSource = "upload" | "scan";

interface BackendImage {
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
```

### 3.4 搜索查询

```ts
type BackendSearchQuery =
  | {
      type: "text";
      text_query: string;
    }
  | {
      type: "image";
      image_url: string;
    }
  | {
      type: "mixed";
      text_query: string;
      image_url: string;
    };
```

### 3.5 搜索会话

```ts
interface BackendSearchTurnItem {
  image_id: string;
  thumbnail_url: string;
  score: number;
}

interface BackendSearchTurn {
  turn_id: string;
  query: BackendSearchQuery;
  items: BackendSearchTurnItem[];
  created_at: string;
}

interface BackendSearchSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
```

### 3.6 历史

```ts
interface BackendHistoryTurn {
  query: BackendSearchQuery;
  matched_image: BackendImage;
}

interface BackendHistoryRecord {
  session_id: string;
  title: string;
  turns: BackendHistoryTurn[];
  created_at: string;
  updated_at: string;
}
```

### 3.7 图片详情上下文

```ts
interface ImageDetailContextResponse {
  image: BackendImage;
  previous_image: BackendImage | null;
  next_image: BackendImage | null;
  related_images: BackendImage[];
}
```

### 3.8 搜索响应

```ts
interface SearchBestMatchResponse {
  best_match: BackendImage | null;
  search_session_id: string | null;
}
```

### 3.9 重命名响应

```ts
interface RenameHistoryResponse {
  session_id: string;
  title: string;
  updated_at: string;
}
```