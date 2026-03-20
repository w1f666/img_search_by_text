import os
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
from scenedetect.scene_manager import save_images
from app.logs.config import logger

import time

def extract_key_frames(video_path: str, output_dir: str = None) -> list:
    """
    使用 PySceneDetect 提取视频基于内容变化的关键帧
    
    :param video_path: 视频文件的绝对路径
    :param output_dir: 提取出的关键帧保存目录，如果为空默认与视频同级的 <视频名_frames> 文件夹
    :return: 包含所有抽取的关键帧图片路径的列表
    """
    if not os.path.exists(video_path):
        logger.error(f"Video file not found: {video_path}")
        return []

    # 确定输出目录
    if output_dir is None:
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_dir = os.path.join(os.path.dirname(video_path), f"{base_name}_frames")
        
    os.makedirs(output_dir, exist_ok=True)
    
    # 记录提取的图片路径
    saved_frame_paths = []
    
    # 创建 VideoManager 和 SceneManager
    video_manager = VideoManager([video_path])
    video_manager.set_downscale_factor()  # 可选：设置下采样因子以加快处理速度，默认为1（不下采样）
    scene_manager = SceneManager()
    
    # 添加基于内容变化的探测器
    # threshold 默认通常是 27.0。值越低，系统越敏感，切分出的场景越多；值越高，切分越少。
    scene_manager.add_detector(ContentDetector(threshold=3.0))
    
    try:
        # 启动视频管理器
        video_manager.start()
        
        # 执行场景检测
        logger.info(f"Starting scene detection for {video_path}...")
        start_time = time.time()
        scene_manager.detect_scenes(frame_source=video_manager)
        
        # 获取所有探测到的场景片段的起止时间戳 (start_time, end_time)
        scene_list = scene_manager.get_scene_list()
        logger.info(f"Detected {len(scene_list)} scenes in {video_path}")
        
        # 提取每个场景的关键帧并保存到本地
        if scene_list:
            save_images(
                scene_list=scene_list,
                video=video_manager, 
                num_images=1,
                image_name_template='$VIDEO_NAME-Scene-$SCENE_NUMBER',
                output_dir=output_dir
            )
        
        end_time = time.time()
        logger.info(f"Scene detection and key frame extraction completed in {end_time - start_time:.2f} seconds.")
            
        # 收集保存的图片绝对路径返回给后续处理（如入库、提CLIP计算）
        for file_name in os.listdir(output_dir):
            if file_name.endswith(('.jpg', '.jpeg', '.png')):
                saved_frame_paths.append(os.path.join(output_dir, file_name))
                
    except Exception as e:
        logger.error(f"Error during key frame extraction: {e}")
    finally:
        # 释放视频资源
        video_manager.release()
        
    return saved_frame_paths

if __name__ == "__main__":
    test_video = r"E:\片\不要点进来\C\3522708714\VAM_Frieren 企鹅群443281762.mp4"
    print(extract_key_frames(test_video))
    # pass