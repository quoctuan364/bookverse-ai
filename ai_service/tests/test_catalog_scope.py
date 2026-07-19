from ai_service.catalog_scope import build_synthetic_catalog_predicate


def test_catalog_scope_uses_metadata_relation_when_available() -> None:
    predicate = build_synthetic_catalog_predicate("b", True)
    assert "book_source_metadata" in predicate
    assert 'bsm."bookId" = b.id' in predicate


def test_catalog_scope_keeps_legacy_database_compatible() -> None:
    assert build_synthetic_catalog_predicate("b", False) == "TRUE"
