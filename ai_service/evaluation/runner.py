"""Orchestration cho temporal evaluation, baseline, parity và output artifact."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from typing import Any

import pandas as pd

from ai_service import main as production
from ai_service.evaluation.core import (
    COHORTS,
    EVALUATION_VERSION,
    POSITIVE_EVENT_TYPES,
    build_behavior_neighbors,
    build_ground_truth,
    calculate_metrics_at_k,
    cohort_for_interaction_count,
    deduplicate_user_book_events,
    normalize_cutoff,
    rank_behavior_candidates,
    seeded_random_rank,
    stable_temporal_split,
    validate_event_frame,
)
from ai_service.evaluation.database import EvaluationData
from ai_service.evaluation.taxonomy import map_legacy_interaction_event


VALID_PURCHASE_STATUSES = frozenset({"PAID", "PAID_DEMO", "SHIPPED", "COMPLETED"})
CANCELLED_PURCHASE_STATUSES = frozenset({"CANCELLED", "REFUNDED"})
PRODUCTION_INTERACTION_TYPES = frozenset({"READING_START", "BOOKMARK_ADD", "BOOK_VIEW"})
READING_TIME_THRESHOLD_SECONDS = 300
READING_PROGRESS_THRESHOLD_PERCENT = 50.0
DEFAULT_CUTOFF = "2026-06-01T00:00:00"
DEFAULT_K_VALUES = (5, 10)
ALGORITHMS = (
    "popularity",
    "content",
    "behavior",
    "hybrid_production_weights",
    "random_seeded_sanity",
)


@dataclass(frozen=True)
class EvaluationConfig:
    cutoff: str = DEFAULT_CUTOFF
    k_values: tuple[int, ...] = DEFAULT_K_VALUES
    seed: int = 20260714
    output_root: Path = Path("outputs/evaluation")
    parity_fixture: Path | None = None

    def validate(self) -> None:
        if not self.k_values or any(k <= 0 for k in self.k_values):
            raise ValueError("K phải là danh sách số nguyên dương.")
        if max(self.k_values) > production.MAX_RECOMMENDATIONS:
            raise ValueError(
                f"K không được vượt production MAX_RECOMMENDATIONS={production.MAX_RECOMMENDATIONS}."
            )
        normalize_cutoff(self.cutoff)


def _event_frame(
    source: pd.DataFrame,
    id_column: str,
    event_type: str,
    prefix: str,
) -> pd.DataFrame:
    if source.empty:
        return pd.DataFrame(columns=["eventId", "userId", "bookId", "eventType", "timestamp"])
    return pd.DataFrame(
        {
            "eventId": prefix + source[id_column].astype(str),
            "userId": source["userId"].astype(str),
            "bookId": source["bookId"].astype(str),
            "eventType": event_type,
            "timestamp": source["createdAt"],
        }
    )


def build_positive_events(data: EvaluationData) -> pd.DataFrame:
    """Tạo strong-positive labels từ nguồn có bằng chứng và timestamp."""
    strong_reading = data.reading_sessions[
        (data.reading_sessions["timeSpent"] >= READING_TIME_THRESHOLD_SECONDS)
        | (data.reading_sessions["progressPercent"] >= READING_PROGRESS_THRESHOLD_PERCENT)
    ]
    positive_reviews = data.reviews[data.reviews["rating"] >= 4]
    valid_purchases = data.purchases[
        data.purchases["status"].isin(VALID_PURCHASE_STATUSES)
        & (data.purchases["quantity"] > 0)
    ]
    events = pd.concat(
        [
            _event_frame(valid_purchases, "orderItemId", "PURCHASE", "purchase:"),
            _event_frame(strong_reading, "sessionId", "READING_COMPLETED", "reading:"),
            _event_frame(data.bookmarks, "bookmarkId", "BOOKMARK", "bookmark:"),
            _event_frame(data.favorites, "favoriteId", "FAVORITE", "favorite:"),
            _event_frame(positive_reviews, "reviewId", "POSITIVE_REVIEW", "review:"),
        ],
        ignore_index=True,
    )
    return validate_event_frame(events, POSITIVE_EVENT_TYPES)


def _canonical_production_interactions(
    interactions: pd.DataFrame,
    cutoff: pd.Timestamp,
) -> pd.DataFrame:
    train = interactions[interactions["createdAt"] < cutoff].copy()
    train["actionType"] = train["actionType"].astype(str).map(map_legacy_interaction_event)
    return train[train["actionType"].isin(PRODUCTION_INTERACTION_TYPES)].copy()


def _build_train_feature_events(
    data: EvaluationData,
    positive_train: pd.DataFrame,
    cutoff: pd.Timestamp,
) -> pd.DataFrame:
    interaction_train = _canonical_production_interactions(data.interactions, cutoff)
    interaction_events = pd.DataFrame(
        {
            "eventId": "interaction:" + interaction_train["eventId"].astype(str),
            "userId": interaction_train["userId"].astype(str),
            "bookId": interaction_train["bookId"].astype(str),
            "timestamp": interaction_train["createdAt"],
        }
    )
    positive_features = positive_train[["eventId", "userId", "bookId", "timestamp"]].copy()
    combined = pd.concat([positive_features, interaction_events], ignore_index=True)
    if combined.empty:
        return combined
    combined = combined.sort_values(["timestamp", "eventId"], kind="mergesort")
    combined = combined.drop_duplicates("eventId", keep="first").reset_index(drop=True)
    if not (combined["timestamp"] < cutoff).all():
        raise AssertionError("User feature chứa event tại hoặc sau cutoff.")
    return combined


def _candidate_books_at_cutoff(data: EvaluationData, cutoff: pd.Timestamp) -> pd.DataFrame:
    books = data.books[
        (data.books["status"] == "ACTIVE")
        & data.books["deletedAt"].isna()
        & (data.books["createdAt"] < cutoff)
    ].copy()
    if books.empty:
        raise ValueError("Không có candidate Book hợp lệ tại cutoff.")

    # Rating hiện tại không có lịch sử as-of-cutoff, nên đặt 0 để không dùng review tương lai.
    books["rating"] = 0.0
    return books.sort_values("bookId", kind="mergesort").reset_index(drop=True)


def _seen_by_user(feature_events: pd.DataFrame) -> dict[str, set[str]]:
    if feature_events.empty:
        return {}
    grouped = feature_events.groupby("userId")["bookId"].apply(
        lambda values: set(map(str, values))
    )
    return {str(user_id): books for user_id, books in grouped.items()}


def _build_popularity_frame(
    data: EvaluationData,
    cutoff: pd.Timestamp,
) -> tuple[pd.DataFrame, dict[str, int]]:
    raw_scores: defaultdict[str, float] = defaultdict(float)

    interactions = data.interactions[data.interactions["createdAt"] < cutoff]
    for book_id, count in interactions.groupby("bookId").size().items():
        raw_scores[str(book_id)] += float(count)

    sessions = data.reading_sessions[data.reading_sessions["createdAt"] < cutoff]
    for book_id, count in sessions.groupby("bookId").size().items():
        raw_scores[str(book_id)] += float(count) * 2.0

    bookmarks = data.bookmarks[data.bookmarks["createdAt"] < cutoff]
    for book_id, count in bookmarks.groupby("bookId").size().items():
        raw_scores[str(book_id)] += float(count) * 3.0

    valid_purchases = data.purchases[
        (data.purchases["createdAt"] < cutoff)
        & data.purchases["status"].isin(VALID_PURCHASE_STATUSES)
        & (data.purchases["quantity"] > 0)
    ]
    for book_id, quantity in valid_purchases.groupby("bookId")["quantity"].sum().items():
        raw_scores[str(book_id)] += float(quantity) * 4.0

    popularity = pd.DataFrame(
        sorted(raw_scores.items()), columns=["bookId", "rawPopularity"]
    )
    source_counts = {
        "interactionEventsBeforeCutoff": int(len(interactions)),
        "readingSessionsBeforeCutoff": int(len(sessions)),
        "bookmarksBeforeCutoff": int(len(bookmarks)),
        "validPurchaseItemsBeforeCutoff": int(len(valid_purchases)),
        # Tính từ đúng các frame đã đi vào công thức để assertion có thể audit được.
        "eventsAtOrAfterCutoffUsed": int(
            (interactions["createdAt"] >= cutoff).sum()
            + (sessions["createdAt"] >= cutoff).sum()
            + (bookmarks["createdAt"] >= cutoff).sum()
            + (valid_purchases["createdAt"] >= cutoff).sum()
        ),
    }
    return popularity, source_counts


def _empty_frame(columns: list[str]) -> pd.DataFrame:
    return pd.DataFrame(columns=columns)


def _groups(frame: pd.DataFrame) -> dict[str, pd.DataFrame]:
    if frame.empty:
        return {}
    return {str(user_id): group.reset_index(drop=True) for user_id, group in frame.groupby("userId")}


def _production_feature_groups(
    data: EvaluationData,
    cutoff: pd.Timestamp,
) -> tuple[
    dict[str, pd.DataFrame],
    dict[str, pd.DataFrame],
    dict[str, pd.DataFrame],
    dict[str, pd.DataFrame],
]:
    metadata = data.books[
        ["bookId", "title", "authorName", "categoryId", "categoryName"]
    ].copy()

    session_rows = data.reading_sessions[data.reading_sessions["createdAt"] < cutoff].merge(
        metadata, on="bookId", how="inner"
    )
    sessions = (
        session_rows.groupby(
            ["userId", "bookId", "title", "authorName", "categoryId", "categoryName"],
            as_index=False,
        )
        .agg(timeSpent=("timeSpent", "sum"), sessionCount=("sessionId", "size"))
    )

    bookmark_rows = data.bookmarks[data.bookmarks["createdAt"] < cutoff].merge(
        metadata, on="bookId", how="inner"
    )
    bookmarks = (
        bookmark_rows.groupby(
            ["userId", "bookId", "title", "authorName", "categoryId", "categoryName"],
            as_index=False,
        )
        .agg(bookmarkCount=("bookmarkId", "size"))
    )

    interaction_rows = _canonical_production_interactions(data.interactions, cutoff).merge(
        metadata, on="bookId", how="inner"
    )
    interactions = (
        interaction_rows.groupby(
            [
                "userId",
                "bookId",
                "actionType",
                "title",
                "authorName",
                "categoryId",
                "categoryName",
            ],
            as_index=False,
        )
        .agg(eventCount=("eventId", "size"))
    )

    purchase_rows = data.purchases[
        (data.purchases["createdAt"] < cutoff)
        & data.purchases["status"].isin(VALID_PURCHASE_STATUSES)
        & (data.purchases["quantity"] > 0)
    ].merge(metadata, on="bookId", how="inner")
    purchases = (
        purchase_rows.groupby(
            ["userId", "bookId", "title", "authorName", "categoryId", "categoryName"],
            as_index=False,
        )
        .agg(purchaseCount=("quantity", "sum"))
    )

    return _groups(sessions), _groups(bookmarks), _groups(interactions), _groups(purchases)


def _rank_popularity(candidate_books: pd.DataFrame, limit: int) -> list[str]:
    ranked = candidate_books.sort_values(
        ["popularityNorm", "bookId"], ascending=[False, True], kind="mergesort"
    )
    return ranked.head(limit)["bookId"].astype(str).tolist()


def _rank_content(
    candidate_books: pd.DataFrame,
    reading_category_scores: dict[str, float],
    reading_author_scores: dict[str, float],
    purchase_category_scores: dict[str, float],
    limit: int,
) -> list[str]:
    category_scores = production.normalize_score_map(reading_category_scores)
    author_scores = production.normalize_score_map(reading_author_scores)
    purchase_scores = production.normalize_score_map(purchase_category_scores)
    ranked = candidate_books.copy()
    ranked["contentScore"] = (
        ranked["categoryId"].astype(str).map(lambda key: category_scores.get(key, 0.0))
        + ranked["authorName"].astype(str).map(lambda key: author_scores.get(key, 0.0)) * 0.5
        + ranked["categoryId"].astype(str).map(lambda key: purchase_scores.get(key, 0.0)) * 0.75
    )
    ranked = ranked.sort_values(
        ["contentScore", "bookId"], ascending=[False, True], kind="mergesort"
    )
    return ranked.head(limit)["bookId"].astype(str).tolist()


def rank_hybrid_snapshot(
    candidate_books: pd.DataFrame,
    reading_category_scores: dict[str, float],
    reading_author_scores: dict[str, float],
    purchase_category_scores: dict[str, float],
    limit: int,
) -> list[dict[str, Any]]:
    """Vector hóa đúng công thức/trọng số production, nhưng chỉ dùng snapshot train."""
    normalized_categories = production.normalize_score_map(reading_category_scores)
    normalized_authors = production.normalize_score_map(reading_author_scores)
    normalized_purchases = production.normalize_score_map(purchase_category_scores)
    ranked = candidate_books.copy()
    ranked["readingScore"] = (
        ranked["categoryId"].astype(str).map(
            lambda key: normalized_categories.get(key, 0.0) * production.READING_CATEGORY_WEIGHT
        )
        + ranked["authorName"].astype(str).map(
            lambda key: normalized_authors.get(key, 0.0) * production.READING_AUTHOR_WEIGHT
        )
    )
    ranked["purchaseScore"] = ranked["categoryId"].astype(str).map(
        lambda key: normalized_purchases.get(key, 0.0) * production.PURCHASE_CATEGORY_WEIGHT
    )
    ranked["popularityScore"] = ranked["popularityNorm"] * production.POPULARITY_WEIGHT
    ranked["score"] = (
        ranked["readingScore"] + ranked["purchaseScore"] + ranked["popularityScore"]
    ).round(4)

    positive_ranked = ranked[ranked["score"] > 0]
    if positive_ranked.empty:
        ranked["score"] = (ranked["popularityNorm"] * production.POPULARITY_WEIGHT).round(4)
        ranked = ranked.sort_values(
            ["score", "rating", "bookId"],
            ascending=[False, False, True],
            kind="mergesort",
        )
    else:
        ranked = positive_ranked.sort_values(
            ["score", "popularityNorm", "rating", "bookId"],
            ascending=[False, False, False, True],
            kind="mergesort",
        )
    return [
        {"bookId": str(row.bookId), "score": float(row.score)}
        for row in ranked.head(limit).itertuples(index=False)
    ]


def _percentile_95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(0.95 * len(ordered) + 0.999999) - 1))
    return ordered[index]


def _frame_fingerprint(hasher: Any, name: str, frame: pd.DataFrame) -> None:
    hasher.update(name.encode("utf-8"))
    hasher.update("|".join(frame.columns).encode("utf-8"))
    for record in frame.to_dict(orient="records"):
        normalized: dict[str, Any] = {}
        for key, value in record.items():
            if pd.isna(value):
                normalized[key] = None
            elif isinstance(value, pd.Timestamp):
                normalized[key] = value.isoformat()
            elif hasattr(value, "item"):
                normalized[key] = value.item()
            else:
                normalized[key] = value
        hasher.update(
            json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
                "utf-8"
            )
        )


def dataset_fingerprint(data: EvaluationData) -> str:
    hasher = hashlib.sha256()
    for name, frame, sort_columns in (
        ("books", data.books, ["bookId"]),
        ("interactions", data.interactions, ["createdAt", "eventId"]),
        ("reading_sessions", data.reading_sessions, ["createdAt", "sessionId"]),
        ("bookmarks", data.bookmarks, ["createdAt", "bookmarkId"]),
        ("favorites", data.favorites, ["createdAt", "favoriteId"]),
        ("reviews", data.reviews, ["createdAt", "reviewId"]),
        ("purchases", data.purchases, ["createdAt", "orderItemId"]),
    ):
        _frame_fingerprint(hasher, name, frame.sort_values(sort_columns, kind="mergesort"))
    return hasher.hexdigest()


def _git_state() -> dict[str, Any]:
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
        dirty = bool(
            subprocess.check_output(
                ["git", "status", "--porcelain"], text=True, stderr=subprocess.DEVNULL
            ).strip()
        )
        return {"commit": commit, "dirty": dirty}
    except (OSError, subprocess.CalledProcessError):
        return {"commit": "UNKNOWN", "dirty": None}


def _round_metrics(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 12)
    if isinstance(value, dict):
        return {key: _round_metrics(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_round_metrics(item) for item in value]
    return value


def _canonical_checksum(report: dict[str, Any]) -> str:
    deterministic = {
        "config": report["config"],
        "datasetFingerprint": report["datasetFingerprint"],
        "statistics": report["statistics"],
        "leakageAssertions": report["leakageAssertions"],
        "methods": report["methods"],
        "metrics": report["metrics"],
        "ctr": report["ctr"],
        "productionParity": report["productionParity"],
    }
    payload = json.dumps(
        deterministic, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def check_production_parity(fixture_path: Path | None) -> dict[str, Any]:
    if fixture_path is None:
        return {"status": "NOT_RUN", "reason": "Không cấu hình parity fixture."}
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    production.get_engine.cache_clear()
    max_score_delta = 0.0
    compared_rows = 0

    for user_id in fixture["users"]:
        actual = production.recommend_books(user_id)
        expected = fixture["recommendations"][user_id]
        if len(actual) != len(expected):
            raise AssertionError(f"Parity {user_id}: số recommendation thay đổi.")
        for actual_row, expected_row in zip(actual, expected, strict=True):
            if actual_row["bookId"] != expected_row["bookId"]:
                raise AssertionError(f"Parity {user_id}: ranking Book thay đổi.")
            score_delta = abs(float(actual_row["score"]) - float(expected_row["score"]))
            max_score_delta = max(max_score_delta, score_delta)
            if score_delta > 1e-6:
                raise AssertionError(f"Parity {user_id}: score thay đổi quá tolerance.")
            if actual_row["evidence"] != expected_row["evidence"]:
                raise AssertionError(f"Parity {user_id}: evidence thay đổi.")
            compared_rows += 1

    return {
        "status": "PASS",
        "users": len(fixture["users"]),
        "rows": compared_rows,
        "scoreTolerance": 1e-6,
        "maxScoreDelta": max_score_delta,
        "fixtureVersion": fixture["fixtureVersion"],
    }


def run_evaluation(
    data: EvaluationData,
    config: EvaluationConfig,
) -> dict[str, Any]:
    config.validate()
    cutoff = normalize_cutoff(config.cutoff)
    positive_events = build_positive_events(data)
    positive_train, positive_test = stable_temporal_split(positive_events, cutoff)
    feature_train = _build_train_feature_events(data, positive_train, cutoff)
    seen_by_user = _seen_by_user(feature_train)
    candidate_books = _candidate_books_at_cutoff(data, cutoff)
    candidate_ids = set(candidate_books["bookId"].astype(str))
    ground_truth, ground_truth_stats = build_ground_truth(
        positive_test, seen_by_user, candidate_ids
    )
    if not ground_truth:
        raise ValueError("Không có user/ground truth hợp lệ sau temporal split.")

    popularity, popularity_counts = _build_popularity_frame(data, cutoff)
    books_with_popularity = production.build_popularity_scores(candidate_books, popularity)
    session_groups, bookmark_groups, interaction_groups, purchase_groups = (
        _production_feature_groups(data, cutoff)
    )
    behavior_neighbors = build_behavior_neighbors(positive_train)
    strong_train_by_user = _seen_by_user(deduplicate_user_book_events(positive_train))
    max_k = max(config.k_values)
    rankings: dict[str, dict[str, list[str]]] = {
        algorithm: {} for algorithm in ALGORITHMS
    }
    timings: dict[str, list[float]] = {algorithm: [] for algorithm in ALGORITHMS}

    empty_sessions = _empty_frame(
        ["bookId", "title", "authorName", "categoryId", "categoryName", "timeSpent", "sessionCount"]
    )
    empty_bookmarks = _empty_frame(
        ["bookId", "title", "authorName", "categoryId", "categoryName", "bookmarkCount"]
    )
    empty_interactions = _empty_frame(
        [
            "bookId",
            "actionType",
            "title",
            "authorName",
            "categoryId",
            "categoryName",
            "eventCount",
        ]
    )
    empty_purchases = _empty_frame(
        ["bookId", "title", "authorName", "categoryId", "categoryName", "purchaseCount"]
    )

    for user_id in sorted(ground_truth):
        user_candidates = books_with_popularity[
            ~books_with_popularity["bookId"].astype(str).isin(seen_by_user.get(user_id, set()))
        ].copy()
        user_candidate_ids = user_candidates["bookId"].astype(str).tolist()
        sessions = session_groups.get(user_id, empty_sessions)
        bookmarks = bookmark_groups.get(user_id, empty_bookmarks)
        interactions = interaction_groups.get(user_id, empty_interactions)
        purchases = purchase_groups.get(user_id, empty_purchases)
        reading_categories, reading_authors = production.build_reading_preference_scores(
            sessions, bookmarks, interactions
        )
        purchase_categories = production.build_purchase_category_scores(purchases)

        start = perf_counter()
        rankings["popularity"][user_id] = _rank_popularity(user_candidates, max_k)
        timings["popularity"].append((perf_counter() - start) * 1000.0)

        start = perf_counter()
        rankings["content"][user_id] = _rank_content(
            user_candidates,
            reading_categories,
            reading_authors,
            purchase_categories,
            max_k,
        )
        timings["content"].append((perf_counter() - start) * 1000.0)

        start = perf_counter()
        rankings["behavior"][user_id] = rank_behavior_candidates(
            user_candidate_ids,
            strong_train_by_user.get(user_id, set()),
            behavior_neighbors,
            max_k,
        )
        timings["behavior"].append((perf_counter() - start) * 1000.0)

        start = perf_counter()
        hybrid_rows = rank_hybrid_snapshot(
            user_candidates,
            reading_categories,
            reading_authors,
            purchase_categories,
            max_k,
        )
        rankings["hybrid_production_weights"][user_id] = [
            row["bookId"] for row in hybrid_rows
        ]
        timings["hybrid_production_weights"].append((perf_counter() - start) * 1000.0)

        start = perf_counter()
        rankings["random_seeded_sanity"][user_id] = seeded_random_rank(
            user_candidate_ids, user_id, config.seed, max_k
        )
        timings["random_seeded_sanity"].append((perf_counter() - start) * 1000.0)

    interaction_counts = {
        user_id: len(seen_by_user.get(user_id, set())) for user_id in ground_truth
    }
    cohort_users = {
        "all": sorted(ground_truth),
        "cold_0": sorted(
            user_id for user_id, count in interaction_counts.items() if count == 0
        ),
        "sparse_1_2": sorted(
            user_id for user_id, count in interaction_counts.items() if 1 <= count <= 2
        ),
        "warm_3_plus": sorted(
            user_id for user_id, count in interaction_counts.items() if count >= 3
        ),
    }

    metrics: dict[str, Any] = {}
    for algorithm in ALGORITHMS:
        metrics[algorithm] = {}
        for k in config.k_values:
            metrics[algorithm][f"k{k}"] = {
                cohort: calculate_metrics_at_k(
                    rankings[algorithm],
                    ground_truth,
                    len(candidate_ids),
                    k,
                    cohort_users[cohort],
                )
                for cohort in COHORTS
            }

    held_out_overlap = sum(
        len(ground_truth[user_id] & seen_by_user.get(user_id, set())) for user_id in ground_truth
    )
    cancelled_positive_count = int(
        data.purchases[
            data.purchases["status"].isin(CANCELLED_PURCHASE_STATUSES)
        ]["orderItemId"]
        .astype(str)
        .map(lambda item_id: f"purchase:{item_id}")
        .isin(set(positive_events["eventId"]))
        .sum()
    )
    train_test_overlap = len(set(positive_train["eventId"]) & set(positive_test["eventId"]))
    if train_test_overlap or cancelled_positive_count or held_out_overlap:
        raise AssertionError("Leakage assertion thất bại.")

    parity = check_production_parity(config.parity_fixture)
    git_state = _git_state()
    report: dict[str, Any] = {
        "config": {
            "evaluationVersion": EVALUATION_VERSION,
            "gitCommit": git_state["commit"],
            "gitDirty": git_state["dirty"],
            "seed": config.seed,
            "k": list(config.k_values),
            "splitStrategy": "global_temporal_cutoff",
            "cutoff": cutoff.isoformat(),
            "positiveLabelPolicy": {
                "purchaseStatuses": sorted(VALID_PURCHASE_STATUSES),
                "readingTimeSecondsAtLeast": READING_TIME_THRESHOLD_SECONDS,
                "readingProgressPercentAtLeast": READING_PROGRESS_THRESHOLD_PERCENT,
                "bookmark": True,
                "favorite": True,
                "reviewRatingAtLeast": 4,
                "interactionEventPurchaseUsed": False,
            },
            "databaseProfile": data.database_name,
            "algorithmVersion": "bookverse-temporal-baselines-v1",
            "productionWeights": {
                "readingCategory": production.READING_CATEGORY_WEIGHT,
                "readingAuthor": production.READING_AUTHOR_WEIGHT,
                "purchaseCategory": production.PURCHASE_CATEGORY_WEIGHT,
                "popularity": production.POPULARITY_WEIGHT,
            },
        },
        "datasetFingerprint": dataset_fingerprint(data),
        "statistics": {
            "sourceRows": {
                "books": int(len(data.books)),
                "interactionEvents": int(len(data.interactions)),
                "readingSessions": int(len(data.reading_sessions)),
                "bookmarks": int(len(data.bookmarks)),
                "favorites": int(len(data.favorites)),
                "reviews": int(len(data.reviews)),
                "orderItems": int(len(data.purchases)),
            },
            "positiveEvents": int(len(positive_events)),
            "trainPositiveEvents": int(len(positive_train)),
            "testPositiveEvents": int(len(positive_test)),
            "trainFeatureEvents": int(len(feature_train)),
            "candidateBooks": int(len(candidate_ids)),
            "testUsersBeforeEligibility": int(positive_test["userId"].nunique()),
            "eligibleUsers": len(ground_truth),
            "excludedUsers": int(positive_test["userId"].nunique()) - len(ground_truth),
            "groundTruth": ground_truth_stats,
            "cohorts": {cohort: len(users) for cohort, users in cohort_users.items()},
            "popularityTrainSources": popularity_counts,
            "temporalDistribution": {
                "positiveMin": positive_events["timestamp"].min().isoformat(),
                "positiveMax": positive_events["timestamp"].max().isoformat(),
                "trainMax": positive_train["timestamp"].max().isoformat(),
                "testMin": positive_test["timestamp"].min().isoformat(),
            },
        },
        "leakageAssertions": {
            "trainMaxBeforeTestMin": bool(
                positive_train["timestamp"].max() < positive_test["timestamp"].min()
            ),
            "trainTestEventIdOverlap": train_test_overlap,
            "futureFeatureEventsUsed": int((feature_train["timestamp"] >= cutoff).sum()),
            "cancelledOrRefundedPurchasePositives": cancelled_positive_count,
            "heldOutBooksSeenInUserTrainFeature": held_out_overlap,
            "futurePopularityEventsUsed": popularity_counts["eventsAtOrAfterCutoffUsed"],
            "currentRatingUsedForScoring": False,
        },
        "methods": {
            "popularity": "Train-only popularity; tie-break Book ID.",
            "content": "Category/author affinity chỉ từ user train snapshot.",
            "behavior": "Item-item cosine co-occurrence chỉ từ strong-positive train.",
            "hybrid_production_weights": "Công thức/trọng số production trên train snapshot.",
            "random_seeded_sanity": "Sanity check có seed; không phải AI baseline.",
        },
        "metrics": metrics,
        "runtimeMs": {
            algorithm: {
                "average": sum(values) / len(values) if values else 0.0,
                "p95": _percentile_95(values),
                "samples": len(values),
            }
            for algorithm, values in timings.items()
        },
        "ctr": {
            "status": "NOT_AVAILABLE",
            "reason": "Chưa có impression/exposure log đáng tin cậy.",
        },
        "productionParity": parity,
        "limitations": [
            "Dataset là dữ liệu synthetic; metric không đại diện trực tiếp hành vi người dùng thật.",
            "Không có lịch sử trạng thái Book/Category tại cutoff; dùng trạng thái ACTIVE hiện tại và Book đã tạo trước cutoff.",
            "Book.rating hiện tại không được dùng vì không thể dựng rating as-of-cutoff.",
            "InteractionEvent.PURCHASE không làm label vì không có orderId để xác minh trạng thái đơn.",
        ],
    }
    report = _round_metrics(report)
    report["reproducibilityChecksum"] = _canonical_checksum(report)
    return report


def _metrics_rows(report: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for algorithm, k_results in report["metrics"].items():
        for k_name, cohorts in k_results.items():
            for cohort, metric in cohorts.items():
                rows.append(
                    {
                        "algorithm": algorithm,
                        "k": int(k_name.removeprefix("k")),
                        "cohort": cohort,
                        **metric,
                    }
                )
    return rows


def _markdown_summary(report: dict[str, Any]) -> str:
    lines = [
        "# BookVerse AI Temporal Evaluation",
        "",
        f"- Evaluation version: `{report['config']['evaluationVersion']}`",
        f"- Cutoff: `{report['config']['cutoff']}`",
        f"- Dataset fingerprint: `{report['datasetFingerprint']}`",
        f"- Reproducibility checksum: `{report['reproducibilityChecksum']}`",
        f"- Eligible users: {report['statistics']['eligibleUsers']}",
        f"- Candidate books: {report['statistics']['candidateBooks']}",
        "- CTR: NOT_AVAILABLE — chưa có impression log đáng tin cậy.",
        "",
        "## Kết quả cohort all",
        "",
        "| Algorithm | K | Precision | Recall | Hit Rate | NDCG | MRR | Coverage |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in _metrics_rows(report):
        if row["cohort"] != "all" or row["status"] != "AVAILABLE":
            continue
        lines.append(
            "| {algorithm} | {k} | {precision:.6f} | {recall:.6f} | "
            "{hitRate:.6f} | {ndcg:.6f} | {mrr:.6f} | {catalogCoverage:.6f} |".format(
                **row
            )
        )
    lines.extend(["", "## Hạn chế", ""])
    lines.extend(f"- {item}" for item in report["limitations"])
    return "\n".join(lines) + "\n"


def write_evaluation_outputs(report: dict[str, Any], output_root: Path) -> dict[str, str]:
    generated_at = datetime.now(UTC)
    run_id = (
        generated_at.strftime("%Y%m%dT%H%M%S%fZ")
        + "-"
        + report["reproducibilityChecksum"][:12]
    )
    run_directory = output_root / run_id
    run_directory.mkdir(parents=True, exist_ok=False)

    output_report = {
        **report,
        "run": {
            "runId": run_id,
            "generatedAt": generated_at.isoformat(),
            "outputDirectory": str(run_directory),
        },
    }
    json_path = run_directory / "evaluation.json"
    csv_path = run_directory / "metrics.csv"
    markdown_path = run_directory / "summary.md"
    json_path.write_text(
        json.dumps(output_report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    rows = _metrics_rows(report)
    with csv_path.open("x", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    markdown_path.write_text(_markdown_summary(report), encoding="utf-8")
    return {
        "runDirectory": str(run_directory),
        "json": str(json_path),
        "csv": str(csv_path),
        "markdown": str(markdown_path),
    }


def database_url_from_environment() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise ValueError("Thiếu DATABASE_URL cho bookverse_ai_test.")
    return database_url
