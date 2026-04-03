import os
import subprocess
import time
import shutil
import numpy as np
from PIL import Image
from app.logs.config import logger

try:
    import torch
    import torchvision.transforms as T
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
except ImportError:
    logger.warning("torch or torchvision is not installed. MobileNet fallback will fail.")

class LightWeightFeatureExtractor:
    """极其轻量的本地特征提取器，提取出的特征仅用于时序查重，不入主特征库"""
    def __init__(self):
        logger.info("Initializing MobileNetV3 for frame deduplication...")
        weights = MobileNet_V3_Small_Weights.DEFAULT
        self.model = mobilenet_v3_small(weights=weights)
        self.model.classifier = torch.nn.Identity()
        self.model.eval()
        
        # 【优化1】显式指定使用 CPU！
        # 理由：MobileNetV3太小，CPU算力完全溢出。将宝贵的GPU显存全部留给后续的CLIP主模型。
        self.device = torch.device('cpu') 
        self.model.to(self.device)
        self.preprocess = weights.transforms()

    @torch.no_grad()
    def extract(self, image_path: str) -> np.ndarray:
        try:
            with Image.open(image_path) as img:
                img_rgb = img.convert('RGB')
                tensor = self.preprocess(img_rgb).unsqueeze(0).to(self.device)
            # 输出 576 维向量
            feature = self.model(tensor).numpy().flatten()
            return feature / np.linalg.norm(feature) # L2 归一化用于余弦距离
        except Exception as e:
            logger.error(f"Failed to extract feature for {image_path}: {e}")
            return None


def extract_frames_with_fallback(video_path: str, temp_dir: str) -> list:
    """
    尝试提取 I 帧，若失败或过少，自动降级到固定抽帧
    """
    os.makedirs(temp_dir, exist_ok=True)
    temp_pattern = os.path.join(temp_dir, "frame_%05d.jpg")
    
    # 策略A：尝试首选 I 帧
    command_i = [
        "ffmpeg", "-y", "-i", video_path, 
        "-vf", "select='eq(pict_type,I)'", "-vsync", "0", "-q:v", "3", temp_pattern
    ]
    
    logger.info("Extracting raw frames (trying I-frames first)...")
    try:
        subprocess.run(command_i, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except subprocess.CalledProcessError:
        pass # 静默捕获，下方通过文件数量判断是否成功

    frames = sorted([f for f in os.listdir(temp_dir) if f.endswith('.jpg')])
    
    # 【优化3】兜底策略：如果 I 帧提取出来不到 3 帧（可能是奇葩编码），强制降级到 1fps 抽帧
    if len(frames) < 3:
        logger.warning(f"Failed to extract enough I-frames (got {len(frames)}). Falling back to 1 fps fixed extraction.")
        command_fallback = [
             "ffmpeg", "-y", "-i", video_path, 
             "-vf", "fps=1", "-q:v", "3", temp_pattern
        ]
        subprocess.run(command_fallback, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        frames = sorted([f for f in os.listdir(temp_dir) if f.endswith('.jpg')])

    return [os.path.join(temp_dir, f) for f in frames]


def extract_key_frames_smart(video_path: str, output_dir: str = None, similarity_threshold: float = 0.90) -> list:
    """
    智能关键帧提取管线： I帧(带兜底) -> MobileNetV3 特征 -> 时序平滑去重
    
    :param similarity_threshold: 0.85 (较松，保留多) ~ 0.95 (极严，保留极少)。默认 0.90 综合较好。
    """
    if not os.path.exists(video_path):
        logger.error(f"Video file not found: {video_path}")
        return []

    if output_dir is None:
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_dir = os.path.join(os.path.dirname(video_path), f"{base_name}_frames")
    
    temp_dir = os.path.join(os.path.dirname(video_path), f".temp_{int(time.time())}")
    os.makedirs(output_dir, exist_ok=True)
    
    overall_start_time = time.time()
    saved_final_paths = []
    
    try:
        # 1. 抽取初始全量帧 (I帧或基于固定频率的帧)
        extracted_paths = extract_frames_with_fallback(video_path, temp_dir)
        total_extracted = len(extracted_paths)
        if not extracted_paths:
            return []

        # 2. 边提取轻量特征，边进行时序平滑去重
        cluster_start = time.time()
        extractor = LightWeightFeatureExtractor()
        
        last_feature = None
        retained_count = 0
        
        logger.info(f"Filtering {total_extracted} raw frames through deep semantic deduplication...")
        for img_path in extracted_paths:
            current_feature = extractor.extract(img_path)
            if current_feature is None:
                continue
                
            is_new_scene = True
            if last_feature is not None:
                 # Cosine Similarity
                similarity = np.dot(last_feature, current_feature)
                if similarity > similarity_threshold:
                    is_new_scene = False 
            
            if is_new_scene:
                final_name = f"keyframe_{retained_count:04d}.jpg"
                final_path = os.path.join(output_dir, final_name)
                # 使用 shutil.move 而不是 copy，稍微节省一次磁盘 I/O 开销
                shutil.move(img_path, final_path)
                saved_final_paths.append(final_path)
                
                last_feature = current_feature 
                retained_count += 1
                
        logger.info(f"Deduplication finished in {time.time() - cluster_start:.2f}s.")
        logger.info(f"Reduced from {total_extracted} raw frames to {len(saved_final_paths)} keyframes.")
        
    except Exception as e:
        logger.error(f"Error in smart key frame extraction: {e}")
    finally:
        # 确保无论发生什么错误，都会清理占空间的临时解帧文件夹
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            
    logger.info(f"Total processing time: {time.time() - overall_start_time:.2f}s")
    return saved_final_paths

if __name__ == "__main__":
    # 配置一个测试视频的路径
    test_video_path = r"E:\片\EVA新世纪福音战士\旧TV+剧场版\17.mkv"
    logger.info(f"=== Starting Smart Keyframe Extraction Test ===")
    logger.info(f"Target Video: {test_video_path}")
    
    if not os.path.exists(test_video_path):
        logger.error("Test video not found. Please check the path.")
    else:
        # 你可以尝试调整 similarity_threshold (例如 0.85 会保留更多，0.95 会保留极少)
        final_frames = extract_key_frames_smart(
            video_path=test_video_path, 
            similarity_threshold=0.90
        )
        
        logger.info("=== Test Completed ===")
        print(f"\nFinal retained {len(final_frames)} core keyframes.")
        if final_frames:
            print(f"They are saved in: {os.path.dirname(final_frames[0])}")