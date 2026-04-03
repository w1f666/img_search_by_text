from fastapi import APIRouter, HTTPException,Body,Query
from typing import List
from pydantic import BaseModel
from datetime import datetime
from db.sql_db.models.image import Image
from app.core.db_handler.gallery_handler import (
    create_gallery,
    list_galleries,
    list_galleries_advanced,
    # get_gallery_by_id,
    update_gallery,
    delete_gallery_single,
    # delete_gallery,
    # restore_gallery,
    # get_gallery_content,
    # add_image_to_gallery,
    # batch_add_images_to_gallery,
    # # hard_delete_all_galleries
    # move_gallery,
    # #restore_image,
    # move_image,
    # #remove_image_from_gallery,
    # batch_remove_images,
    # batch_restore_images,
    update_image_gallery,
    move_image_to_trash,
    list_trash_images,
    batch_move_to_trash,
    restore_image,
    delete_image_permanently,
    clear_trash,
    get_image_detail_context,
    get_gallery_cover
)

gallery_router = APIRouter()

# 更改为多级相册逻辑
# 【new2.3-3】已对接前端接口
@gallery_router.post("/api/galleries")
async def create_gallery_api(
    name:str,
    description:str | None =None
):
    # 应用当前逻辑不引入父目录逻辑
    gallery = await create_gallery(
        name=name,
        description=description
    )

    return {
        "id": f"gallery_{gallery.id:03d}",
        "name": gallery.name,
        "description": gallery.description,
        "cover_image_url": None,
        "image_count": gallery.image_count,
        "created_at": gallery.created_time.isoformat(),
        "updated_at": gallery.updated_time.isoformat() if gallery.updated_time else gallery.created_time.isoformat()
    }

# 【new2.3-1】一次性返回所有相册
@gallery_router.get("/api/galleries/all")
async def list_all_galleries_api():
    galleries = await list_galleries()
    items = []
    for g in galleries:
        #  动态统计图片数量
        count = await Image.filter(
            gallery_id=g.id,
            status="active"
        ).count()
        #  获取封面
        cover = await get_gallery_cover(g.id)
        items.append({
            "id": f"gallery_{g.id:03d}",
            "name": g.name,
            "description": g.description,
            "cover_image_url": cover,
            "image_count": count,
            "created_at": g.created_time.isoformat(),
            "updated_at": g.updated_time.isoformat() if g.updated_time else g.created_time.isoformat()
        })
    return {
        "items": items
    }

# 【new2.3-2】分页展示相册
@gallery_router.get("/api/galleries")
async def list_galleries_api(
    start: int = Query(1),
    end: int = Query(12),
    query: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc")
):
    items, total = await list_galleries_advanced(
        start, end, query, sort_by, sort_order
    )

    result_items = []
    for g in items:
        # 动态统计
        count = await Image.filter(
            gallery_id=g.id,
            status="active"
        ).count()
        # 封面
        cover = await get_gallery_cover(g.id)
        result_items.append({
            "id": f"gallery_{g.id:03d}",
            "name": g.name,
            "description": g.description,
            "cover_image_url": cover,
            "image_count": count,
            "created_at": g.created_time.isoformat(),
            "updated_at": g.updated_time.isoformat() if g.updated_time else g.created_time.isoformat()
        })

    page_size = end - start + 1
    page = (start - 1) // page_size + 1
    total_pages = (total + page_size - 1) // page_size

    meta = {
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

    return {
        "items": result_items,
        "meta": meta
    }



# 【new2.3-4】
@gallery_router.patch("/api/galleries/{gallery_id}")
async def update_gallery_api(
    gallery_id: str,
    data: dict = Body(...)
):
    name = data.get("name")
    description = data.get("description")

    gallery = await update_gallery(
        gallery_id=gallery_id,
        name=name,
        description=description
    )

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    return {
        "id": f"gallery_{gallery.id:03d}",
        "name": gallery.name,
        "description": gallery.description,
        "cover_image_url": None,
        "image_count": gallery.image_count,
        "created_at": gallery.created_time.isoformat(),
        "updated_at": gallery.updated_time.isoformat()
    }

# 【new2.3-5】单级相册目录逻辑删除
@gallery_router.delete("/api/galleries/{gallery_id}")
async def delete_gallery_api(gallery_id: str):
    success, moved_count = await delete_gallery_single(gallery_id)

    if not success:
        raise HTTPException(status_code=404, detail="Gallery not found")

    return {
        "gallery_id": gallery_id,
        "deleted": True,
        "moved_to_ungrouped_count": moved_count
    }


# 【new2.4-4】修改图片归属
class UpdateImageRequest(BaseModel):
    gallery_id: int | None

@gallery_router.patch("/images/{image_id}")
async def update_image_api(image_id: int, request: UpdateImageRequest):

    image = await update_image_gallery(
        image_id=image_id,
        gallery_id=request.gallery_id
    )

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return {
        "id": f"image_{image.id}",
        "gallery_id": f"gallery_{request.gallery_id}" if request.gallery_id else None,
        "updated_at": datetime.now().isoformat()
    }

# 【new2.4-5】将图片移动到回收站
@gallery_router.post("/images/{image_id}/trash")
async def trash_image_api(image_id: int):

    image = await move_image_to_trash(image_id)

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return {
        "id": f"image_{image.id}",
        "status": "trash",
        "deleted_at": image.deleted_at.isoformat()
    }

# 【new2.5-1】分页展示回收站内容
@gallery_router.get("/trash/images")
async def list_trash_images_api(
    start: int = 1,
    end: int = 20,
    query: str | None = None,
    sort_by: str = "deleted_at",
    sort_order: str = "desc"
):
    images, total = await list_trash_images(
        start, end, query, sort_by, sort_order
    )

    items = []

    for img in images:
        
        g = await img.gallery
        items.append({
            "id": f"image_{img.id}",
            "filename": img.image_url.split("/")[-1] if img.image_url else None,
            "image_url": img.image_url,
            "thumbnail_url": img.thumbnail_url,
            "size_bytes": img.size_bytes,
            "size_label": img.size_label,
            "created_at": img.created_at.isoformat() if img.created_at else None,
            "gallery_id": f"gallery_{g.id}" if g else None,
            "status": "trash",
            "source": "upload",
            "deleted_at": img.deleted_at.isoformat() if img.deleted_at else None
        })

    # meta
    page_size = end - start + 1
    page = (start - 1) // page_size + 1
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "meta": {
            "requested_start": start,
            "requested_end": end,
            "returned_start": start,
            "returned_end": start + len(items) - 1 if items else 0,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_previous": page > 1,
            "has_next": page < total_pages
        }
    }

# 【new2.5-2】根据id批量删除图片
class BatchTrashRequest(BaseModel):
    image_ids: list[int]

@gallery_router.post("/images/batch-trash")
async def batch_trash_api(request: BatchTrashRequest):
    count = await batch_move_to_trash(request.image_ids)

    return {
        "image_ids": request.image_ids,
        "deleted_count": count
    }

# 【new2.5-3】恢复图片（单张）
@gallery_router.post("/images/{image_id}/restore")
async def restore_image_api(image_id: int):
    image = await restore_image(image_id)

    if not image:
        raise HTTPException(404, "Image not found")

    return {
        "id": f"image_{image.id}",
        "status": "active",
        "deleted_at": None
    }

# 【new2.5-4】物理删除图片
@gallery_router.delete("/images/{image_id}")
async def delete_image_api(image_id: int):
    success = await delete_image_permanently(image_id)

    if not success:
        raise HTTPException(404, "Image not found")

    return {
        "id": f"image_{image_id}",
        "deleted": True
    }

# 清空回收站
@gallery_router.delete("/trash")
async def clear_trash_api():
    count = await clear_trash()

    return {
        "deleted_count": count
    }


@gallery_router.get("/api/images/{image_id}/detail-context")
async def get_image_detail_context_api(
    image_id: int,
    gallery_id: int | None = Query(None)
):
    result = await get_image_detail_context(image_id, gallery_id)

    if not result:
        raise HTTPException(status_code=404, detail="Image not found")

    image = result["image"]
    prev = result["previous"]
    next_img = result["next"]

    def format_image(img):
        if not img:
            return None

        return {
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

    return {
        "image": format_image(image),
        "previous_image": format_image(prev),
        "next_image": format_image(next_img),
        "related_images": []  # 先留空
    }




# @gallery_router.get("/{gallery_id}")
# async def get_gallery_detail(gallery_id: int):
#     gallery = await get_gallery_by_id(gallery_id)
#     if not gallery or gallery.is_deleted:
#         raise HTTPException(status_code=404, detail="Gallery not found")

#     return {
#         "msg": "success",
#         "data": {
#             "id": gallery.id,
#             "name": gallery.name,
#             "description": gallery.description,
#             "parent_id": gallery.parent_id,
#             "image_count": gallery.image_count,
#             "created_time": gallery.created_time
#         }
#     }


# # 多级相册目录逻辑的删除——目前弃用
# @gallery_router.delete("/delete/{gallery_id}")
# async def delete_gallery_api(gallery_id: int):
#     if gallery_id == 1:
#         raise HTTPException(
#             status_code=400,
#             detail="Recycle Bin cannot be deleted"
#         )
#     # 避免出现删除失败但是API仍然返回成功的情况
#     success = await delete_gallery(gallery_id)

#     if not success:
#         raise HTTPException(
#             status_code=404,
#             detail="Gallery not found"
#         )

#     return {
#         "msg": "gallery moved to recycle bin",
#         "gallery_id": gallery_id
#     }

# @gallery_router.post("/restore/{gallery_id}")
# async def restore_gallery_api(gallery_id: int):
#     success = await restore_gallery(gallery_id)

#     if not success:
#         raise HTTPException(
#             status_code=404,
#             detail="Gallery not found in recycle bin"
#         )

#     return {
#         "msg": "gallery restored",
#         "gallery_id": gallery_id
#     }
# # 修改原 获取回收站中的画廊列表 为 通用相册内容查询
# @gallery_router.get("/{gallery_id}/content")
# async def get_gallery_content_api(gallery_id: int):

#     result = await get_gallery_content(gallery_id)

#     if not result:
#         raise HTTPException(
#             status_code=404,
#             detail="Gallery not found"
#         )

#     return {
#         "msg": "success",
#         "galleries": [
#             {
#                 "id": g.id,
#                 "name": g.name,
#                 "image_count": g.image_count
#             }
#             for g in result["galleries"]
#         ],
#         "images": [
#             {
#                 "id": item["image"].id if isinstance(item, dict) else item.id,
#                 "file_path": item["image"].file_path if isinstance(item, dict) else item.file_path,
#                 "description": item["image"].description if isinstance(item, dict) else item.description,
#                 "upload_time": item["image"].upload_time if isinstance(item, dict) else item.upload_time,
#                 "from_gallery_id": item.get("gallery_id") if isinstance(item, dict) else None
#             }
#             for item in result["images"]
#         ]
#     }


# class AddImageToGalleryRequest(BaseModel):
#     image_id: int | List[int]
#     gallery_id: int
# @gallery_router.post("/gallery")
# async def add_image_to_gallery_api(request: AddImageToGalleryRequest):
#     """
#     将图片添加到画廊。

#     :param image_id: 图片 ID
#     :param gallery_id: 画廊 ID
#     :return: 是否添加成功
#     """
#     if isinstance(request.image_id, int):
#         image_ids = [request.image_id]
#     else:
#         image_ids = request.image_id

#     # 略作修改：batch_add_images_to_gallery返回dict不是bool，永远不会进入错误
#     result = await batch_add_images_to_gallery(
#         image_ids=image_ids,
#         gallery_id=request.gallery_id
#     )

#     if not result["success"]:
#         raise HTTPException(
#             status_code=404,
#             detail=result["message"]
#         )

#     return {
#         "msg": result["message"],
#         "gallery_id": request.gallery_id,
#         "image_ids": image_ids
#     }


# @gallery_router.put("/move/{gallery_id}")
# async def move_gallery_api(gallery_id: int, new_parent_id: int):
#     if new_parent_id == 1:
#         raise HTTPException(
#             status_code=400,
#             detail="Cannot move gallery to recycle bin"
#         )
#     success = await move_gallery(gallery_id, new_parent_id)

#     if not success:
#         raise HTTPException(
#             status_code=400,
#             detail="Move failed"
#         )

#     return {
#         "msg": "gallery moved",
#         "gallery_id": gallery_id,
#         "new_parent_id": new_parent_id
#     }


### 新增图片操作接口
"""
@gallery_router.delete("/image/{image_id}")
async def remove_image_from_gallery_api(
    image_id: int,
    gallery_id: int
):

    success = await remove_image_from_gallery(
        image_id=image_id,
        gallery_id=gallery_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Image not found"
        )

    return {
        "msg": "image removed from gallery",
        "image_id": image_id,
        "gallery_id": gallery_id
    }

class RestoreImageRequest(BaseModel):
    image_id: int
    gallery_id: int


@gallery_router.post("/image/restore")
async def restore_image_api(request: RestoreImageRequest):

    success = await restore_image(
        image_id=request.image_id,
        gallery_id=request.gallery_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Image not found in recycle bin"
        )

    return {
        "msg": "image restored",
        "image_id": request.image_id,
        "gallery_id": request.gallery_id
    }
"""
    
# class MoveImageRequest(BaseModel):
#     image_id: int
#     from_gallery_id: int
#     to_gallery_id: int
# @gallery_router.put("/image/move")
# async def move_image_api(request: MoveImageRequest):
#     if request.to_gallery_id == 1:
#         raise HTTPException(
#             status_code=400,
#             detail="Cannot move image to recycle bin"
#         )
#     if request.from_gallery_id == request.to_gallery_id:
#         raise HTTPException(
#             status_code=400,
#             detail="Source and destination gallery cannot be the same"
#         )
#     success = await move_image(
#         image_id=request.image_id,
#         from_gallery_id=request.from_gallery_id,
#         to_gallery_id=request.to_gallery_id
#     )
#     if not success:
#         raise HTTPException(
#             status_code=400,
#             detail="Move image failed"
#         )
#     return {
#         "msg": "image moved successfully",
#         "image_id": request.image_id,
#         "from_gallery": request.from_gallery_id,
#         "to_gallery": request.to_gallery_id
#     }

# # 新增批量删除和修复
# class BatchRemoveImageRequest(BaseModel):
#     image_ids: List[int]
#     gallery_id: int

# @gallery_router.post("/image/batch_delete")
# async def batch_remove_images_api(request: BatchRemoveImageRequest):

#     results = await batch_remove_images(
#         image_ids=request.image_ids,
#         gallery_id=request.gallery_id
#     )

#     return {
#         "msg": "batch remove finished",
#         "results": results
#     }

# class BatchRestoreImageRequest(BaseModel):
#     image_ids: List[int]
#     gallery_id: int

# @gallery_router.post("/image/batch_restore")
# async def batch_restore_images_api(request: BatchRestoreImageRequest):

#     results = await batch_restore_images(
#         image_ids=request.image_ids,
#         gallery_id=request.gallery_id
#     )

#     return {
#         "msg": "batch restore finished",
#         "results": results
#     }