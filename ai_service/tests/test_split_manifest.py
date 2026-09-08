from __future__ import annotations

from ai_service.evaluation.split_manifest import build_three_window_manifest
from ai_service.tests.test_evaluation_runner import sample_data


def test_split_manifest_is_reproducible_and_does_not_publish_final_metric() -> None:
    data = sample_data()
    first = build_three_window_manifest(data, "2026-01-02", "2026-06-01")
    second = build_three_window_manifest(data, "2026-01-02", "2026-06-01")
    assert first == second
    assert first["manifestChecksum"] == second["manifestChecksum"]
    assert first["assertions"]["crossWindowEventIdOverlap"] == 0
    assert first["policy"]["modelSelectionWindow"] == "validation"
    assert first["policy"]["finalTestIsUnseen"] is False
    assert "metrics" not in first
