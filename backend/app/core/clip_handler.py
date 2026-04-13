import torch
from PIL import Image
from cn_clip.clip import load_from_name, available_models,tokenize
import os
from typing_extensions import override
from app.logs.config import logger

MODEL_PATH = os.path.join(os.getcwd(),"backend","resource","clip_model")
os.makedirs(MODEL_PATH,exist_ok=True)

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
        
        self.model = None
        self.preprocess = None
        self.model_path = model_path
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"CLIP instance created. Device: {self.device} (Model not loaded yet)")
        #初始化标志量
        self._initialized = True
        
    def _ensure_model_loaded(self):
        """
        实现模型加载
        """
        if self.model is None or self.preprocess is None:
            try:
                self.model, self.preprocess = load_from_name(
                    "ViT-L-14-336",
                    device=self.device,
                    download_root=self.model_path,
                    use_modelscope=True,
                )
                self.model.eval()
                logger.info("CLIP model loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading CLIP model: {e}")
                self.model = None
                self.preprocess = None

    def image_extract(self, image_input) -> list[float] | None:
        """
        使用CLIP模型提取图像特征向量
        :param image_input: 图像文件路径(str)或文件对象(file-like)
        :return: 图像特征向量（torch.Tensor）
        """
        self._ensure_model_loaded()
        if not self.model or not self.preprocess:
            logger.error("Something wrong in clip init")
            return None
        try:
            with Image.open(image_input) as img:
                image = torch.tensor(self.preprocess(img)).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    image_features = self.model.encode_image(image)
                    image_features /= image_features.norm(dim=-1, keepdim=True)
            return image_features.cpu().numpy().flatten().tolist()
        except FileNotFoundError:
            logger.error(f"File not found: {image_input}")
            return None
        except Exception as e:
            logger.error(f"Error extracting image vector: {e}")
            return None

    def text_extract(self, text: str) -> list[float] | None:
        """
        使用CLIP模型提取文本特征向量
        :param text: 输入文本
        :return: 文本特征向量（torch.Tensor）
        """
        self._ensure_model_loaded()
        if not self.model or not self.preprocess:
            logger.error("Something wrong in clip init")
            return None
        try:
            text_input = tokenize([text]).to(self.device)
            with torch.no_grad():
                text_features = self.model.encode_text(text_input)
                text_features /= text_features.norm(dim=-1, keepdim=True)
            return text_features.cpu().numpy().flatten().tolist()
        except FileNotFoundError:
            logger.error(f"File not found for text: {text}")
            return None
        except Exception as e:
            logger.error(f"Error extracting vector for text '{text}': {e}")
            return None