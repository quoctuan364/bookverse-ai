from __future__ import annotations

from pathlib import Path

import pandas as pd

from ai_service import main as production
from ai_service.evaluation.database import EvaluationData, assert_evaluation_database
from ai_service.evaluation.runner import (
    EvaluationConfig,
    build_positive_events,
    rank_hybrid_snapshot,
    run_evaluation,
)


def _frame(columns: list[str], rows: list[tuple[object, ...]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=columns)


def sample_data() -> EvaluationData:
    books = _frame(
        [
            "bookId",
            "title",
            "authorName",
            "categoryId",
            "categoryName",
            "rating",
            "status",
            "deletedAt",
            "createdAt",
        ],
        [
            ("B1", "Book 1", "Author A", "C1", "Cat 1", 5.0, "ACTIVE", None, "2025-01-01"),
            ("B2", "Book 2", "Author A", "C1", "Cat 1", 4.0, "ACTIVE", None, "2025-01-02"),
            ("B3", "Book 3", "Author B", "C2", "Cat 2", 3.0, "ACTIVE", None, "2025-01-03"),
            ("B4", "Book 4", "Author C", "C3", "Cat 3", 2.0, "ACTIVE", None, "2025-01-04"),
        ],
    )
    books["createdAt"] = pd.to_datetime(books["createdAt"])
    interactions = _frame(
        ["eventId", "userId", "bookId", "actionType", "createdAt"],
        [
            ("I1", "U1", "B1", "VIEW", "2026-01-01"),
            ("I2", "U1", "B3", "VIEW", "2026-07-01"),
        ],
    )
    interactions["createdAt"] = pd.to_datetime(interactions["createdAt"])
    sessions = _frame(
        ["sessionId", "userId", "bookId", "timeSpent", "progressPercent", "createdAt"],
        [
            ("S1", "U1", "B1", 600, 60.0, "2026-01-01"),
            ("S2", "U1", "B2", 600, 60.0, "2026-07-01"),
            ("S3", "U2", "B2", 600, 60.0, "2026-01-02"),
            ("S4", "U2", "B3", 600, 60.0, "2026-07-02"),
        ],
    )
    sessions["createdAt"] = pd.to_datetime(sessions["createdAt"])
    bookmarks = _frame(
        ["bookmarkId", "userId", "bookId", "createdAt"],
        [("M1", "U3", "B4", "2026-07-03")],
    )
    bookmarks["createdAt"] = pd.to_datetime(bookmarks["createdAt"])
    favorites = _frame(["favoriteId", "userId", "bookId", "createdAt"], [])
    favorites["createdAt"] = pd.to_datetime(favorites["createdAt"])
    reviews = _frame(["reviewId", "userId", "bookId", "rating", "createdAt"], [])
    reviews["createdAt"] = pd.to_datetime(reviews["createdAt"])
    purchases = _frame(
        ["orderItemId", "userId", "bookId", "quantity", "status", "createdAt"],
        [
            ("O1", "U1", "B4", 1, "CANCELLED", "2026-07-04"),
            ("O2", "U2", "B1", 1, "PAID", "2026-02-01"),
        ],
    )
    purchases["createdAt"] = pd.to_datetime(purchases["createdAt"])
    return EvaluationData(
        database_name="bookverse_ai_test",
        books=books,
        interactions=interactions,
        reading_sessions=sessions,
        bookmarks=bookmarks,
        favorites=favorites,
        reviews=reviews,
        purchases=purchases,
    )


def test_cancelled_purchase_is_not_positive() -> None:
    positives = build_positive_events(sample_data())
    assert "purchase:O1" not in set(positives["eventId"])
    assert "purchase:O2" in set(positives["eventId"])


def test_evaluation_checksum_is_reproducible_and_future_features_are_zero(tmp_path: Path) -> None:
    config = EvaluationConfig(
        cutoff="2026-06-01T00:00:00",
        k_values=(2,),
        seed=42,
        output_root=tmp_path,
        parity_fixture=None,
    )
    first = run_evaluation(sample_data(), config)
    second = run_evaluation(sample_data(), config)
    assert first["reproducibilityChecksum"] == second["reproducibilityChecksum"]
    assert first["metrics"] == second["metrics"]
    assert first["leakageAssertions"]["futureFeatureEventsUsed"] == 0
    assert first["leakageAssertions"]["cancelledOrRefundedPurchasePositives"] == 0
    assert first["leakageAssertions"]["heldOutBooksSeenInUserTrainFeature"] == 0
    assert first["statistics"]["cohorts"]["cold_0"] == 1


def test_debug_data_is_opt_in_and_uses_same_eligible_users(tmp_path: Path) -> None:
    regular = run_evaluation(
        sample_data(),
        EvaluationConfig(
            cutoff="2026-06-01T00:00:00",
            k_values=(2,),
            seed=42,
            output_root=tmp_path,
            parity_fixture=None,
        ),
    )
    debug = run_evaluation(
        sample_data(),
        EvaluationConfig(
            cutoff="2026-06-01T00:00:00",
            k_values=(2,),
            seed=42,
            output_root=tmp_path,
            parity_fixture=None,
            include_debug_data=True,
        ),
    )
    assert "debugData" not in regular
    assert sorted(debug["debugData"]["groundTruth"]) == ["U1", "U2", "U3"]
    assert sorted(debug["debugData"]["rankings"]["content"]) == ["U1", "U2", "U3"]
    assert debug["debugData"]["hybridScoreSummaries"]["U1"]["score"]["max"] >= 0
    # Debug không được làm thay đổi metric/checksum chuẩn hóa.
    assert debug["metrics"] == regular["metrics"]
    assert debug["reproducibilityChecksum"] == regular["reproducibilityChecksum"]


def test_snapshot_hybrid_matches_production_formula_and_tie_break() -> None:
    books = pd.DataFrame(
        [
            {
                "bookId": "B2",
                "title": "Book 2",
                "authorName": "A2",
                "categoryId": "C1",
                "categoryName": "Cat",
                "rating": 0.0,
                "popularityNorm": 0.5,
            },
            {
                "bookId": "B1",
                "title": "Book 1",
                "authorName": "A1",
                "categoryId": "C1",
                "categoryName": "Cat",
                "rating": 0.0,
                "popularityNorm": 1.0,
            },
        ]
    )
    reading_categories = {"C1": 2.0}
    reading_authors: dict[str, float] = {}
    purchase_categories: dict[str, float] = {}
    snapshot = rank_hybrid_snapshot(
        books, reading_categories, reading_authors, purchase_categories, 2
    )
    production_rows = production.rank_hybrid_recommendations(
        books,
        reading_categories,
        reading_authors,
        purchase_categories,
        {},
    )
    assert [row["bookId"] for row in snapshot] == [row["bookId"] for row in production_rows]
    assert [row["score"] for row in snapshot] == [row["score"] for row in production_rows]


def test_database_guard_rejects_demo_database() -> None:
    assert (
        assert_evaluation_database(
            "postgresql://postgres:postgres@localhost:5433/bookverse_ai_test?schema=public"
        )
        == "bookverse_ai_test"
    )
    try:
        assert_evaluation_database("postgresql://postgres:postgres@localhost:5432/bookverse_ai")
    except ValueError as error:
        assert "fail-closed" in str(error)
    else:
        raise AssertionError("Guard phải từ chối database demo.")
