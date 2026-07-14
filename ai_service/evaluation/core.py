"""Các hàm thuần cho temporal split, metric và baseline hành vi.

Module này không kết nối database để unit test có thể chạy nhanh và tái lập.
"""

from __future__ import annotations

import hashlib
import math
import random
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from itertools import combinations
from typing import Any

import pandas as pd


EVALUATION_VERSION = "temporal-eval-v1"
POSITIVE_EVENT_TYPES = frozenset(
    {"PURCHASE", "READING_COMPLETED", "BOOKMARK", "FAVORITE", "POSITIVE_REVIEW"}
)
COHORTS = ("all", "cold_0", "sparse_1_2", "warm_3_plus")
EVENT_COLUMNS = ("eventId", "userId", "bookId", "eventType", "timestamp")


def normalize_cutoff(value: str | pd.Timestamp) -> pd.Timestamp:
    """Chuẩn hóa cutoff về timestamp không timezone để khớp PostgreSQL hiện tại."""
    cutoff = pd.Timestamp(value)
    if cutoff.tzinfo is not None:
        cutoff = cutoff.tz_convert("UTC").tz_localize(None)
    return cutoff


def validate_event_frame(
    events: pd.DataFrame,
    allowed_event_types: frozenset[str] = POSITIVE_EVENT_TYPES,
) -> pd.DataFrame:
    missing_columns = [column for column in EVENT_COLUMNS if column not in events.columns]
    if missing_columns:
        raise ValueError(f"Event thiếu cột bắt buộc: {', '.join(missing_columns)}")

    validated = events.loc[:, EVENT_COLUMNS].copy()
    for column in ("eventId", "userId", "bookId", "eventType"):
        if validated[column].isna().any() or (validated[column].astype(str).str.strip() == "").any():
            raise ValueError(f"Event có {column} rỗng.")
        validated[column] = validated[column].astype(str)

    validated["timestamp"] = pd.to_datetime(validated["timestamp"], errors="coerce")
    if validated["timestamp"].isna().any():
        raise ValueError("Event có timestamp không hợp lệ.")
    if getattr(validated["timestamp"].dt, "tz", None) is not None:
        validated["timestamp"] = validated["timestamp"].dt.tz_convert("UTC").dt.tz_localize(None)

    unknown_types = sorted(set(validated["eventType"]) - allowed_event_types)
    if unknown_types:
        raise ValueError(f"Event type không được hỗ trợ: {', '.join(unknown_types)}")
    if validated["eventId"].duplicated().any():
        raise ValueError("eventId bị trùng trong evaluation dataset.")

    return validated.sort_values(["timestamp", "eventId"], kind="mergesort").reset_index(drop=True)


def assert_temporal_isolation(train: pd.DataFrame, test: pd.DataFrame) -> None:
    train_ids = set(train.get("eventId", pd.Series(dtype=str)).astype(str))
    test_ids = set(test.get("eventId", pd.Series(dtype=str)).astype(str))
    if train_ids & test_ids:
        raise AssertionError("Một event xuất hiện đồng thời trong train và test.")
    if not train.empty and not test.empty:
        if not train["timestamp"].max() < test["timestamp"].min():
            raise AssertionError("Temporal split bị chồng thời gian train/test.")


def stable_temporal_split(
    events: pd.DataFrame,
    cutoff: str | pd.Timestamp,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    validated = validate_event_frame(events)
    normalized_cutoff = normalize_cutoff(cutoff)
    train = validated[validated["timestamp"] < normalized_cutoff].copy()
    test = validated[validated["timestamp"] >= normalized_cutoff].copy()
    assert_temporal_isolation(train, test)
    return train.reset_index(drop=True), test.reset_index(drop=True)


def deduplicate_user_book_events(events: pd.DataFrame) -> pd.DataFrame:
    """Giữ positive sớm nhất; eventId là tie-breaker khi timestamp bằng nhau."""
    if events.empty:
        return events.copy()
    ordered = events.sort_values(["timestamp", "eventId"], kind="mergesort")
    return ordered.drop_duplicates(["userId", "bookId"], keep="first").reset_index(drop=True)


def build_ground_truth(
    test_events: pd.DataFrame,
    train_seen_by_user: Mapping[str, set[str]],
    candidate_book_ids: set[str],
) -> tuple[dict[str, set[str]], dict[str, int]]:
    deduplicated = deduplicate_user_book_events(test_events)
    ground_truth: dict[str, set[str]] = defaultdict(set)
    excluded_seen = 0
    excluded_outside_candidate = 0

    for row in deduplicated.itertuples(index=False):
        user_id = str(row.userId)
        book_id = str(row.bookId)
        if book_id not in candidate_book_ids:
            excluded_outside_candidate += 1
            continue
        if book_id in train_seen_by_user.get(user_id, set()):
            excluded_seen += 1
            continue
        ground_truth[user_id].add(book_id)

    result = {user_id: books for user_id, books in sorted(ground_truth.items()) if books}
    stats = {
        "testEvents": int(len(test_events)),
        "deduplicatedUserBookEvents": int(len(deduplicated)),
        "excludedSeenInTrain": excluded_seen,
        "excludedOutsideCandidateAtCutoff": excluded_outside_candidate,
        "eligibleUsers": len(result),
        "groundTruthPairs": sum(len(books) for books in result.values()),
    }
    return result, stats


def cohort_for_interaction_count(interaction_count: int) -> str:
    if interaction_count <= 0:
        return "cold_0"
    if interaction_count <= 2:
        return "sparse_1_2"
    return "warm_3_plus"


def _unique_top_k(recommendations: Sequence[str], k: int) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for raw_book_id in recommendations:
        book_id = str(raw_book_id)
        if book_id in seen:
            continue
        unique.append(book_id)
        seen.add(book_id)
        if len(unique) >= k:
            break
    return unique


def calculate_metrics_at_k(
    recommendations_by_user: Mapping[str, Sequence[str]],
    ground_truth_by_user: Mapping[str, set[str]],
    candidate_count: int,
    k: int,
    user_ids: Iterable[str] | None = None,
) -> dict[str, Any]:
    if k <= 0:
        raise ValueError("K phải lớn hơn 0.")

    selected_users = sorted(user_ids if user_ids is not None else ground_truth_by_user.keys())
    selected_users = [user_id for user_id in selected_users if ground_truth_by_user.get(user_id)]
    if not selected_users:
        return {
            "status": "NOT_AVAILABLE",
            "users": 0,
            "precision": None,
            "recall": None,
            "hitRate": None,
            "ndcg": None,
            "mrr": None,
            "catalogCoverage": None,
        }

    precisions: list[float] = []
    recalls: list[float] = []
    hit_rates: list[float] = []
    ndcgs: list[float] = []
    reciprocal_ranks: list[float] = []
    covered_books: set[str] = set()

    for user_id in selected_users:
        recommended = _unique_top_k(recommendations_by_user.get(user_id, ()), k)
        relevant = ground_truth_by_user[user_id]
        hits = [1 if book_id in relevant else 0 for book_id in recommended]
        hit_count = sum(hits)
        precisions.append(hit_count / k)
        recalls.append(hit_count / len(relevant))
        hit_rates.append(1.0 if hit_count else 0.0)

        dcg = sum(hit / math.log2(rank + 1) for rank, hit in enumerate(hits, start=1))
        ideal_hits = min(k, len(relevant))
        idcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_hits + 1))
        ndcgs.append(dcg / idcg if idcg else 0.0)

        first_hit = next((rank for rank, hit in enumerate(hits, start=1) if hit), None)
        reciprocal_ranks.append(1.0 / first_hit if first_hit else 0.0)
        covered_books.update(recommended)

    user_count = len(selected_users)
    return {
        "status": "AVAILABLE",
        "users": user_count,
        "precision": sum(precisions) / user_count,
        "recall": sum(recalls) / user_count,
        "hitRate": sum(hit_rates) / user_count,
        "ndcg": sum(ndcgs) / user_count,
        "mrr": sum(reciprocal_ranks) / user_count,
        "catalogCoverage": len(covered_books) / candidate_count if candidate_count > 0 else 0.0,
    }


def seeded_random_rank(
    candidate_book_ids: Sequence[str],
    user_id: str,
    seed: int,
    limit: int,
) -> list[str]:
    ordered = sorted(str(book_id) for book_id in candidate_book_ids)
    digest = hashlib.sha256(f"{seed}:{user_id}".encode("utf-8")).digest()
    randomizer = random.Random(int.from_bytes(digest[:8], "big"))
    randomizer.shuffle(ordered)
    return ordered[:limit]


def build_behavior_neighbors(
    train_positive_events: pd.DataFrame,
) -> dict[str, dict[str, float]]:
    """Item-item cosine similarity từ co-occurrence positive trong train."""
    deduplicated = deduplicate_user_book_events(train_positive_events)
    user_books = (
        deduplicated.groupby("userId")["bookId"].apply(lambda values: sorted(set(map(str, values))))
        if not deduplicated.empty
        else pd.Series(dtype=object)
    )
    item_user_counts: Counter[str] = Counter()
    pair_counts: Counter[tuple[str, str]] = Counter()

    for books in user_books:
        item_user_counts.update(books)
        pair_counts.update(combinations(books, 2))

    neighbors: dict[str, dict[str, float]] = defaultdict(dict)
    for (left, right), pair_count in sorted(pair_counts.items()):
        denominator = math.sqrt(item_user_counts[left] * item_user_counts[right])
        similarity = pair_count / denominator if denominator else 0.0
        neighbors[left][right] = similarity
        neighbors[right][left] = similarity
    return {book_id: dict(values) for book_id, values in neighbors.items()}


def rank_behavior_candidates(
    candidate_book_ids: Sequence[str],
    seen_book_ids: set[str],
    neighbors: Mapping[str, Mapping[str, float]],
    limit: int,
) -> list[str]:
    scores: defaultdict[str, float] = defaultdict(float)
    candidate_set = set(map(str, candidate_book_ids))
    for seen_book_id in sorted(seen_book_ids):
        for candidate_id, similarity in neighbors.get(seen_book_id, {}).items():
            if candidate_id in candidate_set:
                scores[candidate_id] += float(similarity)
    return sorted(candidate_set, key=lambda book_id: (-scores[book_id], book_id))[:limit]
