from __future__ import annotations

import os
from pathlib import Path

import pytest

from ai_service.evaluation.database import load_evaluation_data
from ai_service.evaluation.runner import build_positive_events, check_production_parity


pytestmark = pytest.mark.integration


@pytest.mark.skipif(
    os.getenv("RUN_EVALUATION_INTEGRATION") != "1",
    reason="Đặt RUN_EVALUATION_INTEGRATION=1 để chạy PostgreSQL read-only integration.",
)
def test_database_snapshot_and_production_parity() -> None:
    database_url = os.environ["DATABASE_URL"]
    data = load_evaluation_data(database_url)
    assert data.database_name == "bookverse_ai_test"
    assert len(data.books) > 0
    assert len(data.interactions) > 0
    positives = build_positive_events(data)
    assert len(positives) > 0
    cancelled_ids = set(
        "purchase:"
        + data.purchases[
            data.purchases["status"].isin(["CANCELLED", "REFUNDED"])
        ]["orderItemId"].astype(str)
    )
    assert set(positives["eventId"]).isdisjoint(cancelled_ids)

    fixture = Path(__file__).parent / "fixtures" / "production_parity_expected.json"
    parity = check_production_parity(fixture)
    assert parity["status"] == "PASS"
    assert parity["rows"] == 30
