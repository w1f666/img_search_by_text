from fastapi import APIRouter, Query, UploadFile, File
from app.core.db_handler.img_handler import search_similar_images
from app.core.clip_handler import CLIPHandler

img_search_router = APIRouter()

@img_search_router.post("/search_by_text")
async def text_search_images_api(
    query: str = Query(..., description="查询文本"),
    top_k: int = Query(5, description="返回的最大结果数")
    ):
    """
    根据文本查询相关图片。

    :param query: 查询文本
    :return: 相关图片记录列表
    """
    clip=CLIPHandler()
    embedding = clip.text_extract(query)
    if not embedding:
        return {
            "message": "Failed to extract text embedding",
            "results": []
        }
    similar_imgs = await search_similar_images(vector=embedding, top_k=top_k)
      
    return {
        "message": "Text search executed",
        "results": similar_imgs
        #TODO: 返回的结果中或许不应该包含图片id             
    }

@img_search_router.post("/search_by_image")
async def search_by_image_api(
    uploaded_file: str = Query(..., description="上传的图片文件"),
    top_k: int = Query(5, description="返回的最大结果数")
):
    """
    根据上传的图片查询相似图片。

    :param uploaded_file: 上传的图片文件
    :return: 相关图片记录列表
    """
    clip = CLIPHandler()
    embedding = clip.image_extract(uploaded_file)

    if not embedding:
        return {
            "message": "Failed to extract image features",
            "results": []
        }
    
    similar_imgs = await search_similar_images(vector=embedding, top_k=top_k)

    return {
        "message": "Image search executed",
        "results": similar_imgs
    }