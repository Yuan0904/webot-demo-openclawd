"""
Excel桥接器 - 直接COM调用，完美支持中文
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))

from common.com_direct import ExcelCOM
from common.platform_check import is_windows
from common.utils import setup_logger

logger = setup_logger('excel_bridge_direct')

class ExcelBridgeDirect:
    """Excel桥接器 - 直接COM调用"""
    
    def __init__(self):
        if not is_windows():
            raise RuntimeError("ExcelBridgeDirect is only available on Windows")
        
        self.excel = ExcelCOM()
        self.active_file = None
        logger.info("ExcelBridgeDirect initialized")
    
    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        """打开Excel文件"""
        result = self.excel.open(file_path, visible)
        if result.get("success"):
            self.active_file = file_path
        return result

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        """附加到当前WPS/Excel已打开工作簿"""
        result = self.excel.attach_active(visible)
        if result.get("success"):
            self.active_file = result.get("data", {}).get("path")
        return result
    
    def new(self) -> Dict[str, Any]:
        """新建Excel文件"""
        result = self.excel.new()
        if result.get("success"):
            self.active_file = "新建文件.xlsx"
        return result
    
    def close(self, save: bool = True) -> Dict[str, Any]:
        """关闭文件"""
        result = self.excel.close(save)
        if result.get("success"):
            self.active_file = None
        return result
    
    def quit(self):
        """退出Excel"""
        self.excel.quit()
    
    # ========== 写入操作（完美支持中文）==========
    
    def write_cell(self, cell: str, value: Any, sheet_name: str = None) -> Dict[str, Any]:
        """写入单元格"""
        return self.excel.write_cell(cell, value, sheet_name)
    
    def write_range(self, start_cell: str, data: List[List[Any]], 
                   sheet_name: str = None) -> Dict[str, Any]:
        """写入范围"""
        return self.excel.write_range(start_cell, data, sheet_name)
    
    def write_summary(self, summary_data: List[List[Any]], 
                     start_row: int = 21,
                     sheet_name: str = None) -> Dict[str, Any]:
        """写入汇总数据 - 解决乱码问题"""
        return self.excel.write_summary(summary_data, start_row, sheet_name)
    
    def set_formula(self, cell: str, formula: str, sheet_name: str = None) -> Dict[str, Any]:
        """设置公式"""
        return self.excel.set_formula(cell, formula, sheet_name)
    
    def format_range(self, range_str: str, bold: bool = False,
                    font_size: int = None, font_color: str = None,
                    number_format: str = None,
                    sheet_name: str = None) -> Dict[str, Any]:
        """格式化范围"""
        return self.excel.format_range(range_str, bold, font_size,
                                      font_color, number_format, sheet_name)
    
    # ========== 读取操作 ==========
    
    def read_cell(self, cell: str, sheet_name: str = None) -> Dict[str, Any]:
        """读取单元格"""
        return self.excel.read_cell(cell, sheet_name)
    
    def read_range(self, start_cell: str, end_cell: str = None,
                  sheet_name: str = None) -> Dict[str, Any]:
        """读取范围"""
        return self.excel.read_range(start_cell, end_cell, sheet_name)
    
    # ========== 工作表操作 ==========
    
    def select_sheet(self, sheet_name: str) -> bool:
        """选择工作表"""
        return self.excel.select_sheet(sheet_name)
    
    def get_sheet_names(self) -> List[str]:
        """获取所有工作表名称"""
        return self.excel.get_sheet_names()
