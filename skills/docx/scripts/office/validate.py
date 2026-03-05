"""
Command line tool to validate Office document XML files against XSD schemas and tracked changes.

Usage:
    python validate.py <path> [--original <original_file>] [--auto-repair] [--author NAME]

The first argument can be either:
- An unpacked directory containing the Office document XML files
- A packed Office file (.docx/.pptx/.xlsx) which will be unpacked to a temp directory

Auto-repair fixes:
- paraId/durableId values that exceed OOXML limits
- Missing xml:space="preserve" on w:t elements with whitespace
"""

import argparse
import sys
import tempfile
import zipfile
from pathlib import Path

from validators import DOCXSchemaValidator, PPTXSchemaValidator, RedliningValidator
# 新增实时桥接校验====开始======
from word_bridge import WordBridge
from excel_bridge import ExcelBridge
from ppt_bridge import PPTBridge

def validate_live(file_path: str, file_type: str, **kwargs):
    """实时验证（使用COM）"""
    bridges = {
        "docx": WordBridge,
        "pptx": PPTBridge,
        "xlsx": ExcelBridge
    }
    
    bridge_class = bridges.get(file_type)
    if not bridge_class:
        return {"success": False, "message": f"Unsupported file type: {file_type}"}
    
    bridge = bridge_class()
    
    # 打开文件
    result = bridge.open(file_path)
    if not result.get("success"):
        return result
    
    try:
        # 根据类型执行验证
        if file_type == "docx":
            return bridge.validate_against_xsd(
                original_file=kwargs.get("original")
            )
        elif file_type == "pptx":
            return bridge.validate_slide_layouts()
        elif file_type == "xlsx":
            return bridge.detect_errors()
    finally:
        bridge.close(save=False)
    
 # ===================   
 
    

def main():
    parser = argparse.ArgumentParser(description="Validate Office document XML files")
    parser.add_argument(
        "path",
        help="Path to unpacked directory or packed Office file (.docx/.pptx/.xlsx)",
    )
    parser.add_argument(
        "--original",
        required=False,
        default=None,
        help="Path to original file (.docx/.pptx/.xlsx). If omitted, all XSD errors are reported and redlining validation is skipped.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose output",
    )
    parser.add_argument(
        "--auto-repair",
        action="store_true",
        help="Automatically repair common issues (hex IDs, whitespace preservation)",
    )
    parser.add_argument(
        "--author",
        default="Claude",
        help="Author name for redlining validation (default: Claude)",
    )
    args = parser.parse_args()

    path = Path(args.path)
    assert path.exists(), f"Error: {path} does not exist"


    original_file = None
    if args.original:
        original_file = Path(args.original)
        assert original_file.is_file(), f"Error: {original_file} is not a file"
        assert original_file.suffix.lower() in [".docx", ".pptx", ".xlsx"], (
            f"Error: {original_file} must be a .docx, .pptx, or .xlsx file"
        )

    file_extension = (original_file or path).suffix.lower()
    assert file_extension in [".docx", ".pptx", ".xlsx"], (
        f"Error: Cannot determine file type from {path}. Use --original or provide a .docx/.pptx/.xlsx file."
    )

    if path.is_file() and path.suffix.lower() in [".docx", ".pptx", ".xlsx"]:
        temp_dir = tempfile.mkdtemp()
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(temp_dir)
        unpacked_dir = Path(temp_dir)
    else:
        assert path.is_dir(), f"Error: {path} is not a directory or Office file"
        unpacked_dir = path
        
        
 # 新增判断
    if args.live:
        result = validate_live(
            str(path),
            file_extension[1:],  # 去掉点
            original=args.original
        )
        
        if result.get("success"):
            print(result.get("message", "Validation passed"))
            if args.verbose and result.get("details"):
                print(json.dumps(result["details"], indent=2))
            sys.exit(0)
        else:
            print(f"Validation failed: {result.get('message')}")
            sys.exit(1)
    match file_extension:
        case ".docx":
            validators = [
                DOCXSchemaValidator(unpacked_dir, original_file, verbose=args.verbose),
            ]
            if original_file:
                validators.append(
                    RedliningValidator(unpacked_dir, original_file, verbose=args.verbose, author=args.author)  
                )
        case ".pptx":
            validators = [
                PPTXSchemaValidator(unpacked_dir, original_file, verbose=args.verbose),
            ]
        case _:
            print(f"Error: Validation not supported for file type {file_extension}")
            sys.exit(1)

# 新增结束

    if args.auto_repair:
        total_repairs = sum(v.repair() for v in validators)
        if total_repairs:
            print(f"Auto-repaired {total_repairs} issue(s)")

    success = all(v.validate() for v in validators)

    if success:
        print("All validations PASSED!")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
