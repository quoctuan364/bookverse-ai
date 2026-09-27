"""
ai_service/evaluation/artifact_loader.py

Tải EvaluationData trực tiếp từ file artifact chuẩn của đồ án (ví dụ data/json/bookverse_ultra_seed_2200.json)
để chạy benchmark độc lập không phụ thuộc vào PostgreSQL connection trực tiếp.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from ai_service.evaluation.database import EvaluationData, _normalize_timestamps


def id_fmt(prefix: str, val: int | str, width: int) -> str:
    return f"{prefix}{str(val).zfill(width)}"


def load_evaluation_data_from_artifact(artifact_path: Path | str) -> EvaluationData:
    path = Path(artifact_path)
    if not path.is_file():
        raise FileNotFoundError(f"Không tìm thấy artifact dataset: {path}")

    with open(path, "r", encoding="utf-8") as f:
        raw: dict[str, Any] = json.load(f)

    # Categories
    cat_map: dict[int, tuple[str, str]] = {}
    for c in raw.get("categories", []):
        cat_id = id_fmt("C", c["id"], 3)
        cat_map[c["id"]] = (cat_id, c.get("name", "Unknown"))

    # Authors map
    author_map: dict[int, str] = {}
    for a in raw.get("authors", []):
        author_map[a["id"]] = a.get("name", "Unknown Author")

    book_author_map: dict[int, str] = {}
    for ba in raw.get("book_authors", []):
        bid = ba.get("book_id")
        aid = ba.get("author_id")
        if bid and aid and aid in author_map:
            book_author_map[bid] = author_map[aid]

    # Books (2200)
    books_rows = []
    for b in raw.get("books", []):
        cid, cname = cat_map.get(b.get("category_id"), (id_fmt("C", b.get("category_id", 0), 3), "General"))
        author_name = book_author_map.get(b["id"], f"Author {b['id']}")
        books_rows.append({
            "bookId": id_fmt("B", b["id"], 4),
            "title": b.get("title", ""),
            "authorName": author_name,
            "categoryId": cid,
            "categoryName": cname,
            "rating": float(b.get("rating") or 0.0),
            "status": "ACTIVE",
            "deletedAt": None,
            "createdAt": b.get("created_at", "2025-01-01T00:00:00Z"),
        })
    books = pd.DataFrame(books_rows)

    # Interaction events (18000)
    ie_rows = []
    for ie in raw.get("interaction_events", []):
        bid = id_fmt("B", ie["book_id"], 4) if ie.get("book_id") else ""
        ie_rows.append({
            "eventId": id_fmt("IE", ie["id"], 6),
            "userId": id_fmt("U", ie["user_id"], 4),
            "bookId": bid,
            "actionType": ie.get("action_type", "VIEW"),
            "createdAt": ie.get("created_at", "2026-01-01T00:00:00Z"),
        })
    interactions = pd.DataFrame(ie_rows)

    # Reading sessions (6200)
    rs_rows = []
    for rs in raw.get("reading_sessions", []):
        duration = rs.get("duration_minutes", 0)
        progress = rs.get("progress_percent", 100.0)
        rs_rows.append({
            "sessionId": id_fmt("RS", rs["id"], 6),
            "userId": id_fmt("U", rs["user_id"], 4),
            "bookId": id_fmt("B", rs["book_id"], 4),
            "timeSpent": int(duration * 60),
            "progressPercent": float(progress),
            "createdAt": rs.get("created_at", "2026-01-01T00:00:00Z"),
        })
    sessions = pd.DataFrame(rs_rows)

    # Bookmarks (2800)
    bm_rows = []
    for bm in raw.get("bookmarks", []):
        bm_rows.append({
            "bookmarkId": id_fmt("BM", bm["id"], 6),
            "userId": id_fmt("U", bm["user_id"], 4),
            "bookId": id_fmt("B", bm["book_id"], 4),
            "createdAt": bm.get("created_at", "2026-01-01T00:00:00Z"),
        })
    bookmarks = pd.DataFrame(bm_rows)

    # Favorites
    fav_rows = []
    for fav in raw.get("favorites", []):
        fav_rows.append({
            "favoriteId": id_fmt("FAV", fav["id"], 6),
            "userId": id_fmt("U", fav["user_id"], 4),
            "bookId": id_fmt("B", fav["book_id"], 4),
            "createdAt": fav.get("created_at", "2026-01-01T00:00:00Z"),
        })
    favorites = pd.DataFrame(fav_rows) if fav_rows else pd.DataFrame(columns=["favoriteId", "userId", "bookId", "createdAt"])

    # Reviews (3600)
    rv_rows = []
    for rv in raw.get("reviews", []):
        rv_rows.append({
            "reviewId": id_fmt("RV", rv["id"], 6),
            "userId": id_fmt("U", rv["user_id"], 4),
            "bookId": id_fmt("B", rv["book_id"], 4),
            "rating": float(rv.get("rating", 5.0)),
            "createdAt": rv.get("created_at", "2026-01-01T00:00:00Z"),
        })
    reviews = pd.DataFrame(rv_rows)

    # Purchases from order_items & orders
    orders_map: dict[int, tuple[str, str, str]] = {}
    for o in raw.get("orders", []):
        uid = id_fmt("U", o.get("buyer_id", 0), 4)
        status = o.get("status", "PAID")
        created = o.get("created_at", "2026-01-01T00:00:00Z")
        orders_map[o["id"]] = (uid, status, created)

    po_rows = []
    for oi in raw.get("order_items", []):
        oid = oi.get("order_id")
        uid, status, o_created = orders_map.get(oid, ("U0000", "PAID", oi.get("created_at", "2026-01-01T00:00:00Z")))
        po_rows.append({
            "orderItemId": id_fmt("OI", oi["id"], 6),
            "userId": uid,
            "bookId": id_fmt("B", oi["book_id"], 4),
            "quantity": int(oi.get("quantity", 1)),
            "status": status,
            "createdAt": o_created,
        })
    purchases = pd.DataFrame(po_rows)

    return EvaluationData(
        database_name="bookverse_ai_test",
        books=_normalize_timestamps(books, ("createdAt",)),
        interactions=_normalize_timestamps(interactions, ("createdAt",)),
        reading_sessions=_normalize_timestamps(sessions, ("createdAt",)),
        bookmarks=_normalize_timestamps(bookmarks, ("createdAt",)),
        favorites=_normalize_timestamps(favorites, ("createdAt",)),
        reviews=_normalize_timestamps(reviews, ("createdAt",)),
        purchases=_normalize_timestamps(purchases, ("createdAt",)),
    )