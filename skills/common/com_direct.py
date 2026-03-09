"""
Python直接调用 WPS/Office COM
完全绕过PowerShell，完美解决中文乱码问题
支持 Excel, Word, PowerPoint（优先WPS）
"""

from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import platform
import sys

logger = logging.getLogger(__name__)

# Keep Python process I/O in UTF-8 to avoid Windows codepage side-effects.
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

class OfficeCOMBase:
    """WPS/Office COM基类（优先连接WPS）"""

    def __init__(self, app_name: str, prog_ids: Optional[List[str]] = None):
        self.app_name = app_name
        self.prog_ids = prog_ids or [app_name]
        self.app = None
        self.document = None
        self.connected_prog_id: Optional[str] = None
        self._ensure_com_available()
    
    def _ensure_com_available(self):
        """确保COM可用"""
        if platform.system() != 'Windows':
            raise RuntimeError(f"{self.app_name} COM is only available on Windows")
        
        try:
            import win32com.client
            from win32com.client import constants
            self.win32com = win32com.client
            self.constants = constants
        except ImportError:
            raise ImportError("pywin32 is required. Install with: pip install pywin32")
    
    def _get_app(self):
        """获取或创建应用实例（按ProgID顺序尝试，优先WPS）"""
        if self.app:
            return self.app

        errors: List[str] = []
        for prog_id in self.prog_ids:
            try:
                app = self.win32com.client.Dispatch(prog_id)
                self.app = app
                self.connected_prog_id = prog_id
                try:
                    self.app.Visible = False
                except Exception:
                    pass
                try:
                    self.app.DisplayAlerts = False
                except Exception:
                    pass
                logger.info("%s connected via COM ProgID: %s", self.app_name, prog_id)
                return self.app
            except Exception as e:
                errors.append(f"{prog_id}: {e}")

        raise RuntimeError(
            f"Unable to connect {self.app_name} via COM. Tried ProgIDs: {self.prog_ids}. "
            f"Errors: {' | '.join(errors)}"
        )


class ExcelCOM(OfficeCOMBase):
    """Excel/WPS表格 COM直接调用"""

    def __init__(self):
        super().__init__(
            "Excel.Application",
            prog_ids=["ket.Application", "KET.Application", "Excel.Application"],
        )
        self.workbook = None
    
    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开Excel文件"""
        try:
            self._get_app()
            self.app.Visible = visible

            abs_path = str(Path(file_path).absolute())
            self.workbook = self.app.Workbooks.Open(abs_path)

            return {
                "success": True,
                "message": "Excel file opened successfully",
                "data": {
                    "name": self.workbook.Name,
                    "path": self.workbook.FullName,
                    "sheets": self.workbook.Worksheets.Count,
                    "prog_id": self.connected_prog_id,
                }
            }
        except Exception as e:
            logger.exception("Error opening Excel file")
            return {"success": False, "message": str(e)}

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前活动工作簿（已打开的WPS/Excel）"""
        try:
            self._get_app()
            self.app.Visible = visible
            active_workbook = self.app.ActiveWorkbook
            if not active_workbook:
                return {"success": False, "message": "No active workbook found"}

            self.workbook = active_workbook
            return {
                "success": True,
                "message": "Attached to active workbook",
                "data": {
                    "name": self.workbook.Name,
                    "path": self.workbook.FullName,
                    "sheets": self.workbook.Worksheets.Count,
                    "prog_id": self.connected_prog_id,
                },
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def new(self) -> Dict[str, Any]:
        """新建Excel文件"""
        try:
            self._get_app()
            self.workbook = self.app.Workbooks.Add()
            return {
                "success": True,
                "message": "New Excel file created",
                "data": {"sheets": self.workbook.Worksheets.Count}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭Excel文件"""
        try:
            if self.workbook:
                if save:
                    self.workbook.Save()
                self.workbook.Close()
                self.workbook = None
            return {"success": True, "message": "Excel file closed"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def quit(self):
        """退出Excel"""
        try:
            if self.app:
                self.app.Quit()
                self.app = None
        except:
            pass
    
    def get_active_sheet(self):
        """获取当前活动工作表"""
        if not self.workbook:
            return None
        return self.workbook.ActiveSheet
    
    def select_sheet(self, sheet_name: str) -> bool:
        """选择工作表"""
        try:
            sheet = self.workbook.Worksheets(sheet_name)
            sheet.Activate()
            return True
        except:
            return False
    
    def get_sheet_names(self) -> List[str]:
        """获取所有工作表名称"""
        if not self.workbook:
            return []
        sheets = []
        for i in range(1, self.workbook.Worksheets.Count + 1):
            sheets.append(self.workbook.Worksheets(i).Name)
        return sheets
    
    # ========== 写入操作（完美支持中文）==========
    
    def write_cell(self, cell: str, value: Any, sheet_name: str = None) -> Dict[str, Any]:
        """写入单元格 - 中文完美支持"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            sheet.Range(cell).Value = value
            
            return {
                "success": True,
                "message": f"Written to {cell}",
                "data": {"cell": cell, "value": str(value)[:50]}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def write_range(self, start_cell: str, data: List[List[Any]], 
                   sheet_name: str = None) -> Dict[str, Any]:
        """写入范围数据"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            
            rows = len(data)
            cols = len(data[0]) if data else 0
            end_cell = self._get_end_cell(start_cell, rows, cols)
            range_str = f"{start_cell}:{end_cell}"
            
            sheet.Range(range_str).Value = data
            
            return {
                "success": True,
                "message": f"Written range {range_str}",
                "data": {"rows": rows, "cols": cols}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def write_summary(self, summary_data: List[List[Any]], 
                     start_row: int = 21,
                     sheet_name: str = None) -> Dict[str, Any]:
        """写入汇总数据 - 专门解决乱码问题"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            
            for i, row in enumerate(summary_data):
                row_num = start_row + i
                for j, value in enumerate(row):
                    col_letter = self._get_column_letter(j + 1)
                    cell = f"{col_letter}{row_num}"
                    sheet.Range(cell).Value = value
                    
                    if i == 0:  # 标题行加粗
                        sheet.Range(cell).Font.Bold = True
            
            return {
                "success": True,
                "message": f"Written {len(summary_data)} summary rows",
                "data": {"rows": len(summary_data)}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def set_formula(self, cell: str, formula: str, sheet_name: str = None) -> Dict[str, Any]:
        """设置公式"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            sheet.Range(cell).Formula = formula
            
            return {
                "success": True,
                "message": f"Formula set in {cell}",
                "data": {"cell": cell, "formula": formula}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def format_range(self, range_str: str, bold: bool = False,
                    font_size: int = None, font_color: str = None,
                    number_format: str = None,
                    sheet_name: str = None) -> Dict[str, Any]:
        """格式化范围"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            range_obj = sheet.Range(range_str)
            
            if bold:
                range_obj.Font.Bold = True
            if font_size:
                range_obj.Font.Size = font_size
            if font_color:
                range_obj.Font.Color = font_color
            if number_format:
                range_obj.NumberFormat = number_format
            
            return {"success": True, "message": f"Formatted range {range_str}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ========== 读取操作 ==========
    
    def read_cell(self, cell: str, sheet_name: str = None) -> Dict[str, Any]:
        """读取单元格"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            value = sheet.Range(cell).Value
            
            return {
                "success": True,
                "data": {
                    "cell": cell,
                    "value": value,
                    "formula": sheet.Range(cell).Formula
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def read_range(self, start_cell: str, end_cell: str = None,
                  sheet_name: str = None) -> Dict[str, Any]:
        """读取范围"""
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            
            sheet = self._get_sheet(sheet_name)
            
            if end_cell:
                range_str = f"{start_cell}:{end_cell}"
            else:
                range_str = start_cell
            
            range_obj = sheet.Range(range_str)
            data = range_obj.Value
            
            return {
                "success": True,
                "data": {
                    "range": range_str,
                    "values": data
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ========== 辅助函数 ==========
    
    def _get_sheet(self, sheet_name: str = None):
        """获取工作表"""
        if sheet_name:
            return self.workbook.Worksheets(sheet_name)
        return self.get_active_sheet()
    
    def _get_end_cell(self, start_cell: str, rows: int, cols: int) -> str:
        import re
        match = re.match(r'([A-Z]+)(\d+)', start_cell)
        if not match:
            return start_cell
        
        start_col, start_row = match.groups()
        start_row = int(start_row)
        
        end_col = self._increment_column(start_col, cols - 1)
        end_row = start_row + rows - 1
        
        return f"{end_col}{end_row}"
    
    def _increment_column(self, col: str, steps: int) -> str:
        result = col
        for _ in range(steps):
            result = self._next_column(result)
        return result
    
    def _next_column(self, col: str) -> str:
        col = col.upper()
        chars = list(col)
        for i in range(len(chars)-1, -1, -1):
            if chars[i] < 'Z':
                chars[i] = chr(ord(chars[i]) + 1)
                return ''.join(chars)
            else:
                chars[i] = 'A'
        return 'A' + ''.join(chars)
    
    def _get_column_letter(self, col_num: int) -> str:
        result = ""
        while col_num > 0:
            col_num -= 1
            result = chr(65 + (col_num % 26)) + result
            col_num //= 26
        return result


class WordCOM(OfficeCOMBase):
    """Word/WPS文字 COM直接调用"""

    def __init__(self):
        super().__init__(
            "Word.Application",
            prog_ids=["kwps.Application", "KWPS.Application", "Word.Application"],
        )
        self.document = None
    
    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开Word文档"""
        try:
            self._get_app()
            self.app.Visible = visible

            abs_path = str(Path(file_path).absolute())
            self.document = self.app.Documents.Open(abs_path)

            return {
                "success": True,
                "message": "Word document opened successfully",
                "data": {
                    "name": self.document.Name,
                    "path": self.document.FullName,
                    "words": self.document.Words.Count,
                    "prog_id": self.connected_prog_id,
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前活动文档（已打开的WPS/Word）"""
        try:
            self._get_app()
            self.app.Visible = visible
            active_document = self.app.ActiveDocument
            if not active_document:
                return {"success": False, "message": "No active document found"}

            self.document = active_document
            return {
                "success": True,
                "message": "Attached to active document",
                "data": {
                    "name": self.document.Name,
                    "path": self.document.FullName,
                    "words": self.document.Words.Count,
                    "prog_id": self.connected_prog_id,
                },
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def new(self) -> Dict[str, Any]:
        """新建Word文档"""
        try:
            self._get_app()
            self.document = self.app.Documents.Add()
            return {"success": True, "message": "New Word document created"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭文档"""
        try:
            if self.document:
                if save:
                    self.document.Save()
                self.document.Close()
                self.document = None
            return {"success": True, "message": "Word document closed"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def quit(self):
        """退出Word"""
        try:
            if self.app:
                self.app.Quit()
                self.app = None
        except:
            pass
    
    # ========== 写入操作（完美支持中文）==========
    
    def write_text(self, text: str, position: str = "end") -> Dict[str, Any]:
        """写入文本"""
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}
            
            selection = self.app.Selection
            
            if position == "end":
                selection.EndKey(Unit=6)  # 6 = wdStory
            elif position == "start":
                selection.HomeKey(Unit=6)
            
            selection.TypeText(text)
            
            return {
                "success": True,
                "message": f"Written {len(text)} characters",
                "data": {"length": len(text)}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def write_paragraph(self, text: str) -> Dict[str, Any]:
        """写入段落"""
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}
            
            selection = self.app.Selection
            selection.EndKey(Unit=6)
            selection.TypeText(text)
            selection.TypeParagraph()
            
            return {"success": True, "message": "Paragraph written"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def replace_text(self, find_text: str, replace_text: str, 
                    replace_all: bool = True) -> Dict[str, Any]:
        """替换文本"""
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}
            
            find_obj = self.app.Selection.Find
            find_obj.ClearFormatting()
            find_obj.Replacement.ClearFormatting()
            
            if replace_all:
                count = find_obj.Execute(
                    find_text, ReplaceWith=replace_text,
                    Replace=2  # 2 = wdReplaceAll
                )
            else:
                count = find_obj.Execute(
                    find_text, ReplaceWith=replace_text,
                    Replace=1  # 1 = wdReplaceOne
                )
            
            return {
                "success": True,
                "message": f"Replaced {count} occurrences",
                "data": {"count": count}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def format_text(self, bold: bool = False, italic: bool = False,
                   font_size: int = None, font_name: str = None) -> Dict[str, Any]:
        """格式化选中的文本"""
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}
            
            selection = self.app.Selection
            
            if bold:
                selection.Font.Bold = bold
            if italic:
                selection.Font.Italic = italic
            if font_size:
                selection.Font.Size = font_size
            if font_name:
                selection.Font.Name = font_name
            
            return {"success": True, "message": "Text formatted"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # ========== 读取操作 ==========
    
    def read_all_text(self) -> Dict[str, Any]:
        """读取所有文本"""
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}
            
            content = self.document.Content.Text
            
            return {
                "success": True,
                "data": {
                    "text": content,
                    "length": len(content),
                    "words": self.document.Words.Count,
                    "paragraphs": self.document.Paragraphs.Count
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def read_selection(self) -> Dict[str, Any]:
        """读取选中的文本"""
        try:
            selection = self.app.Selection
            text = selection.Text
            
            return {
                "success": True,
                "data": {
                    "text": text,
                    "length": len(text),
                    "start": selection.Start,
                    "end": selection.End
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}


class PowerPointCOM(OfficeCOMBase):
    """PowerPoint/WPS演示 COM直接调用"""

    def __init__(self):
        super().__init__(
            "PowerPoint.Application",
            prog_ids=["kwpp.Application", "KWPP.Application", "PowerPoint.Application"],
        )
        self.presentation = None
    
    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开演示文稿"""
        try:
            self._get_app()
            self.app.Visible = visible

            abs_path = str(Path(file_path).absolute())
            self.presentation = self.app.Presentations.Open(abs_path)

            return {
                "success": True,
                "message": "Presentation opened successfully",
                "data": {
                    "name": self.presentation.Name,
                    "path": self.presentation.FullName,
                    "slides": self.presentation.Slides.Count,
                    "prog_id": self.connected_prog_id,
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前活动演示文稿（已打开的WPS演示/PowerPoint）"""
        try:
            self._get_app()
            self.app.Visible = visible
            active_presentation = self.app.ActivePresentation
            if not active_presentation:
                return {"success": False, "message": "No active presentation found"}

            self.presentation = active_presentation
            return {
                "success": True,
                "message": "Attached to active presentation",
                "data": {
                    "name": self.presentation.Name,
                    "path": self.presentation.FullName,
                    "slides": self.presentation.Slides.Count,
                    "prog_id": self.connected_prog_id,
                },
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def new(self) -> Dict[str, Any]:
        """新建演示文稿"""
        try:
            self._get_app()
            self.presentation = self.app.Presentations.Add()
            return {
                "success": True,
                "message": "New presentation created",
                "data": {"slides": self.presentation.Slides.Count}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭演示文稿"""
        try:
            if self.presentation:
                if save:
                    self.presentation.Save()
                self.presentation.Close()
                self.presentation = None
            return {"success": True, "message": "Presentation closed"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def quit(self):
        """退出PowerPoint"""
        try:
            if self.app:
                self.app.Quit()
                self.app = None
        except:
            pass
    
    def add_slide(self, index: int = None, layout: int = 1, 
                  title: str = None) -> Dict[str, Any]:
        """添加幻灯片"""
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}
            
            if index is None:
                index = self.presentation.Slides.Count + 1
            
            slide = self.presentation.Slides.Add(index, layout)
            
            if title:
                slide.Shapes[1].TextFrame.TextRange.Text = title
            
            return {
                "success": True,
                "message": f"Slide added at position {index}",
                "data": {"index": index}
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def get_slides_info(self) -> Dict[str, Any]:
        """获取所有幻灯片信息"""
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slides = []
            for i in range(1, self.presentation.Slides.Count + 1):
                slide = self.presentation.Slides(i)
                slides.append({
                    "index": i,
                    "name": slide.Name,
                    "shapes": slide.Shapes.Count
                })
            
            return {
                "success": True,
                "data": {
                    "total": len(slides),
                    "slides": slides
                }
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def add_text(self, slide_index: int, text: str, 
                left: int = 100, top: int = 100,
                width: int = 400, height: int = 50) -> Dict[str, Any]:
        """添加文本框"""
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}
            
            slide = self.presentation.Slides(slide_index)
            shape = slide.Shapes.AddTextbox(1, left, top, width, height)
            shape.TextFrame.TextRange.Text = text
            
            return {
                "success": True,
                "message": f"Text added to slide {slide_index}"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
