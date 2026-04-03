import os
from PIL import Image
from hashlib import md5
import imagehash
from app.core.clip_handler import CLIPHandler
from app.logs.config import logger

THUMBNAIL_DIR = os.path.join(os.getcwd(), "frontend", "public", ".thumbnails")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

def generate_thumbnail_from_img(img: Image.Image, file_hash: str, size=(256, 256)) -> str:
    """
    根据已打开的 PIL Image 对象生成缩略图并保存为 WebP 格式
    在这里使用 file_hash (MD5) 作为主键文件名，保证绝不会相互覆盖
    """
    thumb_filename = f"{file_hash}_thumb.webp"
    thumb_dist_path = os.path.join(THUMBNAIL_DIR, thumb_filename)
    
    # 转换为 RGB 以防原图是 RGBA/P 等不能直接存 JPG/WEBP 的格式
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # img.copy() 避免影响 CLIP 或感知哈希的特征提取
    thumb_img = img.copy()
    thumb_img.thumbnail(size) # 原地修改，保持长宽比缩小
    
    thumb_img.save(thumb_dist_path, format="WEBP", quality=80)
    
    # 返回给前端使用的路由路径
    return f"/.thumbnails/{thumb_filename}"

# 计算MD5哈希、感知哈希、特征向量
def image_process(
    img_path: str
    ) -> dict | None:
    """
    计算图像的MD5哈希、感知哈希和CLIP特征向量，同时附带生成缩略图
    """
    clip=CLIPHandler()

    try:
        with open(img_path, "rb") as f:
            file_hash = md5(f.read()).hexdigest()

        with Image.open(img_path) as img:
            phash = str(imagehash.phash(img))
            
            # 使用算出的 md5 作为名字直接生成缩略图
            thumb_url = generate_thumbnail_from_img(img, file_hash)
            
        clip_vector = clip.image_extract(img_path)

        return {
            "md5": file_hash, 
            "phash": phash, 
            "clip_vector": clip_vector,
            "thumbnail_url": thumb_url
        }

    except FileNotFoundError:
        logger.error(f"File not found: {img_path}")
        return None
    except Exception as e:
        logger.error(f"Error processing image {img_path}: {e}")
        return None