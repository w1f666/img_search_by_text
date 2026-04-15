from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime
from db.sql_db.models.image import Image
from app.schemas.image import image_to_response
from app.schemas.common import build_pagination_meta

router = APIRouter()


@router.get("/images")
async def list_trash_images(
    start: int = Query(1),
    end: int = Query(20),
    query: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("deleted_at"),
    sort_order: Optional[str] = Query("desc"),
):
    qs = Image.filter(status="trash")
    if query:
        qs = qs.filter(filename__icontains=query)

    total = await qs.count()

    order_prefix = "-" if sort_order == "desc" else ""
    field = sort_by if sort_by in ("deleted_at", "created_at", "filename") else "deleted_at"
    qs = qs.order_by(f"{order_prefix}{field}")

    offset = max(0, start - 1)
    limit = max(1, end - start + 1)
    items = await qs.offset(offset).limit(limit)

    meta = build_pagination_meta(total, start, end, len(items))
    return {
        "items": [image_to_response(img).model_dump() for img in items],
        "meta": meta.model_dump(),
    }


@router.delete("")
async def clear_trash():
    count = await Image.filter(status="trash").count()
    await Image.filter(status="trash").delete()
    return {"deleted_count": count}
