from db.vector_db.client import collection
from typing import List
from db.sql_db.models.gallery import Gallery
from datetime import datetime

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
    new_gallery = await Gallery.create(
        name=name,
        description=description,
        created_time=datetime.now()
    )
    print(f"Gallery '{name}' created with ID {new_gallery.id}.")
    return new_gallery
