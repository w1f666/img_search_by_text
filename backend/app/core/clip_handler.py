import os
import requests
from tqdm import tqdm
import numpy as np
import onnxruntime as ort
from PIL import Image
from transformers import BertTokenizer
from typing_extensions import override
from app.logs.config import logger

MODEL_PATH = os.path.join(os.getcwd(),"backend","resource","clip_model")
os.makedirs(MODEL_PATH,exist_ok=True)

IMAGE_MODEL_URL =""
TEXT_MODEL_URL = ""

def download_file(url: str, dest_path: str):
    """带进度条的文件下载实用函数"""
    logger.info(f"Downloading model from {url} to {dest_path}...")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        
        with open(dest_path, "wb") as file, tqdm(
            desc=os.path.basename(dest_path),
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for data in response.iter_content(chunk_size=1024):
                size = file.write(data)
                bar.update(size)
        logger.info(f"Successfully downloaded {os.path.basename(dest_path)}.")
    except Exception as e:
        logger.error(f"Failed to download {url}. Error: {e}")
        # 如果下载失败，删除可能损坏的不完整文件
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise e

class CLIPHandler:
    
    _instance = None #存储单例实例，防止多次初始化
    
    @override
    def __new__(cls, *args, **kwargs):
        # 检查之前是否存在实例
        if cls._instance is None:
            # 如果不存在，则创建一个新的实例
            cls._instance = super(CLIPHandler, cls).__new__(cls) #调用父类object的__new__方法为类实例分配内存
        # 如果存在就返回已有的
        return cls._instance
    
    def __init__(self, model_path: str = MODEL_PATH):
        """
        :param model_path: 模型存储路径
        """
        if getattr(self, '_initialized', False):
            return
        
        self.image_session = None
        self.text_session = None
        self.tokenizer = None
        self.model_path = model_path
        self.providers = ['CUDAExecutionProvider', "CPUExecutionProvider"] if ort.get_device() == 'GPU' else ['CPUExecutionProvider']
        logger.info(f"CLIP (ONNX) instance created. Providers: {self.providers}")
        #初始化标志量
        self._initialized = True
        
    def _ensure_model_loaded(self):
        """
        实现模型加载
        """
        if self.image_session is None or self.text_session is None:
            image_model_path = os.path.join(self.model_path, "ViT-L-14-336-image.onnx")
            text_model_path = os.path.join(self.model_path, "ViT-L-14-336-text.onnx")
            
            # 如果模型文件不存在，尝试下载
            if not os.path.exists(image_model_path):
                logger.warning(f"Image model not found at {image_model_path}. Attempting to download...")
                download_file(IMAGE_MODEL_URL, image_model_path)
            if not os.path.exists(text_model_path):
                logger.warning(f"Text model not found at {text_model_path}. Attempting to download...")
                download_file(TEXT_MODEL_URL, text_model_path)
                
            try:
                image_model_path = os.path.join(self.model_path, "ViT-L-14-336-image.onnx")
                text_model_path = os.path.join(self.model_path, "ViT-L-14-336-text.onnx")
                
                self.image_session  = ort.InferenceSession(
                    image_model_path, providers=self.providers
                )
                self.text_session   = ort.InferenceSession(
                    text_model_path, providers=self.providers
                )
                logger.info("CLIP ONNX models loaded successfully.")
                
                self.tokenizer = BertTokenizer.from_pretrained(
                    "OFA-Sys/chinese-clip-vit-base-patch16",
                    cache_dir=os.path.join(self.model_path, "tokenizer")
                )
                logger.info("Tokenizer loaded successfully.")
                
            except Exception as e:
                logger.error(f"Error loading CLIP models or tokenizer: {e}")
                self.image_session = None
                self.text_session = None
                self.tokenizer = None
     
    #替代原本使用pytorch的预处理函数，直接在onnx输入前进行必要的预处理 
    def _preprocess_image(self, image: Image.Image,size=336) -> np.ndarray:
        #保证图像时rgb格式
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        #确定长短边的长度    
        width,height = image.size
        short_side = min(height,width)
        long_side = max(height,width)
        
        resize_side = int(size * long_side / short_side)
        width,height = (resize_side, size) if width>height else (size, resize_side)
        
        #使用BICUBIC进行缩放，保持宽高比的同时缩放到最短边为size
        image = image.resize((width, height), Image.Resampling.BICUBIC)
        
        #中心裁剪
        left = (width - size) / 2
        top = (height - size) / 2
        right = left + size
        bottom = top + size
        image = image.crop((left, top, right, bottom))
        
        # 压缩到0-1范围的numpy数组，并转置为CHW格式
        img_array = np.array(image).astype(np.float32) / 255.0
        img_array = np.transpose(img_array, (2, 0, 1))  # HWC to CHW
        
        # clip模型的输入需要进行特定的归一化处理，使用clip官方的均值和标准差进行归一化
        mean = np.array([0.48145466, 0.4578275, 0.40821073]).reshape(3, 1, 1)
        std = np.array([0.26862954, 0.26130258, 0.27577711]).reshape(3, 1, 1)
        img_array = (img_array - mean) / std
        
        return np.expand_dims(img_array, axis=0).astype(np.float32) #增加batch维度，变成1CHW


    def image_extract(self, image_path: str) -> list[float] | None:
        """
        使用CLIP模型提取图像特征向量
        :param image_path: 图像文件路径
        :return: 图像特征向量（torch.Tensor）
        """
        self._ensure_model_loaded()
        if not self.image_session:
            logger.error("Something wrong in clip init: image session not loaded")
            return None
        try:
            with Image.open(image_path) as img:
                image_imput = self._preprocess_image(img)
            
            image_name = self.image_session.get_inputs()[0].name
            image_features = self.image_session.run(
                None, {image_name: image_imput}
            )[0]
            
            #这报错别理
            image_features = image_features / np.linalg.norm(image_features, axis=-1, keepdims=True) # L2 归一化用于余弦距离
            return image_features.flatten().tolist()
        except FileNotFoundError:
            logger.error(f"File not found: {image_path}")
            return None
        except Exception as e:
            logger.error(f"Error extracting vector for {image_path}: {e}")
            return None
        
    def text_extract(self, text: str) -> list[float] | None:
        """
        使用CLIP模型提取文本特征向量
        :param text: 输入文本
        :return: 文本特征向量（torch.Tensor）
        """
        self._ensure_model_loaded()
        if not self.text_session or not self.tokenizer:
            logger.error("Something wrong in clip init: text session or tokenizer not loaded")
            return None
        try:
            inputs = self.tokenizer(
                text,
                padding='max_length',
                max_length=52,
                truncation=True,
                return_tensors='np' 
            )
            
            #cn_clip的encode_text
            text_input = inputs['input_ids'].astype(np.int64)
            
            text_name = self.text_session.get_inputs()[0].name
            text_features = self.text_session.run(
                None, {text_name: text_input}
            )[0]
            
            text_features = text_features / np.linalg.norm(text_features, axis=-1, keepdims=True) # L2 归一化用于余弦距离
            return text_features.flatten().tolist()
        
        except Exception as e:
            logger.error(f"Error extracting vector for text '{text}': {e}")
            return None