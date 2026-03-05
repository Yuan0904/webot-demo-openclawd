"""
Word桥接器 - 直接COM调用，完美支持中文
"""

import sys
from pathlib import Path
from typing import Dict, Any

current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))

from common.com_direct import WordCOM
from common.platform_check import is_windows
from common.utils import setup_logger

logger = setup_logger('word_bridge_direct')


class WordBridgeDirect:
    """Word桥接器 - 直接COM调用"""

    def __init__(self):
        if not is_windows():
            raise RuntimeError("WordBridgeDirect is only available on Windows")

        self.word = WordCOM()
        self.active_file = None
        logger.info("WordBridgeDirect initialized")


    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开Word文档"""
        result = self.word.open(file_path, visible)
        if result.get("success"):
            opened_path = result.get("data", {}).get("path")
            self.active_file = opened_path or file_path
            self._modified = False
            self._pre_snapshot_id = None
        return result

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前WPS/Word已打开文档"""
        result = self.word.attach_active(visible)
        if result.get("success"):
            self.active_file = result.get("data", {}).get("path")
            self._modified = False
            self._pre_snapshot_id = None
        return result

    def new(self) -> Dict[str, Any]:
        """新建Word文档"""
        result = self.word.new()
        if result.get("success"):
            self.active_file = "新建文档.docx"
            self._modified = False
            self._pre_snapshot_id = None
        return result

    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭文档"""
        try:
            if self.word.document:
                if save:
                    self.word.document.Save()
                    if self._modified:
                        self._create_snapshot("post", parent_id=self._pre_snapshot_id)
                self.word.document.Close()
                self.word.document = None

            self.active_file = None
            self._modified = False
            self._pre_snapshot_id = None
            return {"success": True, "message": "Word document closed"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def quit(self):
        """退出Word"""
        self.word.quit()

    # ========== 写入操作（完美支持中文）==========

    def write_text(self, text: str, position: str = "end") -> Dict[str, Any]:
        """写入文本"""
        self._ensure_pre_snapshot()
        result = self.word.write_text(text, position)
        if result.get("success"):
            self._modified = True
        return result

    def write_paragraph(self, text: str) -> Dict[str, Any]:
        """写入段落"""
        self._ensure_pre_snapshot()
        result = self.word.write_paragraph(text)
        if result.get("success"):
            self._modified = True
        return result

    def write_at_bookmark(self, bookmark_name: str, text: str) -> Dict[str, Any]:
        """在书签位置写入文本"""
        self._ensure_pre_snapshot()
        try:
            if not self.word.document:
                return {"success": False, "message": "No document open"}

            if self.word.document.Bookmarks.Exists(bookmark_name):
                bookmark = self.word.document.Bookmarks(bookmark_name)
                bookmark.Range.Text = text
                self._modified = True
                return {"success": True, "message": f"Written at bookmark {bookmark_name}"}
            else:
                return {"success": False, "message": f"Bookmark {bookmark_name} not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def replace_text(self, find_text: str, replace_text: str,
                     replace_all: bool = True) -> Dict[str, Any]:
        """替换文本"""
        self._ensure_pre_snapshot()
        result = self.word.replace_text(find_text, replace_text, replace_all)
        if result.get("success"):
            self._modified = True
        return result

    def format_text(self, bold: bool = False, italic: bool = False,
                    font_size: int = None, font_name: str = None,
                    font_color: str = None) -> Dict[str, Any]:
        """格式化选中的文本"""
        self._ensure_pre_snapshot()
        try:
            if not self.word.document:
                return {"success": False, "message": "No document open"}

            selection = self.word.app.Selection

            if bold:
                selection.Font.Bold = bold
            if italic:
                selection.Font.Italic = italic
            if font_size:
                selection.Font.Size = font_size
            if font_name:
                selection.Font.Name = font_name
            if font_color:
                selection.Font.Color = font_color

            self._modified = True
            return {"success": True, "message": "Text formatted"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ========== 读取操作 ==========

    def read_all_text(self) -> Dict[str, Any]:
        """读取所有文本"""
        return self.word.read_all_text()

    def read_selection(self) -> Dict[str, Any]:
        """读取选中的文本"""
        return self.word.read_selection()

    def read_paragraphs(self, count: int = None) -> Dict[str, Any]:
        """读取段落"""
        try:
            if not self.word.document:
                return {"success": False, "message": "No document open"}

            paragraphs = []
            para_count = self.word.document.Paragraphs.Count

            if count:
                para_count = min(count, para_count)

            for i in range(1, para_count + 1):
                para = self.word.document.Paragraphs(i)
                paragraphs.append({
                    "index": i,
                    "text": para.Range.Text.strip(),
                    "style": para.Style
                })

            return {
                "success": True,
                "data": {
                    "total": self.word.document.Paragraphs.Count,
                    "paragraphs": paragraphs
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ========== 文档操作 ==========

    def insert_break(self, break_type: str = "page") -> Dict[str, Any]:
        """插入分页符"""
        self._ensure_pre_snapshot()
        try:
            if not self.word.document:
                return {"success": False, "message": "No document open"}

            selection = self.word.app.Selection

            if break_type == "page":
                selection.InsertBreak(7)  # 7 = wdPageBreak
            elif break_type == "line":
                selection.InsertBreak(6)  # 6 = wdLineBreak
            elif break_type == "column":
                selection.InsertBreak(8)  # 8 = wdColumnBreak

            self._modified = True
            return {"success": True, "message": f"{break_type} break inserted"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def go_to(self, target: str, value: Any = None) -> Dict[str, Any]:
        """跳转到指定位置"""
        try:
            if not self.word.document:
                return {"success": False, "message": "No document open"}

            selection = self.word.app.Selection

            if target == "start":
                selection.HomeKey(Unit=6)
            elif target == "end":
                selection.EndKey(Unit=6)
            elif target == "page" and value:
                selection.GoTo(What=1, Which=1, Count=value)  # 1 = wdGoToPage
            elif target == "line" and value:
                selection.GoTo(What=2, Which=1, Count=value)  # 2 = wdGoToLine

            return {"success": True, "message": f"Went to {target}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
