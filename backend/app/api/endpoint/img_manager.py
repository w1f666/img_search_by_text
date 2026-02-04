from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List
from app.core.img_process import image_process
from app.core.db_handler.img_handler import add_img_to_database 

img_manage_router = APIRouter()

class AddImageRequest(BaseModel):
    file_path: List[str]

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
        db_result = await add_img_to_database(
            img_path=img_path,
            img_hash=img_hash,
            phash=phash,
            vector=vector,
            strict=True
        )

        if isinstance(db_result, list):  
            # 如果返回的是重复图片ID列表
            duplicate_images.append({
                "file_path": img_path,
                "duplicate_ids": db_result
            })
        else:
            added_images.append(db_result)

    return {
        "message": "Images processed",
        "add_count": len(added_images),
        "duplicate_count": len(duplicate_images),
        "added_images": added_images,
        "duplicate_images": duplicate_images
    }
    
async def delete_image_api(
    image_id: int = Form(..., description="要删除的图片ID")
):
    """
    删除指定ID的图片记录。

    :param image_id: 要删除的图片ID
    :return: 删除操作的结果消息
    """

    success = await delete_image_by_id(image_id)

    if not success:
        raise HTTPException(status_code=404, detail="Image not found")

    return {
        "message": f"Image with ID {image_id} deleted successfully"
    }