# backend/app/main.py
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from tortoise.contrib.fastapi import register_tortoise
from db.sql_db.config.settings import TORTOISE_ORM
from app.api.endpoint.galleries_api import router as galleries_router
from app.api.endpoint.images_api import router as images_router
from app.api.endpoint.search_api import router as search_router
from app.api.endpoint.history_api import router as history_router
from app.api.endpoint.trash_api import router as trash_router

app = FastAPI(title="Image Search Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

SEARCH_UPLOAD_DIR = Path(__file__).resolve().parent / "search_uploads"
SEARCH_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/search_uploads", StaticFiles(directory=str(SEARCH_UPLOAD_DIR)), name="search_uploads")

app.include_router(galleries_router, prefix="/api/galleries", tags=["Galleries"])
app.include_router(images_router, prefix="/api/images", tags=["Images"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])
app.include_router(history_router, prefix="/api/history", tags=["History"])
app.include_router(trash_router, prefix="/api/trash", tags=["Trash"])


@app.get("/")
def read_root():
    return {"message": "Backend is running!"}


register_tortoise(
    app=app,
    config=TORTOISE_ORM,
    generate_schemas=True,
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True, workers=1)
