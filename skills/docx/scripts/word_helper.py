"""
Word助手 - 提供简单的函数调用
"""

import hashlib
import json
import shutil
from pathlib import Path
from time import time
from uuid import uuid4


def _to_file_id(file_path: Path) -> str:
    return hashlib.sha1(str(file_path).encode("utf-8")).hexdigest()[:16]


def _snapshots_root() -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "snapshots"


def _read_manifest(file_dir: Path, file_path: Path) -> dict:
    manifest_path = file_dir / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if not isinstance(manifest.get("versions"), list):
                manifest["versions"] = []
            return manifest
        except Exception:
            pass
    return {"fileId": _to_file_id(file_path), "filePath": str(file_path), "versions": []}


def _write_manifest(file_dir: Path, manifest: dict) -> None:
    file_dir.mkdir(parents=True, exist_ok=True)
    (file_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _create_snapshot(file_path: str | Path, version_type: str, task_id: str, created_by: str = "ai") -> dict:
    target = Path(file_path).expanduser().resolve()
    if not target.exists() or not target.is_file():
        return {"ok": False, "message": f"file not found: {target}"}

    file_id = _to_file_id(target)
    ext = target.suffix or ".bin"
    snapshots_root = _snapshots_root()
    file_dir = snapshots_root / file_id
    task_dir = file_dir / task_id
    snapshot_name = f"before{ext}" if version_type == "before_ai" else f"after{ext}"
    snapshot_path = task_dir / snapshot_name

    task_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, snapshot_path)

    sha256 = hashlib.sha256(snapshot_path.read_bytes()).hexdigest()
    size_bytes = snapshot_path.stat().st_size
    created_at = int(time() * 1000)
    version_id = str(uuid4())

    manifest = _read_manifest(file_dir, target)
    manifest["filePath"] = str(target)
    entry = {
        "id": version_id,
        "fileId": file_id,
        "versionType": version_type,
        "createdAt": created_at,
        "createdBy": created_by,
        "snapshotPath": str(snapshot_path),
        "taskId": task_id,
        "filePath": str(target),
        "sizeBytes": size_bytes,
        "sha256": sha256,
    }
    manifest.setdefault("versions", []).append(entry)
    if version_type == "after_ai":
        manifest["currentVersionId"] = version_id
    _write_manifest(file_dir, manifest)

    return {"ok": True, "version": entry}


def write_to_word(file_path: str, text: str, position: str = "end") -> dict:
    """
    向Word文档写入文本

    Args:
        file_path: Word文件路径
        text: 要写入的文本
        position: "start" 或 "end"

    Returns:
        操作结果
    """
    from word_bridge_direct import WordBridgeDirect

    bridge = WordBridgeDirect()
    task_id = str(uuid4())

    try:
        result = bridge.open(file_path, visible=False)
        if not result.get("success"):
            return result

        before = _create_snapshot(file_path, "before_ai", task_id, "ai")
        if not before.get("ok"):
            return {"success": False, "message": f"before snapshot failed: {before.get('message', 'unknown')}"}

        result = bridge.write_text(text, position)
        if not result.get("success"):
            bridge.close(save=False)
            return result

        close_result = bridge.close(save=True)
        if not close_result.get("success"):
            return close_result

        after = _create_snapshot(file_path, "after_ai", task_id, "ai")
        if not after.get("ok"):
            return {"success": False, "message": f"after snapshot failed: {after.get('message', 'unknown')}"}

        result["snapshot"] = {"taskId": task_id, "before": before["version"]["id"], "after": after["version"]["id"]}
        return result

    finally:
        bridge.quit()


def replace_in_word(file_path: str, find_text: str, replace_text: str,
                    replace_all: bool = True) -> dict:
    """
    替换Word文档中的文本

    Args:
        file_path: Word文件路径
        find_text: 要查找的文本
        replace_text: 替换的文本
        replace_all: 是否替换所有

    Returns:
        操作结果
    """
    from word_bridge_direct import WordBridgeDirect

    bridge = WordBridgeDirect()
    task_id = str(uuid4())

    try:
        result = bridge.open(file_path, visible=False)
        if not result.get("success"):
            return result

        before = _create_snapshot(file_path, "before_ai", task_id, "ai")
        if not before.get("ok"):
            return {"success": False, "message": f"before snapshot failed: {before.get('message', 'unknown')}"}

        result = bridge.replace_text(find_text, replace_text, replace_all)
        if not result.get("success"):
            bridge.close(save=False)
            return result

        close_result = bridge.close(save=True)
        if not close_result.get("success"):
            return close_result

        after = _create_snapshot(file_path, "after_ai", task_id, "ai")
        if not after.get("ok"):
            return {"success": False, "message": f"after snapshot failed: {after.get('message', 'unknown')}"}

        result["snapshot"] = {"taskId": task_id, "before": before["version"]["id"], "after": after["version"]["id"]}
        return result

    finally:
        bridge.quit()


def read_word(file_path: str) -> dict:
    """
    读取Word文档内容

    Args:
        file_path: Word文件路径

    Returns:
        文档内容
    """
    from word_bridge_direct import WordBridgeDirect

    bridge = WordBridgeDirect()

    try:
        result = bridge.open(file_path, visible=False)
        if not result.get("success"):
            return result

        result = bridge.read_all_text()

        bridge.close(save=False)
        return result

    finally:
        bridge.quit()


def edit_active_word(find_text: str, replace_text: str, replace_all: bool = True) -> dict:
    """编辑当前已打开的WPS/Word文档"""
    from word_bridge_direct import WordBridgeDirect

    bridge = WordBridgeDirect()
    task_id = str(uuid4())

    try:
        result = bridge.attach_active(visible=True)
        if not result.get("success"):
            return result

        active_path = result.get("data", {}).get("path")
        if not active_path:
            return {"success": False, "message": "active document path unavailable"}

        before = _create_snapshot(active_path, "before_ai", task_id, "ai")
        if not before.get("ok"):
            return {"success": False, "message": f"before snapshot failed: {before.get('message', 'unknown')}"}

        result = bridge.replace_text(find_text, replace_text, replace_all)
        if not result.get("success"):
            bridge.close(save=False)
            return result

        close_result = bridge.close(save=True)
        if not close_result.get("success"):
            return close_result

        after = _create_snapshot(active_path, "after_ai", task_id, "ai")
        if not after.get("ok"):
            return {"success": False, "message": f"after snapshot failed: {after.get('message', 'unknown')}"}

        result["snapshot"] = {"taskId": task_id, "before": before["version"]["id"], "after": after["version"]["id"]}
        return result
    finally:
        bridge.quit()
