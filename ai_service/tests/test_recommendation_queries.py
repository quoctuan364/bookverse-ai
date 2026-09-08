from __future__ import annotations

import pandas as pd

from ai_service import main


def test_purchase_preferences_only_use_valid_order_statuses(monkeypatch) -> None:
    """Đơn chờ, hủy và hoàn tiền không được dùng làm tín hiệu sở thích."""

    captured: dict[str, object] = {}

    def fake_read_dataframe(query: str, params: dict[str, object]) -> pd.DataFrame:
        captured["query"] = query
        captured["params"] = params
        return pd.DataFrame()

    monkeypatch.setattr(main, "read_dataframe", fake_read_dataframe)
    monkeypatch.setattr(main, "synthetic_catalog_predicate", lambda: "TRUE")

    main.get_user_purchases("user-1")

    normalized_query = " ".join(str(captured["query"]).split())
    assert "o.status IN ('PAID', 'PAID_DEMO', 'SHIPPED', 'COMPLETED')" in normalized_query
    assert "PENDING" not in normalized_query
    assert "CANCELLED" not in normalized_query
    assert "REFUNDED" not in normalized_query
    assert captured["params"] == {"user_id": "user-1"}
