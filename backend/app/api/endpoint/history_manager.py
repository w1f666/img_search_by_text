from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel
from typing import Optional, List
from app.core.db_handler.history_handler import HistoryHandler

history_router = APIRouter()

# 模型定义 
class TitleUpdateRequest(BaseModel):
    title: str

class SearchTurnResponse(BaseModel):
    id: int
    text_query: Optional[str] = None
    reference_image_url: Optional[str] = None
    result_count: int
    created_at: str

class SessionDetailResponse(BaseModel):
    id: str
    title: str
    cover_image_url: Optional[str] = None
    created_at: str
    updated_at: str
    turns: List[SearchTurnResponse] = []

# 接口路由 
@history_router.get("", summary="获取所有搜图历史记录")
async def get_history_list(
    page: int = Query(1, description="页码"),
    page_size: int = Query(20, description="每页数量"),
    keyword: Optional[str] = Query(None, description="搜索标题包含的关键字")
):
    total, sessions = await HistoryHandler.get_sessions(page, page_size, keyword)
    
    return {
        "status": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [
                {
                    "id": s.id,
                    "title": s.title,
                    "cover_image_url": s.cover_image_url,
                    "created_at": s.created_at.isoformat(),
                    "updated_at": s.updated_at.isoformat()
                } for s in sessions
            ]
        }
    }

@history_router.get("/{session_id}", response_model=SessionDetailResponse, summary="获取指定搜索历史详情（含多轮搜索记录）")
async def get_history_detail(session_id: str = Path(..., description="历史记录的会话ID")):
    session = await HistoryHandler.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="历史记录不存在")
        
    # 为了防止异步获取多对多/一对多问题，prefetch_related 已经在 handler 完成
    session_turns = [
        SearchTurnResponse(
            id=t.id,
            text_query=t.text_query,
            reference_image_url=t.reference_image_url,
            result_count=t.result_count,
            created_at=t.created_at.isoformat()
        ) for t in session.turns
    ]
    
    return SessionDetailResponse(
        id=session.id,
        title=session.title,
        cover_image_url=session.cover_image_url,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        turns=session_turns
    )

@history_router.patch("/{session_id}", summary="修改历史记录的标题")
async def rename_history_title(
    request: TitleUpdateRequest, 
    session_id: str = Path(..., description="历史记录会话ID")
):
    if not request.title or len(request.title.strip()) == 0:
        raise HTTPException(status_code=400, detail="标题不能为空")
        
    session = await HistoryHandler.update_session_title(session_id, request.title.strip())
    if not session:
        raise HTTPException(status_code=404, detail="历史记录不存在")
        
    return {"status": "success", "message": "标题已更新", "data": {"title": session.title}}

@history_router.delete("/{session_id}", summary="删除一条特定的搜索历史")
async def delete_history_session(session_id: str = Path(...)):
    success = await HistoryHandler.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="记录不存在或删除失败")
    return {"status": "success", "message": "历史记录已删除"}

@history_router.delete("", summary="清空所有搜索历史")
async def clear_all_history():
    deleted_count = await HistoryHandler.clear_all_sessions()
    return {"status": "success", "message": f"已清空 {deleted_count} 条记录"}