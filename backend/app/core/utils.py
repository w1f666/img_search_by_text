from typing import List
from db.sql_db.models.image import Image
from app.core.clip_handler import CLIPHandler
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

async def phash_check(phash:str):
    """
    使用感知哈希检查图片是否重复。
    
    :param phash: 图片的感知哈希值
    :return: 如果检测到重复图片则返回 True，否则返回 None
    """
    if await Image.filter(p_hash=phash).exists():
            logger.info(f"Duplicate detected in strict mode: Image with pHash {phash} already exists.")
            return True
        
    HANMING_DISTANCE_THRESHOLD = 5  # 定义感知哈希的汉明距离阈值
    try:
        parts = split_phash(phash) 
        if len(parts) == 4:
            candidates = await Image.filter(
                Q(phash_p1=[parts[0]] ) |
                Q(phash_p2=[parts[1]] ) |
                Q(phash_p3=[parts[2]] ) |
                Q(phash_p4=[parts[3]] )
            ).values_list("p_hash", flat=True)
            #values_list方法限制查询结果只包含phash字段，flat=True表示返回一个扁平列表
            
            print(candidates)
            
            target_obj = imagehash.hex_to_hash(phash)
            
            for candidate_phash in candidates:
                
                if not candidate_phash or len(candidate_phash) < 4:
                    continue
                
                #这报错别理
                candidate_hash_obj = imagehash.hex_to_hash(candidate_phash)
                if target_obj - candidate_hash_obj <= HANMING_DISTANCE_THRESHOLD:
                    logger.info(f"Duplicate detected by pHash similarity: Image with pHash {candidate_phash} is similar to {phash}.")
                    return True
    except Exception as e:
        logger.error(f"pHash check error: {e}")
        
async def vector_check(vector: List[float], threshold: float = 0.9):
    """
    使用向量相似度检查图片是否重复。
    
    :param vector: 图片的向量表示
    :param threshold: 相似度阈值，默认值为0.9
    :return: 如果检测到重复图片则返回 True，否则返回 None
    """
    clip=CLIPHandler()
    pass

async def duplicate_check(
    img_hash: str,
    phash: str, 
    vector: List[float],
    strict: bool = False
) -> bool | None:
    """
    检查图片是否为重复图片。
    
    :param img_hash: 图片的 MD5 哈希值
    :param phash: 图片的感知哈希值
    :param vector: 图片的向量表示
    :param strict: 是否启用严格模式（包括感知哈希和向量相似度检查）
    :return: 如果检测到重复图片则返回 True，否则返回 None
    """
    # 根据 MD5 哈希值查询图片是否已存在
    if await Image.filter(file_hash=img_hash).exists():
        logger.info(f"Duplicate detected: Image with hash {img_hash} already exists.")
        return True
    elif strict:
        # 严格模式下，根据感知哈希值查询图片是否已存在
        if await phash_check(phash):
            return True
        
        else:
            # 最后在进行向量相似度检查
            pass
            