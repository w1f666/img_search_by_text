from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from db.sql_db.models.image import Image
from db.sql_db.models.search_session import SearchSession, SearchTurn
from app.schemas.history import RenameSessionRequest
from app.schemas.image import image_to_response

router = APIRouter()


def _build_turn_response(turn: "SearchTurn", matched_image: "Image | None"):
    query: dict = {"type": turn.query_type}
    if turn.query_type in ("text", "mixed") and turn.text_query:
        query["textQuery"] = turn.text_query
    if turn.query_type in ("image", "mixed") and turn.image_url:
        query["imageUrl"] = turn.image_url
    return {
        "query": query,
        "matched_image": image_to_response(matched_image).model_dump() if matched_image else None,
    }


async def _build_session_response(session: "SearchSession"):
    turns = await SearchTurn.filter(session=session).order_by("created_at")
    turn_responses = []
    for t in turns:
        matched = await Image.get_or_none(id=t.matched_image_id) if t.matched_image_id else None
        turn_responses.append(_build_turn_response(t, matched))

    return {
        "session_id": session.session_id,
        "title": session.title,
        "turns": turn_responses,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("")
async def list_history(keyword: Optional[str] = Query(None)):
    qs = SearchSession.all()
    if keyword:
        qs = qs.filter(title__icontains=keyword)

    sessions = await qs.order_by("-updated_at")
    items = []
    for s in sessions:
        items.append(await _build_session_response(s))
    return {"items": items}


@router.get("/{session_id}")
async def get_history(session_id: str):
    session = await SearchSession.get_or_none(session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return await _build_session_response(session)


@router.patch("/{session_id}")
async def rename_history(session_id: str, payload: RenameSessionRequest):
    session = await SearchSession.get_or_none(session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = payload.title.strip()
    await session.save()

    return {
        "session_id": session.session_id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat(),
    }


@router.delete("/{session_id}")
async def delete_history(session_id: str):
    session = await SearchSession.get_or_none(session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await SearchTurn.filter(session=session).delete()
    await session.delete()

    return {"session_id": session_id, "deleted": True}
