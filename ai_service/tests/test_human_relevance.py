from __future__ import annotations

from ai_service.evaluation.human_relevance import (
    analyze_blinded_ratings,
    prepare_blinded_assignments,
)


def test_prepare_blinded_assignment_deduplicates_shared_book() -> None:
    public, secret = prepare_blinded_assignments(
        [
            {"participant_code": "P01", "algorithm": "content", "rank": 1, "book_id": "B1"},
            {"participant_code": "P01", "algorithm": "behavior", "rank": 2, "book_id": "B1"},
            {"participant_code": "P01", "algorithm": "hybrid", "rank": 1, "book_id": "B2"},
        ],
        seed=20260730,
    )
    assert len(public) == 2
    assert len(secret) == 2
    assert all("algorithm" not in row for row in public)
    shared = next(row for row in secret if row["book_id"] == "B1")
    assert "content" in shared["algorithm_ranks_json"]
    assert "behavior" in shared["algorithm_ranks_json"]


def test_analyzer_does_not_publish_metrics_below_ten_people() -> None:
    public, secret = prepare_blinded_assignments(
        [
            {"participant_code": "P01", "algorithm": "content", "rank": 1, "book_id": "B1"},
            {"participant_code": "P01", "algorithm": "behavior", "rank": 1, "book_id": "B2"},
            {"participant_code": "P01", "algorithm": "hybrid", "rank": 1, "book_id": "B3"},
        ],
        seed=1,
    )
    ratings = [
        {**row, "consent": "YES", "relevance_rating_1_5": 4}
        for row in public
    ]
    result = analyze_blinded_ratings(ratings, secret)
    assert result["status"] == "NOT_AVAILABLE"
    assert result["metrics"] is None
