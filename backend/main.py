# backend/app/main.py
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from db.sql_db.config.settings import TORTOISE_ORM
from app.api.endpoint.img_manager import img_manage_router 
from app.api.endpoint.img_search import img_search_router
from app.api.endpoint.gallery_manager import gallery_router

app = FastAPI(title="Image Search Backend")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(img_manage_router,prefix="/management", tags=["Image Management"])
app.include_router(img_search_router,prefix="/search", tags=["Image Search"])
app.include_router(gallery_router, prefix="/gallery", tags=["Gallery"])

# 创建 FastAPI 应用实例

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

# 使用 register_tortoise 将 Tortoise-ORM 注册到 FastAPI 应用
register_tortoise(
    app=app,
    config=TORTOISE_ORM,
    generate_schemas=True,  # 启动时自动创建数据库表
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8080, reload=True, workers=1)
