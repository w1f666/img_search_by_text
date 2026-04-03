from typing import List,Set
from typing import List,Set
from db.sql_db.models.image import Image
from db.vector_db.client import collection
from db.vector_db.client import collection
from app.logs.config import logger
from tortoise.expressions import Q
import imagehash

def split_phash(phash: str) -> List[str]:
    """
    将感知哈希字符串分割为四个部分，便于汉明距离计算。

    :param phash: 完整的感知哈希字符串,长度应为16个十六进制字符
    :return: 分割后的四个部分列表
    """
    if not phash or len(phash) != 16:
        logger.warning("Invalid pHash provided for splitting.")
        return ["", "", "", ""]
    return [phash[i:i+4] for i in range(0, 16, 4)]

async def phash_check(phash:str) -> List[int] :
    """
    使用感知哈希检查图片是否重复。
    
    :param phash: 图片的感知哈希值
    :return: 返回重复图片的 ID 列表，如果没有检测到重复则返回 None
    :return: 返回重复图片的 ID 列表，如果没有检测到重复则返回 None
    """
    
    found_ids: Set[int] = set()
    
    exact_matches = await Image.filter(p_hash=phash).values_list("id", flat=True)
    if exact_matches:
        for img_id in exact_matches:
            #这个报错别理
            found_ids.add(img_id)
        logger.info(f"Exact pHash match found: {exact_matches}")
    
    found_ids: Set[int] = set()
        
    HANMING_DISTANCE_THRESHOLD = 3  # 定义感知哈希的汉明距离阈值
    try:
        parts = split_phash(phash) 
        if len(parts) == 4:
            candidates = await Image.filter(
                Q(phash_p1=parts[0] ) |
                Q(phash_p2=parts[1] ) |
                Q(phash_p3=parts[2] ) |
                Q(phash_p4=parts[3] )
            ).values_list("id","p_hash")
            #values_list方法限制查询结果包含字段，flat=True表示返回一个扁平列表
            
            target_obj = imagehash.hex_to_hash(phash)
            
            for img_id, candidate_phash in candidates:
                
                #完全匹配的无需计算汉明距离
                if img_id in found_ids:
                    continue
                
                if not candidate_phash or len(candidate_phash) < 4:
                    continue
                
                #这报错别理
                candidate_hash_obj = imagehash.hex_to_hash(candidate_phash)
                distance = target_obj - candidate_hash_obj
                
                if target_obj - candidate_hash_obj <= HANMING_DISTANCE_THRESHOLD:
                    logger.info(f"Similarity detected (dist={distance}): ID {img_id}")
                    found_ids.add(img_id)
                    
    except Exception as e:
        logger.error(f"pHash check error: {e}")
        
    return list(found_ids) 

async def vector_check(vector: List[float], threshold: float , top_k) -> List[int]:
    """
    使用向量相似度检查图片是否重复。
    
    :param vector: 图片的向量表示
    :param threshold: 相似度阈值，默认值为0.9
    :param top_k: 检索的最相似向量数量，默认值为5
    :return: 返回相似度超过阈值的图片 ID 列表,如果没有检测到相似图片则返回空列表
    """
    found_ids: Set[int] = set()
    
    try:
        result = collection.query(
            query_embeddings=[vector],
            n_results=top_k,
        )
        
        if not result['ids'][0] or not result['distances']:  # 检查是否有结果
            logger.warning("No similar images found in vector database.")
            return []  # 如果没有结果，返回空列表
        
        ids_str = result['ids'][0]
        scores = result['distances'][0]
        
        for img_id, score in zip(ids_str, scores):
            if score <= threshold:
                logger.info(f"Vector similarity detected: ID {img_id} score {score}")
                try:
                    found_ids.add(int(img_id))
                except ValueError:
                    logger.error(f"Invalid image ID format: {img_id}")
    except Exception as e:
        logger.error(f"Vector check error: {e}")
    
    return list(found_ids)

    
async def duplicate_check(
    img_hash: str,
    phash: str, 
    vector: List[float],
    strict: bool = True
) -> List[int]:
    """
    检查图片是否为重复图片。
    
    :param img_hash: 图片的 MD5 哈希值
    :param phash: 图片的感知哈希值
    :param vector: 图片的向量表示
    :param strict: 是否启用严格模式（包括感知哈希和向量相似度检查）
    :return: 如果检测到重复图片则返回 True，否则返回 None
    """
    all_duplicate_ids: Set[int] = set()
    
    # 1.MD5:根据 MD5 哈希值查询图片是否已存在
    md5_matches = await Image.filter(file_hash=img_hash).values_list("id", flat=True)   
    if md5_matches:
        logger.info(f"Duplicate detected by MD5: {md5_matches}")
        for img_id in md5_matches:
            #依旧不用管这个报错
            all_duplicate_ids.add(img_id)
    if strict:
        # 2.pHash:使用感知哈希检查重复
        phash_duplicates = await phash_check(phash)
        if phash_duplicates:
            for img_id in phash_duplicates:
                all_duplicate_ids.add(img_id)

        # 3.Vector:使用向量相似度检查重复
        vector_duplicates = await vector_check(vector, threshold=0.2 , top_k=5)
        if vector_duplicates:
            for img_id in vector_duplicates:
                all_duplicate_ids.add(img_id)
    
    return list(all_duplicate_ids)