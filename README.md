### 项目结构

```
.
├── main.py                    # 根层示例入口（占位）
├── pyproject.toml             # 项目信息与 aerich 迁移配置
├── requirements.txt           # 依赖
├── README.md
└── backend/
    ├── main.py                # FastAPI 应用启动文件
    ├── app/
    │   ├── api/
    │   │   ├── api_manger.py  # 自动api注册，暂未实现，考虑弃用
    │   │   └── endpoint/
    │   │       ├── img_manager.py  # 图片批量添加接口
    │   │       └── img_search.py   # 文本/图片检索接口
    │   └── core/
    │       ├── clip_handler.py     # CLIP 模型加载与向量抽取
    │       ├── db_handler.py       # 入库与向量检索逻辑（协调 SQLite + ChromaDB）
    │       └── img_process.py      # 图片处理：MD5、pHash、向量封装
    ├── db/
    │   ├── sql_db/
    │   │   ├── config/settings.py  # Tortoise ORM SQLite 连接配置
    │   │   ├── migrations/         # Aerich 迁移脚本目录
    │   │   │   └── models/0_xxx.py # 迁移版本文件
    │   │   ├── models/
    │   │   │   ├── image.py        # 图片元数据模型（哈希、路径、描述等）
    │   │   │   └── gallery.py      # 画廊模型（多对多关系占位）
    │   │   └── storage/            # SQLite 实际文件存放位置
    │   └── vector_db/
    │       ├── client.py           # ChromaDB 客户端与向量集合初始化
    │       └── storage/            # ChromaDB 持久化目录
    └── resource/
        ├── clip_model/             # 本地缓存/下载的 CLIP 模型
        └── gallery/                # （预留）图片文件资源目录
```

### 核心模块职责

| 目录       | 用途                           |
| ---------- | ------------------------------ |
| endpoint   | 对外 HTTP 路由                 |
| core       | 模型、图片处理与数据库协调逻辑 |
| sql_db     | 关系型数据（图片元信息）       |
| vector_db  | 向量检索持久化                 |
| clip_model | CLIP 模型缓存                  |
| gallery    | 原始图片文件（待入库或展示）   |
