from db.vector_db.client import image_collection
from typing import List
from db.sql_db.models.gallery import Gallery
from datetime import datetime
from app.logs.config import logger
from db.sql_db.models.image import Image
from db.sql_db.models.ImageGalleryTrash import ImageGalleryTrash
from tortoise.expressions import Q
from app.core.clip_handler import CLIPHandler
from db.vector_db.client import gallery_collection

RECYCLE_GALLERY_ID = 1
ROOT_ID = 0

# # 统计图片数量
# async def recalc_image_count(gallery: Gallery):
#     count = await gallery.image.filter(
#         is_deleted=False
#     ).distinct().count()
#     gallery.image_count = count
#     await gallery.save(update_fields=["image_count"])
# # 回收站的图片统计逻辑单独定义
# async def recalc_recycle_count():
#     count = await ImageGalleryTrash.filter(restored=False).count()

#     recycle_gallery = await Gallery.get(id=RECYCLE_GALLERY_ID)
#     recycle_gallery.image_count = count
#     await recycle_gallery.save()
# # 防止图片以任何形式被重复添加进gallery
# async def safe_add_image(gallery: Gallery, image: Image):
#     exists = await gallery.image.filter(id=image.id).exists()
#     if not exists:
#         await gallery.image.add(image)

# 缩略图封面
async def get_gallery_cover(gallery_id: int) -> str | None:
    image = await Image.filter(
        gallery_id=gallery_id,
        status="active"
    ).order_by("-created_at").first()

    if not image:
        return None

    return image.thumbnail_url

# 【new2.3-3】创建相册逻辑
async def create_gallery(name: str, description: str | None = None):
    gallery = await Gallery.create(
        name=name,
        description=description,
        cover_image_url=None,
        image_count=0,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    clip = CLIPHandler()
    text_vector = clip.text_extract(name)
    if text_vector:
        gallery_collection.add(
            ids=[f"{gallery.id}"],  # 统一使用带有前缀的格式或直接存 string 类型的 id
            embeddings=[text_vector],
            metadatas=[{"name": name}]
        )
    return gallery

# 【new2.3-1】获取所有除回收站以外的正常相册
async def list_galleries() -> List[Gallery]:
    """
    获取所有正常画廊（不包含回收站）。

    :return: 画廊列表
    """
    galleries = await Gallery.filter(
        is_deleted=False
    # ).exclude(
    #     id=RECYCLE_GALLERY_ID
    )
    return galleries

# 【new2.3-2】分页展示相册
async def list_galleries_advanced(
    start: int,
    end: int,
    query: str | None,
    sort_by: str,
    sort_order: str
):
    qs = Gallery.filter(is_deleted=False)
    # .exclude(id=RECYCLE_GALLERY_ID)
    # 搜索
    if query:
        qs = qs.filter(name__icontains=query)
    # 字段映射表
    field_map = {
        "created_at": "created_time",
        "image_count": "image_count",
        "name": "name"
    }
    sort_by = field_map.get(sort_by, "created_time")
    # 排序
    order = f"-{sort_by}" if sort_order == "desc" else sort_by
    qs = qs.order_by(order)
    # 总数
    total = await qs.count()
    # 分页（注意：start是从1开始）
    page_size = end - start + 1
    offset = start - 1
    items = await qs.offset(offset).limit(page_size)
    return items, total

# 【new2.3-4】
async def update_gallery(
    gallery_id: int,
    name: str | None = None,
    description: str | None = None
) -> Gallery | None:
    """
    更新画廊信息。

    :param gallery_id: 画廊 ID
    :param name: 新画廊名称
    :param description: 新画廊描述
    :return: 更新后的 Gallery 对象或 None
    """
    gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
    if not gallery:
        return None

    if name is not None:
        clip = CLIPHandler()
        text_vector = clip.text_extract(name)
        if text_vector:
            # 采用 upsert 进行更新
            gallery_collection.upsert(
                ids=[str(gallery.id)],
                embeddings=[text_vector],
                metadatas=[{"name": name}]
            )
        gallery.name = name
    if description is not None:
        gallery.description = description
    # 添加修改时间
    gallery.updated_time = datetime.now()

    await gallery.save()
    return gallery

# # 【new2.3-5】目前采用单级目录模式进行删除
# async def delete_gallery_single(gallery_id: int) -> tuple[bool, int]:
#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         return False, 0
#     # 统计图片数量（不删除关系）便于后期恢复
#     moved_count = gallery.image_count
#     # 只做软删除
#     gallery.is_deleted = True
#     await gallery.save()

#     return True, moved_count

async def delete_gallery_single(gallery_id: int):
    gallery = await Gallery.get_or_none(id=gallery_id)
    if not gallery:
        return False, 0

    # 1. 直接获取对应相册下的图片总数，不拉取图片详情，效率更高
    count = await Image.filter(gallery_id=gallery_id).count()

    # 2. 将该相册下的所有图片变更为未归类 (gallery_id=None)
    await Image.filter(gallery_id=gallery_id).update(gallery_id=None)

    # 3. 删除 gallery 本身
    await gallery.delete()
    
    # 4. 同步从 ChromaDB 向量库中删除该相册的特征向量（注意使用裸 ID 字符串）
    try:
        gallery_collection.delete(ids=[str(gallery_id)])
    except Exception as e:
        logger.error(f"Failed to delete gallery vector for gallery_id={gallery_id}: {e}")

    return True, count

# # 【new2.4-4】修改图片归属
# async def update_image_gallery(
#     image_id: int,
#     gallery_id: int | None
# ):
#     image = await Image.get_or_none(id=image_id, is_deleted=False)
#     if not image:
#         return None
#     # 先移除所有旧相册关系（因为要“单归属效果”）
#     old_galleries = await image.galleries.all()
#     for g in old_galleries:
#         await g.image.remove(image)
#         await recalc_image_count(g)
#     # 如果是 null → 变成未归类
#     if gallery_id is None:
#         return image
#     # 获取新相册
#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         return None
#     # 禁止回收站
#     if gallery.id == RECYCLE_GALLERY_ID:
#         return None
#     # 添加新关系
#     await safe_add_image(gallery, image)
#     await recalc_image_count(gallery)
#     return image

async def update_image_gallery(
    image_id: int,
    gallery_id: int | None
):
    image = await Image.get_or_none(id=image_id, status="active")
    if not image:
        return None
    # 校验目标相册是否存在
    if gallery_id is not None:
        gallery = await Gallery.get_or_none(id=gallery_id)
        if not gallery:
            return None
    # 核心：直接改归属
    image.gallery_id = gallery_id
    await image.save()

    return image

# # 【new2.4-5】将图片移动到回收站
# async def move_image_to_trash(image_id: int):
#     image = await Image.get_or_none(id=image_id, is_deleted=False)
#     if not image:
#         return None

#     image.is_deleted = True
#     image.deleted_at = datetime.now()  
#     await image.save()

#     return image

async def move_image_to_trash(image_id: int):
    image = await Image.get_or_none(id=image_id)
    if not image:
        return None

    image.status = "trash"
    image.deleted_at = datetime.now()
    await image.save()

    return image

# # 【new2.5-1】分页展示回收站内容
# async def list_trash_images(
#     start: int,
#     end: int,
#     query: str | None,
#     sort_by: str,
#     sort_order: str
# ):
#     qs = Image.filter(is_deleted=True)

#     # 搜索
#     if query:
#         qs = qs.filter(
#             Q(file_path__icontains=query) |
#             Q(description__icontains=query)
#         )
#     # 排序
#     if sort_by == "deleted_at":
#         order = "-deleted_at" if sort_order == "desc" else "deleted_at"
#     else:
#         order = "-upload_time"
#     qs = qs.order_by(order)
#     total = await qs.count()
#     # 分页
#     images = await qs.offset(start - 1).limit(end - start + 1)
#     return images, total

async def list_trash_images(
    start: int,
    end: int,
    query: str | None,
    sort_by: str,
    sort_order: str
):
    qs = Image.filter(status="trash")

    if query:
        qs = qs.filter(filename__icontains=query)

    order = "-deleted_at" if sort_order == "desc" else "deleted_at"
    qs = qs.order_by(order)

    total = await qs.count()
    items = await qs.offset(start - 1).limit(end - start + 1)

    return items, total

# 【new2.5-2】根据id批量删除图片
# async def batch_move_to_trash(image_ids: list[int]):
#     count = 0
#     for image_id in image_ids:
#         image = await Image.get_or_none(id=image_id, is_deleted=False)
#         if not image:
#             continue
#         image.is_deleted = True
#         image.deleted_at = datetime.now()
#         await image.save()
#         count += 1

#     return count

async def batch_move_to_trash(image_ids: list[int]):
    count = 0
    for image_id in image_ids:
        image = await Image.get_or_none(id=image_id, status="active")
        if not image:
            continue
        image.status = "trash"
        image.deleted_at = datetime.now()
        await image.save()
        count += 1
    return count

# 【new2.5-3】恢复图片（单张）
async def restore_image(image_id: int):
    image = await Image.get_or_none(id=image_id, status="trash")
    if not image:
        return None

    image.status = "active"
    image.deleted_at = None
    await image.save()

    return image

# 【new2.5-4】物理删除图片
async def delete_image_permanently(image_id: int):
    image = await Image.get_or_none(id=image_id)
    if not image:
        return False

    await image.delete()
    return True

# 被注释掉的是只能删除回收站里的图片
# async def delete_image_permanently(image_id: int):
#     image = await Image.get_or_none(id=image_id, status="trash")
#     if not image:
#         return False

#     await image.delete()
#     return True

# 【2.5-5】清空回收站
async def clear_trash():
    images = await Image.filter(status="trash")

    count = await images.count()

    for img in images:
        await img.delete()

    return count

# 【2.5-6】获取图片详情
# async def get_image_detail_context(image_id: int, gallery_id: int | None):
#     """
#     获取图片详情 + 上一张 + 下一张
#     """

#     # 当前图片
#     image = await Image.get_or_none(id=image_id, is_deleted=False)
#     if not image:
#         return None

#     # 获取图片列表（根据 gallery_id）
#     if gallery_id:
#         gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#         if not gallery:
#             return None

#         images = await gallery.image.filter(is_deleted=False).order_by("id")
#     else:
#         # 未归类图片（简单处理：全部图片）
#         images = await Image.filter(is_deleted=False).order_by("id")

#     # 找当前图片位置
#     image_list = list(images)
#     index = None

#     for i, img in enumerate(image_list):
#         if img.id == image_id:
#             index = i
#             break

#     if index is None:
#         return None

#     # 上一张 / 下一张
#     previous_image = image_list[index - 1] if index > 0 else None
#     next_image = image_list[index + 1] if index < len(image_list) - 1 else None

#     return {
#         "image": image,
#         "previous": previous_image,
#         "next": next_image
#     }

async def get_image_detail_context(image_id: int, gallery_id: int | None):
    image = await Image.get_or_none(id=image_id, status="active")
    if not image:
        return None

    # 获取同一“列表”
    if gallery_id is not None:
        qs = Image.filter(
            gallery_id=gallery_id,
            status="active"
        ).order_by("created_at")
    else:
        qs = Image.filter(
            gallery_id=None,
            status="active"
        ).order_by("created_at")

    image_list = await qs

    # 找位置
    index = None
    for i, img in enumerate(image_list):
        if img.id == image_id:
            index = i
            break

    if index is None:
        return None

    previous_image = image_list[index - 1] if index > 0 else None
    next_image = image_list[index + 1] if index < len(image_list) - 1 else None

    return {
        "image": image,
        "previous": previous_image,
        "next": next_image
    }






# # 新增Recover相册工具函数
# async def get_or_create_recover_gallery():
#     # 查找是否已有 Recover 相册
#     gallery = await Gallery.get_or_none(
#         name="Recover",
#         is_deleted=False
#     )

#     # 没有就创建
#     if not gallery:
#         gallery = await Gallery.create(
#             name="Recover",
#             description="Auto created for restored images",
#             parent_id=None,
#             image_count=0
#         )

#     return gallery


# async def get_gallery_by_id(gallery_id: int) -> Gallery | None:
#     """
#     根据画廊 ID 获取画廊对象。

#     :param gallery_id: 画廊 ID
#     :return: Gallery 对象或 None
#     """
#     gallery = await Gallery.get_or_none(id=gallery_id)
#     return gallery


# # 递归删除子相册函数
# async def _mark_children_deleted(parent_gallery_id: int):
#     """
#     递归标记所有子相册为删除状态
#     不改变 parent_id，只修改 is_deleted
#     """
#     children = await Gallery.filter(parent_id=parent_gallery_id)

#     for child in children:
#         if not child.is_deleted:
#             child.deleted_parent_id = child.parent_id
#             child.is_deleted = True
#             await child.save(update_fields=["is_deleted", "deleted_parent_id"])

#         await _mark_children_deleted(child.id)
# async def delete_gallery(gallery_id: int) -> bool:
#     """
#     软删除画廊，将其放入回收站。

#     :param gallery_id: 画廊 ID
#     :return: 是否删除成功
#     """
#     if gallery_id == RECYCLE_GALLERY_ID:
#         return False

#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         return False

#     # 记录删除前位置
#     gallery.deleted_parent_id = gallery.parent_id

#     # 移动到回收站
#     gallery.parent_id = RECYCLE_GALLERY_ID
#     gallery.is_deleted = True
#     #gallery.deleted_time = datetime.now()

#     await gallery.save(update_fields=[
#         "parent_id",
#         "is_deleted",
#         "deleted_parent_id"
#     ])
#     # 新增：递归删除子相册
#     await _mark_children_deleted(gallery.id)

#     return True

# # 递归恢复子相册
# async def _restore_children(parent_gallery_id: int):
#     """
#     递归恢复子相册
#     """
#     children = await Gallery.filter(parent_id=parent_gallery_id)

#     for child in children:

#         if child.is_deleted:

#             parent = await Gallery.get_or_none(
#                 id=child.deleted_parent_id,
#                 is_deleted=False
#             )

#             if parent:
#                 child.parent_id = parent.id
#             else:
#                 child.parent_id = None

#             child.is_deleted = False
#             child.deleted_parent_id = None

#             await child.save()

#         await _restore_children(child.id)
# async def restore_gallery(gallery_id: int) -> bool:
#     """
#     从回收站恢复画廊。

#     :param gallery_id: 画廊 ID
#     :return: 是否恢复成功
#     """
#     gallery = await Gallery.get_or_none(
#         id=gallery_id,
#         parent_id=RECYCLE_GALLERY_ID,
#         is_deleted=True
#     )
#     if not gallery:
#         return False

#     #这个报错不用理
#     parent_id = gallery.deleted_parent_id
#     # 检查父目录是否存在，若不存在则恢复到根目录Root下
#     if parent_id:
#         parent = await Gallery.get_or_none(
#             id=parent_id,
#             is_deleted=False
#         )
#         if not parent or parent.is_deleted:
#             gallery.parent_id = None
#         else:
#             gallery.parent_id = parent_id
#     else:
#         gallery.parent_id = None
#     gallery.deleted_parent_id = None
#     gallery.is_deleted = False

#     await gallery.save()
#     # 恢复子相册
#     await _restore_children(gallery.id)

#     return True


# # 修改原 获取回收站中的画廊列表 为 相册内容查询（通用接口，包括回收站的查询，查询结果包括相册和图片）
# async def get_gallery_content(gallery_id: int):
#     # 根目录
#     if gallery_id == ROOT_ID:
#         sub_galleries = await Gallery.filter(
#             parent_id=None,
#             is_deleted=False
#         )
#         images = []
#         return {
#             "galleries": sub_galleries,
#             "images": images
#         }
#     # 回收站
#     if gallery_id == RECYCLE_GALLERY_ID:
#         # 只显示直接删除的相册
#         sub_galleries = await Gallery.filter(
#             parent_id=RECYCLE_GALLERY_ID,
#             is_deleted=True
#         )
#         # 查回收站图片
#         trash_records = await ImageGalleryTrash.filter(
#             restored=False
#         ).prefetch_related("image")

#         images = []

#         for record in trash_records:
#             if record.image:
#                 images.append({
#                     "image": record.image,
#                     "gallery_id": record.gallery_id
#                 })

#         return {
#             "galleries": sub_galleries,
#             "images": images
#         }
#     # 普通相册
#     gallery = await Gallery.get_or_none(
#         id=gallery_id,
#         is_deleted=False
#     )
#     if not gallery:
#         return None
#     # 子相册
#     sub_galleries = await Gallery.filter(
#         parent_id=gallery_id,
#         is_deleted=False
#     )
#     # 相册图片
#     images = await gallery.image.filter(
#         is_deleted=False
#     )
#     return {
#         "galleries": sub_galleries,
#         "images": images
#     }

# async def add_image_to_gallery(image_id: int, gallery_id: int) -> bool:
#     """
#     将图片添加到画廊。

#     :param image_id: 图片 ID
#     :param gallery_id: 画廊 ID
#     :return: 是否添加成功
#     """
#     # ROOT特殊处理，按理来说ROOT不应该直接存图片的可以不用管
#     if gallery_id == ROOT_ID:
#         gallery_id = None

#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         logger.warning(f"Add image failed: Gallery not found or deleted: ID={gallery_id}")
#         return False
    
#      # 禁止回收站操作
#     if gallery.parent_id == RECYCLE_GALLERY_ID:
#         return False
    
#     image = await Image.get_or_none(id=image_id, is_deleted=False)
#     if not image:
#         logger.warning(f"Add image failed: Image not found or deleted: ID={image_id}")
#         return False
#     # 防止重复添加
#     if await gallery.image.filter(id=image_id).exists():
#         return True

#     await safe_add_image(gallery, image)
#     logger.info(f"Image ID {image_id} added to Gallery ID {gallery_id} successfully.")

#     await recalc_image_count(gallery)
#     logger.info(f"Gallery ID {gallery_id} image count updated to {gallery.image_count}.")
    
#     return True

# async def batch_add_images_to_gallery(image_ids: List[int], gallery_id: int) -> dict:
#     """
#     批量将图片添加到画廊。

#     :param image_ids: 图片 ID 列表
#     :param gallery_id: 画廊 ID
#     :return: 包含添加结果的字典
#     """
#     # ROOT 特殊处理
#     if gallery_id == ROOT_ID:
#         gallery_id = None

#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         logger.warning(f"Batch add images failed: Gallery not found or deleted: ID={gallery_id}")
#         return {"success": False, "message": "Gallery not found or deleted", "added_count": 0}

#     # 禁止回收站
#     if gallery.id == RECYCLE_GALLERY_ID:
#         return {
#             "success": False,
#             "message": "Cannot add image to recycle bin",
#             "added_count": 0
#         }

#     added_count = 0
#     for image_id in image_ids:
#         image = await Image.get_or_none(id=image_id, is_deleted=False)
#         if not image:
#             logger.warning(f"Batch add images failed: Image not found or deleted: ID={image_id}")
#             continue
#         # 防止一张图片重复添加至同一相册中
#         if await gallery.image.filter(id=image_id).exists():
#             continue

#         await safe_add_image(gallery, image)
#         added_count += 1
#         logger.info(f"Image ID {image_id} added to Gallery ID {gallery_id} successfully.")

#     if added_count > 0:
#         await recalc_image_count(gallery)
#         logger.info(f"Gallery ID {gallery_id} image count updated to {gallery.image_count}.")

#     return {"success": True, "message": f"{added_count} images added to gallery", "added_count": added_count}
    
# # 新增检测函数
# async def _is_descendant(parent_id: int, target_id: int) -> bool:
#     """
#     检查target是否是parent的子孙节点
#     """
#     children = await Gallery.filter(parent_id=parent_id,is_deleted=False)
#     for child in children:
#         if child.id == target_id:
#             return True
#         if await _is_descendant(child.id, target_id):
#             return True
#     return False

# # 新增相册移动函数
# async def move_gallery(gallery_id: int, new_parent_id: int) -> bool:
#     # Root特殊处理
#     if new_parent_id == ROOT_ID:
#         new_parent_id = None
#     # 回收站不可移动
#     if gallery_id == RECYCLE_GALLERY_ID:
#         return False
#     gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
#     if not gallery:
#         return False
#     # 不能移动到自己
#     if gallery_id == new_parent_id:
#         return False
#     # Root不需要检测parent
#     if new_parent_id is not None:
#         parent = await Gallery.get_or_none(id=new_parent_id, is_deleted=False)
#         if not parent:
#             return False
#         # 防止循环目录
#         if await _is_descendant(gallery_id, new_parent_id):
#             return False
#     gallery.parent_id = new_parent_id
#     await gallery.save(update_fields=["parent_id"])
#     return True



# ### 新增图片操作

# # 从相册中移除图片（若图片存在于多个相册中，当移除某相册中的图片其余相册中该图片不会受影响）
# async def remove_image_from_gallery(image_id: int, gallery_id: int):

#     if gallery_id == RECYCLE_GALLERY_ID:
#         return False

#     image = await Image.get_or_none(id=image_id)
#     gallery = await Gallery.get_or_none(id=gallery_id)

#     if not image or not gallery:
#         return False

#     # 判断图片是否在该相册
#     if not await gallery.image.filter(id=image_id).exists():
#         return False

#     # 移除关系
#     await gallery.image.remove(image)

#     # 写入回收站记录
#     await ImageGalleryTrash.create(
#         image_id=image_id,
#         gallery_id=gallery_id,
#         restored=False
#     )

#     # 更新图片数量
#     await recalc_image_count(gallery)
#     # 更新回收站图片数量
#     await recalc_recycle_count()

#     # 判断图片是否还存在其他相册
#     other_galleries = await image.galleries.filter(
#         is_deleted=False
#     ).exclude(id=gallery_id).exists()

#     if not other_galleries:
#         image.is_deleted = True
#         await image.save()

#     return True
# # 从回收站恢复图片
# async def restore_image(image_id: int, gallery_id: int):

#     image = await Image.get_or_none(id=image_id)
#     gallery = await Gallery.get_or_none(id=gallery_id)
#     if not image:
#         return False
#     # 如果原相册不存在使用 Recover
#     if not gallery or gallery.is_deleted:
#         gallery = await get_or_create_recover_gallery()
#     trash_record = await ImageGalleryTrash.filter(
#         image_id=image_id,
#         gallery_id=gallery_id,
#         restored=False
#     ).first()
#     if not trash_record:
#         return False
#     # 恢复图片状态
#     image.is_deleted = False
#     await image.save()
#     # 安全添加图片到相册
#     exists = await gallery.image.filter(id=image_id).exists()
#     if not exists:
#         await gallery.image.add(image)
#     # 重新计算相册图片数量
#     await recalc_image_count(gallery)
#     # 标记回收站记录已恢复
#     trash_record.restored = True
#     await trash_record.delete()
#     # 更新回收站图片数量
#     await recalc_recycle_count()
#     return True

# # 新增图片的批量删除和恢复操作
# async def batch_remove_images(image_ids: list[int], gallery_id: int):
#     results = []

#     for image_id in image_ids:
#         res = await remove_image_from_gallery(image_id, gallery_id)
#         results.append({
#             "image_id": image_id,
#             "success": res
#         })

#     return results

# async def batch_restore_images(image_ids: list[int], gallery_id: int):
#     results = []

#     for image_id in image_ids:
#         res = await restore_image(image_id, gallery_id)
#         results.append({
#             "image_id": image_id,
#             "success": res
#         })

#     return results
# # 移动图片到其他相册
# async def move_image(image_id: int, from_gallery_id: int, to_gallery_id: int):
#     """
#     移动图片到另一个相册
#     """
#     # 1 获取图片
#     image = await Image.get_or_none(id=image_id)
#     if not image:
#         return None
#     # 2 禁止移动到根目录
#     if to_gallery_id == ROOT_ID:
#         raise ValueError("Cannot move image to root gallery")
#     # 3 禁止移动到回收站
#     if to_gallery_id == RECYCLE_GALLERY_ID:
#         raise ValueError("Cannot move image to recycle bin")
#     # 4 获取目标和源相册
#     source_gallery = await Gallery.get_or_none(
#         id=from_gallery_id,
#         is_deleted=False
#     )
#     target_gallery = await Gallery.get_or_none(
#         id=to_gallery_id,
#         is_deleted=False
#     )
#     if not source_gallery or not target_gallery:
#         return False
#     if not await source_gallery.image.filter(id=image_id).exists():
#         return False
#     # 7 移除旧关系
#     await source_gallery.image.remove(image)
#     await recalc_image_count(source_gallery)
#     # 8 添加新关系
#     await safe_add_image(target_gallery, image)
#     await recalc_image_count(target_gallery)
#     return True




# # 因为没有回收站相册了所以这边逻辑要进行删除，但是创建相册那边还没开始整合
# async def get_or_create_recycle_gallery() -> Gallery:
#     """
#     获取或预创建系统回收站画廊（固定 ID = 1）。

#     确保系统中始终存在一个 ID=1 的回收站画廊，
#     防止普通画廊创建时占用该 ID。
#     """
#     gallery = await Gallery.get_or_none(id=RECYCLE_GALLERY_ID)
#     if not gallery:
#         gallery = await Gallery.create(
#             id=RECYCLE_GALLERY_ID,
#             name="Recycle Bin",
#             description="System recycle bin",
#             created_time=datetime.now(),
#             is_deleted=False
#         )
#         print("System Recycle Bin gallery created.")
#     return gallery