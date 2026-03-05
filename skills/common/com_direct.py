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
import re

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
        self.connected_prog_id: Optional[str] = None
        self._ensure_com_available()

    @staticmethod
    def _ok(message: str = "", data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        result: Dict[str, Any] = {"success": True}
        if message:
            result["message"] = message
        if data is not None:
            result["data"] = data
        return result

    @staticmethod
    def _err(e: Exception | str) -> Dict[str, Any]:
        return {"success": False, "message": str(e)}

    def _ensure_com_available(self):
        """确保COM可用"""
        if platform.system() != "Windows":
            raise RuntimeError(f"{self.app_name} COM is only available on Windows")

        try:
            import win32com.client
            self.win32com = win32com.client
        except ImportError as exc:
            raise ImportError("pywin32 is required. Install with: pip install pywin32") from exc

    def _safe_set(self, obj: Any, attr: str, value: Any):
        try:
            setattr(obj, attr, value)
        except Exception:
            pass

    def _get_app(self):
        """获取或创建应用实例（按ProgID顺序尝试，优先WPS）"""
        if self.app:
            return self.app

        errors: List[str] = []
        for prog_id in self.prog_ids:
            try:
                app = self.win32com.Dispatch(prog_id)
                self.app = app
                self.connected_prog_id = prog_id

                self._safe_set(self.app, "Visible", False)
                self._safe_set(self.app, "DisplayAlerts", False)

                logger.info("%s connected via COM ProgID: %s", self.app_name, prog_id)
                return self.app
            except Exception as e:
                errors.append(f"{prog_id}: {e}")

        raise RuntimeError(
            f"Unable to connect {self.app_name} via COM. Tried ProgIDs: {self.prog_ids}. "
            f"Errors: {' | '.join(errors)}"
        )

    def _open_common(
        self,
        file_path: str,
        visible: bool,
        open_callable,
        data_builder,
        success_message: str,
    ) -> Dict[str, Any]:
        try:
            self._get_app()
            self.app.Visible = visible
            abs_path = str(Path(file_path).absolute())
            opened_obj = open_callable(abs_path)
            return self._ok(
                success_message,
                {**data_builder(opened_obj), "prog_id": self.connected_prog_id},
            )
        except Exception as e:
            logger.exception("Open failed for %s", self.app_name)
            return self._err(e)

    def _attach_active_common(
        self,
        visible: bool,
        getter,
        assigner,
        data_builder,
        not_found_message: str,
        success_message: str,
    ) -> Dict[str, Any]:
        try:
            self._get_app()
            self.app.Visible = visible
            active_obj = getter()
            if not active_obj:
                return self._ok(not_found_message, None) if False else {"success": False, "message": not_found_message}

            assigner(active_obj)
            return self._ok(
                success_message,
                {**data_builder(active_obj), "prog_id": self.connected_prog_id},
            )
        except Exception as e:
            return self._err(e)

    def _new_common(self, create_callable, success_message: str, data_builder=None) -> Dict[str, Any]:
        try:
            self._get_app()
            obj = create_callable()
            data = data_builder(obj) if data_builder else None
            return self._ok(success_message, data)
        except Exception as e:
            return self._err(e)

    def _close_common(self, obj: Any, save: bool, success_message: str) -> Dict[str, Any]:
        try:
            if obj:
                if save:
                    obj.Save()
                obj.Close()
            return self._ok(success_message)
        except Exception as e:
            return self._err(e)

    def quit(self):
        """退出应用"""
        try:
            if self.app:
                self.app.Quit()
                self.app = None
        except Exception:
            pass


class ExcelCOM(OfficeCOMBase):
    """Excel/WPS表格 COM直接调用"""

    def __init__(self):
        super().__init__(
            "Excel.Application",
            prog_ids=["ket.Application", "KET.Application", "Excel.Application"],
        )
        self.workbook = None

    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        return self._open_common(
            file_path=file_path,
            visible=visible,
            open_callable=lambda p: self._set_wb(self.app.Workbooks.Open(p)),
            data_builder=lambda wb: {
                "name": wb.Name,
                "path": wb.FullName,
                "sheets": wb.Worksheets.Count,
            },
            success_message="Excel file opened successfully",
        )

    def _set_wb(self, wb):
        self.workbook = wb
        return wb

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        return self._attach_active_common(
            visible=visible,
            getter=lambda: self.app.ActiveWorkbook,
            assigner=lambda wb: self._set_wb(wb),
            data_builder=lambda wb: {
                "name": wb.Name,
                "path": wb.FullName,
                "sheets": wb.Worksheets.Count,
            },
            not_found_message="No active workbook found",
            success_message="Attached to active workbook",
        )

    def new(self) -> Dict[str, Any]:
        return self._new_common(
            create_callable=lambda: self._set_wb(self.app.Workbooks.Add()),
            success_message="New Excel file created",
            data_builder=lambda wb: {"sheets": wb.Worksheets.Count},
        )

    def close(self, save: bool = True) -> Dict[str, Any]:
        res = self._close_common(self.workbook, save, "Excel file closed")
        self.workbook = None
        return res

    def get_active_sheet(self):
        if not self.workbook:
            return None
        return self.workbook.ActiveSheet

    def select_sheet(self, sheet_name: str) -> bool:
        try:
            sheet = self.workbook.Worksheets(sheet_name)
            sheet.Activate()
            return True
        except Exception:
            return False

    def get_sheet_names(self) -> List[str]:
        if not self.workbook:
            return []
        return [self.workbook.Worksheets(i).Name for i in range(1, self.workbook.Worksheets.Count + 1)]

    def write_cell(self, cell: str, value: Any, sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            sheet = self._get_sheet(sheet_name)
            sheet.Range(cell).Value = value
            return self._ok(f"Written to {cell}", {"cell": cell, "value": str(value)[:50]})
        except Exception as e:
            return self._err(e)

    def write_range(self, start_cell: str, data: List[List[Any]], sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            if not data or not data[0]:
                return {"success": False, "message": "Data is empty"}

            sheet = self._get_sheet(sheet_name)
            rows = len(data)
            cols = len(data[0])
            end_cell = self._get_end_cell(start_cell, rows, cols)
            range_str = f"{start_cell}:{end_cell}"
            sheet.Range(range_str).Value = data
            return self._ok(f"Written range {range_str}", {"rows": rows, "cols": cols})
        except Exception as e:
            return self._err(e)

    def write_summary(self, summary_data: List[List[Any]], start_row: int = 21, sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}

            sheet = self._get_sheet(sheet_name)

            for i, row in enumerate(summary_data):
                row_num = start_row + i
                for j, value in enumerate(row):
                    cell = f"{self._get_column_letter(j + 1)}{row_num}"
                    sheet.Range(cell).Value = value
                    if i == 0:
                        sheet.Range(cell).Font.Bold = True

            return self._ok(f"Written {len(summary_data)} summary rows", {"rows": len(summary_data)})
        except Exception as e:
            return self._err(e)

    def set_formula(self, cell: str, formula: str, sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}
            sheet = self._get_sheet(sheet_name)
            sheet.Range(cell).Formula = formula
            return self._ok(f"Formula set in {cell}", {"cell": cell, "formula": formula})
        except Exception as e:
            return self._err(e)

    def format_range(
        self,
        range_str: str,
        bold: bool = False,
        font_size: int = None,
        font_color: str = None,
        number_format: str = None,
        sheet_name: str = None,
    ) -> Dict[str, Any]:
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

            return self._ok(f"Formatted range {range_str}")
        except Exception as e:
            return self._err(e)

    def read_cell(self, cell: str, sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}

            sheet = self._get_sheet(sheet_name)
            rng = sheet.Range(cell)
            return self._ok(data={"cell": cell, "value": rng.Value, "formula": rng.Formula})
        except Exception as e:
            return self._err(e)

    def read_range(self, start_cell: str, end_cell: str = None, sheet_name: str = None) -> Dict[str, Any]:
        try:
            if not self.workbook:
                return {"success": False, "message": "No workbook open"}

            sheet = self._get_sheet(sheet_name)
            range_str = f"{start_cell}:{end_cell}" if end_cell else start_cell
            data = sheet.Range(range_str).Value
            return self._ok(data={"range": range_str, "values": data})
        except Exception as e:
            return self._err(e)

    def _get_sheet(self, sheet_name: str = None):
        return self.workbook.Worksheets(sheet_name) if sheet_name else self.get_active_sheet()

    @staticmethod
    def _get_end_cell(start_cell: str, rows: int, cols: int) -> str:
        match = re.match(r"([A-Z]+)(\d+)", start_cell.upper())
        if not match:
            return start_cell

        start_col, start_row = match.groups()
        start_row = int(start_row)
        end_col = ExcelCOM._increment_column(start_col, cols - 1)
        end_row = start_row + rows - 1
        return f"{end_col}{end_row}"

    @staticmethod
    def _increment_column(col: str, steps: int) -> str:
        result = col
        for _ in range(steps):
            result = ExcelCOM._next_column(result)
        return result

    @staticmethod
    def _next_column(col: str) -> str:
        chars = list(col.upper())
        for i in range(len(chars) - 1, -1, -1):
            if chars[i] < "Z":
                chars[i] = chr(ord(chars[i]) + 1)
                return "".join(chars)
            chars[i] = "A"
        return "A" + "".join(chars)

    @staticmethod
    def _get_column_letter(col_num: int) -> str:
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

    def _set_doc(self, doc):
        self.document = doc
        return doc

    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        return self._open_common(
            file_path=file_path,
            visible=visible,
            open_callable=lambda p: self._set_doc(self.app.Documents.Open(p)),
            data_builder=lambda d: {"name": d.Name, "path": d.FullName, "words": d.Words.Count},
            success_message="Word document opened successfully",
        )

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        return self._attach_active_common(
            visible=visible,
            getter=lambda: self.app.ActiveDocument,
            assigner=lambda d: self._set_doc(d),
            data_builder=lambda d: {"name": d.Name, "path": d.FullName, "words": d.Words.Count},
            not_found_message="No active document found",
            success_message="Attached to active document",
        )

    def new(self) -> Dict[str, Any]:
        return self._new_common(
            create_callable=lambda: self._set_doc(self.app.Documents.Add()),
            success_message="New Word document created",
        )

    def close(self, save: bool = True) -> Dict[str, Any]:
        res = self._close_common(self.document, save, "Word document closed")
        self.document = None
        return res

    def write_text(self, text: str, position: str = "end") -> Dict[str, Any]:
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}

            selection = self.app.Selection
            if position == "end":
                selection.EndKey(Unit=6)  # wdStory
            elif position == "start":
                selection.HomeKey(Unit=6)

            selection.TypeText(text)
            return self._ok(f"Written {len(text)} characters", {"length": len(text)})
        except Exception as e:
            return self._err(e)

    def write_paragraph(self, text: str) -> Dict[str, Any]:
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}

            selection = self.app.Selection
            selection.EndKey(Unit=6)
            selection.TypeText(text)
            selection.TypeParagraph()
            return self._ok("Paragraph written")
        except Exception as e:
            return self._err(e)

    def replace_text(self, find_text: str, replace_text: str, replace_all: bool = True) -> Dict[str, Any]:
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}

            find_obj = self.app.Selection.Find
            find_obj.ClearFormatting()
            find_obj.Replacement.ClearFormatting()

            replaced = find_obj.Execute(
                find_text,
                ReplaceWith=replace_text,
                Replace=2 if replace_all else 1,  # wdReplaceAll / wdReplaceOne
            )
            return self._ok(f"Replaced result: {replaced}", {"count": replaced})
        except Exception as e:
            return self._err(e)

    def format_text(
        self,
        bold: bool = False,
        italic: bool = False,
        font_size: int = None,
        font_name: str = None,
    ) -> Dict[str, Any]:
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

            return self._ok("Text formatted")
        except Exception as e:
            return self._err(e)

    def read_all_text(self) -> Dict[str, Any]:
        try:
            if not self.document:
                return {"success": False, "message": "No document open"}

            content = self.document.Content.Text
            return self._ok(
                data={
                    "text": content,
                    "length": len(content),
                    "words": self.document.Words.Count,
                    "paragraphs": self.document.Paragraphs.Count,
                }
            )
        except Exception as e:
            return self._err(e)

    def read_selection(self) -> Dict[str, Any]:
        try:
            selection = self.app.Selection
            text = selection.Text
            return self._ok(
                data={
                    "text": text,
                    "length": len(text),
                    "start": selection.Start,
                    "end": selection.End,
                }
            )
        except Exception as e:
            return self._err(e)


class PowerPointCOM(OfficeCOMBase):
    """PowerPoint/WPS演示 COM直接调用"""

    def __init__(self):
        super().__init__(
            "PowerPoint.Application",
            prog_ids=["kwpp.Application", "KWPP.Application", "PowerPoint.Application"],
        )
        self.presentation = None

    def _set_ppt(self, ppt):
        self.presentation = ppt
        return ppt

    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        return self._open_common(
            file_path=file_path,
            visible=visible,
            open_callable=lambda p: self._set_ppt(self.app.Presentations.Open(p)),
            data_builder=lambda p: {"name": p.Name, "path": p.FullName, "slides": p.Slides.Count},
            success_message="Presentation opened successfully",
        )

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        return self._attach_active_common(
            visible=visible,
            getter=lambda: self.app.ActivePresentation,
            assigner=lambda p: self._set_ppt(p),
            data_builder=lambda p: {"name": p.Name, "path": p.FullName, "slides": p.Slides.Count},
            not_found_message="No active presentation found",
            success_message="Attached to active presentation",
        )

    def new(self) -> Dict[str, Any]:
        return self._new_common(
            create_callable=lambda: self._set_ppt(self.app.Presentations.Add()),
            success_message="New presentation created",
            data_builder=lambda p: {"slides": p.Slides.Count},
        )

    def close(self, save: bool = True) -> Dict[str, Any]:
        res = self._close_common(self.presentation, save, "Presentation closed")
        self.presentation = None
        return res

    def add_slide(self, index: int = None, layout: int = 1, title: str = None) -> Dict[str, Any]:
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}

            if index is None:
                index = self.presentation.Slides.Count + 1

            slide = self.presentation.Slides.Add(index, layout)
            if title:
                slide.Shapes[1].TextFrame.TextRange.Text = title

            return self._ok(f"Slide added at position {index}", {"index": index})
        except Exception as e:
            return self._err(e)

    def get_slides_info(self) -> Dict[str, Any]:
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}

            slides = []
            for i in range(1, self.presentation.Slides.Count + 1):
                slide = self.presentation.Slides(i)
                slides.append({"index": i, "name": slide.Name, "shapes": slide.Shapes.Count})

            return self._ok(data={"total": len(slides), "slides": slides})
        except Exception as e:
            return self._err(e)

    def add_text(
        self,
        slide_index: int,
        text: str,
        left: int = 100,
        top: int = 100,
        width: int = 400,
        height: int = 50,
    ) -> Dict[str, Any]:
        try:
            if not self.presentation:
                return {"success": False, "message": "No presentation open"}

            slide = self.presentation.Slides(slide_index)
            shape = slide.Shapes.AddTextbox(1, left, top, width, height)
            shape.TextFrame.TextRange.Text = text
            return self._ok(f"Text added to slide {slide_index}")
        except Exception as e:
            return self._err(e)
