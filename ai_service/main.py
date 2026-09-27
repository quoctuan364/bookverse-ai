import os
import logging
from hmac import compare_digest
from functools import lru_cache
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

if "DATABASE_URL" not in os.environ:
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.preprocessing import MinMaxScaler
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from ai_service.catalog_scope import build_recommendation_catalog_predicate
from ai_service.evaluation.taxonomy import map_legacy_interaction_event
from ai_service.evaluation.dynamic_alpha import (
    get_dynamic_weights,
    weights_to_dict,
    PRODUCTION_WEIGHTS,
)
from ai_service.preference_profile import build_declared_category_scores


MAX_RECOMMENDATIONS = 10
logger = logging.getLogger("bookverse.ai")

# Feature flag: activates dynamic alpha tier-based weighting.
# Default: false (không thay đổi production behavior cho đến khi có bằng chứng rõ ràng hơn).
HYBRID_DYNAMIC_ALPHA_ENABLED = os.getenv("HYBRID_DYNAMIC_ALPHA", "false").lower() == "true"

READING_CATEGORY_WEIGHT = PRODUCTION_WEIGHTS.reading_category  # 12.0
READING_AUTHOR_WEIGHT = PRODUCTION_WEIGHTS.reading_author       # 6.0
PURCHASE_CATEGORY_WEIGHT = PRODUCTION_WEIGHTS.purchase_category # 8.0
POPULARITY_WEIGHT = 3.0

# Các biểu thức này chỉ đọc metadata Category và vẫn chạy với schema demo cũ.
# `to_jsonb(c)` trả về JSON của row hiện có; key chưa tồn tại sẽ cho NULL thay
# vì làm PostgreSQL báo lỗi "column does not exist".
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

CATEGORY_PARENT_JOIN_SQL = """
LEFT JOIN "Category" pc ON pc.id = NULLIF(to_jsonb(c)->>'parentId', '')
""".strip()

app = FastAPI(
    title="BookVerse AI Recommendation Service",
    version="2.0.0",
    description="Hybrid Recommendation có Explainability cho BookVerse AI.",
)

def configured_cors_origins() -> list[str]:
    configured = os.getenv("BOOKVERSE_AI_ALLOWED_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    if os.getenv("NODE_ENV", "development").lower() == "production":
        raise RuntimeError("BOOKVERSE_AI_ALLOWED_ORIGINS is required in production.")
    return ["http://127.0.0.1:3000", "http://localhost:3000"]


def is_authorized_service_request(presented: str | None, expected: str, production: bool) -> bool:
    if production and not expected:
        return False
    if not expected:
        return True
    return bool(presented) and compare_digest(presented, expected)


def require_service_token(
    x_bookverse_service_token: str | None = Header(default=None),
) -> None:
    expected = os.getenv("BOOKVERSE_AI_SERVICE_TOKEN", "").strip()
    production = os.getenv("NODE_ENV", "development").lower() == "production"
    if not is_authorized_service_request(x_bookverse_service_token, expected, production):
        raise HTTPException(status_code=401, detail="AI service authentication failed.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "X-BookVerse-Service-Token"],
)


def normalize_database_url(database_url: str) -> str:
    """
    Prisma hay dùng query `?schema=public`, psycopg2 không hiểu option này.
    Hàm này bỏ `schema` khỏi query string để SQLAlchemy kết nối ổn định.
    """
    parsed_url = urlsplit(database_url)
    query_items = [
        (key, value)
        for key, value in parse_qsl(parsed_url.query, keep_blank_values=True)
        if key.lower() != "schema"
    ]
    return urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            urlencode(query_items),
            parsed_url.fragment,
        )
    )


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required for the recommendation service.")
    return create_engine(normalize_database_url(database_url), pool_pre_ping=True)


def read_dataframe(query: str, params: dict[str, Any] | None = None) -> pd.DataFrame:
    try:
        with get_engine().connect() as connection:
            return pd.read_sql_query(text(query), connection, params=params or {})
    except SQLAlchemyError as error:
        logger.exception("Database query failed in recommendation service.")
        raise HTTPException(
            status_code=500,
            detail="Recommendation database is temporarily unavailable.",
        ) from error


@lru_cache(maxsize=8)
def _has_source_metadata_table(database_url: str) -> bool:
    engine = create_engine(normalize_database_url(database_url), pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            table_name = connection.execute(
                text("SELECT to_regclass('public.book_source_metadata')::text")
            ).scalar_one_or_none()
            return bool(table_name)
    finally:
        engine.dispose()


def recommendation_catalog_predicate(table_alias: str = "b") -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required for catalog scope checks.")
    return build_recommendation_catalog_predicate(
        table_alias,
        _has_source_metadata_table(database_url),
    )


def min_max_normalize(series: pd.Series) -> pd.Series:
    if series.empty:
        return pd.Series(dtype=float)

    numeric_series = pd.to_numeric(series, errors="coerce").fillna(0.0)
    if numeric_series.max() == numeric_series.min():
        return pd.Series([1.0 if numeric_series.max() > 0 else 0.0] * len(numeric_series), index=series.index)

    scaler = MinMaxScaler()
    values = scaler.fit_transform(numeric_series.to_numpy().reshape(-1, 1)).flatten()
    return pd.Series(values, index=series.index)


def get_books() -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    return read_dataframe(
        f"""
        SELECT
          b.id AS "bookId",
          b.title AS "title",
          b."authorName" AS "authorName",
          {CATEGORY_FEATURE_SQL} AS "categoryId",
          {CATEGORY_NAME_SQL} AS "categoryName",
          COALESCE(b.rating::float, 0) AS "rating"
        FROM "Book" b
        JOIN "Category" c ON c.id = b."categoryId"
        {CATEGORY_PARENT_JOIN_SQL}
        WHERE {catalog_predicate} AND b.status = 'ACTIVE' AND b."deletedAt" IS NULL AND b."isPubliclyVisible" = true
        """
    )


def get_user_reading_sessions(user_id: str) -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    return read_dataframe(
        f"""
        SELECT
          rs."bookId" AS "bookId",
          b.title AS "title",
          b."authorName" AS "authorName",
          {CATEGORY_FEATURE_SQL} AS "categoryId",
          {CATEGORY_NAME_SQL} AS "categoryName",
          SUM(rs."timeSpent") AS "timeSpent",
          COUNT(*) AS "sessionCount"
        FROM reading_sessions rs
        JOIN "Book" b ON b.id = rs."bookId"
        JOIN "Category" c ON c.id = b."categoryId"
        {CATEGORY_PARENT_JOIN_SQL}
        WHERE rs."userId" = :user_id AND {catalog_predicate}
        GROUP BY
          rs."bookId", b.title, b."authorName",
          {CATEGORY_FEATURE_SQL}, {CATEGORY_NAME_SQL}
        """,
        {"user_id": user_id},
    )


def get_user_bookmarks(user_id: str) -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    return read_dataframe(
        f"""
        SELECT
          bm."bookId" AS "bookId",
          b.title AS "title",
          b."authorName" AS "authorName",
          {CATEGORY_FEATURE_SQL} AS "categoryId",
          {CATEGORY_NAME_SQL} AS "categoryName",
          COUNT(*) AS "bookmarkCount"
        FROM bookmarks bm
        JOIN "Book" b ON b.id = bm."bookId"
        JOIN "Category" c ON c.id = b."categoryId"
        {CATEGORY_PARENT_JOIN_SQL}
        WHERE bm."userId" = :user_id AND {catalog_predicate}
        GROUP BY
          bm."bookId", b.title, b."authorName",
          {CATEGORY_FEATURE_SQL}, {CATEGORY_NAME_SQL}
        """,
        {"user_id": user_id},
    )


def get_user_interaction_events(user_id: str) -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    interactions = read_dataframe(
        f"""
        SELECT
          ie."bookId" AS "bookId",
          ie."actionType" AS "actionType",
          b.title AS "title",
          b."authorName" AS "authorName",
          {CATEGORY_FEATURE_SQL} AS "categoryId",
          {CATEGORY_NAME_SQL} AS "categoryName",
          COUNT(*) AS "eventCount"
        FROM interaction_events ie
        JOIN "Book" b ON b.id = ie."bookId"
        JOIN "Category" c ON c.id = b."categoryId"
        {CATEGORY_PARENT_JOIN_SQL}
        WHERE ie."userId" = :user_id AND {catalog_predicate}
        GROUP BY
          ie."bookId", ie."actionType", b.title, b."authorName",
          {CATEGORY_FEATURE_SQL}, {CATEGORY_NAME_SQL}
        """,
        {"user_id": user_id},
    )
    if interactions.empty:
        return interactions

    interactions["actionType"] = interactions["actionType"].astype(str).map(
        map_legacy_interaction_event
    )
    interactions = interactions[
        interactions["actionType"].isin(
            {
                "BOOK_VIEW",
                "READING_START",
                "READING_PROGRESS",
                "READING_COMPLETE",
                "READING_HIGHLIGHT",
                "BOOKMARK_ADD",
                "FAVORITE_ADD",
                "CART_ADD",
            }
        )
    ]
    if interactions.empty:
        return interactions

    group_columns = [
        "bookId",
        "actionType",
        "title",
        "authorName",
        "categoryId",
        "categoryName",
    ]
    return interactions.groupby(group_columns, as_index=False).agg(eventCount=("eventCount", "sum"))


def get_user_purchases(user_id: str) -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    return read_dataframe(
        f"""
        SELECT
          oi."bookId" AS "bookId",
          b.title AS "title",
          b."authorName" AS "authorName",
          {CATEGORY_FEATURE_SQL} AS "categoryId",
          {CATEGORY_NAME_SQL} AS "categoryName",
          SUM(oi.quantity) AS "purchaseCount"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Book" b ON b.id = oi."bookId"
        JOIN "Category" c ON c.id = b."categoryId"
        {CATEGORY_PARENT_JOIN_SQL}
        WHERE
          o."buyerId" = :user_id
          AND o.status IN ('PAID', 'PAID_DEMO', 'SHIPPED', 'COMPLETED')
          AND {catalog_predicate}
        GROUP BY
          oi."bookId", b.title, b."authorName",
          {CATEGORY_FEATURE_SQL}, {CATEGORY_NAME_SQL}
        """,
        {"user_id": user_id},
    )


def get_user_declared_category_scores(user_id: str) -> dict[str, float]:
    profile = read_dataframe(
        'SELECT "preferredGenres" FROM "Profile" WHERE "userId" = :user_id LIMIT 1',
        {"user_id": user_id},
    )
    if profile.empty:
        return {}

    preferences = profile.iloc[0].get("preferredGenres")
    if preferences is None:
        return {}
    if isinstance(preferences, str):
        preferences = [preferences]
    return build_declared_category_scores(preferences)


def get_global_popularity() -> pd.DataFrame:
    catalog_predicate = recommendation_catalog_predicate()
    return read_dataframe(
        f"""
        SELECT
          b.id AS "bookId",
          COALESCE(ie."eventCount", 0) AS "eventCount",
          COALESCE(rs."sessionCount", 0) AS "sessionCount",
          COALESCE(bm."bookmarkCount", 0) AS "bookmarkCount",
          COALESCE(oi."orderCount", 0) AS "orderCount",
          (
            COALESCE(ie."eventCount", 0)
            + COALESCE(rs."sessionCount", 0) * 2
            + COALESCE(bm."bookmarkCount", 0) * 3
            + COALESCE(oi."orderCount", 0) * 4
          ) AS "rawPopularity"
        FROM "Book" b
        LEFT JOIN (
          SELECT "bookId", COUNT(*) AS "eventCount"
          FROM interaction_events
          GROUP BY "bookId"
        ) ie ON ie."bookId" = b.id
        LEFT JOIN (
          SELECT "bookId", COUNT(*) AS "sessionCount"
          FROM reading_sessions
          GROUP BY "bookId"
        ) rs ON rs."bookId" = b.id
        LEFT JOIN (
          SELECT "bookId", COUNT(*) AS "bookmarkCount"
          FROM bookmarks
          GROUP BY "bookId"
        ) bm ON bm."bookId" = b.id
        LEFT JOIN (
          SELECT "bookId", SUM(quantity) AS "orderCount"
          FROM "OrderItem"
          GROUP BY "bookId"
        ) oi ON oi."bookId" = b.id
        WHERE {catalog_predicate} AND b.status = 'ACTIVE' AND b."deletedAt" IS NULL AND b."isPubliclyVisible" = true
        """
    )


def add_score(score_map: dict[str, float], key: str, amount: float) -> None:
    if not key:
        return

    score_map[key] = score_map.get(key, 0.0) + amount


def build_reading_preference_scores(
    reading_sessions: pd.DataFrame,
    bookmarks: pd.DataFrame,
    interaction_events: pd.DataFrame,
) -> tuple[dict[str, float], dict[str, float]]:
    category_scores: dict[str, float] = {}
    author_scores: dict[str, float] = {}

    if not reading_sessions.empty:
        for row in reading_sessions.itertuples(index=False):
            time_spent = float(getattr(row, "timeSpent") or 0)
            session_count = float(getattr(row, "sessionCount") or 0)
            score = min(time_spent / 300.0, 8.0) + session_count
            add_score(category_scores, str(getattr(row, "categoryId")), score)
            add_score(author_scores, str(getattr(row, "authorName")), score * 0.7)

    if not bookmarks.empty:
        for row in bookmarks.itertuples(index=False):
            bookmark_count = float(getattr(row, "bookmarkCount") or 0)
            score = bookmark_count * 4.0
            add_score(category_scores, str(getattr(row, "categoryId")), score)
            add_score(author_scores, str(getattr(row, "authorName")), score * 0.6)

    if not interaction_events.empty:
        event_weights = {
            "BOOK_VIEW": 1.0,
            "READING_START": 3.0,
            "READING_PROGRESS": 4.0,
            "READING_COMPLETE": 6.0,
            "READING_HIGHLIGHT": 5.0,
            "BOOKMARK_ADD": 6.0,
            "FAVORITE_ADD": 7.0,
            "CART_ADD": 5.0,
        }
        for row in interaction_events.itertuples(index=False):
            action_type = str(getattr(row, "actionType"))
            event_count = float(getattr(row, "eventCount") or 0)
            score = event_weights.get(action_type, 0.5) * event_count
            add_score(category_scores, str(getattr(row, "categoryId")), score)
            add_score(author_scores, str(getattr(row, "authorName")), score * 0.5)

    return category_scores, author_scores


def build_purchase_category_scores(purchases: pd.DataFrame) -> dict[str, float]:
    category_scores: dict[str, float] = {}

    if purchases.empty:
        return category_scores

    for row in purchases.itertuples(index=False):
        purchase_count = float(getattr(row, "purchaseCount") or 0)
        add_score(category_scores, str(getattr(row, "categoryId")), purchase_count * 5.0)

    return category_scores


def normalize_score_map(score_map: dict[str, float]) -> dict[str, float]:
    if not score_map:
        return {}

    max_score = max(score_map.values())
    if max_score <= 0:
        return {key: 0.0 for key in score_map}

    return {key: value / max_score for key, value in score_map.items()}


def has_user_history(
    reading_sessions: pd.DataFrame,
    bookmarks: pd.DataFrame,
    interaction_events: pd.DataFrame,
    purchases: pd.DataFrame,
) -> bool:
    return not (
        reading_sessions.empty
        and bookmarks.empty
        and interaction_events.empty
        and purchases.empty
    )


def build_excluded_book_ids(
    reading_sessions: pd.DataFrame,
    bookmarks: pd.DataFrame,
    interaction_events: pd.DataFrame,
    purchases: pd.DataFrame,
) -> set[str]:
    excluded_book_ids: set[str] = set()

    for frame in [reading_sessions, bookmarks, purchases]:
        if not frame.empty:
            excluded_book_ids.update(frame["bookId"].dropna().astype(str).tolist())

    if not interaction_events.empty:
        read_or_bookmarked = interaction_events[
            interaction_events["actionType"].isin(
                [
                    "READING_START",
                    "READING_PROGRESS",
                    "READING_COMPLETE",
                    "READING_HIGHLIGHT",
                    "BOOKMARK_ADD",
                    "FAVORITE_ADD",
                    "CART_ADD",
                ]
            )
        ]
        excluded_book_ids.update(read_or_bookmarked["bookId"].dropna().astype(str).tolist())

    return excluded_book_ids


def get_purchase_evidence_by_category(purchases: pd.DataFrame) -> dict[str, str]:
    evidence_by_category: dict[str, str] = {}
    if purchases.empty:
        return evidence_by_category

    sorted_purchases = purchases.sort_values("purchaseCount", ascending=False)
    for row in sorted_purchases.itertuples(index=False):
        category_id = str(getattr(row, "categoryId"))
        title = str(getattr(row, "title"))
        evidence_by_category.setdefault(category_id, f"Vì bạn đã mua cuốn {title}")

    return evidence_by_category


def build_evidence(
    row: pd.Series,
    reading_score: float,
    purchase_score: float,
    popularity_score: float,
    purchase_evidence_by_category: dict[str, str],
    cold_start: bool,
) -> str:
    if cold_start:
        return "Sách nổi bật được cộng đồng yêu thích"

    category_name = str(row["categoryName"])
    author_name = str(row["authorName"])
    category_id = str(row["categoryId"])

    if reading_score >= purchase_score and reading_score >= popularity_score and reading_score > 0:
        return f"Gợi ý vì bạn đã đọc hoặc bookmark nhiều sách thể loại {category_name} / tác giả {author_name}"

    if purchase_score >= popularity_score and purchase_score > 0:
        return purchase_evidence_by_category.get(
            category_id,
            f"Gợi ý vì bạn đã mua nhiều sách thể loại {category_name}",
        )

    return "Sách đang thịnh hành trong cộng đồng"


def build_popularity_scores(books: pd.DataFrame, popularity: pd.DataFrame) -> pd.DataFrame:
    if popularity.empty:
        books["rawPopularity"] = 0.0
        books["popularityNorm"] = 0.0
        return books

    merged = books.merge(popularity[["bookId", "rawPopularity"]], on="bookId", how="left")
    merged["rawPopularity"] = pd.to_numeric(merged["rawPopularity"], errors="coerce").fillna(0.0)
    merged["popularityNorm"] = min_max_normalize(merged["rawPopularity"])
    return merged


def rank_cold_start(books: pd.DataFrame) -> list[dict[str, Any]]:
    ranked = books.copy()
    ranked["score"] = (ranked["popularityNorm"] * POPULARITY_WEIGHT).round(4)
    ranked = ranked.sort_values(
        by=["score", "rating", "bookId"],
        ascending=[False, False, True],
    ).head(MAX_RECOMMENDATIONS)

    return [
        {
            "bookId": str(row.bookId),
            "score": float(row.score),
            "evidence": "Sách nổi bật được cộng đồng yêu thích",
        }
        for row in ranked.itertuples(index=False)
    ]


def rank_hybrid_recommendations(
    books: pd.DataFrame,
    reading_category_scores: dict[str, float],
    reading_author_scores: dict[str, float],
    purchase_category_scores: dict[str, float],
    purchase_evidence_by_category: dict[str, str],
    rc_weight: float = READING_CATEGORY_WEIGHT,
    ra_weight: float = READING_AUTHOR_WEIGHT,
    pc_weight: float = PURCHASE_CATEGORY_WEIGHT,
    pop_weight: float = POPULARITY_WEIGHT,
) -> list[dict[str, Any]]:
    normalized_reading_categories = normalize_score_map(reading_category_scores)
    normalized_reading_authors = normalize_score_map(reading_author_scores)
    normalized_purchase_categories = normalize_score_map(purchase_category_scores)

    ranked = books.copy()
    ranked["readingScore"] = ranked.apply(
        lambda row: (
            normalized_reading_categories.get(str(row["categoryId"]), 0.0) * rc_weight
            + normalized_reading_authors.get(str(row["authorName"]), 0.0) * ra_weight
        ),
        axis=1,
    )
    ranked["purchaseScore"] = ranked["categoryId"].astype(str).map(
        lambda category_id: normalized_purchase_categories.get(category_id, 0.0) * pc_weight
    )
    ranked["popularityScore"] = ranked["popularityNorm"] * pop_weight
    ranked["score"] = (
        ranked["readingScore"] + ranked["purchaseScore"] + ranked["popularityScore"]
    ).round(4)

    ranked = ranked[ranked["score"] > 0]
    if ranked.empty:
        return rank_cold_start(books)

    ranked = ranked.sort_values(
        by=["score", "popularityNorm", "rating", "bookId"],
        ascending=[False, False, False, True],
    ).head(MAX_RECOMMENDATIONS)

    recommendations: list[dict[str, Any]] = []
    for _, row in ranked.iterrows():
        evidence = build_evidence(
            row=row,
            reading_score=float(row["readingScore"]),
            purchase_score=float(row["purchaseScore"]),
            popularity_score=float(row["popularityScore"]),
            purchase_evidence_by_category=purchase_evidence_by_category,
            cold_start=False,
        )
        recommendations.append(
            {
                "bookId": str(row["bookId"]),
                "score": float(row["score"]),
                "evidence": evidence,
            }
        )

    return recommendations


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/recommend/{user_id}", dependencies=[Depends(require_service_token)])
def recommend_books(user_id: str) -> list[dict[str, Any]]:
    clean_user_id = user_id.strip()
    if not clean_user_id:
        raise HTTPException(status_code=400, detail="user_id không hợp lệ.")

    try:
        books = get_books()
        if books.empty:
            return []

        popularity = get_global_popularity()
        books_with_popularity = build_popularity_scores(books, popularity)

        reading_sessions = get_user_reading_sessions(clean_user_id)
        bookmarks = get_user_bookmarks(clean_user_id)
        interaction_events = get_user_interaction_events(clean_user_id)
        purchases = get_user_purchases(clean_user_id)

        if not has_user_history(reading_sessions, bookmarks, interaction_events, purchases):
            return rank_cold_start(books_with_popularity)

        excluded_book_ids = build_excluded_book_ids(
            reading_sessions=reading_sessions,
            bookmarks=bookmarks,
            interaction_events=interaction_events,
            purchases=purchases,
        )
        candidate_books = books_with_popularity[
            ~books_with_popularity["bookId"].astype(str).isin(excluded_book_ids)
        ].copy()

        if candidate_books.empty:
            return rank_cold_start(books_with_popularity)

        reading_category_scores, reading_author_scores = build_reading_preference_scores(
            reading_sessions=reading_sessions,
            bookmarks=bookmarks,
            interaction_events=interaction_events,
        )
        for category_id, score in get_user_declared_category_scores(clean_user_id).items():
            add_score(reading_category_scores, category_id, score)
        purchase_category_scores = build_purchase_category_scores(purchases)
        purchase_evidence_by_category = get_purchase_evidence_by_category(purchases)

        # Feature flag: dùng dynamic alpha khi bật, giữ production weights khi tắt
        interaction_count = (
            len(reading_sessions)
            + len(bookmarks)
            + len(interaction_events)
            + len(purchases)
        )

        if HYBRID_DYNAMIC_ALPHA_ENABLED:
            weights = get_dynamic_weights(interaction_count)
            logger.debug(
                "dynamic_alpha tier=%s interaction_count=%d",
                weights.tier,
                interaction_count,
            )
            return rank_hybrid_recommendations(
                books=candidate_books,
                reading_category_scores=reading_category_scores,
                reading_author_scores=reading_author_scores,
                purchase_category_scores=purchase_category_scores,
                purchase_evidence_by_category=purchase_evidence_by_category,
                rc_weight=weights.reading_category,
                ra_weight=weights.reading_author,
                pc_weight=weights.purchase_category,
                pop_weight=weights.popularity,
            )

        # Production path: weights cố định, không thay đổi
        return rank_hybrid_recommendations(
            books=candidate_books,
            reading_category_scores=reading_category_scores,
            reading_author_scores=reading_author_scores,
            purchase_category_scores=purchase_category_scores,
            purchase_evidence_by_category=purchase_evidence_by_category,
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Recommendation generation failed.")
        raise HTTPException(
            status_code=500,
            detail="Không thể tạo gợi ý sách lúc này.",
        ) from error
