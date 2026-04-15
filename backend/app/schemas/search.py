from pydantic import BaseModel
from typing import Optional


class SearchBestMatchRequest(BaseModel):
    type: str  # text | image | mixed
    text_query: Optional[str] = None
    image_url: Optional[str] = None
    search_session_id: Optional[str] = None
    top_k: int = 24
    search_strategy: str = "balanced"
