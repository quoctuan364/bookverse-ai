"""Đánh giá nhanh chất lượng recommendation từ dữ liệu PostgreSQL.

Chạy:
    python ai_service/evaluate.py

Script này dùng dữ liệu đã lưu trong bảng Recommendation và interaction_events.
Positive interaction gồm READ, BOOKMARK, PURCHASE, REVIEW.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import pandas as pd
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/bookverse_ai",
)
K = int(os.getenv("RECOMMENDATION_K", "10"))
POSITIVE_ACTIONS = ("READ", "BOOKMARK", "PURCHASE", "REVIEW")


@dataclass(frozen=True)
class EvaluationResult:
    users: int
    precision_at_k: float
    hit_rate_at_k: float
    total_recommendations: int
    total_positive_events: int


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    engine = create_engine(DATABASE_URL)

    with engine.connect() as connection:
        recommendations = pd.read_sql(
            text(
                """
                SELECT "userId", "targetId" AS "bookId", "rank", "score"
                FROM "Recommendation"
                WHERE "targetType" = 'BOOK'
                ORDER BY "userId", "rank" ASC
                """
            ),
            connection,
        )
        positives = pd.read_sql(
            text(
                """
                SELECT "userId", "bookId", "actionType", "createdAt"
                FROM interaction_events
                WHERE "actionType" IN ('READ', 'BOOKMARK', 'PURCHASE', 'REVIEW')
                """
            ),
            connection,
        )

    return recommendations, positives


def evaluate(recommendations: pd.DataFrame, positives: pd.DataFrame) -> EvaluationResult:
    if recommendations.empty or positives.empty:
        return EvaluationResult(
            users=0,
            precision_at_k=0.0,
            hit_rate_at_k=0.0,
            total_recommendations=int(len(recommendations)),
            total_positive_events=int(len(positives)),
        )

    user_scores: list[float] = []
    user_hits: list[int] = []

    positive_by_user = positives.groupby("userId")["bookId"].apply(set).to_dict()

    for user_id, group in recommendations.groupby("userId"):
        recommended_books = list(group.sort_values("rank").head(K)["bookId"])
        positive_books = positive_by_user.get(user_id, set())

        if not recommended_books or not positive_books:
            continue

        hits = len(set(recommended_books) & positive_books)
        user_scores.append(hits / min(K, len(recommended_books)))
        user_hits.append(1 if hits > 0 else 0)

    if not user_scores:
        return EvaluationResult(
            users=0,
            precision_at_k=0.0,
            hit_rate_at_k=0.0,
            total_recommendations=int(len(recommendations)),
            total_positive_events=int(len(positives)),
        )

    return EvaluationResult(
        users=len(user_scores),
        precision_at_k=float(sum(user_scores) / len(user_scores)),
        hit_rate_at_k=float(sum(user_hits) / len(user_hits)),
        total_recommendations=int(len(recommendations)),
        total_positive_events=int(len(positives)),
    )


def main() -> None:
    recommendations, positives = load_data()
    result = evaluate(recommendations, positives)

    print("=== BookVerse AI Recommendation Evaluation ===")
    print(f"Users evaluated: {result.users}")
    print(f"Precision@{K}: {result.precision_at_k:.4f}")
    print(f"HitRate@{K}: {result.hit_rate_at_k:.4f}")
    print(f"Total recommendations: {result.total_recommendations}")
    print(f"Total positive events: {result.total_positive_events}")


if __name__ == "__main__":
    main()
