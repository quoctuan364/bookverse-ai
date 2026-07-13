import pandas as pd

from .recommender import split_tokens


def score_listing(listing: pd.Series, book: pd.Series | None = None) -> dict:
    score = 0
    suggestions = []

    title = str(listing.get("title", "")).strip()
    description = str(listing.get("description", "")).strip()
    tags = split_tokens(listing.get("tags", ""))
    target_audience = str(listing.get("target_audience", "")).strip()
    price = float(listing.get("price", 0) or 0)

    if 12 <= len(title) <= 90:
        score += 18
    else:
        suggestions.append("Viết tiêu đề rõ hơn, có tên sách và điểm nổi bật.")

    if len(description) >= 140:
        score += 24
    else:
        suggestions.append("Bổ sung mô tả tối thiểu 140 ký tự: nội dung chính, tình trạng sách, lợi ích cho người đọc.")

    if len(tags) >= 3:
        score += 18
    else:
        suggestions.append("Thêm ít nhất 3 tag như thể loại, trình độ, công nghệ hoặc nhu cầu đọc.")

    if bool(listing.get("has_cover", False)):
        score += 15
    else:
        suggestions.append("Thêm ảnh bìa rõ nét để tăng độ tin cậy của bài đăng.")

    if target_audience:
        score += 12
    else:
        suggestions.append("Nêu nhóm độc giả mục tiêu để hệ thống gợi ý đúng người hơn.")

    if price > 0:
        score += 8
        if book is not None and "price" in book:
            original_price = float(book.get("price", 0) or 0)
            if original_price > 0 and price > original_price * 1.15:
                suggestions.append("Giá đang cao hơn giá tham khảo, nên giải thích tình trạng sách hoặc điều chỉnh giá.")
            else:
                score += 5
    else:
        suggestions.append("Cập nhật giá bán hợp lệ.")

    if not suggestions:
        suggestions.append("Bài đăng đã đủ thông tin chính, có thể theo dõi thêm lượt xem và lượt mua.")

    return {
        "quality_score": min(score, 100),
        "quality_level": _quality_level(score),
        "suggestions": suggestions,
    }


def _quality_level(score: int) -> str:
    if score >= 85:
        return "Tốt"
    if score >= 65:
        return "Khá"
    if score >= 45:
        return "Cần cải thiện"
    return "Yếu"


def score_all_listings(data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    listings = data["listings"].copy()
    books = data["books"].set_index("book_id")
    rows = []
    for _, listing in listings.iterrows():
        book = books.loc[listing["book_id"]] if listing["book_id"] in books.index else None
        scored = score_listing(listing, book)
        rows.append(
            {
                "listing_id": listing["listing_id"],
                "book_id": listing["book_id"],
                "title": listing["title"],
                "status": listing["status"],
                "views": listing["views"],
                "cart_adds": listing["cart_adds"],
                "purchases": listing["purchases"],
                "quality_score": scored["quality_score"],
                "quality_level": scored["quality_level"],
                "suggestions": " | ".join(scored["suggestions"]),
            }
        )
    return pd.DataFrame(rows).sort_values("quality_score", ascending=False).reset_index(drop=True)

