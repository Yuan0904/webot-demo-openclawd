"""
PowerPoint助手 - 提供简单的函数调用
"""

from typing import Optional, List

def create_presentation(file_path: str, title: str = None) -> dict:
    """
    创建新的演示文稿
    
    Args:
        file_path: 保存路径
        title: 第一张幻灯片的标题
    
    Returns:
        操作结果
    """
    from ppt_bridge_direct import PPTBridgeDirect
    
    bridge = PPTBridgeDirect()
    
    try:
        result = bridge.new()
        if not result.get("success"):
            return result
        
        if title:
            bridge.set_title(1, title)
        
        result = bridge.close(save=True)
        return result
        
    finally:
        bridge.quit()

def add_slide_with_title(file_path: str, title: str, 
                        layout: int = 1) -> dict:
    """
    添加带标题的幻灯片
    
    Args:
        file_path: 演示文稿路径
        title: 幻灯片标题
        layout: 幻灯片布局
    
    Returns:
        操作结果
    """
    from ppt_bridge_direct import PPTBridgeDirect
    
    bridge = PPTBridgeDirect()
    
    try:
        result = bridge.open(file_path, visible=False)
        if not result.get("success"):
            return result
        
        result = bridge.add_slide(title=title, layout=layout)
        
        bridge.close(save=True)
        return result
        
    finally:
        bridge.quit()

def read_slides_info(file_path: str) -> dict:
    """
    读取幻灯片信息
    
    Args:
        file_path: 演示文稿路径
    
    Returns:
        幻灯片信息
    """
    from ppt_bridge_direct import PPTBridgeDirect
    
    bridge = PPTBridgeDirect()
    
    try:
        result = bridge.open(file_path, visible=False)
        if not result.get("success"):
            return result
        
        result = bridge.get_slides_info()
        
        bridge.close(save=False)
        return result
        
    finally:
        bridge.quit()


def edit_active_ppt(slide_index: int, text: str,
                    left: int = 100, top: int = 100,
                    width: int = 400, height: int = 50) -> dict:
    """编辑当前已打开的WPS/PPT演示文稿"""
    from ppt_bridge_direct import PPTBridgeDirect

    bridge = PPTBridgeDirect()

    try:
        result = bridge.attach_active(visible=True)
        if not result.get("success"):
            return result

        result = bridge.add_text(slide_index, text, left, top, width, height)
        bridge.close(save=True)
        return result
    finally:
        bridge.quit()