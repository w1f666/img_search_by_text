from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Literal, List
import uuid
import numpy as np

from app.core.db_handler.img_handler import search_similar_images
from app.core.clip_handler import CLIPHandler
from app.logs.config import logger
from app.core.db_handler.history_handler import HistoryHandler
from db.sql_db.models.history import  SearchTurn

img_search_router = APIRouter()

class BestMatchRequest(BaseModel):
    type: Literal["text", "image", "mixed"]
    text_query: Optional[str] = None
    image_url: Optional[str] = None
    search_session_id: Optional[str] = None
    top_k: int = 24
    search_strategy: Optional[str] = "balanced"

@img_search_router.post("/best-match")
async def best_match_api(request: BestMatchRequest):
    """
    统一多模态搜索最优匹配 API
    """
    clip = CLIPHandler()
    vector = None

    if request.type == "text":
        if not request.text_query:
            raise HTTPException(status_code=400, detail="text_query is required for text search")
        vector = clip.text_extract(request.text_query)

    elif request.type == "image":
        if not request.image_url:
            raise HTTPException(status_code=400, detail="image_url is required for image search")
        vector = clip.image_extract(request.image_url)

    elif request.type == "mixed":
        if not (request.text_query and request.image_url):
            raise HTTPException(status_code=400, detail="Both text_query and image_url are required for mixed search")
        
        text_emb = clip.text_extract(request.text_query)
        image_emb = clip.image_extract(request.image_url)
        
        if text_emb is None or image_emb is None:
            raise HTTPException(status_code=500, detail="Failed to extract features")
            
        # 展平并转换为 numpy 数组
        text_arr = np.array(text_emb).astype(np.float32).flatten()
        image_arr = np.array(image_emb).astype(np.float32).flatten()
        
        # 对两个向量分别进行独立的 L2 归一化，消除模长带来的绝对权重影响
        text_norm = text_arr / (np.linalg.norm(text_arr) + 1e-10)
        image_norm = image_arr / (np.linalg.norm(image_arr) + 1e-10)
        
        # 解析前端策略并分配权重
        strategy = request.search_strategy or "balanced"
        if strategy == "text-first":
            w_text, w_img = 0.7, 0.3
        elif strategy == "image-first":
            w_text, w_img = 0.3, 0.7
        else: # 默认为 balanced 或未知策略
            w_text, w_img = 0.5, 0.5
            
        # 按分配权重做线性加权融合
        combined_vector = (w_text * text_norm) + (w_img * image_norm)
        
        # 再次进行归一化，以适配 ChromaDB 基于余弦距离的底层检索
        combined_vector = combined_vector / (np.linalg.norm(combined_vector) + 1e-10)
        vector = combined_vector.tolist()
        
    if not vector:
        raise HTTPException(status_code=500, detail="Failed to generate combined vector.")

    if isinstance(vector, list) and len(vector) > 0 and isinstance(vector[0], list):
        vector = vector[0]
    elif isinstance(vector, np.ndarray):
        vector = vector.flatten().tolist()

    similar_imgs = await search_similar_images(vector=vector, top_k=request.top_k)
    best_match_obj = similar_imgs[0] if similar_imgs else None
    result_count = len(similar_imgs)

    session_id = request.search_session_id
    
    if session_id:
        # 如果前端提供了 session_id，说明这是在一个已有会话中的后续搜索，追加搜索轮次
        turn = await HistoryHandler.add_search_turn(
            session_id=session_id,
            text_query=request.text_query,
            reference_image_url=request.image_url
        )
        if turn:
            # 同时更新本轮的 result_count
            turn.result_count = result_count
            await turn.save(update_fields=["result_count"])
    else:
        # 新的搜索
        session = await HistoryHandler.create_session(
            text_query = request.text_query,
             reference_image_url=request.image_url
        )
        session_id = session.id
        first_turn = await session.turns.all().first()
        if first_turn:
            first_turn.result_count = result_count
            await first_turn.save(update_fields=["result_count"])
            
    return {
        "best_match": best_match_obj,
        "search_session_id": session_id if not session_id else None,
        "results": similar_imgs
    }


# @img_search_router.post("/search_by_text")
# async def text_search_images_api(
#     query: str = Query(..., description="查询文本"),
#     top_k: int = Query(5, description="返回的最大结果数")
#     ):
#     """
#     根据文本查询相关图片。

#     :param query: 查询文本
#     :return: 相关图片记录列表
#     """
#     clip=CLIPHandler()
#     embedding = clip.text_extract(query)
#     if not embedding:
#         return {
#             "message": "Failed to extract text embedding",
#             "results": []
#         }
#     similar_imgs = await search_similar_images(vector=embedding, top_k=top_k)
      
#     return {
#         "message": "Text search executed",
#         "results": similar_imgs
#         #TODO: 返回的结果中或许不应该包含图片id             
#     }

# @img_search_router.post("/search_by_image")
# async def search_by_image_api(
#     uploaded_file: str = Query(..., description="上传的图片文件"),
#     top_k: int = Query(5, description="返回的最大结果数")
# ):
#     """
#     根据上传的图片查询相似图片。

#     :param uploaded_file: 上传的图片文件
#     :return: 相关图片记录列表
#     """
#     clip = CLIPHandler()
#     embedding = clip.image_extract(uploaded_file)

#     if not embedding:
#         return {
#             "message": "Failed to extract image features",
#             "results": []
#         }
    
#     similar_imgs = await search_similar_images(vector=embedding, top_k=top_k)

#     return {
#         "message": "Image search executed",
#         "results": similar_imgs
#     }