from __future__ import annotations

from ai_service.evaluation.hybrid_audit import (
    _mean_metric_reports,
    _random_comparison_summary,
    _window_data_diagnostics,
    build_candidate_rankings,
    reciprocal_rank_fusion,
    weighted_rank_fusion,
)
from ai_service.evaluation.runner import EvaluationConfig, run_evaluation
from ai_service.tests.test_evaluation_runner import sample_data


def test_rrf_is_deterministic_and_deduplicates_items() -> None:
    rankings = {
        "content": ["B2", "B1", "B1"],
        "behavior": ["B1", "B3"],
    }
    first = reciprocal_rank_fusion(rankings, {"content": 1, "behavior": 1}, rrf_k=60)
    second = reciprocal_rank_fusion(
        dict(reversed(list(rankings.items()))),
        {"content": 1, "behavior": 1},
        rrf_k=60,
    )
    assert first == second
    assert len(first) == len(set(first))
    assert first[0] == "B1"


def test_weighted_rank_normalizes_each_source_before_fusion() -> None:
    result = weighted_rank_fusion(
        {
            "content": ["B1", "B2", "B3"],
            "behavior": ["B3", "B2", "B1"],
        },
        {"content": 1, "behavior": 2},
    )
    assert result[0] == "B3"
    assert set(result) == {"B1", "B2", "B3"}


def test_gated_profile_uses_popularity_for_cold_user() -> None:
    base = {
        "content": {"U1": ["C1", "C2"], "U2": ["C1", "C2"]},
        "behavior": {"U1": ["B1", "B2"], "U2": ["B1", "B2"]},
        "popularity": {"U1": ["P1", "P2"], "U2": ["P1", "P2"]},
    }
    result = build_candidate_rankings(base, {"U1": 0, "U2": 5}, "gated_history")
    assert result["U1"] == ["P1", "P2"]
    assert result["U2"][0] in {"B1", "C1"}


def test_window_diagnostics_reports_cold_item_ground_truth() -> None:
    data = sample_data()
    report = run_evaluation(
        data,
        EvaluationConfig(
            cutoff="2026-06-01T00:00:00",
            k_values=(2,),
            parity_fixture=None,
            include_debug_data=True,
        ),
    )
    diagnostics = _window_data_diagnostics(
        data, "2026-06-01T00:00:00", report["debugData"]
    )
    assert diagnostics["eligibleGroundTruthPairs"] == 3
    assert diagnostics["coldItemGroundTruthRate"] >= 0
    assert diagnostics["eligibleTestPositivePerUser"]["median"] == 1


def test_multi_seed_metric_report_uses_mean_not_best_seed() -> None:
    template = {
        cohort: {
            "status": "AVAILABLE",
            "users": 2,
            "precision": 0.1,
            "recall": 0.2,
            "hitRate": 0.3,
            "ndcg": 0.2,
            "mrr": 0.1,
            "catalogCoverage": 0.4,
        }
        for cohort in ("all", "cold_0", "sparse_1_2", "warm_3_plus")
    }
    second = {
        cohort: {**metrics, "ndcg": 0.6}
        for cohort, metrics in template.items()
    }
    merged = _mean_metric_reports([template, second])
    assert merged["all"]["ndcg"] == 0.4
    assert merged["all"]["users"] == 2


def test_random_comparison_pairs_same_temporal_windows() -> None:
    windows = [
        {
            "name": "W1",
            "randomSanityBySeed": [
                {"metrics": {"ndcg": 0.1, "hitRate": 0.2}},
                {"metrics": {"ndcg": 0.3, "hitRate": 0.4}},
            ],
            "metrics": {
                "random_multi_seed_sanity": {"all": {"ndcg": 0.2}},
                "behavior": {"all": {"ndcg": 0.1}},
            },
        },
        {
            "name": "W2",
            "randomSanityBySeed": [
                {"metrics": {"ndcg": 0.2, "hitRate": 0.3}},
                {"metrics": {"ndcg": 0.4, "hitRate": 0.5}},
            ],
            "metrics": {
                "random_multi_seed_sanity": {"all": {"ndcg": 0.3}},
                "behavior": {"all": {"ndcg": 0.5}},
            },
        },
    ]
    summary = _random_comparison_summary(
        windows, ["random_multi_seed_sanity", "behavior"]
    )
    comparison = summary["pairedNdcg"]["behavior"]
    assert round(comparison["mean"], 12) == -0.05
    assert comparison["randomHigherWindows"] == 1
    assert comparison["algorithmHigherWindows"] == 1
