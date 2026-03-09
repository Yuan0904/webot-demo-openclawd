"""
平台检测工具 - 判断操作系统和COM可用性
"""

import sys
import platform
import subprocess
from pathlib import Path
from typing import Dict

def is_windows() -> bool:
    """判断是否为Windows系统"""
    return platform.system().lower() == 'windows'

def is_macos() -> bool:
    """判断是否为macOS系统"""
    return platform.system().lower() == 'darwin'

def is_linux() -> bool:
    """判断是否为Linux系统"""
    return platform.system().lower() == 'linux'

def can_use_com() -> bool:
    """判断是否可以使用COM（仅Windows）"""
    if not is_windows():
        return False
    
    try:
        import win32com.client
        return True
    except ImportError:
        return False

def get_os_info() -> Dict[str, str]:
    """获取操作系统信息"""
    return {
        'system': platform.system(),
        'release': platform.release(),
        'version': platform.version(),
        'machine': platform.machine(),
        'processor': platform.processor(),
        'python_version': sys.version
    }

def get_recommended_backend() -> str:
    """获取推荐的后端"""
    if is_windows() and can_use_com():
        return 'com'
    return 'python'