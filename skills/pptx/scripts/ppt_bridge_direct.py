"""
PowerPoint桥接器 - 直接COM调用，完美支持中文
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional

current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))

from common.com_direct import PowerPointCOM
from common.platform_check import is_windows
from common.utils import setup_logger

logger = setup_logger('ppt_bridge_direct')

class PPTBridgeDirect:
    """PowerPoint桥接器 - 直接COM调用"""
    
    def __init__(self):
        if not is_windows():
            raise RuntimeError("PPTBridgeDirect is only available on Windows")
        
        self.ppt = PowerPointCOM()
        self.active_file = None
        logger.info("PPTBridgeDirect initialized")
    
    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开演示文稿"""
        result = self.ppt.open(file_path, visible)
        if result.get("success"):
            self.active_file = file_path
        return result

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前WPS/PPT已打开演示文稿"""
        result = self.ppt.attach_active(visible)
        if result.get("success"):
            self.active_file = result.get("data", {}).get("path")
        return result
    
    def new(self) -> Dict[str, Any]:
        """新建演示文稿"""
        result = self.ppt.new()
        if result.get("success"):
            self.active_file = "新建演示文稿.pptx"
        return result
    
    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭演示文稿"""
        result = self.ppt.close(save)
        if result.get("success"):
            self.active_file = None
        return result
    
    def quit(self):
        """退出PowerPoint"""
        self.ppt.quit()
    
    # ========== 幻灯片操作 ==========
    
    def add_slide(self, index: int = None, layout: int = 1, 
                  title: str = None) -> Dict[str, Any]:
        """添加幻灯片"""
        return self.ppt.add_slide(index, layout, title)
    
    def get_slides_info(self) -> Dict[str, Any]:
        """获取所有幻灯片信息"""
        return self.ppt.get_slides_info()
    
    def delete_slide(self, index: int) -> Dict[str, Any]:
        """删除幻灯片"""
        try:
            if not self.ppt.presentation:
                return {"success": False, "message": "No presentation open"}
            
            self.ppt.presentation.Slides(index).Delete()
            return {"success": True, "message": f"Slide {index} deleted"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def duplicate_slide(self, index: int) -> Dict[str, Any]:
        """复制幻灯片"""
        try:
            if not self.ppt.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slide = self.ppt.presentation.Slides(index)
            slide.Copy()
            new_slide = self.ppt.presentation.Slides.Paste(index + 1)
            
            return {
                "success": True,
                "message": f"Slide {index} duplicated",
                "data": {"new_index": new_slide.SlideIndex}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ========== 形状操作 ==========
    
    def add_text(self, slide_index: int, text: str, 
                left: int = 100, top: int = 100,
                width: int = 400, height: int = 50) -> Dict[str, Any]:
        """添加文本框"""
        return self.ppt.add_text(slide_index, text, left, top, width, height)
    
    def add_picture(self, slide_index: int, image_path: str,
                   left: int = 100, top: int = 100,
                   width: int = None, height: int = None) -> Dict[str, Any]:
        """添加图片"""
        try:
            if not self.ppt.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slide = self.ppt.presentation.Slides(slide_index)
            picture = slide.Shapes.AddPicture(image_path, False, True, left, top, width, height)
            
            return {
                "success": True,
                "message": f"Picture added to slide {slide_index}"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def add_table(self, slide_index: int, rows: int, cols: int,
                 left: int = 100, top: int = 100,
                 width: int = 400, height: int = 200,
                 data: list = None) -> Dict[str, Any]:
        """添加表格"""
        try:
            if not self.ppt.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slide = self.ppt.presentation.Slides(slide_index)
            table = slide.Shapes.AddTable(rows, cols, left, top, width, height)
            
            if data:
                for i, row in enumerate(data):
                    for j, value in enumerate(row):
                        if i < rows and j < cols:
                            table.Table.Cell(i+1, j+1).Shape.TextFrame.TextRange.Text = str(value)
            
            return {
                "success": True,
                "message": f"Table added to slide {slide_index}"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ========== 文本操作 ==========
    
    def set_title(self, slide_index: int, title: str) -> Dict[str, Any]:
        """设置幻灯片标题"""
        try:
            if not self.ppt.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slide = self.ppt.presentation.Slides(slide_index)
            if slide.Shapes.HasTitle:
                slide.Shapes.Title.TextFrame.TextRange.Text = title
                return {"success": True, "message": f"Title set for slide {slide_index}"}
            else:
                return {"success": False, "message": f"Slide {slide_index} has no title placeholder"}
        except Exception as e:
            return {"success": False, "message": str(e)}
