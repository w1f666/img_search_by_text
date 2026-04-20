# Image Search And Duplicate By CLIP

基于 CN-CLIP 的图片检索与管理系统，提供文本搜图、以图搜图、混合检索、图片归档、图集管理、搜索历史与回收站等能力。

项目由两部分组成：

- 后端：FastAPI + Tortoise ORM + SQLite + ChromaDB，负责图片上传、向量抽取、检索、历史记录与静态资源服务。
- 前端：React + TypeScript + Vite，负责搜索交互、图片浏览、图集管理和历史会话展示。

## 功能概览

- 文本搜索：输入中文文本，通过 CN-CLIP 文本向量检索图库。
- 以图搜图：上传参考图，返回相似图片集合。
- 混合检索：同时使用文本和图片，并支持 balanced、text-first、image-first 三种权重策略。
- 图片管理：批量上传、缩略图生成、分页浏览、详情查看、移入回收站。
- 图集管理：创建、编辑、删除图集，支持图片重新归类。
- 搜索历史：保存搜索 session，支持查看、重命名、删除。
- 本地持久化：SQLite 保存业务数据，ChromaDB 保存向量索引，上传资源保存在本地目录。

## 技术栈

### 后端

- FastAPI
- Tortoise ORM
- SQLite
- ChromaDB
- CN-CLIP
- Pillow
- Uvicorn

### 前端

- React 19
- TypeScript
- Vite 7
- React Router 7
- TanStack Query
- Axios
- Tailwind CSS 4
- Radix UI / shadcn 风格组件

## 目录结构

```text
.
├── backend/                  # 后端服务
│   ├── main.py               # FastAPI 启动入口
│   ├── app/
│   │   ├── api/endpoint/     # 各业务接口
│   │   ├── core/             # CLIP 调用与核心业务逻辑
│   │   ├── logs/             # 日志配置
│   │   └── schemas/          # Pydantic / 响应模型
│   ├── db/
│   │   ├── sql_db/           # SQLite 配置、模型、迁移、存储
│   │   └── vector_db/        # ChromaDB 客户端与持久化目录
│   ├── resource/clip_model/  # CLIP 模型缓存
│   ├── uploads/              # 上传图片与缩略图
│   └── search_uploads/       # 搜索参考图缓存
├── frontend/                 # React 前端
├── requirements.txt          # Python 依赖
├── pyproject.toml            # 项目信息与 Aerich 配置
└── README.md
```

## 运行环境

- Python 3.13 或更高版本
- Node.js 20 或更高版本
- npm 10 或更高版本

说明：首次执行搜索或上传时，后端会加载 CN-CLIP 模型。若本地没有模型文件，会下载到 `backend/resource/clip_model/`。

## 快速开始

### 1. 安装后端依赖

在项目根目录执行：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动后端

```bash
cd backend
uvicorn main:app --reload --host localhost --port 8000
```

启动后可访问：

- 后端健康检查：http://localhost:8000/
- OpenAPI 文档：http://localhost:8000/docs

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动前端开发服务

```bash
cd frontend
npm run dev
```

默认开发地址通常为：http://localhost:5173

## 前后端联调说明

- 前端默认请求地址为 `http://localhost:8000`。
- 如需修改后端地址，可在前端环境变量中设置 `VITE_BACKEND_URL`。
- 后端会挂载两个静态目录：
    - `/uploads`：正式上传图片和缩略图
    - `/search_uploads`：搜索用参考图片

## 数据与资源目录

### SQLite

- 数据文件：`backend/db/sql_db/storage/db.sqlite3`

### 向量数据库

- ChromaDB 存储目录：`backend/db/vector_db/storage/`

### 上传资源

- 原图：`backend/uploads/`
- 缩略图：`backend/uploads/thumbnails/`
- 搜索参考图：`backend/search_uploads/`

### 模型资源

- 模型缓存目录：`backend/resource/clip_model/`

## 主要接口

### 搜索

- `POST /api/search/top-k`：返回 top-k 检索结果
- `POST /api/search/best-match`：返回最佳匹配结果
- `GET /api/search/sessions/{session_id}/results`：获取某次搜索 session 的结果集

### 图片

- `GET /api/images`：分页查询图片
- `GET /api/images/all`：查询全部图片
- `POST /api/images/upload`：单图上传
- `POST /api/images/batch-upload`：批量上传
- `PATCH /api/images/{image_id}`：更新图片归属图集
- `POST /api/images/{image_id}/trash`：移入回收站

### 图集

- `GET /api/galleries`：分页查询图集
- `GET /api/galleries/all`：查询全部图集
- `POST /api/galleries`：创建图集
- `PATCH /api/galleries/{gallery_id}`：更新图集
- `DELETE /api/galleries/{gallery_id}`：删除图集

### 历史

- `GET /api/history`：查询搜索历史
- `GET /api/history/{session_id}`：查看单个历史 session
- `PATCH /api/history/{session_id}`：重命名历史记录
- `DELETE /api/history/{session_id}`：删除历史记录

### 回收站

- `GET /api/trash/images`：分页查询回收站图片
- `DELETE /api/trash`：清空回收站

## 前端页面能力

- `/`：搜索首页
- `/search/:sessionId`：搜索结果页
- `/search/:sessionId/:imageid`：搜索上下文中的图片详情
- `/gallery`：图集列表
- `/gallery/:galleryId`：图集详情
- `/all-images`：所有图片
- `/history`：历史搜索
- `/trash`：回收站

## 常见问题

### 1. 前端能打开，但接口请求失败

检查后端是否已在 `http://localhost:8000` 启动，或确认前端是否正确设置了 `VITE_BACKEND_URL`。

### 2. 搜索结果为空

常见原因：

- 图库中还没有上传图片
- CLIP 模型尚未成功加载
- 向量索引尚未建立
- 相似度阈值过滤后没有命中结果

### 3. 首次启动较慢

首次加载 CLIP 模型和首次构建前端资源会明显更慢，属于正常现象。

## 开发建议

- 在导入大量图片前，先用少量样本验证检索质量。
- 若需要迁移数据库结构，可结合 `aerich` 管理 Tortoise ORM 迁移。
- 生产部署前建议补充权限控制、上传大小限制、对象存储和日志归档方案。

## 补充说明

前端说明文档见 `frontend/README.md`，包含页面结构、环境变量和前端开发约定。
