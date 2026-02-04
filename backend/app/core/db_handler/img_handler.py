from db.vector_db.client import collection
from typing import List
from db.sql_db.models.image import Image
from datetime import datetime
from app.logs.config import logger
from app.core.utils import split_phash
from app.core.utils import duplicate_check
    
async def add_img_to_database(
    img_path: str, 
    img_hash: str,
    phash: str, 
    vector: List[float],
    strict: bool#如果为TRUE，则在添加前会检查感知哈希以防止重复，CLIP向量相似度检查
) -> Image | List[int]:
    """
    将图片元数据存入 SQLite，向量存入 ChromaDB。
    在存入前会检查 hash 值以防止重复。

    :return: 新添加的图片记录，或检测到的重复图片 ID 列表
    """
    logger.info(f"current process image: {img_path} - Adding image to database...")
    duplicates_img_ids = await duplicate_check(
        img_hash=img_hash,
        phash=phash,
        vector=vector,
        strict=strict
    )
    
    if duplicates_img_ids:
        return duplicates_img_ids
    
    four_parts = split_phash(phash)
    #存入SQLite数据库,切分用于计算汉明距离
    new_img_record = await Image.create(
        file_path=img_path,
        file_hash=img_hash,
        p_hash=phash,
        upload_time=datetime.now(),
        phash_p1=four_parts[0],
        phash_p2=four_parts[1],
        phash_p3=four_parts[2],
        phash_p4=four_parts[3],
    )
    
    # 存入 ChromaDB 向量数据库
    collection.add(
        ids=[str(new_img_record.id)],
        embeddings=[vector],
    )
    
    logger.info(f"Image added successfully: ID={new_img_record.id}, Path={img_path}")
    return new_img_record

async def search_similar_images(
    vector: List[float],
    top_k: int = 5
) -> List[dict]:
    """
    在 ChromaDB 中根据给定的向量搜索相似图片。
    
    :param vector: 用于搜索的特征向量
    :param top_k: 返回的最大结果数
    :return: 包含相似图片信息的字典列表
    """
    results = collection.query(
        query_embeddings=[vector],
        n_results=top_k,
        include=["distances"]
    )
    
    similar_images = []
    
    if not results['ids'][0] or not results['distances']:  # 检查是否有结果
        logger.warning("No similar images found in vector database.")
        return similar_images  # 如果没有结果，返回空列表
    
    for dist, img_id in zip(results['distances'][0], results['ids'][0]):  
        image_url= await Image.get_or_none(id=img_id)
        similar_images.append({
            "image_id": img_id,
            "distance": dist,
            "image_url": image_url
        })

    return similar_images

async def delete_image_by_path(image_path: str) -> bool:
    """
    删除指定路径的图片记录（软删除）。

    :param image_path: 要删除的图片路径
    :return: 删除操作是否成功（如果路径不存在则返回 False）
    """
    # 使用 filter().update() 直接更新，返回受影响的行数
    updated_count = await Image.filter(file_path=image_path).update(is_deleted=True)
    
    if updated_count == 0:
        logger.warning(f"Delete failed: Image path not found or already deleted: {image_path}")
        return False
    
    logger.info(f"Image moved to Recycle Bin: {image_path}")
    return True

async def restore_image_by_path(image_path: str) -> bool:
    """
    恢复指定路径的图片记录。

    :param image_path: 要恢复的图片路径
    :return: 恢复操作是否成功
    """
    updated_count = await Image.filter(file_path=image_path).update(is_deleted=False)
    
    if updated_count == 0:
        logger.warning(f"Restore failed: Image path not found or not deleted: {image_path}")
        return False
    
    logger.info(f"Image restored from Recycle Bin: {image_path}.")
    return True

async def delete_image_by_id(image_id: int) -> bool:
    """
    通过 ID 删除图片（软删除）。
    """
    updated_count = await Image.filter(id=image_id).update(is_deleted=True)
    
    if updated_count == 0:
        logger.warning(f"Delete failed: Image ID not found or already deleted: {image_id}")
        return False
    
    logger.info(f"Image moved to Recycle Bin: ID={image_id}")
    return True

async def restore_image_by_id(image_id: int) -> bool:
    """
    通过 ID 恢复图片。
    """
    updated_count = await Image.filter(id=image_id).update(is_deleted=False)
    
    if updated_count == 0:
        logger.warning(f"Restore failed: Image ID not found or not deleted: {image_id}")
        return False
    
    logger.info(f"Image restored from Recycle Bin: ID={image_id}")
    return True