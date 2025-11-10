import os
from PIL import Image
from hashlib import md5
import imagehash
from app.core.clip_handler import CLIPHandler

clip = CLIPHandler()

# 计算MD5哈希、感知哈希、特征向量
def image_process(
    img_path: str
    ) -> dict | None:
    """
    计算图像的MD5哈希、感知哈希和CLIP特征向量
    :param img_path: 图像文件路径
    :return: dict 包含 'md5', 'phash', 'clip_vector'
    """
    if not clip.model or not clip.preprocess:
        print("Model is not loaded. Cannot process image.")
        return None

    try:
        with open(img_path, "rb") as f:
            file_hash = md5(f.read()).hexdigest()

        with Image.open(img_path) as img:
            phash = str(imagehash.phash(img))

        clip_vector = clip.image_extract(img_path)

        return {"md5": file_hash, "phash": phash, "clip_vector": clip_vector}

    except FileNotFoundError:
        print(f"File not found: {img_path}")
        return None
    except Exception as e:
        print(f"Error processing image {img_path}: {e}")
        return None


if __name__ == "__main__":
    for _ in os.listdir("backend/app/resource/gallery"):
        img=os.path.join("backend/app/resource/gallery", _)
        result = image_process(img)
        print(f"Processing {img}: {result}")
    