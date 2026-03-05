"""
Excel助手 - 提供简单的函数调用
"""

from typing import List, Any, Optional
from pathlib import Path

def add_summary_to_excel(file_path: str, 
                        summary_data: List[List[Any]], 
                        start_row: int = 21,
                        sheet_name: str = None,
                        visible: bool = False) -> dict:
    """
    向Excel文件添加汇总数据 - 完美支持中文
    
    Args:
        file_path: Excel文件路径
        summary_data: 汇总数据，如 [["部门", "销售额", "销量"], ["华北区", 30355, 370]]
        start_row: 起始行号
        sheet_name: 工作表名称
        visible: 是否显示Excel窗口
    
    Returns:
        操作结果
    """
    from excel_bridge_direct import ExcelBridgeDirect
    
    bridge = ExcelBridgeDirect()
    
    try:
        result = bridge.open(file_path, visible=visible)
        if not result.get("success"):
            return result
        
        if sheet_name:
            bridge.select_sheet(sheet_name)
        
        result = bridge.write_summary(summary_data, start_row)
        
        bridge.close(save=True)
        return result
        
    finally:
        bridge.quit()

def quick_write(file_path: str, cell: str, value: Any, 
               sheet_name: str = None) -> dict:
    """快速写入单元格"""
    from excel_bridge_direct import ExcelBridgeDirect
    
    bridge = ExcelBridgeDirect()
    
    try:
        bridge.open(file_path, visible=False)
        if sheet_name:
            bridge.select_sheet(sheet_name)
        result = bridge.write_cell(cell, value)
        bridge.close(save=True)
        return result
    finally:
        bridge.quit()

def quick_read(file_path: str, cell: str, sheet_name: str = None) -> dict:
    """快速读取单元格"""
    from excel_bridge_direct import ExcelBridgeDirect
    
    bridge = ExcelBridgeDirect()
    
    try:
        bridge.open(file_path, visible=False)
        if sheet_name:
            bridge.select_sheet(sheet_name)
        result = bridge.read_cell(cell)
        bridge.close(save=False)
        return result
    finally:
        bridge.quit()


def edit_active_excel(cell: str, value: Any, sheet_name: str = None) -> dict:
    """编辑当前已打开的WPS/Excel工作簿"""
    from excel_bridge_direct import ExcelBridgeDirect

    bridge = ExcelBridgeDirect()

    try:
        result = bridge.attach_active(visible=True)
        if not result.get("success"):
            return result

        if sheet_name:
            bridge.select_sheet(sheet_name)

        result = bridge.write_cell(cell, value)
        bridge.close(save=True)
        return result
    finally:
        bridge.quit()