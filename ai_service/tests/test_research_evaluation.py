from __future__ import annotations

import pytest

from ai_service.evaluation.research import (
    choose_validation_profile,
    compare_final_metrics,
    profile_score,
    summarize_random_seeds,
)


def _metric(ndcg: float, recall: float, hit_rate: float, coverage: float) -> dict:
    return {
        "status": "AVAILABLE",
        "precision": 0.01,
        "recall": recall,
        "hitRate": hit_rate,
        "ndcg": ndcg,
        "mrr": 0.01,
        "catalogCoverage": coverage,
    }


def test_choose_profile_uses_ndcg_then_recall() -> None:
    rows = [
        {"profile": "a", "metric": _metric(0.2, 0.1, 0.3, 0.4)},
        {"profile": "b", "metric": _metric(0.2, 0.2, 0.1, 0.2)},
        {"profile": "c", "metric": _metric(0.1, 0.9, 0.9, 0.9)},
    ]
    assert choose_validation_profile(rows)["profile"] == "b"
    assert profile_score(rows[1]) > profile_score(rows[2])


def test_random_seed_summary_reports_mean_and_std() -> None:
    reports = []
    for value in (0.1, 0.2, 0.3):
        reports.append(
            {
                "metrics": {
                    "random_seeded_sanity": {
                        "k10": {
                            "all": {
                                "status": "AVAILABLE",
                                "precision": value,
                                "recall": value,
                                "hitRate": value,
                                "ndcg": value,
                                "mrr": value,
                                "catalogCoverage": value,
                            }
                        }
                    }
                }
            }
        )
    summary = summarize_random_seeds(reports)
    assert summary["status"] == "AVAILABLE"
    assert summary["runs"] == 3
    assert summary["ndcg"]["mean"] == pytest.approx(0.2)
    assert summary["ndcg"]["std"] > 0


def test_final_decision_keeps_production_when_candidate_does_not_generalize() -> None:
    selected = _metric(0.2, 0.2, 0.2, 0.3)
    production = _metric(0.3, 0.2, 0.2, 0.3)
    baselines = {
        "content": _metric(0.4, 0.3, 0.3, 0.4),
        "behavior": _metric(0.35, 0.3, 0.3, 0.8),
    }
    decision = compare_final_metrics(selected, production, baselines)
    assert decision["deploymentDecision"] == "KEEP_PRODUCTION"
    assert decision["bestBaseline"] == "content"
    assert decision["generalizedFromValidation"] is False
    assert decision["selectedVsProduction"]["ndcg"] == pytest.approx(-0.1)
