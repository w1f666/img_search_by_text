from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List

from app.core.img_process import image_process
from app.core.db_handler import add_img_to_database

img_manage_router = APIRouter()

class AddImageRequest(BaseModel):
    file_path:list[str]


#TODO 修改添加逻辑，敲定是使用独立文件夹保存还是只存储文件路径
@img_manage_router.post("/add")
async def add_images_api(request: AddImageRequest):
    """
    批量添加图片到数据库。
    接收图片文件路径列表，处理每张图片并存入数据库，防止重复添加。

    :param request: 包含图片文件路径列表的请求体
    :return: 成功添加的图片记录列表和重复图片路径列表
    """
    
    added_images = []
    duplicate_images = []

    for img_path in request.file_path:
        # 处理图片，获取hash和向量
        result = image_process(img_path)
        if not result:
            continue  # 如果处理失败，跳过该图片

        img_hash = result['md5']
        phash = result['phash']
        vector = result['clip_vector']

        # 尝试将图片添加到数据库
        result = await add_img_to_database(
            img_path=img_path,
            img_hash=img_hash,
            phash=phash,
            vector=vector
        )

        if result == "duplicate":
            duplicate_images.append(img_path)
        else:
            added_images.append(result)

    return {
        "message": "Images added successfully",
        "added_images": added_images,
        "duplicate_images": duplicate_images
    }