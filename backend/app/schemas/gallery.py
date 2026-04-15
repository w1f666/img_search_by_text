from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GalleryResponse(BaseModel):
    id: str
    name: str
    description: str
    cover_image_url: Optional[str] = None
    image_count: int
    created_at: str
    updated_at: str


class CreateGalleryRequest(BaseModel):
    name: str
    description: str = ""


class UpdateGalleryRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


def gallery_to_response(g) -> GalleryResponse:
    return GalleryResponse(
        id=str(g.id),
        name=g.name,
        description=g.description or "",
        cover_image_url=g.cover_image_url,
        image_count=g.image_count,
        created_at=g.created_at.isoformat() if isinstance(g.created_at, datetime) else str(g.created_at),
        updated_at=g.updated_at.isoformat() if isinstance(g.updated_at, datetime) else str(g.updated_at),
    )
