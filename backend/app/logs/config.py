import sys
from loguru import logger
import os

# 定义日志文件夹
LOG_DIR = "backend\\app\\logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# 移除默认的处理器（默认只输出到控制台）
logger.remove()

# 添加控制台输出（带颜色，级别为 INFO）
logger.add(
    sys.stderr,
    level="INFO", 
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)

# 添加文件输出（每天轮转一个新文件，保留 10 天）
logger.add(
    os.path.join(LOG_DIR, "runtime_{time:YYYY-MM-DD}.log"),
    rotation="00:00",
    retention="10 days",
    level="DEBUG",
    encoding="utf-8"
)

# 导出配置好的 logger
__all__ = ["logger"]