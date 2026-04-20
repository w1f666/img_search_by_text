# Frontend README

这是图片检索系统的前端应用，基于 React、TypeScript 和 Vite 构建，负责搜索交互、图片浏览、图集管理、历史记录与回收站页面。

## 技术栈

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- TanStack Query 5
- Axios
- Tailwind CSS 4
- Framer Motion
- Radix UI / shadcn 风格组件

## 主要能力

- 支持文本搜图、以图搜图和混合搜索
- 支持搜索结果会话化展示，URL 中保留 sessionId
- 支持图片详情页的上一张、下一张与相关推荐
- 支持图集创建、编辑、删除和图片归类
- 支持所有图片列表、历史记录和回收站页面
- 使用 React Query 管理服务端状态，减少手写缓存同步逻辑
- 页面级组件按路由懒加载，降低首屏体积

## 开发命令

在 `frontend` 目录执行：

```bash
npm install
npm run dev
```

其他常用命令：

```bash
npm run build
npm run lint
npm run preview
```

## 环境变量

项目通过 `import.meta.env` 读取环境变量。

当前使用到的变量：

```bash
VITE_BACKEND_URL=http://localhost:8000
```

说明：

- 未设置时，前端默认请求 `http://localhost:8000`
- 本地联调时通常不需要额外配置

## 路由结构

前端主要路由如下：

- `/`：搜索首页
- `/search/:sessionId`：搜索结果列表
- `/search/:sessionId/:imageid`：搜索结果中的图片详情
- `/gallery`：图集列表
- `/gallery/:galleryId`：图集下图片列表
- `/gallery/:galleryId/:imageid`：图集上下文中的图片详情
- `/all-images`：所有图片
- `/all-images/:imageid`：全量图片上下文中的图片详情
- `/history`：搜索历史
- `/trash`：回收站

## 目录说明

```text
src/
├── components/          # 通用组件与基础 UI
├── hooks/               # 复用 hooks
├── Layout/              # 页面布局
├── lib/                 # API 请求、React Query、工具方法
├── pages/               # 页面与页面级组合组件
├── router/              # 路由定义
└── types/               # 前端类型定义
```

重点目录说明：

- `src/lib/request.ts`：Axios 实例与统一错误处理
- `src/lib/media-api.ts`：前后端接口映射与数据转换层
- `src/lib/media-query.ts`：React Query hooks
- `src/router/index.tsx`：路由表、懒加载与错误边界
- `src/pages/`：按业务拆分的页面实现

## 与后端的接口关系

前端通过 `src/lib/media-api.ts` 调用后端接口，主要覆盖以下模块：

- 搜索：`/api/search/*`
- 图片：`/api/images/*`
- 图集：`/api/galleries/*`
- 历史：`/api/history/*`
- 回收站：`/api/trash/*`

接口返回后，会先转换为前端统一的数据结构，再交给页面使用。

## 别名与构建约定

- 使用 `@/` 指向 `src/`
- TypeScript `paths` 与 Vite `resolve.alias` 已保持一致
- 页面组件采用懒加载，减少初始包体积
- 构建阶段会将框架层和动画相关代码拆分到独立 chunk

## 页面说明

### 搜索页

- 初始状态显示搜索入口
- 搜索后进入带 `sessionId` 的结果页
- 支持文本、图片、混合检索三种模式

### 图集页

- 展示图集卡片与封面
- 支持新增、编辑、删除图集
- 支持进入图集查看归属图片

### 所有图片页

- 分页浏览全部图片
- 支持上传、筛选、查看详情、移入回收站

### 历史页

- 展示历史搜索 session
- 支持关键字搜索、重命名、删除

### 回收站页

- 展示已删除图片
- 支持清空回收站

## 开发建议

- 新增接口时，优先在 `src/lib/media-api.ts` 做数据适配，不要把后端字段格式直接散落在页面里。
- 需要缓存服务端数据时，优先放进 React Query hooks，而不是页面本地状态。
- 如果增加新页面，优先保持与现有路由、面包屑和错误边界结构一致。

## 常见问题

### 1. 页面能打开，但看不到数据

通常是后端未启动，或 `VITE_BACKEND_URL` 配置错误。

### 2. 图片能上传，但看不到缩略图

需要确认后端的 `/uploads` 静态目录是否正常挂载。

### 3. TypeScript 提示 `baseUrl` 已弃用

当前项目已经改为仅使用 `paths` 配合 Vite alias，无需再添加 `baseUrl`。

## 相关文档

项目整体说明见根目录 `README.md`。
