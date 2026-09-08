from __future__ import annotations

import pytest

from ai_service.evaluation.taxonomy import (
    load_interaction_taxonomy,
    map_legacy_interaction_event,
    taxonomy_manifest,
    validate_canonical_event_fields,
)


def test_taxonomy_version_alias_and_manifest_are_stable() -> None:
    taxonomy = load_interaction_taxonomy()
    assert taxonomy["version"] == "interaction-taxonomy.v1"
    assert map_legacy_interaction_event("VIEW") == "BOOK_VIEW"
    assert map_legacy_interaction_event("read-page") == "READING_PROGRESS"
    assert map_legacy_interaction_event("CHATBOT_QUERY") == "ASSISTANT_QUERY"
    assert map_legacy_interaction_event("UNKNOWN_EVENT") is None
    assert taxonomy_manifest() == taxonomy_manifest()


def test_required_fields_and_unknown_event() -> None:
    missing = validate_canonical_event_fields(
        "RECOMMENDATION_CLICK",
        {"requestId": "REQ-1", "userId": "U1", "timestamp": "2026-07-15"},
    )
    assert missing == ["bookId"]
    with pytest.raises(ValueError, match="Unknown interaction event"):
        validate_canonical_event_fields("NOT_REAL", {})
