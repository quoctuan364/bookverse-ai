from collections import defaultdict

import pandas as pd

from .config import EVENT_WEIGHTS


def split_tokens(value: object) -> list[str]:
    if pd.isna(value):
        return []
    return [token.strip().lower() for token in str(value).replace(",", ";").split(";") if token.strip()]


def _normalize(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return max(0.0, min(value / max_value, 1.0))


def _get_user(user_id: str, users: pd.DataFrame) -> pd.Series:
    matched = users.loc[users["user_id"] == user_id]
    if matched.empty:
        return users.iloc[0]
    return matched.iloc[0]


def _user_behavior_profile(user_id: str, data: dict[str, pd.DataFrame]) -> dict:
    books = data["books"][["book_id", "genre", "tags"]]
    events = data["interactions"].loc[data["interactions"]["user_id"] == user_id].copy()
    if events.empty:
        return {
            "genre_weight": {},
            "tag_weight": {},
            "purchased_books": set(),
            "read_books": set(),
            "max_genre_weight": 0,
            "max_tag_weight": 0,
        }

    events["event_weight"] = events["event_type"].map(EVENT_WEIGHTS).fillna(1.0)
    events = events.merge(books, on="book_id", how="left")

    genre_weight = defaultdict(float)
    tag_weight = defaultdict(float)
    for _, row in events.iterrows():
        weight = float(row["event_weight"])
        genre_weight[str(row["genre"]).lower()] += weight
        for tag in split_tokens(row["tags"]):
            tag_weight[tag] += weight

    return {
        "genre_weight": dict(genre_weight),
        "tag_weight": dict(tag_weight),
        "purchased_books": set(events.loc[events["event_type"] == "purchase", "book_id"]),
        "read_books": set(events.loc[events["event_type"] == "read", "book_id"]),
        "max_genre_weight": max(genre_weight.values(), default=0),
        "max_tag_weight": max(tag_weight.values(), default=0),
    }


def _community_strength(data: dict[str, pd.DataFrame]) -> pd.Series:
    posts = data["community_posts"].copy()
    if posts.empty:
        return pd.Series(dtype=float)
    posts["strength"] = posts["reactions"] * 1.0 + posts["comments"] * 1.5 - posts["reports"] * 2.0
    return posts.groupby("book_id")["strength"].sum()


def _popularity_strength(data: dict[str, pd.DataFrame]) -> pd.Series:
    interactions = data["interactions"].copy()
    listings = data["listings"].copy()

    if not interactions.empty:
        interactions["event_weight"] = interactions["event_type"].map(EVENT_WEIGHTS).fillna(1.0)
        event_score = interactions.groupby("book_id")["event_weight"].sum()
    else:
        event_score = pd.Series(dtype=float)

    if not listings.empty:
        listings["listing_score"] = listings["views"] * 0.05 + listings["cart_adds"] * 0.4 + listings["purchases"] * 1.4
        listing_score = listings.groupby("book_id")["listing_score"].sum()
    else:
        listing_score = pd.Series(dtype=float)

    return event_score.add(listing_score, fill_value=0)


def recommend_for_user(
    user_id: str,
    data: dict[str, pd.DataFrame],
    top_k: int = 8,
    mode: str = "hybrid",
    exclude_owned: bool = True,
) -> pd.DataFrame:
    books = data["books"].copy()
    users = data["users"]
    user = _get_user(user_id, users)

    preferred_genres = set(split_tokens(user["preferred_genres"]))
    user_level = str(user["level"]).lower()
    budget = float(user["budget"] or 0)

    profile = _user_behavior_profile(user_id, data)
    community = _community_strength(data)
    popularity = _popularity_strength(data)
    max_community = float(community.max()) if not community.empty else 0.0
    max_popularity = float(popularity.max()) if not popularity.empty else 0.0

    purchased_books = profile["purchased_books"]
    purchased_tags = set()
    purchased_genres = set()
    for _, row in books.loc[books["book_id"].isin(purchased_books)].iterrows():
        purchased_genres.add(str(row["genre"]).lower())
        purchased_tags.update(split_tokens(row["tags"]))

    rows = []
    for _, book in books.iterrows():
        book_id = book["book_id"]
        genre = str(book["genre"]).lower()
        tags = set(split_tokens(book["tags"]))
        reasons = []

        content_score = 0.0
        if genre in preferred_genres:
            content_score += 45
            reasons.append(f"hợp sở thích {book['genre']}")
        if str(book["level"]).lower() == user_level:
            content_score += 15
            reasons.append(f"đúng mức {book['level'].lower()}")
        if budget > 0 and float(book["price"]) <= budget:
            content_score += 10
            reasons.append("phù hợp ngân sách")

        behavior_score = 0.0
        behavior_score += 35 * _normalize(profile["genre_weight"].get(genre, 0), profile["max_genre_weight"])
        tag_signal = sum(profile["tag_weight"].get(tag, 0) for tag in tags)
        behavior_score += 25 * _normalize(tag_signal, profile["max_tag_weight"] * max(len(tags), 1))
        if behavior_score >= 20:
            reasons.append("giống các sách bạn đã xem/đọc")

        purchase_score = 0.0
        if genre in purchased_genres:
            purchase_score += 30
        if tags & purchased_tags:
            purchase_score += 30 * (len(tags & purchased_tags) / max(len(tags), 1))
        if purchase_score >= 20:
            reasons.append("liên quan sách bạn đã mua")

        community_score = 35 * _normalize(float(community.get(book_id, 0)), max_community)
        if float(book["rating"]) >= 4.6:
            community_score += 15
            reasons.append(f"đánh giá cao {book['rating']}/5")
        if community_score >= 28:
            reasons.append("đang được cộng đồng quan tâm")

        popularity_score = 50 * _normalize(float(popularity.get(book_id, 0)), max_popularity)
        if popularity_score >= 28:
            reasons.append("có nhiều lượt tương tác")

        if mode == "content":
            final_score = content_score * 0.70 + community_score * 0.15 + popularity_score * 0.15
        elif mode == "popular":
            final_score = popularity_score * 0.70 + community_score * 0.30
        else:
            final_score = (
                content_score * 0.30
                + behavior_score * 0.30
                + purchase_score * 0.15
                + community_score * 0.15
                + popularity_score * 0.10
            )

        if exclude_owned and book_id in purchased_books:
            final_score *= 0.35
            reasons.append("đã mua nên giảm ưu tiên")

        rows.append(
            {
                "book_id": book_id,
                "title": book["title"],
                "author": book["author"],
                "genre": book["genre"],
                "level": book["level"],
                "format": book["format"],
                "price": int(book["price"]),
                "rating": float(book["rating"]),
                "pages": int(book["pages"]),
                "is_ebook": bool(book["is_ebook"]),
                "cover_path": book.get("cover_path", ""),
                "tags": book.get("tags", ""),
                "score": round(final_score, 2),
                "content_score": round(content_score, 2),
                "behavior_score": round(behavior_score, 2),
                "purchase_score": round(purchase_score, 2),
                "community_score": round(community_score, 2),
                "popularity_score": round(popularity_score, 2),
                "reason": "; ".join(dict.fromkeys(reasons[:5])) or "có tín hiệu phù hợp tổng hợp",
                "description": book["description"],
            }
        )

    result = pd.DataFrame(rows).sort_values(["score", "rating"], ascending=False).head(top_k)
    return result.reset_index(drop=True)


def popular_books(data: dict[str, pd.DataFrame], top_k: int = 8) -> pd.DataFrame:
    fake_user_id = data["users"].iloc[0]["user_id"]
    return recommend_for_user(fake_user_id, data, top_k=top_k, mode="popular", exclude_owned=False)


def search_books(
    data: dict[str, pd.DataFrame],
    keyword: str = "",
    genres: list[str] | None = None,
    levels: list[str] | None = None,
    max_price: int | None = None,
    only_ebook: bool = False,
) -> pd.DataFrame:
    books = data["books"].copy()

    if keyword.strip():
        text = keyword.strip().lower()
        haystack = (
            books["title"].astype(str)
            + " "
            + books["author"].astype(str)
            + " "
            + books["genre"].astype(str)
            + " "
            + books["tags"].astype(str)
            + " "
            + books["description"].astype(str)
        ).str.lower()
        books = books.loc[haystack.str.contains(text, regex=False)]

    if genres:
        books = books.loc[books["genre"].isin(genres)]
    if levels:
        books = books.loc[books["level"].isin(levels)]
    if max_price is not None:
        books = books.loc[books["price"] <= max_price]
    if only_ebook:
        books = books.loc[books["is_ebook"]]

    return books.sort_values(["rating", "price"], ascending=[False, True]).reset_index(drop=True)
