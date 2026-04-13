from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ImageResponse(BaseModel):
    id: str
    filename: str
    image_url: str
    thumbnail_url: Optional[str] = None
    size_bytes: int
    size_label: str
    created_at: str
    gallery_id: Optional[str] = None
    status: str
    source: str
    deleted_at: Optional[str] = None


class CreateImageRequest(BaseModel):
    filename: str
    size_label: str
    url: str
    gallery_id: Optional[int | str] = None


class UpdateImageRequest(BaseModel):
    gallery_id: Optional[int | str] = None


class AutoClassifyRequest(BaseModel):
    image_ids: Optional[list[str]] = None
    scope: str = "all-unclassified"


class AutoClassifyResultItem(BaseModel):
    image_id: str
    gallery_id: str
    gallery_name: str
    confidence: float


class AutoClassifyResponse(BaseModel):
    classified: list[AutoClassifyResultItem]
    skipped: list[str]
    total_processed: int


class BatchTrashRequest(BaseModel):
    image_ids: list[str]


def image_to_response(img) -> ImageResponse:
    return ImageResponse(
        id=str(img.id),
        filename=img.filename,
        image_url=img.image_url,
        thumbnail_url=img.thumbnail_url,
        size_bytes=img.size_bytes,
        size_label=img.size_label,
        created_at=img.created_at.isoformat() if isinstance(img.created_at, datetime) else str(img.created_at),
        gallery_id=str(img.gallery_id) if img.gallery_id is not None else None,
        status=img.status,
        source=img.source,
        deleted_at=img.deleted_at.isoformat() if img.deleted_at else None,
    )
