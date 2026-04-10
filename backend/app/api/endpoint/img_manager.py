from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Path, Query
from typing import List
from app.core.img_process import image_process
from app.core.db_handler.img_handler import add_img_to_database
# from app.core.db_handler.img_handler import delete_image_by_id,delete_images_batch_by_ids
# from app.core.db_handler.img_handler import restore_image_by_id
from app.core.db_handler.img_handler import list_images_all
from app.core.db_handler.img_handler import list_images_paginated
from app.logs.config import logger
from app.core.clip_handler import CLIPHandler
from db.sql_db.models.image import Image
from db.vector_db.client import image_collection
from db.vector_db.client import gallery_collection

from db.sql_db.models.gallery import Gallery

img_manage_router = APIRouter()


# 【2.4-3】新增适用与前端接口的添加图片功能，之前先上传到数据库在把图片从数据库加载到图库中的逻辑已废弃
class CreateImageRequest(BaseModel):
    file_path: str
    gallery_id: int | None = None

@img_manage_router.post("/api/images")
async def create_image_api(request: CreateImageRequest):
    """
    上传图片（单张）
    """

    img_path = request.file_path

    # 处理图片（提取特征）
    result = image_process(img_path)
    if not result:
        raise HTTPException(status_code=400, detail="Image processing failed")

    img_hash = result['md5']
    phash = result['phash']
    vector = result['clip_vector']

    # 存数据库（包含去重逻辑）
    db_result = await add_img_to_database(
        img_path=img_path,
        img_hash=img_hash,
        phash=phash,
        vector=vector,
        strict=True
    )

    # 处理重复图片情况
    if isinstance(db_result, list):
        return {
            "duplicate": True,
            "duplicate_ids": db_result
        }

    image = db_result  # 新创建的 Image 对象

    # 绑定相册（如果有）
    if request.gallery_id:
        gallery = await Gallery.get_or_none(id=request.gallery_id, is_deleted=False)
        if gallery:
            await gallery.image.add(image)

            # 更新计数
            gallery.image_count += 1
            await gallery.save()

    # 返回标准格式（符合前端）
    return {
        "id": f"image_{image.id:03d}",
        "filename": image.filename,
        "image_url": image.image_url,
        "thumbnail_url": image.thumbnail_url,
        "size_bytes": image.size_bytes,
        "size_label": image.size_label,
        "created_at": image.created_at.isoformat(),
        "gallery_id": f"gallery_{image.gallery_id:03d}" if image.gallery_id else None,
        "status": image.status,
        "source": image.source,
        "deleted_at": image.deleted_at.isoformat() if image.deleted_at else None
    }

# 【new2.4-1】获取全部图片的接口
@img_manage_router.get("/api/images/all")
async def list_images_all_api(
    status: str = Query("active"),
    gallery_id: int | None = Query(None),
    query: str | None = Query(None)
):
    images = await list_images_all(
        status=status,
        gallery_id=gallery_id,
        query=query
    )
    return {
        "items": [
            {
                "id": f"image_{img.id:03d}",
                "filename": img.filename,
                "image_url": img.image_url,
                "thumbnail_url": img.thumbnail_url,
                "size_bytes": img.size_bytes,
                "size_label": img.size_label,
                "created_at": img.created_at.isoformat(),
                "gallery_id": f"gallery_{img.gallery_id:03d}" if img.gallery_id else None,
                "status": img.status,
                "source": img.source,
                "deleted_at": img.deleted_at.isoformat() if img.deleted_at else None
            }
            for img in images
        ]
    }

# 【new2.4-2】分页展示图片
@img_manage_router.get("/api/images")
async def list_images_api(
    start: int = Query(1),
    end: int = Query(20),
    status: str = Query("active"),
    gallery_id: int | None = Query(None),
    query: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc")
):
    items, total = await list_images_paginated(
        start=start,
        end=end,
        status=status,
        gallery_id=gallery_id,
        query=query,
        sort_by=sort_by,
        sort_order=sort_order
    )

    page_size = end - start + 1
    page = (start - 1) // page_size + 1
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [
            {
                "id": f"image_{img.id:03d}",
                "filename": img.filename,
                "image_url": img.image_url,
                "thumbnail_url": img.thumbnail_url,
                "size_bytes": img.size_bytes,
                "size_label": img.size_label,
                "created_at": img.created_at.isoformat(),
                "gallery_id": f"gallery_{img.gallery_id:03d}" if img.gallery_id else None,
                "status": img.status,
                "source": img.source,
                "deleted_at": img.deleted_at.isoformat() if img.deleted_at else None
            }
            for img in items
        ],
        "meta": {
            "requested_start": start,
            "requested_end": end,
            "returned_start": start,
            "returned_end": start + len(items) - 1 if items else start,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_previous": page > 1,
            "has_next": page < total_pages
        }
    }

class AutoClassifyImageRequest(BaseModel):
    scope: str # "all-unclassified" | "selected"
    image_ids: List[str] | None = None

@img_manage_router.post("/api/images/auto-classify")
async def auto_classify_image(request: AutoClassifyImageRequest):

    if request.scope == "all-unclassified":
        images = await Image.filter(status="active", gallery_id__isnull=True)
    elif request.scope == "selected" and request.image_ids:
        raw_ids = [int(i.split("_")[-1]) for i in request.image_ids] 
        images = await Image.filter(id__in=raw_ids, status="active")
    else:
        images = []

    if not images:
        logger.info("No images to classify based on the provided scope and IDs.")
        return {"classified": [], "skipped": [], "total_processed": 0}

    classified_results = []
    skipped_results = []
    updated_gallery_ids = set()
    
    for img in images:
        img_chroma = image_collection.get(ids=[str(img.id)],include=["embeddings"])
        
        if not img_chroma or len(img_chroma.get('embeddings', [])) == 0:
            logger.warning(f"No vector found for image ID {img.id}, skipping classification.")
            skipped_results.append({
                f"image_{img.id:03d}"
            })
            continue
        
        img_vector = img_chroma['embeddings'][0]
        search_res = gallery_collection.query(
            query_embeddings=[img_vector],
            n_results=1,
            include=["distances","metadatas"]
        )
        
        if len(search_res.get('ids', [])) == 0 or len(search_res['ids'][0]) == 0:
            logger.warning(f"No gallery found for image ID {img.id}, skipping classification.")
            skipped_results.append({
                f"image_{img.id:03d}"
            })
            continue
        
        raw_gallery_id = search_res['ids'][0][0]
        distance = search_res['distances'][0][0]
        best_gallery_name = search_res['metadatas'][0][0]["name"]
        
        confidence = round(1 - distance, 2)
        
        if confidence >= 0.2:
            gallery_num_id = int(raw_gallery_id)
            
            img.gallery_id = gallery_num_id
            await img.save()
            
            classified_results.append({
                "image_id": f"image_{img.id:03d}",
                "gallery_id": f"gallery_{gallery_num_id:03d}",
                "gallery_name": best_gallery_name,
                "confidence": confidence
            })
            updated_gallery_ids.add(gallery_num_id)
        else:
            logger.info(f"Image ID {img.id} classified with low confidence ({confidence}), skipping assignment.")
            skipped_results.append(f"image_{img.id:03d}")
            
    for g_id in updated_gallery_ids:
        g = await Gallery.get_or_none(id=g_id)
        if g:
            count = await Image.filter(gallery_id=g_id, status="active").count()
            g.image_count = count
            
            # 未设置封面时给一张最新的
            if not g.cover_image_url:
                latest_img = await Image.filter(gallery_id=g_id, status="active").order_by("-created_at").first()
                if latest_img:
                    g.cover_image_url = latest_img.image_url
            await g.save()

    return {
        "classified": classified_results,
        "skipped": skipped_results,
        "total_processed": len(images)
    }
# class AddImageRequest(BaseModel):
#     file_path: List[str]

# #TODO 修改添加逻辑，敲定是使用独立文件夹保存还是只存储文件路径
# @img_manage_router.post("/images", status_code=201)
# async def add_images_api(request: AddImageRequest):
#     """
#     批量添加图片到数据库（RESTful: POST /images）。
#     接收图片文件路径列表，处理每张图片并存入数据库，防止重复添加。

#     :param request: 包含图片文件路径列表的请求体
#     :return: 成功添加的图片记录列表和重复图片路径列表
#     """
#     added_images = []
#     duplicate_images = []

#     for img_path in request.file_path:
#         # 处理图片，获取hash和向量
#         result = image_process(img_path)
#         if not result:
#             continue  # 如果处理失败，跳过该图片

#         img_hash = result['md5']
#         phash = result['phash']
#         vector = result['clip_vector']

#         # 尝试将图片添加到数据库
#         db_result = await add_img_to_database(
#             img_path=img_path,
#             img_hash=img_hash,
#             phash=phash,
#             vector=vector,
#             strict=True
#         )

#         if isinstance(db_result, list):  
#             # 如果返回的是重复图片ID列表
#             duplicate_images.append({
#                 "file_path": img_path,
#                 "duplicate_ids": db_result
#             })
#         else:
#             added_images.append(db_result)

#     return {
#         "message": "Images processed",
#         "add_count": len(added_images),
#         "duplicate_count": len(duplicate_images),
#         "added_images": added_images,
#         "duplicate_images": duplicate_images
#     }



# class DeleteImageRequest(BaseModel):
#     image_ids: List[int]
    
# @img_manage_router.delete("/images/{image_id}", status_code=200)
# async def delete_image_api(
#     image_id: int = Path(..., description="要删除的图片ID", gt=0)
# ):
#     """
#     删除指定ID的图片记录（RESTful: DELETE /images/{id}）。

#     :param image_id: 要删除的图片ID
#     :return: 删除操作的结果消息
#     """
#     success = await delete_image_by_id(image_id)

#     if not success:
#         raise HTTPException(status_code=404, detail="Image not found")

#     return {
#         "message": f"Image with ID {image_id} deleted successfully"
#     }    

# @img_manage_router.delete("/images", status_code=200)
# async def batch_delete_images_api(request: DeleteImageRequest):
#     """
#     批量删除图片记录（RESTful: DELETE /images）。
    
#     :param request: 包含要删除的图片ID列表的请求体
#     :return: 删除操作的结果消息
#     """
#     if not request.image_ids:
#         raise HTTPException(status_code=400, detail="No image IDs provided") 
    
#     results = await delete_images_batch_by_ids(request.image_ids)

#     return {
#         "message": f"Batch delete operation completed",
#         "delete_count":len(results["deleted_ids"]),
#         "failed_count":len(results["failed_ids"]),
#         **results
#     }

# class RestoreImageRequest(BaseModel):
#     image_ids: List[int]

# @img_manage_router.post("/images/{image_id}/restore", status_code=200)
# async def restore_image_api(
#     image_id: int = Path(..., description="要恢复的图片ID", gt=0)
# ):
#     """
#     恢复指定ID的图片记录（RESTful: POST /images/{id}/restore）。

#     :param image_id: 要恢复的图片ID
#     :return: 恢复操作的结果消息
#     """
#     success = await restore_image_by_id(image_id)

#     if not success:
#         raise HTTPException(status_code=404, detail="Image not found or not deleted")

#     return {
#         "message": f"Image with ID {image_id} restored successfully"
#     }

# @img_manage_router.post("/images/restore")
# async def batch_restore_images_api(request: RestoreImageRequest):
#     """
#     批量恢复图片记录（RESTful: POST /images/restore）。
    
#     :param request: 包含要恢复的图片ID列表的请求体
#     :return: 恢复操作的结果消息
#     """
#     if not request.image_ids:
#         raise HTTPException(status_code=400, detail="No image IDs provided") 
    
#     restored_count = 0
#     failed_ids = []

#     for img_id in request.image_ids:
#         success = await restore_image_by_id(img_id)
#         if success:
#             restored_count += 1
#         else:
#             failed_ids.append(img_id)

#     return {
#         "message": f"Batch restore operation completed",
#         "restored_count": restored_count,
#         "failed_count": len(failed_ids),
#         "failed_ids": failed_ids
#     }