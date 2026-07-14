"""Đọc taxonomy JSON dùng chung và ánh xạ event legacy cho evaluation."""

from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Any


TAXONOMY_PATH = Path(__file__).resolve().parents[2] / "shared" / "interaction-taxonomy.v1.json"


def _normalize_event_name(value: str) -> str:
    return "_".join(value.strip().upper().replace("-", " ").split())


@lru_cache(maxsize=1)
def load_interaction_taxonomy() -> dict[str, Any]:
    taxonomy = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))
    if taxonomy.get("version") != "interaction-taxonomy.v1":
        raise ValueError("Taxonomy version không được hỗ trợ.")

    canonical_events = [_normalize_event_name(item["name"]) for item in taxonomy["events"]]
    if len(canonical_events) != len(set(canonical_events)):
        raise ValueError("Canonical taxonomy có event bị trùng.")

    canonical_set = set(canonical_events)
    for alias, target in taxonomy["aliases"].items():
        if not alias.strip() or _normalize_event_name(target) not in canonical_set:
            raise ValueError(f"Alias taxonomy không hợp lệ: {alias}.")
    return taxonomy


def map_legacy_interaction_event(raw_event: str) -> str | None:
    taxonomy = load_interaction_taxonomy()
    return taxonomy["aliases"].get(_normalize_event_name(raw_event))


def validate_canonical_event_fields(
    event_name: str,
    fields: dict[str, Any],
) -> list[str]:
    taxonomy = load_interaction_taxonomy()
    canonical = map_legacy_interaction_event(event_name) or _normalize_event_name(event_name)
    definition = next(
        (item for item in taxonomy["events"] if _normalize_event_name(item["name"]) == canonical),
        None,
    )
    if definition is None:
        raise ValueError(f"Unknown interaction event: {event_name}.")
    return [
        field
        for field in definition["requiredFields"]
        if fields.get(field) is None
        or (isinstance(fields.get(field), str) and not fields[field].strip())
    ]


def taxonomy_manifest() -> dict[str, Any]:
    taxonomy = load_interaction_taxonomy()
    canonical_events = sorted(_normalize_event_name(item["name"]) for item in taxonomy["events"])
    aliases = dict(sorted(taxonomy["aliases"].items()))
    payload = json.dumps(
        {
            "version": taxonomy["version"],
            "canonicalEvents": canonical_events,
            "aliases": aliases,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return {
        "version": taxonomy["version"],
        "canonicalEvents": canonical_events,
        "aliases": aliases,
        "checksum": hashlib.sha256(payload).hexdigest(),
    }
