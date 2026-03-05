"""
Common utilities for Office skills
Python直接调用COM，完美支持中文
"""

from .com_direct import ExcelCOM, WordCOM, PowerPointCOM
from .office_bridge_base import OfficeBridgeBase
from .platform_check import is_windows, can_use_com, get_os_info
from .utils import setup_logger, ensure_directory, get_file_extension

__version__ = "1.0.0"

__all__ = [
    'ExcelCOM',
    'WordCOM',
    'PowerPointCOM',
    'OfficeBridgeBase',
    'is_windows',
    'can_use_com',
    'get_os_info',
    'setup_logger',
    'ensure_directory',
    'get_file_extension',
]