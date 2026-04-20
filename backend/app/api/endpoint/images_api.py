import io
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from PIL import Image as PILImage
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from tortoise.transactions import in_transaction
from db.sql_db.models.image import Image
from db.sql_db.models.gallery import Gallery

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_DIR = UPLOAD_DIR / "thumbnails"
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

THUMBNAIL_MAX_SIZE = (400, 400)
THUMBNAIL_QUALITY = 80


def _generate_thumbnail(source_path: Path, thumb_name: str) -> str | None:
    """Generate a thumbnail and return its URL path, or None on failure."""
    try:
        with PILImage.open(source_path) as im:
            im.thumbnail(THUMBNAIL_MAX_SIZE, PILImage.Resampling.LANCZOS)
            thumb_path = THUMBNAIL_DIR / thumb_name
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGB")
            im.save(thumb_path, "JPEG", quality=THUMBNAIL_QUALITY)
            return f"/uploads/thumbnails/{thumb_name}"
    except Exception as e:
        logger.warning(f"Thumbnail generation failed: {e}")
        return None
from app.schemas.image import (
    CreateImageRequest,
    UpdateImageRequest,
    AutoClassifyRequest,
    AutoClassifyResponse,
    AutoClassifyResultItem,
    BatchTrashRequest,
    ImageResponse,
    image_to_response,
)
from app.schemas.common import build_pagination_meta
from app.core.clip_handler import CLIPHandler
from db.vector_db.client import collection

router = APIRouter()


def _parse_size_label(label: str) -> int:
    m = re.match(r"^([\d.]+)\s*(KB|MB|GB)$", label.strip(), re.IGNORECASE)
    if not m:
        return 0
    amount = float(m.group(1))
    unit = m.group(2).upper()
    if unit == "KB":
        return round(amount * 1024)
    if unit == "MB":
        return round(amount * 1024 * 1024)
    return round(amount * 1024 * 1024 * 1024)


@router.get("/all")
async def list_all_images(
    status: Optional[str] = Query("active"),
    gallery_id: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
):
    qs = Image.all()
    if status:
        qs = qs.filter(status=status)
    if gallery_id is not None:
        if gallery_id == "null" or gallery_id == "":
            qs = qs.filter(gallery_id__isnull=True)
        else:
            qs = qs.filter(gallery_id=int(gallery_id))
    if query:
        qs = qs.filter(filename__icontains=query)

    items = await qs.order_by("-created_at")
    return {"items": [image_to_response(img).model_dump() for img in items]}


@router.get("")
async def list_images_page(
    start: int = Query(1),
    end: int = Query(20),
    status: Optional[str] = Query("active"),
    gallery_id: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
):
    qs = Image.all()
    if status:
        qs = qs.filter(status=status)
    if gallery_id is not None:
        if gallery_id == "null" or gallery_id == "":
            qs = qs.filter(gallery_id__isnull=True)
        else:
            qs = qs.filter(gallery_id=int(gallery_id))
    if query:
        qs = qs.filter(filename__icontains=query)

    total = await qs.count()

    order_prefix = "-" if sort_order == "desc" else ""
    field_map = {"created_at": "created_at", "filename": "filename", "size_bytes": "size_bytes"}
    order_field = field_map.get(sort_by, "created_at")
    qs = qs.order_by(f"{order_prefix}{order_field}")

    offset = max(0, start - 1)
    limit = max(1, end - start + 1)
    items = await qs.offset(offset).limit(limit)

    meta = build_pagination_meta(total, start, end, len(items))
    return {
        "items": [image_to_response(img).model_dump() for img in items],
        "meta": meta.model_dump(),
    }


@router.post("")
async def create_image(payload: CreateImageRequest):
    gid = None
    if payload.gallery_id is not None:
        try:
            gid = int(payload.gallery_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid gallery_id")
    img = await Image.create(
        filename=payload.filename.strip(),
        image_url=payload.url.strip(),
        thumbnail_url=payload.url.strip(),
        size_bytes=_parse_size_label(payload.size_label),
        size_label=payload.size_label.strip(),
        gallery_id=gid,
        status="active",
        source="upload",
    )

    if gid:
        await _sync_gallery_count(gid)

    return image_to_response(img).model_dump()


def _format_size_label(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / 1024:.1f} KB"


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".svg"}


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    gallery_id: Optional[str] = Form(None),
):
    if not file.filename:
        raise HTTPException(status_code=422, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    size_bytes = len(content)
    size_label = _format_size_label(size_bytes)

    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / unique_name

    gid = None
    if gallery_id and gallery_id not in ("null", ""):
        try:
            gid = int(gallery_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid gallery_id")

    image_url = f"/uploads/{unique_name}"
    thumb_name = f"{uuid.uuid4().hex}.jpg"
    written_files: list[Path] = []

    try:
        dest.write_bytes(content)
        written_files.append(dest)

        thumbnail_url = _generate_thumbnail(dest, thumb_name) or image_url
        if thumbnail_url != image_url:
            written_files.append(THUMBNAIL_DIR / thumb_name)

        async with in_transaction():
            img = await Image.create(
                filename=file.filename,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                size_bytes=size_bytes,
                size_label=size_label,
                gallery_id=gid,
                status="active",
                source="upload",
            )

        # Index into vector DB for search
        try:
            clip = CLIPHandler()
            vec = clip.image_extract(str(dest))
            if vec:
                collection.upsert(ids=[str(img.id)], embeddings=[vec])
            else:
                logger.warning(f"CLIP returned None for image {img.id}: {dest}")
        except Exception as e:
            logger.error(f"Vector indexing failed for image {img.id}: {e}")

        if gid:
            await _sync_gallery_count(gid)

        return image_to_response(img).model_dump()
    except Exception:
        # Cleanup written files on failure
        for f in written_files:
            try:
                f.unlink(missing_ok=True)
            except OSError:
                pass
        raise


@router.post("/batch-upload")
async def batch_upload_images(
    files: list[UploadFile] = File(...),
    gallery_id: Optional[str] = Form(None),
):
    gid = None
    if gallery_id and gallery_id not in ("null", ""):
        try:
            gid = int(gallery_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid gallery_id")

    results = []
    all_written_files: list[Path] = []

    try:
        for file in files:
            if not file.filename:
                continue
            ext = Path(file.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue

            content = await file.read()
            size_bytes = len(content)
            size_label = _format_size_label(size_bytes)

            unique_name = f"{uuid.uuid4().hex}{ext}"
            dest = UPLOAD_DIR / unique_name
            dest.write_bytes(content)
            all_written_files.append(dest)

            image_url = f"/uploads/{unique_name}"
            thumb_name = f"{uuid.uuid4().hex}.jpg"
            thumbnail_url = _generate_thumbnail(dest, thumb_name) or image_url
            if thumbnail_url != image_url:
                all_written_files.append(THUMBNAIL_DIR / thumb_name)

            async with in_transaction():
                img = await Image.create(
                    filename=file.filename,
                    image_url=image_url,
                    thumbnail_url=thumbnail_url,
                    size_bytes=size_bytes,
                    size_label=size_label,
                    gallery_id=gid,
                    status="active",
                    source="upload",
                )

            # Index into vector DB for search
            try:
                clip = CLIPHandler()
                vec = clip.image_extract(str(dest))
                if vec:
                    collection.upsert(ids=[str(img.id)], embeddings=[vec])
                else:
                    logger.warning(f"CLIP returned None for image {img.id}: {dest}")
            except Exception as e:
                logger.error(f"Vector indexing failed for image {img.id}: {e}")

            results.append(image_to_response(img).model_dump())

        if gid:
            await _sync_gallery_count(gid)

        return {"items": results, "uploaded_count": len(results)}
    except Exception:
        # Cleanup all written files when batch fails
        for f in all_written_files:
            try:
                f.unlink(missing_ok=True)
            except OSError:
                pass
        # Cleanup any DB records that were already created
        for result in results:
            try:
                img_record = await Image.get_or_none(id=int(result["id"]))
                if img_record:
                    await img_record.delete()
                collection.delete(ids=[result["id"]])
            except Exception:
                pass
        raise


@router.patch("/{image_id}")
async def update_image(image_id: int, payload: UpdateImageRequest):
    img = await Image.get_or_none(id=image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    old_gallery_id = img.gallery_id
    if payload.gallery_id is not None:
        try:
            img.gallery_id = int(payload.gallery_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid gallery_id")
    else:
        img.gallery_id = None
    await img.save()

    if old_gallery_id:
        await _sync_gallery_count(old_gallery_id)
    if img.gallery_id:
        await _sync_gallery_count(img.gallery_id)

    return {
        "id": str(img.id),
        "gallery_id": str(img.gallery_id) if img.gallery_id else None,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.post("/{image_id}/trash")
async def move_to_trash(image_id: int):
    img = await Image.get_or_none(id=image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    now = datetime.utcnow()
    img.status = "trash"
    img.deleted_at = now
    await img.save()

    if img.gallery_id:
        await _sync_gallery_count(img.gallery_id)

    return {"id": str(img.id), "status": "trash", "deleted_at": now.isoformat()}


@router.post("/batch-trash")
async def batch_trash(payload: BatchTrashRequest):
    ids = [int(i) for i in payload.image_ids]
    now = datetime.utcnow()
    count = await Image.filter(id__in=ids).update(status="trash", deleted_at=now)
    return {"image_ids": payload.image_ids, "deleted_count": count}


@router.post("/{image_id}/restore")
async def restore_image(image_id: int):
    img = await Image.get_or_none(id=image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    img.status = "active"
    img.deleted_at = None
    await img.save()

    if img.gallery_id:
        await _sync_gallery_count(img.gallery_id)

    return {"id": str(img.id), "status": "active", "deleted_at": None}


@router.delete("/{image_id}")
async def permanently_delete(image_id: int):
    img = await Image.get_or_none(id=image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    gid = img.gallery_id
    # Remove from vector DB
    try:
        collection.delete(ids=[str(image_id)])
    except Exception:
        pass
    await img.delete()

    if gid:
        await _sync_gallery_count(gid)

    return {"id": str(image_id), "deleted": True}


@router.get("/{image_id}/detail-context")
async def image_detail_context(
    image_id: int,
    gallery_id: Optional[str] = Query(None),
):
    img = await Image.get_or_none(id=image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    qs = Image.filter(status="active")
    if gallery_id:
        qs = qs.filter(gallery_id=int(gallery_id))
    ordered = await qs.order_by("-created_at")

    idx = next((i for i, x in enumerate(ordered) if x.id == image_id), -1)
    prev_img = ordered[idx - 1] if idx > 0 else None
    next_img = ordered[idx + 1] if 0 <= idx < len(ordered) - 1 else None

    related_qs = Image.filter(status="active").exclude(id=image_id)
    if img.gallery_id:
        related_qs = related_qs.filter(gallery_id=img.gallery_id)
    related = await related_qs.limit(4)

    return {
        "image": image_to_response(img).model_dump(),
        "previous_image": image_to_response(prev_img).model_dump() if prev_img else None,
        "next_image": image_to_response(next_img).model_dump() if next_img else None,
        "related_images": [image_to_response(r).model_dump() for r in related],
    }


@router.post("/auto-classify")
async def auto_classify(payload: AutoClassifyRequest):
    galleries = await Gallery.all()
    if not galleries:
        return AutoClassifyResponse(classified=[], skipped=[], total_processed=0).model_dump()

    if payload.scope == "selected" and payload.image_ids:
        ids = [int(i) for i in payload.image_ids]
        target_images = await Image.filter(id__in=ids)
    else:
        target_images = await Image.filter(status="active", gallery_id__isnull=True)

    if not target_images:
        return AutoClassifyResponse(classified=[], skipped=[], total_processed=0).model_dump()

    clip = CLIPHandler()
    gallery_vectors = {}
    for g in galleries:
        vec = clip.text_extract(g.name)
        if vec:
            gallery_vectors[g.id] = {"name": g.name, "vector": vec}

    if not gallery_vectors:
        return AutoClassifyResponse(
            classified=[], skipped=[str(img.id) for img in target_images], total_processed=len(target_images)
        ).model_dump()

    classified: list[AutoClassifyResultItem] = []
    skipped: list[str] = []

    for img in target_images:
        img_vec = None
        try:
            results = collection.get(ids=[str(img.id)], include=["embeddings"])
            if results and results["embeddings"] is not None and len(results["embeddings"]) > 0:
                img_vec = results["embeddings"][0]
        except Exception:
            pass

        if img_vec is None and img.image_url:
            fallback_path = str(UPLOAD_DIR / os.path.basename(img.image_url))
            if os.path.exists(fallback_path):
                img_vec = clip.image_extract(fallback_path)

        if img_vec is None:
            skipped.append(str(img.id))
            continue

        best_gid = None
        best_score = -1.0
        import numpy as np
        img_np = np.array(img_vec)
        for gid, gdata in gallery_vectors.items():
            g_np = np.array(gdata["vector"])
            cosine = float(np.dot(img_np, g_np) / (np.linalg.norm(img_np) * np.linalg.norm(g_np) + 1e-9))
            if cosine > best_score:
                best_score = cosine
                best_gid = gid

        if best_gid is not None and best_score >= 0.2:
            img.gallery_id = best_gid
            await img.save()
            classified.append(
                AutoClassifyResultItem(
                    image_id=str(img.id),
                    gallery_id=str(best_gid),
                    gallery_name=gallery_vectors[best_gid]["name"],
                    confidence=round(best_score, 2),
                )
            )
        else:
            skipped.append(str(img.id))

    for g in galleries:
        await _sync_gallery_count(g.id)

    return AutoClassifyResponse(
        classified=classified, skipped=skipped, total_processed=len(target_images)
    ).model_dump()


async def _sync_gallery_count(gallery_id: int):
    g = await Gallery.get_or_none(id=gallery_id)
    if not g:
        return
    count = await Image.filter(gallery_id=gallery_id, status="active").count()
    first_img = await Image.filter(gallery_id=gallery_id, status="active").first()
    g.image_count = count
    g.cover_image_url = (first_img.thumbnail_url or first_img.image_url) if first_img else None
    await g.save()


@router.post("/generate-thumbnails")
async def generate_thumbnails_for_existing():
    """Backfill thumbnails for images that don't have a real thumbnail yet."""
    images = await Image.filter(status="active")
    generated = 0
    for img in images:
        if img.thumbnail_url and img.thumbnail_url != img.image_url:
            continue  # already has a real thumbnail
        if not img.image_url:
            continue
        source_path = UPLOAD_DIR / os.path.basename(img.image_url)
        if not source_path.exists():
            continue
        thumb_name = f"{uuid.uuid4().hex}.jpg"
        thumb_url = _generate_thumbnail(source_path, thumb_name)
        if thumb_url:
            img.thumbnail_url = thumb_url
            await img.save()
            generated += 1
    return {"generated": generated, "total": len(images)}
