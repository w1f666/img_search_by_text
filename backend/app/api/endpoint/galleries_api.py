from fastapi import APIRouter, Query
from typing import Optional
from db.sql_db.models.gallery import Gallery
from db.sql_db.models.image import Image
from app.schemas.gallery import (
    CreateGalleryRequest,
    UpdateGalleryRequest,
    GalleryResponse,
    gallery_to_response,
)
from app.schemas.common import build_pagination_meta

router = APIRouter()


async def _sync_gallery_counts(gallery_id: int | None = None):
    """Recalculate image_count and cover_image_url for one or all galleries."""
    if gallery_id is not None:
        galleries = await Gallery.filter(id=gallery_id)
    else:
        galleries = await Gallery.all()
    for g in galleries:
        count = await Image.filter(gallery_id=g.id, status="active").count()
        first_img = await Image.filter(gallery_id=g.id, status="active").first()
        g.image_count = count
        g.cover_image_url = (first_img.thumbnail_url or first_img.image_url) if first_img else None
        await g.save()


@router.get("/all")
async def list_all_galleries():
    galleries = await Gallery.all().order_by("-created_at")
    return {"items": [gallery_to_response(g) for g in galleries]}


@router.get("")
async def list_galleries_page(
    start: int = Query(1),
    end: int = Query(12),
    query: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
):
    qs = Gallery.all()

    if query:
        qs = qs.filter(name__icontains=query)

    total = await qs.count()

    order_prefix = "-" if sort_order == "desc" else ""
    order_field = sort_by if sort_by in ("name", "image_count", "created_at") else "created_at"
    qs = qs.order_by(f"{order_prefix}{order_field}")

    offset = max(0, start - 1)
    limit = max(1, end - start + 1)
    items = await qs.offset(offset).limit(limit)

    meta = build_pagination_meta(total, start, end, len(items))
    return {"items": [gallery_to_response(g) for g in items], "meta": meta.model_dump()}


@router.post("")
async def create_gallery(payload: CreateGalleryRequest):
    g = await Gallery.create(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else "",
    )
    return gallery_to_response(g).model_dump()


@router.patch("/{gallery_id}")
async def update_gallery(gallery_id: int, payload: UpdateGalleryRequest):
    g = await Gallery.get_or_none(id=gallery_id)
    if not g:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Gallery not found")

    if payload.name is not None:
        g.name = payload.name.strip()
    if payload.description is not None:
        g.description = payload.description.strip()
    await g.save()

    return gallery_to_response(g).model_dump()


@router.delete("/{gallery_id}")
async def delete_gallery(gallery_id: int):
    g = await Gallery.get_or_none(id=gallery_id)
    if not g:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Gallery not found")

    moved = await Image.filter(gallery_id=gallery_id, status="active").count()
    await Image.filter(gallery_id=gallery_id).update(gallery_id=None)
    await g.delete()

    return {"gallery_id": str(gallery_id), "deleted": True, "moved_to_ungrouped_count": moved}
