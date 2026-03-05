"""
桥接器基类 - 提供通用功能
"""

import tempfile
import zipfile
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, Callable
import logging

from .platform_check import is_windows, can_use_com
from .utils import setup_logger

logger = logging.getLogger(__name__)

class OfficeBridgeBase:
    """Office文档桥接器基类"""
    
    def __init__(self, script_dir: Path):
        self.script_dir = script_dir
        self.active_file = None
        self.use_com = is_windows() and can_use_com()
    
    def is_com_available(self) -> bool:
        """检查COM是否可用"""
        return self.use_com
    
    def _with_temp_unpack(self, file_path: Optional[str], 
                         processor: Callable[[Path], Dict[str, Any]],
                         output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        通用解包处理 - 不依赖COM
        """
        target = file_path or self.active_file
        if not target:
            return {"success": False, "message": "No file specified"}
        
        target_path = Path(target)
        if not target_path.exists():
            return {"success": False, "message": f"File not found: {target}"}
        
        temp_dir = None
        try:
            temp_dir = tempfile.mkdtemp()
            temp_path = Path(temp_dir)
            
            # 解包
            with zipfile.ZipFile(target, 'r') as zf:
                zf.extractall(temp_path)
            
            # 处理
            result = processor(temp_path)
            
            # 重新打包
            save_path = Path(output_path) if output_path else target_path
            with zipfile.ZipFile(save_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for f in temp_path.rglob('*'):
                    if f.is_file():
                        zf.write(f, f.relative_to(temp_path))
            
            return {
                "success": True,
                "message": result.get("message", "Operation completed"),
                "data": result.get("data", {}),
                "output_file": str(save_path)
            }
            
        except Exception as e:
            return {"success": False, "message": str(e)}
        finally:
            if temp_dir:
                shutil.rmtree(temp_dir, ignore_errors=True)