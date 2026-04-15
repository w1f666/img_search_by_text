import uuid
from pathlib import Path
from typing import Optional, Dict, List

from fastapi import APIRouter, UploadFile, File, Form
from db.sql_db.models.image import Image
from db.sql_db.models.search_session import SearchSession, SearchTurn
from app.schemas.search import SearchBestMatchRequest
from app.schemas.image import image_to_response
from app.core.clip_handler import CLIPHandler
from db.vector_db.client import collection

router = APIRouter()

SEARCH_UPLOAD_DIR = Path(__file__).resolve().parents[3] / "search_uploads"
SEARCH_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory cache for top-k results per session
_results_cache: Dict[str, List[int]] = {}


async def _save_search_image(image_file: UploadFile) -> str | None:
    """Save a search reference image and return its URL path."""
    if not image_file or not image_file.size:
        return None
    ext = Path(image_file.filename or "img").suffix.lower() or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    content = await image_file.read()
    (SEARCH_UPLOAD_DIR / unique_name).write_bytes(content)
    await image_file.seek(0)  # rewind so CLIP can still read it
    return f"/search_uploads/{unique_name}"


# cosine space: distance = 1 - cosine_similarity, lower is better
DISTANCE_THRESHOLD = 0.9  # cosine similarity >= 0.1, lenient for user selection


async def _vector_search(embedding: list[float], top_k: int) -> list[Image]:
    """Search ChromaDB and return matched Image objects, filtered by distance threshold."""
    results = collection.query(query_embeddings=[embedding], n_results=top_k, include=["distances"])

    if not results["ids"] or not results["ids"][0]:
        return []

    ids_raw = results["ids"][0]
    distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids_raw)

    # Filter out results above the distance threshold
    filtered = [
        (int(img_id), dist)
        for img_id, dist in zip(ids_raw, distances)
        if dist < DISTANCE_THRESHOLD
    ]

    if not filtered:
        return []

    image_ids = [fid for fid, _ in filtered]
    images = await Image.filter(id__in=image_ids, status="active")

    id_order = {img_id: idx for idx, img_id in enumerate(image_ids)}
    images.sort(key=lambda img: id_order.get(img.id, 999))
    return images


def _get_embedding(
    clip: CLIPHandler,
    req_type: str,
    text_query: Optional[str],
    image_file: Optional[UploadFile],
    image_url: Optional[str],
    search_strategy: str,
    saved_image_path: Optional[str] = None,
) -> Optional[list[float]]:
    """Get a combined embedding based on search type and strategy."""
    text_vec = None
    image_vec = None

    if req_type in ("text", "mixed") and text_query:
        text_vec = clip.text_extract(text_query)
    if req_type in ("image", "mixed"):
        # Prefer the saved file path (guaranteed seeked) over the UploadFile stream
        if saved_image_path:
            full_path = Path(__file__).resolve().parents[3] / saved_image_path.lstrip("/")
            image_vec = clip.image_extract(str(full_path))
        elif image_file and image_file.size:
            image_vec = clip.image_extract(image_file.file)
        elif image_url and not image_url.startswith("blob:"):
            image_vec = clip.image_extract(image_url)

    if text_vec and image_vec:
        import numpy as np
        t = np.array(text_vec)
        i = np.array(image_vec)
        weights = {"balanced": (0.5, 0.5), "text-first": (0.7, 0.3), "image-first": (0.3, 0.7)}
        tw, iw = weights.get(search_strategy, (0.5, 0.5))
        combined = tw * t + iw * i
        combined = combined / (np.linalg.norm(combined) + 1e-9)
        return combined.tolist()

    return text_vec or image_vec


async def _persist_turn(
    session_id: str,
    req_type: str,
    text_query: Optional[str],
    image_url: Optional[str],
    matched_image: Image,
):
    """Save a search turn to the database."""
    session = await SearchSession.get_or_none(session_id=session_id)
    if not session:
        title = text_query.strip() if text_query else "图片搜索"
        session = await SearchSession.create(session_id=session_id, title=title)

    await SearchTurn.create(
        session=session,
        query_type=req_type,
        text_query=text_query,
        image_url=image_url,
        matched_image_id=matched_image.id,
    )
    session.updated_at = None  # triggers auto_now
    await session.save()


@router.post("/best-match")
async def search_best_match(
    type: str = Form(...),
    text_query: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    search_session_id: Optional[str] = Form(None),
    top_k: int = Form(24),
    search_strategy: str = Form("balanced"),
):
    saved_image_url = await _save_search_image(image_file) if image_file else None

    clip = CLIPHandler()
    embedding = _get_embedding(clip, type, text_query, image_file, None, search_strategy, saved_image_url)
    if not embedding:
        return {"best_match": None, "search_session_id": search_session_id}

    images = await _vector_search(embedding, top_k)

    session_id = search_session_id or uuid.uuid4().hex[:16]
    best = images[0] if images else None

    if best:
        await _persist_turn(session_id, type, text_query, saved_image_url, best)
        _results_cache[session_id] = [img.id for img in images]

    return {
        "best_match": image_to_response(best).model_dump() if best else None,
        "search_session_id": session_id if best else search_session_id,
    }


@router.post("/top-k")
async def search_top_k(
    type: str = Form(...),
    text_query: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    search_session_id: Optional[str] = Form(None),
    top_k: int = Form(12),
    search_strategy: str = Form("balanced"),
):
    saved_image_url = await _save_search_image(image_file) if image_file else None

    clip = CLIPHandler()
    embedding = _get_embedding(clip, type, text_query, image_file, None, search_strategy, saved_image_url)
    if not embedding:
        session_id = search_session_id or uuid.uuid4().hex[:16]
        return {"results": [], "search_session_id": session_id}

    images = await _vector_search(embedding, top_k)
    session_id = search_session_id or uuid.uuid4().hex[:16]

    if images:
        await _persist_turn(session_id, type, text_query, saved_image_url, images[0])
        _results_cache[session_id] = [img.id for img in images]

    return {
        "results": [image_to_response(img).model_dump() for img in images],
        "search_session_id": session_id,
    }


@router.get("/sessions/{session_id}/results")
async def get_session_results(session_id: str):
    cached_ids = _results_cache.get(session_id)
    if cached_ids:
        images = await Image.filter(id__in=cached_ids, status="active")
        id_order = {img_id: idx for idx, img_id in enumerate(cached_ids)}
        images.sort(key=lambda img: id_order.get(img.id, 999))
        return {"results": [image_to_response(img).model_dump() for img in images]}

    # Fallback: re-run last query from session history
    session = await SearchSession.get_or_none(session_id=session_id)
    if not session:
        return {"results": []}

    turns = await SearchTurn.filter(session=session).order_by("-created_at").limit(1)
    if not turns:
        return {"results": []}

    last_turn = turns[0]
    clip = CLIPHandler()
    embedding = _get_embedding(
        clip, last_turn.query_type, last_turn.text_query, None, None, "balanced",
        saved_image_path=last_turn.image_url,
    )
    if not embedding:
        return {"results": []}

    images = await _vector_search(embedding, 12)
    _results_cache[session_id] = [img.id for img in images]
    return {"results": [image_to_response(img).model_dump() for img in images]}
