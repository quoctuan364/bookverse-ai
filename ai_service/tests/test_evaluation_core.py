from __future__ import annotations

import math

import pandas as pd
import pytest

from ai_service.evaluation.core import (
    assert_temporal_isolation,
    build_behavior_neighbors,
    build_ground_truth,
    calculate_metrics_at_k,
    cohort_for_interaction_count,
    deduplicate_user_book_events,
    rank_behavior_candidates,
    seeded_random_rank,
    stable_temporal_split,
    stable_three_way_temporal_split,
    validate_event_frame,
)


def events(rows: list[tuple[str, str, str, str, str]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["eventId", "userId", "bookId", "eventType", "timestamp"])


def test_temporal_split_ordering_and_disjoint_event_ids() -> None:
    source = events(
        [
            ("E3", "U1", "B3", "BOOKMARK", "2026-06-01T00:00:00"),
            ("E1", "U1", "B1", "BOOKMARK", "2026-05-01T00:00:00"),
            ("E2", "U1", "B2", "PURCHASE", "2026-05-31T23:59:59"),
        ]
    )
    train, test = stable_temporal_split(source, "2026-06-01T00:00:00")
    assert train["eventId"].tolist() == ["E1", "E2"]
    assert test["eventId"].tolist() == ["E3"]
    assert train["timestamp"].max() < test["timestamp"].min()
    assert set(train["eventId"]).isdisjoint(test["eventId"])


def test_future_event_does_not_enter_train() -> None:
    source = events(
        [
            ("TRAIN", "U1", "B1", "BOOKMARK", "2026-05-01"),
            ("FUTURE", "U1", "B2", "FAVORITE", "2026-07-01"),
        ]
    )
    train, _ = stable_temporal_split(source, "2026-06-01")
    assert "FUTURE" not in set(train["eventId"])
    assert "B2" not in set(train["bookId"])


def test_duplicate_book_interaction_uses_timestamp_then_event_id() -> None:
    source = validate_event_frame(
        events(
            [
                ("E2", "U1", "B1", "BOOKMARK", "2026-07-01"),
                ("E1", "U1", "B1", "FAVORITE", "2026-07-01"),
                ("E3", "U1", "B2", "PURCHASE", "2026-07-02"),
            ]
        )
    )
    deduplicated = deduplicate_user_book_events(source)
    assert deduplicated["eventId"].tolist() == ["E1", "E3"]


def test_ground_truth_excludes_seen_and_outside_candidate() -> None:
    test_events = validate_event_frame(
        events(
            [
                ("E1", "U1", "B1", "BOOKMARK", "2026-07-01"),
                ("E2", "U1", "B2", "FAVORITE", "2026-07-02"),
                ("E3", "U2", "B9", "PURCHASE", "2026-07-03"),
            ]
        )
    )
    ground_truth, stats = build_ground_truth(test_events, {"U1": {"B1"}}, {"B1", "B2"})
    assert ground_truth == {"U1": {"B2"}}
    assert stats["excludedSeenInTrain"] == 1
    assert stats["excludedOutsideCandidateAtCutoff"] == 1


def test_known_precision_recall_hit_ndcg_mrr_and_coverage() -> None:
    metric = calculate_metrics_at_k(
        {"U1": ["B1", "B3", "B2"]},
        {"U1": {"B1", "B2"}},
        candidate_count=4,
        k=3,
    )
    expected_ndcg = (1.0 + 1.0 / math.log2(4)) / (1.0 + 1.0 / math.log2(3))
    assert metric["precision"] == pytest.approx(2 / 3)
    assert metric["recall"] == pytest.approx(1.0)
    assert metric["hitRate"] == pytest.approx(1.0)
    assert metric["ndcg"] == pytest.approx(expected_ndcg)
    assert metric["mrr"] == pytest.approx(1.0)
    assert metric["catalogCoverage"] == pytest.approx(0.75)


def test_empty_cohort_is_not_available_and_never_divides_by_zero() -> None:
    metric = calculate_metrics_at_k({}, {}, candidate_count=0, k=5, user_ids=[])
    assert metric["status"] == "NOT_AVAILABLE"
    assert metric["users"] == 0
    assert metric["precision"] is None


def test_cold_start_cohort_boundaries() -> None:
    assert cohort_for_interaction_count(0) == "cold_0"
    assert cohort_for_interaction_count(1) == "sparse_1_2"
    assert cohort_for_interaction_count(2) == "sparse_1_2"
    assert cohort_for_interaction_count(3) == "warm_3_plus"


def test_stable_tie_breaking_for_behavior_rank() -> None:
    rank = rank_behavior_candidates(["B3", "B1", "B2"], set(), {}, 3)
    assert rank == ["B1", "B2", "B3"]


def test_seed_reproducibility() -> None:
    candidates = [f"B{index}" for index in range(20)]
    first = seeded_random_rank(candidates, "U1", 42, 10)
    second = seeded_random_rank(list(reversed(candidates)), "U1", 42, 10)
    different = seeded_random_rank(candidates, "U1", 43, 10)
    assert first == second
    assert first != different


def test_unknown_event_is_rejected() -> None:
    with pytest.raises(ValueError, match="không được hỗ trợ"):
        validate_event_frame(events([("E1", "U1", "B1", "UNKNOWN", "2026-01-01")]))


def test_event_cannot_exist_in_both_train_and_test() -> None:
    duplicated = validate_event_frame(
        events([("E1", "U1", "B1", "BOOKMARK", "2026-01-01")])
    )
    with pytest.raises(AssertionError, match="đồng thời"):
        assert_temporal_isolation(duplicated, duplicated)


def test_behavior_neighbors_are_built_only_from_train_pairs() -> None:
    source = validate_event_frame(
        events(
            [
                ("E1", "U1", "B1", "BOOKMARK", "2026-01-01"),
                ("E2", "U1", "B2", "PURCHASE", "2026-01-02"),
                ("E3", "U2", "B1", "FAVORITE", "2026-01-03"),
                ("E4", "U2", "B2", "POSITIVE_REVIEW", "2026-01-04"),
            ]
        )
    )
    neighbors = build_behavior_neighbors(source)
    assert neighbors["B1"]["B2"] == pytest.approx(1.0)


def test_three_way_temporal_split_has_no_leakage() -> None:
    source = events(
        [
            ("T1", "U1", "B1", "BOOKMARK", "2026-05-31T05:00:00"),
            ("V1", "U1", "B2", "FAVORITE", "2026-06-01T05:00:00"),
            ("V2", "U2", "B3", "PURCHASE", "2026-06-19T05:00:00"),
            ("F1", "U2", "B4", "POSITIVE_REVIEW", "2026-06-20T05:00:00"),
        ]
    )
    train, validation, final_test = stable_three_way_temporal_split(
        source, "2026-06-01", "2026-06-20"
    )
    assert train["eventId"].tolist() == ["T1"]
    assert validation["eventId"].tolist() == ["V1", "V2"]
    assert final_test["eventId"].tolist() == ["F1"]
    assert set(train["eventId"]).isdisjoint(validation["eventId"])
    assert set(validation["eventId"]).isdisjoint(final_test["eventId"])


def test_three_way_split_rejects_invalid_cutoff_order() -> None:
    with pytest.raises(ValueError, match="validation_start"):
        stable_three_way_temporal_split(events([]), "2026-06-20", "2026-06-01")
