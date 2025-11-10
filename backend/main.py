# backend/app/main.py
import uvicorn
from fastapi import FastAPI
from tortoise.contrib.fastapi import register_tortoise
from db.sql_db.config.settings import TORTOISE_ORM
from app.api.endpoint.img_manager import img_manage_router 
from app.api.endpoint.img_search import img_search_router

# 创建 FastAPI 应用实例
app = FastAPI(title="Image Search Backend")

app.include_router(img_manage_router,prefix="/management", tags=["Image Management"])
app.include_router(img_search_router,prefix="/search", tags=["Image Search"])

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
