"""
PowerPoint桥接器 - 直接COM调用，完美支持中文
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))

from common.com_direct import PowerPointCOM
from common.office_bridge_base import DirectCOMBridgeBase
from common.utils import setup_logger

logger = setup_logger("ppt_bridge_direct")


class PPTBridgeDirect(DirectCOMBridgeBase):
    """PowerPoint桥接器 - 直接COM调用"""

    def __init__(self):
        super().__init__(
            script_dir=current_dir,
            bridge_name="PPTBridgeDirect",
            client_attr="ppt",
            app_client=PowerPointCOM(),
        )
        logger.info("PPTBridgeDirect initialized")

    def new(self) -> Dict[str, Any]:
        """新建演示文稿"""
        return super().new(fallback_name="新建演示文稿.pptx")

    def _require_presentation(self) -> Optional[Dict[str, Any]]:
        if not self.ppt.presentation:
            return {"success": False, "message": "No presentation open"}
        return None

    # ========== 幻灯片操作 ==========

    def add_slide(self, index: int = None, layout: int = 1, title: str = None) -> Dict[str, Any]:
        """添加幻灯片"""
        return self.ppt.add_slide(index, layout, title)

    def get_slides_info(self) -> Dict[str, Any]:
        """获取所有幻灯片信息"""
        return self.ppt.get_slides_info()

    def delete_slide(self, index: int) -> Dict[str, Any]:
        """删除幻灯片"""
        try:
            err = self._require_presentation()
            if err:
                return err

            self.ppt.presentation.Slides(index).Delete()
            return {"success": True, "message": f"Slide {index} deleted"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def duplicate_slide(self, index: int) -> Dict[str, Any]:
        """复制幻灯片"""
        try:
            err = self._require_presentation()
            if err:
                return err

            slide = self.ppt.presentation.Slides(index)
            slide.Copy()
            new_slide = self.ppt.presentation.Slides.Paste(index + 1)

            if isinstance(new_slide, list):
                slide_index = new_slide[0].SlideIndex
            else:
                slide_index = getattr(new_slide, "SlideIndex", None)

            return {
                "success": True,
                "message": f"Slide {index} duplicated",
                "data": {"new_index": slide_index},
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ========== 形状操作 ==========

    def add_text(
        self,
        slide_index: int,
        text: str,
        left: int = 100,
        top: int = 100,
        width: int = 400,
        height: int = 50,
    ) -> Dict[str, Any]:
        """添加文本框"""
        return self.ppt.add_text(slide_index, text, left, top, width, height)

    def add_picture(
        self,
        slide_index: int,
        image_path: str,
        left: int = 100,
        top: int = 100,
        width: int = None,
        height: int = None,
    ) -> Dict[str, Any]:
        """添加图片"""
        try:
            err = self._require_presentation()
            if err:
                return err

            slide = self.ppt.presentation.Slides(slide_index)
            slide.Shapes.AddPicture(image_path, False, True, left, top, width, height)
            return {"success": True, "message": f"Picture added to slide {slide_index}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def add_table(
        self,
        slide_index: int,
        rows: int,
        cols: int,
        left: int = 100,
        top: int = 100,
        width: int = 400,
        height: int = 200,
        data: List[List[Any]] = None,
    ) -> Dict[str, Any]:
        """添加表格"""
        try:
            err = self._require_presentation()
            if err:
                return err

            slide = self.ppt.presentation.Slides(slide_index)
            table = slide.Shapes.AddTable(rows, cols, left, top, width, height)

            if data:
                for i, row in enumerate(data[:rows]):
                    for j, value in enumerate(row[:cols]):
                        table.Table.Cell(i + 1, j + 1).Shape.TextFrame.TextRange.Text = str(value)

            return {"success": True, "message": f"Table added to slide {slide_index}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ========== 文本操作 ==========

    def set_title(self, slide_index: int, title: str) -> Dict[str, Any]:
        """设置幻灯片标题"""
        try:
            err = self._require_presentation()
            if err:
                return err

            slide = self.ppt.presentation.Slides(slide_index)
            if slide.Shapes.HasTitle:
                slide.Shapes.Title.TextFrame.TextRange.Text = title
                return {"success": True, "message": f"Title set for slide {slide_index}"}
            return {"success": False, "message": f"Slide {slide_index} has no title placeholder"}
        except Exception as e:
            return {"success": False, "message": str(e)}
