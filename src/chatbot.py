import re

import pandas as pd

from .config import GENRE_KEYWORDS, LEVEL_KEYWORDS
from .recommender import popular_books, recommend_for_user, split_tokens


def _extract_budget(query: str) -> int | None:
    pattern = r"(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|vnd|đ)?"
    matches = re.findall(pattern, query.lower())
    if not matches:
        return None

    value_text, suffix = matches[-1]
    value = float(value_text.replace(",", "."))
    if suffix in {"k", "nghìn", "ngàn"}:
        return int(value * 1000)
    if suffix in {"tr", "triệu"}:
        return int(value * 1_000_000)
    if value < 1000:
        return int(value * 1000)
    return int(value)


def _detect_genres(query: str) -> list[str]:
    text = query.lower()
    genres = []
    for genre, keywords in GENRE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            genres.append(genre)
    return genres


def _detect_level(query: str) -> str | None:
    text = query.lower()
    for level, keywords in LEVEL_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return level
    return None


def answer_book_query(query: str, user_id: str, data: dict[str, pd.DataFrame], top_k: int = 5) -> tuple[str, pd.DataFrame]:
    query = query.strip()
    if not query:
        result = recommend_for_user(user_id, data, top_k=top_k)
        return "Mình dùng hồ sơ đọc hiện tại để chọn sách phù hợp nhất.", result

    budget = _extract_budget(query)
    genres = _detect_genres(query)
    level = _detect_level(query)

    books = data["books"].copy()
    books["chatbot_score"] = books["rating"].astype(float) * 8

    if genres:
        books["chatbot_score"] += books["genre"].isin(genres).astype(int) * 35
    if level:
        books["chatbot_score"] += (books["level"] == level).astype(int) * 20
    if budget:
        books["chatbot_score"] += (books["price"] <= budget).astype(int) * 18

    query_tokens = set(split_tokens(query.replace(" ", ";")))
    books["tag_match"] = books["tags"].apply(lambda value: len(set(split_tokens(value)) & query_tokens))
    books["chatbot_score"] += books["tag_match"] * 6

    if budget:
        books = books.loc[books["price"] <= budget]
    if genres:
        genre_mask = books["genre"].isin(genres)
        tag_mask = books["tags"].str.lower().apply(lambda value: any(keyword in value for genre in genres for keyword in GENRE_KEYWORDS[genre]))
        books = books.loc[genre_mask | tag_mask]
    if level:
        level_books = books.loc[books["level"] == level]
        if len(level_books) >= min(top_k, 3):
            books = level_books

    if books.empty:
        fallback = popular_books(data, top_k=top_k)
        return "Chưa có sách khớp hoàn toàn, mình trả về nhóm đang phổ biến để bạn tham khảo.", fallback

    result = books.sort_values(["chatbot_score", "rating"], ascending=False).head(top_k).reset_index(drop=True)
    result["score"] = result["chatbot_score"].round(2)
    result["reason"] = result.apply(
        lambda row: _build_reason(row, genres=genres, level=level, budget=budget),
        axis=1,
    )

    filters = []
    if genres:
        filters.append("chủ đề " + ", ".join(genres))
    if level:
        filters.append("mức " + level.lower())
    if budget:
        filters.append(f"ngân sách dưới {budget:,.0f}đ")
    filter_text = "; ".join(filters) if filters else "từ khóa bạn nhập"
    return f"Mình đã lọc theo {filter_text} và ưu tiên sách có đánh giá tốt.", result


def _build_reason(row: pd.Series, genres: list[str], level: str | None, budget: int | None) -> str:
    reasons = []
    if genres and row["genre"] in genres:
        reasons.append(f"đúng chủ đề {row['genre']}")
    if level and row["level"] == level:
        reasons.append(f"đúng mức {row['level'].lower()}")
    if budget and int(row["price"]) <= budget:
        reasons.append("nằm trong ngân sách")
    if float(row["rating"]) >= 4.6:
        reasons.append(f"đánh giá {row['rating']}/5")
    return "; ".join(reasons) or "phù hợp theo từ khóa và dữ liệu nội bộ"
