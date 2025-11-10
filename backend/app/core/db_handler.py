"""
# TODO:

where

作用：按 metadata 过滤候选集合，语法是“类 Mongo 表达式”的字典。
常见操作符：
逻辑：$and, $or
比较：$eq, $ne, $gt, $gte, $lt, $lte
集合：$in, $nin
示例：{"$and": [{"color": "red"}, {"price": {"$gte": 4.20}}]}

依照这个思路，可以实现按图片元数据过滤搜索结果的功能。
"""

from db.vector_db.client import collection
from typing import List
from db.sql_db.models.image import Image
from datetime import datetime

THRESHOLD = 0.3

async def add_img_to_database(
    img_path: str, 
    img_hash: str,
    phash: str, 
    vector: List[float],
    strict: bool = False#如果为TRUE，则在添加前会检查感知哈希以防止重复，CLIP向量相似度检查
) -> Image | str:
    """
    将图片元数据存入 SQLite，向量存入 ChromaDB。
    在存入前会检查 hash 值以防止重复。

    :return: 成功时返回创建的 ImageMeta 对象，如果图片重复则返回字符串 "duplicate"。
    """
    # 根据 MD5 哈希值查询图片是否已存在
    if await Image.filter(file_hash=img_hash).exists():
        print(f"Duplicate detected: Image with hash {img_hash} already exists.")
        return "duplicate"
    
    if strict:
        # 严格模式下，根据感知哈希值查询图片是否已存在
        if await Image.filter(p_hash=phash).exists():
            print(f"Duplicate detected in strict mode: Image with pHash {phash} already exists.")
            return "duplicate"
    #存入SQLite数据库
    new_img_record = await Image.create(
        file_path=img_path,
        file_hash=img_hash,
        p_hash=phash,
        upload_time=datetime.now()
    )
    
    # 存入 ChromaDB 向量数据库
    collection.add(
        ids=[str(new_img_record.id)],
        embeddings=[vector],
    )
    
    print(f"Image {img_path} added with ID {new_img_record.id}.")
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
        print("No similar images found.")
        return similar_images  # 如果没有结果，返回空列表
    
    for dist, img_id in zip(results['distances'][0], results['ids'][0]):  
        image_url= await Image.get_or_none(id=img_id)
        similar_images.append({
            "image_id": img_id,
            "distance": dist,
            "image_url": image_url
        })

    return similar_images