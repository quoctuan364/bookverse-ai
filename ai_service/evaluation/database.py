"""Đọc snapshot evaluation bằng transaction read-only và guard database test."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import unquote, urlsplit

import pandas as pd
from sqlalchemy import create_engine, text

from ai_service.main import normalize_database_url


EXPECTED_EVALUATION_DATABASE = "bookverse_ai_test"

CATEGORY_FEATURE_SQL = """
COALESCE(
  NULLIF(NULLIF(to_jsonb(c)->>'canonicalKey', ''), 'unmapped'),
  NULLIF(to_jsonb(c)->>'parentId', ''),
  b."categoryId"
)
""".strip()

CATEGORY_NAME_SQL = """
COALESCE(
  CASE
    WHEN COALESCE(to_jsonb(c)->>'canonicalKey', 'unmapped') <> 'unmapped'
    THEN NULLIF(to_jsonb(c)->>'canonicalName', '')
  END,
  pc.name,
  c.name
)
""".strip()


@dataclass(frozen=True)
class EvaluationData:
    database_name: str
    books: pd.DataFrame
    interactions: pd.DataFrame
    reading_sessions: pd.DataFrame
    bookmarks: pd.DataFrame
    favorites: pd.DataFrame
    reviews: pd.DataFrame
    purchases: pd.DataFrame


def assert_evaluation_database(database_url: str) -> str:
    parsed = urlsplit(database_url)
    database_name = unquote(parsed.path.lstrip("/").split("/", maxsplit=1)[0])
    if database_name != EXPECTED_EVALUATION_DATABASE:
        raise ValueError(
            "Evaluation fail-closed: chỉ được đọc database bookverse_ai_test, "
            f"không phải {database_name or '[EMPTY]'}."
        )
    return database_name


def _normalize_timestamps(frame: pd.DataFrame, columns: tuple[str, ...]) -> pd.DataFrame:
    normalized = frame.copy()
    for column in columns:
        normalized[column] = pd.to_datetime(normalized[column], errors="coerce")
        if normalized[column].isna().any():
            raise ValueError(f"Dữ liệu database có {column} không hợp lệ.")
        if getattr(normalized[column].dt, "tz", None) is not None:
            normalized[column] = normalized[column].dt.tz_convert("UTC").dt.tz_localize(None)
    return normalized


def load_evaluation_data(database_url: str) -> EvaluationData:
    database_name = assert_evaluation_database(database_url)
    engine = create_engine(normalize_database_url(database_url), pool_pre_ping=True)

    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.execute(text("SET TRANSACTION READ ONLY"))
                read_only = connection.execute(text("SHOW transaction_read_only")).scalar_one()
                if str(read_only).lower() != "on":
                    raise RuntimeError("PostgreSQL transaction không ở chế độ read-only.")

                books = pd.read_sql_query(
                    text(
                        f"""
                        SELECT
                          b.id AS "bookId",
                          b.title,
                          b."authorName",
                          {CATEGORY_FEATURE_SQL} AS "categoryId",
                          {CATEGORY_NAME_SQL} AS "categoryName",
                          COALESCE(b.rating::float, 0) AS rating,
                          b.status::text AS status,
                          b."deletedAt",
                          b."createdAt"
                        FROM "Book" b
                        JOIN "Category" c ON c.id = b."categoryId"
                        LEFT JOIN "Category" pc ON pc.id = NULLIF(to_jsonb(c)->>'parentId', '')
                        ORDER BY b.id
                        """
                    ),
                    connection,
                )
                interactions = pd.read_sql_query(
                    text(
                        """
                        SELECT id AS "eventId", "userId", "bookId", "actionType", "createdAt"
                        FROM interaction_events
                        ORDER BY "createdAt", id
                        """
                    ),
                    connection,
                )
                reading_sessions = pd.read_sql_query(
                    text(
                        """
                        SELECT id AS "sessionId", "userId", "bookId", "timeSpent",
                               "progressPercent", "createdAt"
                        FROM reading_sessions
                        ORDER BY "createdAt", id
                        """
                    ),
                    connection,
                )
                bookmarks = pd.read_sql_query(
                    text(
                        """
                        SELECT id AS "bookmarkId", "userId", "bookId", "createdAt"
                        FROM bookmarks
                        ORDER BY "createdAt", id
                        """
                    ),
                    connection,
                )
                favorites = pd.read_sql_query(
                    text(
                        """
                        SELECT id AS "favoriteId", "userId", "bookId", "createdAt"
                        FROM favorite_books
                        ORDER BY "createdAt", id
                        """
                    ),
                    connection,
                )
                reviews = pd.read_sql_query(
                    text(
                        """
                        SELECT id AS "reviewId", "userId", "bookId", rating, "createdAt"
                        FROM "Review"
                        ORDER BY "createdAt", id
                        """
                    ),
                    connection,
                )
                purchases = pd.read_sql_query(
                    text(
                        """
                        SELECT oi.id AS "orderItemId", o."buyerId" AS "userId", oi."bookId",
                               oi.quantity, o.status::text AS status, o."createdAt"
                        FROM "OrderItem" oi
                        JOIN "Order" o ON o.id = oi."orderId"
                        ORDER BY o."createdAt", oi.id
                        """
                    ),
                    connection,
                )
            finally:
                transaction.rollback()
    finally:
        engine.dispose()

    return EvaluationData(
        database_name=database_name,
        books=_normalize_timestamps(books, ("createdAt",)),
        interactions=_normalize_timestamps(interactions, ("createdAt",)),
        reading_sessions=_normalize_timestamps(reading_sessions, ("createdAt",)),
        bookmarks=_normalize_timestamps(bookmarks, ("createdAt",)),
        favorites=_normalize_timestamps(favorites, ("createdAt",)),
        reviews=_normalize_timestamps(reviews, ("createdAt",)),
        purchases=_normalize_timestamps(purchases, ("createdAt",)),
    )
