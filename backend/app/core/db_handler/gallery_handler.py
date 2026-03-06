from db.vector_db.client import collection
from typing import List
from db.sql_db.models.gallery import Gallery
from datetime import datetime
from app.logs.config import logger
from db.sql_db.models.image import Image

RECYCLE_GALLERY_ID = 1

async def create_gallery(
    name: str,
    description: str
) -> Gallery:
    """
    创建一个新的画廊记录。

    :param name: 画廊名称
    :param description: 画廊描述信息
    :return: 创建的 Gallery 对象
    """
    # 确保系统回收站已存在，占用 ID=1
    await get_or_create_recycle_gallery()

    new_gallery = await Gallery.create(
        name=name,
        description=description,
        created_time=datetime.now(),
        is_deleted=False,
        parent_id=None  # None顶层相册
    )
    logger.info(f"Gallery created successfully: ID={new_gallery.id}, Name={name}")
    return new_gallery

async def list_galleries() -> List[Gallery]:
    """
    获取所有正常画廊（不包含回收站）。

    :return: 画廊列表
    """
    galleries = await Gallery.filter(
        is_deleted=False
    ).exclude(
        id=RECYCLE_GALLERY_ID
    )
    return galleries

async def get_gallery_by_id(gallery_id: int) -> Gallery | None:
    """
    根据画廊 ID 获取画廊对象。

    :param gallery_id: 画廊 ID
    :return: Gallery 对象或 None
    """
    gallery = await Gallery.get_or_none(id=gallery_id)
    return gallery

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
        gallery.name = name
    if description is not None:
        gallery.description = description

    await gallery.save()
    return gallery

async def delete_gallery(gallery_id: int) -> bool:
    """
    软删除画廊，将其放入回收站。

    :param gallery_id: 画廊 ID
    :return: 是否删除成功
    """
    if gallery_id == RECYCLE_GALLERY_ID:
        return False

    gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
    if not gallery:
        return False

    # 记录删除前位置
    gallery.deleted_parent_id = gallery.parent_id

    # 移动到回收站
    gallery.parent_id = RECYCLE_GALLERY_ID
    gallery.is_deleted = True
    #gallery.deleted_time = datetime.now()

    await gallery.save()
    return True

async def restore_gallery(gallery_id: int) -> bool:
    """
    从回收站恢复画廊。

    :param gallery_id: 画廊 ID
    :return: 是否恢复成功
    """
    gallery = await Gallery.get_or_none(
        id=gallery_id,
        parent_id=RECYCLE_GALLERY_ID,
        is_deleted=True
    )
    if not gallery:
        return False

    #这个报错不用理
    gallery.parent_id = gallery.deleted_parent_id
    gallery.deleted_parent_id = None
    gallery.is_deleted = False

    await gallery.save()
    return True

async def get_or_create_recycle_gallery() -> Gallery:
    """
    获取或预创建系统回收站画廊（固定 ID = 1）。

    确保系统中始终存在一个 ID=1 的回收站画廊，
    防止普通画廊创建时占用该 ID。
    """
    gallery = await Gallery.get_or_none(id=RECYCLE_GALLERY_ID)
    if not gallery:
        gallery = await Gallery.create(
            id=RECYCLE_GALLERY_ID,
            name="Recycle Bin",
            description="System recycle bin",
            created_time=datetime.now(),
            is_deleted=False
        )
        print("System Recycle Bin gallery created.")
    return gallery

async def list_recycle_galleries() -> List[Gallery]:
    """
    获取回收站中的画廊列表（不包含回收站自身）。
    """
    # 确保回收站相册存在
    await get_or_create_recycle_gallery()

    galleries = await Gallery.filter(
        parent_id=RECYCLE_GALLERY_ID,
        is_deleted=True
    ).exclude(id=RECYCLE_GALLERY_ID)
    return galleries

async def add_image_to_gallery(image_id: int, gallery_id: int) -> bool:
    """
    将图片添加到画廊。

    :param image_id: 图片 ID
    :param gallery_id: 画廊 ID
    :return: 是否添加成功
    """
    gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
    if not gallery:
        logger.warning(f"Add image failed: Gallery not found or deleted: ID={gallery_id}")
        return False
    
    image = await Image.get_or_none(id=image_id, is_deleted=False)
    if not image:
        logger.warning(f"Add image failed: Image not found or deleted: ID={image_id}")
        return False

    await gallery.image.add(image)
    logger.info(f"Image ID {image_id} added to Gallery ID {gallery_id} successfully.")

    gallery.image_count += 1
    await gallery.save(update_fields=["image_count"])
    logger.info(f"Gallery ID {gallery_id} image count updated to {gallery.image_count}.")
    
    return True

async def batch_add_images_to_gallery(image_ids: List[int], gallery_id: int) -> dict:
    """
    批量将图片添加到画廊。

    :param image_ids: 图片 ID 列表
    :param gallery_id: 画廊 ID
    :return: 包含添加结果的字典
    """
    gallery = await Gallery.get_or_none(id=gallery_id, is_deleted=False)
    if not gallery:
        logger.warning(f"Batch add images failed: Gallery not found or deleted: ID={gallery_id}")
        return {"success": False, "message": "Gallery not found or deleted", "added_count": 0}

    added_count = 0
    for image_id in image_ids:
        image = await Image.get_or_none(id=image_id, is_deleted=False)
        if not image:
            logger.warning(f"Batch add images failed: Image not found or deleted: ID={image_id}")
            continue

        await gallery.image.add(image)
        added_count += 1
        logger.info(f"Image ID {image_id} added to Gallery ID {gallery_id} successfully.")

    if added_count > 0:
        gallery.image_count += added_count
        await gallery.save(update_fields=["image_count"])
        logger.info(f"Gallery ID {gallery_id} image count updated to {gallery.image_count}.")

    return {"success": True, "message": f"{added_count} images added to gallery", "added_count": added_count}