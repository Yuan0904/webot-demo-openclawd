"""
桥接器基类 - 提供通用功能
"""

import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional, Callable

from .platform_check import is_windows, can_use_com


class OfficeBridgeBase:
    """Office文档桥接器基类（通用文件解包能力）"""

    def __init__(self, script_dir: Path):
        self.script_dir = script_dir
        self.active_file: Optional[str] = None
        self.use_com = is_windows() and can_use_com()

    def is_com_available(self) -> bool:
        """检查COM是否可用"""
        return self.use_com

    @staticmethod
    def _fail(message: str) -> Dict[str, Any]:
        return {"success": False, "message": message}

    @staticmethod
    def _success(
        message: str,
        data: Optional[Dict[str, Any]] = None,
        output_file: Optional[str] = None,
    ) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "success": True,
            "message": message,
            "data": data or {},
        }
        if output_file:
            result["output_file"] = output_file
        return result

    def _with_temp_unpack(
        self,
        file_path: Optional[str],
        processor: Callable[[Path], Dict[str, Any]],
        output_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """通用解包处理 - 不依赖COM"""
        target = file_path or self.active_file
        if not target:
            return self._fail("No file specified")

        target_path = Path(target)
        if not target_path.exists():
            return self._fail(f"File not found: {target}")

        temp_dir: Optional[str] = None
        try:
            temp_dir = tempfile.mkdtemp()
            temp_path = Path(temp_dir)

            with zipfile.ZipFile(target_path, "r") as zf:
                zf.extractall(temp_path)

            processed = processor(temp_path) or {}
            if processed.get("success") is False:
                return processed

            save_path = Path(output_path) if output_path else target_path
            with zipfile.ZipFile(save_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for f in temp_path.rglob("*"):
                    if f.is_file():
                        zf.write(f, f.relative_to(temp_path))

            return self._success(
                processed.get("message", "Operation completed"),
                processed.get("data", {}),
                str(save_path),
            )

        except Exception as e:
            return self._fail(str(e))
        finally:
            if temp_dir:
                shutil.rmtree(temp_dir, ignore_errors=True)


class DirectCOMBridgeBase(OfficeBridgeBase):
    """Direct COM桥接通用基类（open/new/attach/close/quit 共性下沉）"""

    def __init__(self, script_dir: Path, bridge_name: str, client_attr: str, app_client):
        super().__init__(script_dir)
        if not is_windows():
            raise RuntimeError(f"{bridge_name} is only available on Windows")

        self._bridge_name = bridge_name
        self._client_attr = client_attr
        setattr(self, client_attr, app_client)

    def _client(self):
        return getattr(self, self._client_attr)

    def _sync_active_file(self, result: Dict[str, Any], fallback: Optional[str] = None):
        if result.get("success"):
            self.active_file = result.get("data", {}).get("path") or fallback

    def open(self, file_path: str, visible: bool = False) -> Dict[str, Any]:
        result = self._client().open(file_path, visible)
        self._sync_active_file(result, fallback=file_path)
        return result

    def attach_active(self, visible: bool = True) -> Dict[str, Any]:
        result = self._client().attach_active(visible)
        self._sync_active_file(result)
        return result

    def new(self, fallback_name: str) -> Dict[str, Any]:
        result = self._client().new()
        self._sync_active_file(result, fallback=fallback_name)
        return result

    def close(self, save: bool = True) -> Dict[str, Any]:
        result = self._client().close(save)
        if result.get("success"):
            self.active_file = None
        return result

    def quit(self):
        self._client().quit()
