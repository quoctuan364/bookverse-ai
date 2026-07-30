from __future__ import annotations

import pytest

from ai_service.main import configured_cors_origins, is_authorized_service_request


def test_service_token_is_required_in_production() -> None:
    assert not is_authorized_service_request(None, "", True)
    assert not is_authorized_service_request("wrong", "expected-secret", True)
    assert is_authorized_service_request("expected-secret", "expected-secret", True)


def test_development_can_run_without_internal_token() -> None:
    assert is_authorized_service_request(None, "", False)


def test_production_cors_must_be_explicit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.delenv("BOOKVERSE_AI_ALLOWED_ORIGINS", raising=False)
    with pytest.raises(RuntimeError, match="BOOKVERSE_AI_ALLOWED_ORIGINS"):
        configured_cors_origins()


def test_cors_parses_only_configured_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setenv("BOOKVERSE_AI_ALLOWED_ORIGINS", "https://bookverse.vn, https://admin.bookverse.vn")
    assert configured_cors_origins() == ["https://bookverse.vn", "https://admin.bookverse.vn"]

