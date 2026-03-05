"""
通用工具函数
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """设置日志器"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

def ensure_directory(dir_path: Path) -> Path:
    """确保目录存在"""
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path

def get_file_extension(file_path: str, with_dot: bool = True) -> str:
    """获取文件扩展名"""
    ext = Path(file_path).suffix
    if not with_dot and ext.startswith('.'):
        ext = ext[1:]
    return ext

def read_json_file(file_path: Path) -> Dict[str, Any]:
    """读取JSON文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json_file(file_path: Path, data: Dict[str, Any]) -> None:
    """写入JSON文件"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)