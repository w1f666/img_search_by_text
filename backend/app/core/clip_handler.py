import torch
from PIL import Image
from cn_clip.clip import load_from_name, available_models,tokenize
import os

print("Available models:", available_models())
# ['ViT-B-16', 'ViT-L-14', 'ViT-L-14-336', 'ViT-H-14', 'RN50']

MODEL_PATH = "backend/resource/clip_model"
os.makedirs(MODEL_PATH,exist_ok=True)

class CLIPHandler:
    def __init__(self, model_path: str = MODEL_PATH):
        """
        初始化CLIP模型
        :param model_path: 模型存储路径
        """
        try:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {self.device}")
            self.model, self.preprocess = load_from_name(
                "ViT-L-14-336",
                device=self.device,
                download_root=model_path,
                use_modelscope=True,
            )
            # Available models: [
            # 'ViT-B-16',
            # 'ViT-L-14',
            # 'ViT-L-14-336', 转换出的特征向量维度为768
            # 'ViT-H-14',
            # 'RN50']

            self.model.eval()
            print("clip init complete")
        except Exception as e:
            print("error in clip init")
            self.model = None

    def image_extract(self, image_path: str) -> list[float] | None:
        """
        使用CLIP模型提取图像特征向量
        :param image_path: 图像文件路径
        :return: 图像特征向量（torch.Tensor）
        """
        if not self.model:
            print("somethinf wrong in clip init")
            return None
        try:
            with Image.open(image_path) as img:
                image = torch.tensor(self.preprocess(img)).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    image_features = self.model.encode_image(image)
                    image_features /= image_features.norm(dim=-1, keepdim=True)
            return image_features.cpu().numpy().flatten().tolist()
        except FileNotFoundError:
            print(f"File not found: {image_path}")
            return None
        except Exception as e:
            print(f"Error extracting vector for {image_path}: {e}")
            return None

    def text_extract(self, text: str) -> list[float] | None:
        """
        使用CLIP模型提取文本特征向量
        :param text: 输入文本
        :return: 文本特征向量（torch.Tensor）
        """
        if not self.model:
            print("somethinf wrong in clip init")
            return None
        try:
            text_input = tokenize([text]).to(self.device)
            with torch.no_grad():
                text_features = self.model.encode_text(text_input)

                text_features /= text_features.norm(dim=-1, keepdim=True)

            return text_features.cpu().numpy().flatten().tolist()
        except FileNotFoundError:
            print(f"File not found for text: {text}")
            return None
        except Exception as e:
            print(f"Error extracting vector for text '{text}': {e}")
            return None
        
