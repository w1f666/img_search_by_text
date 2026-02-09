from fastapi import APIRouter, HTTPException
from typing import List
from app.core.db_handler.gallery_handler import (
    create_gallery,
    list_galleries,
    get_gallery_by_id,
    update_gallery,
    delete_gallery,
    restore_gallery,
    list_recycle_galleries,
    hard_delete_all_galleries
)

gallery_router = APIRouter()


@gallery_router.post("/create")
async def create_gallery_api(name: str, description: str | None = None):
    gallery = await create_gallery(name=name, description=description)

    return {
        "msg": "gallery created",
        "id": gallery.id,
        "name": gallery.name,
        "description": gallery.description,
        "image_count": gallery.image_count,
        "created_time": gallery.created_time
    }


@gallery_router.get("/list")
async def list_galleries_api():
    galleries = await list_galleries()

    return {
        "msg": "success",
        "data": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "image_count": g.image_count,
                "created_time": g.created_time
            }
            for g in galleries
        ]
    }


@gallery_router.get("/{gallery_id}")
async def get_gallery_detail(gallery_id: int):
    gallery = await get_gallery_by_id(gallery_id)
    if not gallery or gallery.is_deleted:
        raise HTTPException(status_code=404, detail="Gallery not found")

    return {
        "msg": "success",
        "data": {
            "id": gallery.id,
            "name": gallery.name,
            "description": gallery.description,
            "image_count": gallery.image_count,
            "created_time": gallery.created_time
        }
    }


@gallery_router.put("/update/{gallery_id}")
async def update_gallery_api(
    gallery_id: int,
    name: str | None = None,
    description: str | None = None
):
    gallery = await update_gallery(
        gallery_id=gallery_id,
        name=name,
        description=description
    )

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    return {
        "msg": "gallery updated",
        "id": gallery.id,
        "name": gallery.name,
        "description": gallery.description
    }


@gallery_router.delete("/delete/{gallery_id}")
async def delete_gallery_api(gallery_id: int):
    if gallery_id == 1:
        raise HTTPException(
            status_code=400,
            detail="Recycle Bin cannot be deleted"
        )

    try:
        await delete_gallery(gallery_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "msg": "gallery moved to recycle bin",
        "gallery_id": gallery_id
    }



@gallery_router.post("/restore/{gallery_id}")
async def restore_gallery_api(gallery_id: int):
    success = await restore_gallery(gallery_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Gallery not found in recycle bin"
        )

    return {
        "msg": "gallery restored",
        "gallery_id": gallery_id
    }

@gallery_router.get("/recycle/list")
async def list_recycle_galleries_api():
    galleries = await list_recycle_galleries()

    return {
        "msg": "success",
        "data": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "created_time": g.created_time,
            }
            for g in galleries
        ]
    }

