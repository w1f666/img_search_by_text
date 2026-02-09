from db.vector_db.client import collection
from typing import List
from db.sql_db.models.gallery import Gallery
from datetime import datetime
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
    print(f"Gallery '{name}' created with ID {new_gallery.id}.")
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
