"""
Excel桥接器工厂 - 根据系统自动选择最佳实现
"""

import sys
from pathlib import Path
from typing import Optional

current_dir = Path(__file__).parent
skill_dir = current_dir.parent.parent
common_dir = skill_dir / "common"
if str(common_dir) not in sys.path:
    sys.path.insert(0, str(common_dir))

from common.platform_check import is_windows, can_use_com

def create_excel_bridge(force_direct: bool = False):
    """
    创建Excel桥接器
    
    Args:
        force_direct: 是否强制使用直接COM
    
    Returns:
        Excel桥接器实例
    """
    if is_windows() and (force_direct or can_use_com()):
        try:
            from excel_bridge_direct import ExcelBridgeDirect
            return ExcelBridgeDirect()
        except ImportError:
            # 降级到普通桥接器
            from excel_bridge import ExcelBridge
            return ExcelBridge()
    else:
        # 非Windows系统，使用普通桥接器
        from excel_bridge import ExcelBridge
        return ExcelBridge()