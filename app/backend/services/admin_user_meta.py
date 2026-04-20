import json
from pathlib import Path
from typing import Iterable


class AdminUserMetaStore:
    def __init__(self) -> None:
        self._file_path = Path(__file__).resolve().parent.parent / "data" / "admin_user_meta.json"

    def _read_all(self) -> dict[str, dict[str, str]]:
        if not self._file_path.exists():
            return {}
        try:
            raw = json.loads(self._file_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return raw if isinstance(raw, dict) else {}

    def _write_all(self, payload: dict[str, dict[str, str]]) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._file_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2, sort_keys=True), encoding="utf-8")

    def get_payment_tags(self, user_ids: Iterable[str]) -> dict[str, str]:
        records = self._read_all()
        result: dict[str, str] = {}
        for user_id in user_ids:
            payment_tag = (records.get(user_id, {}) or {}).get("payment_tag", "")
            if payment_tag:
                result[user_id] = payment_tag
        return result

    def set_payment_tag(self, user_id: str, payment_tag: str | None) -> str:
        records = self._read_all()
        entry = dict(records.get(user_id, {}) or {})
        normalized = (payment_tag or "").strip().lower()
        if normalized:
            entry["payment_tag"] = normalized
            records[user_id] = entry
        else:
            entry.pop("payment_tag", None)
            if entry:
                records[user_id] = entry
            else:
                records.pop(user_id, None)
        self._write_all(records)
        return normalized

    def delete_user(self, user_id: str) -> None:
        records = self._read_all()
        if user_id in records:
            records.pop(user_id, None)
            self._write_all(records)


admin_user_meta_store = AdminUserMetaStore()