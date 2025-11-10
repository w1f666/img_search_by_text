### 项目结构

<<<<<<< HEAD
.
├── main.py                    # 根层示例入口（占位）
├── pyproject.toml             # 项目信息与 aerich 迁移配置
├── requirements.txt           # 依赖
├── README.md
=======
    .
├── main.py                    # 根层示例入口（占位）
├── pyproject.toml             # 项目信息与 aerich 迁移配置
├── requirements.txt           # 依赖（目前为空，需补充 FastAPI/ChromaDB 等）
├── README.md
├── test.py                    # 手写 socket 示例（与主服务无直接关联）
>>>>>>> 00a60d7 (更新项目依赖，阐述项目结构)
└── backend/
    ├── main.py                # FastAPI 应用启动文件
    ├── app/
    │   ├── api/
<<<<<<< HEAD
    │   │   ├── api_manger.py  	# api自动注册，目前暂时弃用，考虑到手动注册方便添加注释写明模块作用
    │   │   └── endpoint/
    │   │       ├── img_manager.py  	# 图片批量添加接口
    │   │       └── img_search.py   	# 文本/图片检索接口
=======
    │   │   ├── api_manger.py  # 旧式 Blueprint 注册工具（FastAPI 中暂未使用）
    │   │   └── endpoint/
    │   │       ├── img_manager.py  # 图片批量添加接口
    │   │       └── img_search.py   # 文本/图片检索接口
>>>>>>> 00a60d7 (更新项目依赖，阐述项目结构)
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
<<<<<<< HEAD

### 核心模块职责

* [clip_handler.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  加载中文兼容的 `ViT-L-14-336` CLIP 模型（自动选择 GPU/CPU），提供：
  * [image_extract(image_path)](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html): 返回归一化图像特征向量
  * [text_extract(text)](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html): 返回归一化文本特征向量
* [img_process.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  封装单张图片处理：计算 `MD5`、`pHash`、调用 CLIP 得到 [clip_vector](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
* [db_handler.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  * [add_img_to_database(...)](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html): 防重复（MD5，严格模式下可检查 pHash），写入 SQLite + 向量写入 ChromaDB
  * [search_similar_images(vector, top_k)](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html): 用传入向量查询相似图片返回结果列表
* [img_manager.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  POST `/management/add`：批量根据文件路径入库，并返回成功与重复列表
* [img_search.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  * POST `/search/search_by_text`：文本检索图片
  * POST `/search/search_by_image`：上传图片检索（当前返回结果占位，需补充）
* [image.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  图片表字段：路径、文件哈希、感知哈希、描述、软删除标记、上传时间
* [gallery.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  画廊多对多结构（尚未完全使用）
* [client.py](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  初始化 ChromaDB 持久化客户端与 `image_vectors` 集合（余弦相似度）


| 目录                                                                                                                             | 用途                           |
| -------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| [endpoint](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)   | 对外 HTTP 路由                 |
| [core](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)       | 模型、图片处理与数据库协调逻辑 |
| [sql_db](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)     | 关系型数据（图片元信息）       |
| [vector_db](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)  | 向量检索持久化                 |
| [clip_model](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | CLIP 模型缓存                  |
| [gallery](vscode-file://vscode-app/d:/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)    | 原始图片文件（待入库或展示）   |
=======
>>>>>>> 00a60d7 (更新项目依赖，阐述项目结构)
