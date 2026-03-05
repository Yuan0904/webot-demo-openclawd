import json
import sys
from typing import Any, Dict, List, Optional

from pypdf import PdfReader, PdfWriter

from extract_form_field_info import get_field_info


def _build_fields_by_page(fields: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    fields_by_page: Dict[int, Dict[str, Any]] = {}
    for field in fields:
        if "value" not in field:
            continue
        page = field["page"]
        field_id = field["field_id"]
        fields_by_page.setdefault(page, {})[field_id] = field["value"]
    return fields_by_page


def fill_pdf_fields(input_pdf_path: str, fields_json_path: str, output_pdf_path: str):
    with open(fields_json_path, encoding="utf-8") as f:
        fields = json.load(f)

    reader = PdfReader(input_pdf_path)
    field_info = get_field_info(reader)
    fields_by_ids = {f["field_id"]: f for f in field_info}

    has_error = False
    for field in fields:
        field_id = field.get("field_id")
        existing_field = fields_by_ids.get(field_id)
        if not existing_field:
            has_error = True
            print(f"ERROR: `{field_id}` is not a valid field ID")
            continue

        input_page = field.get("page")
        expected_page = existing_field.get("page")
        if input_page != expected_page:
            has_error = True
            print(
                f"ERROR: Incorrect page number for `{field_id}` "
                f"(got {input_page}, expected {expected_page})"
            )
            continue

        if "value" in field:
            err = validation_error_for_field_value(existing_field, field["value"])
            if err:
                print(err)
                has_error = True

    if has_error:
        sys.exit(1)

    fields_by_page = _build_fields_by_page(fields)

    writer = PdfWriter(clone_from=reader)
    for page, field_values in fields_by_page.items():
        writer.update_page_form_field_values(
            writer.pages[page - 1],
            field_values,
            auto_regenerate=False,
        )

    writer.set_need_appearances_writer(True)

    with open(output_pdf_path, "wb") as f:
        writer.write(f)


def validation_error_for_field_value(field_info: Dict[str, Any], field_value: Any) -> Optional[str]:
    field_type = field_info.get("type")
    field_id = field_info.get("field_id")

    if field_type == "checkbox":
        checked_val = field_info.get("checked_value")
        unchecked_val = field_info.get("unchecked_value")
        if field_value not in (checked_val, unchecked_val):
            return (
                f'ERROR: Invalid value "{field_value}" for checkbox field "{field_id}". '
                f'The checked value is "{checked_val}" and the unchecked value is "{unchecked_val}"'
            )

    elif field_type == "radio_group":
        option_values = [opt.get("value") for opt in field_info.get("radio_options", [])]
        if field_value not in option_values:
            return (
                f'ERROR: Invalid value "{field_value}" for radio group field "{field_id}". '
                f"Valid values are: {option_values}"
            )

    elif field_type == "choice":
        choice_values = [opt.get("value") for opt in field_info.get("choice_options", [])]
        if field_value not in choice_values:
            return (
                f'ERROR: Invalid value "{field_value}" for choice field "{field_id}". '
                f"Valid values are: {choice_values}"
            )

    return None


def monkeypatch_pypdf_method():
    from pypdf.constants import FieldDictionaryAttributes
    from pypdf.generic import DictionaryObject

    original_get_inherited = DictionaryObject.get_inherited

    def patched_get_inherited(self, key: str, default=None):
        result = original_get_inherited(self, key, default)
        if key == FieldDictionaryAttributes.Opt:
            if isinstance(result, list) and all(isinstance(v, list) and len(v) == 2 for v in result):
                result = [r[0] for r in result]
        return result

    DictionaryObject.get_inherited = patched_get_inherited


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: fill_fillable_fields.py [input pdf] [field_values.json] [output pdf]")
        sys.exit(1)

    monkeypatch_pypdf_method()
    input_pdf = sys.argv[1]
    fields_json = sys.argv[2]
    output_pdf = sys.argv[3]
    fill_pdf_fields(input_pdf, fields_json, output_pdf)
