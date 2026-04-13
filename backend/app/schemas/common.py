from pydantic import BaseModel
from typing import Optional


class PaginationParams(BaseModel):
    start: int = 1
    end: int = 12


class PaginationMeta(BaseModel):
    requested_start: int
    requested_end: int
    returned_start: int
    returned_end: int
    total: int
    page: int
    page_size: int
    total_pages: int
    has_previous: bool
    has_next: bool


def build_pagination_meta(
    total: int, start: int, end: int, returned_count: int
) -> PaginationMeta:
    page_size = max(1, end - start + 1)
    returned_start = start if returned_count > 0 else 0
    returned_end = (start + returned_count - 1) if returned_count > 0 else 0
    page = ((start - 1) // page_size) + 1
    total_pages = 0 if total == 0 else -(-total // page_size)

    return PaginationMeta(
        requested_start=start,
        requested_end=end,
        returned_start=returned_start,
        returned_end=returned_end,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_previous=start > 1 and total > 0,
        has_next=end < total,
    )
