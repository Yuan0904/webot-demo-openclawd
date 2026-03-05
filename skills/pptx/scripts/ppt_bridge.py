# ppt_bridge.py
"""
PowerPoint实时操作桥接器 - 结合Python复杂逻辑和COM实时操作
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional
current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))
from pathlib import Path
import tempfile
import zipfile
from common import OfficeBridgeBase, setup_logger
from ..py.validators.pptx import PPTXSchemaValidator

logger = setup_logger('ppt_bridge')

from com_wrapper import COMWrapper
from validators.pptx import PPTXSchemaValidator


class PPTBridge:
    """PowerPoint实时操作桥接器"""
    
    def __init__(self):
        self.com = COMWrapper()
        self.active_presentation = None
        
    def open(self, file_path: str) -> Dict[str, Any]:
        """打开演示文稿"""
        result = self.com._run_ps(
            self.com.ppt_script,
            "open",
            file_path=file_path
        )
        if result.get("success"):
            self.active_presentation = file_path
        return result
    
    # ========== 复杂操作 ==========
    
    def validate_slide_layouts(self, file_path: str = None) -> Dict[str, Any]:
        """验证幻灯片布局"""
        target = file_path or self.active_presentation
        if not target:
            return {"success": False, "message": "No presentation specified"}
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                with zipfile.ZipFile(target, 'r') as zf:
                    zf.extractall(temp_dir)
                
                validator = PPTXSchemaValidator(
                    unpacked_dir=temp_dir,
                    verbose=True
                )
                
                # 运行特定验证
                valid_layouts = validator.validate_slide_layout_ids()
                valid_uuids = validator.validate_uuid_ids()
                valid_notes = validator.validate_notes_slide_references()
                
                return {
                    "success": True,
                    "valid": all([valid_layouts, valid_uuids, valid_notes]),
                    "details": {
                        "layouts_valid": valid_layouts,
                        "uuids_valid": valid_uuids,
                        "notes_valid": valid_notes
                    }
                }
        except Exception as e:
            return {"success": False, "message": str(e)}