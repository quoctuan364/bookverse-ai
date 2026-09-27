"""Chuẩn hóa sở thích khai báo sang taxonomy category của catalog thật."""

from __future__ import annotations

import unicodedata
from collections.abc import Iterable


DECLARED_PREFERENCE_WEIGHT = 40.0

# Key ở đây trùng với Category.canonicalKey mà main.py dùng làm categoryId.
_CATEGORY_FAMILIES: tuple[tuple[frozenset[str], tuple[str, ...]], ...] = (
    (
        frozenset(
            {
                "cong nghe",
                "cong nghe thong tin",
                "lap trinh",
                "tri tue nhan tao",
                "khoa hoc du lieu",
                "khoa hoc",
            }
        ),
        ("technology", "artificial-intelligence", "data-science"),
    ),
    (
        frozenset(
            {
                "van hoc",
                "tieu thuyet",
                "van hoc nuoc ngoai",
                "van hoc viet nam",
                "trinh tham",
                "ky ao",
            }
        ),
        ("literature", "mystery", "fantasy"),
    ),
    (frozenset({"tam ly", "tam ly hoc"}), ("psychology",)),
    (
        frozenset(
            {
                "kinh doanh",
                "kinh te",
                "khoi nghiep",
                "kinh doanh va quan tri",
                "quan tri",
                "marketing",
                "tai chinh ca nhan",
            }
        ),
        ("business", "personal-finance", "marketing"),
    ),
)


def normalize_preference_label(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().lower())
    return "".join(character for character in normalized if not unicodedata.combining(character)).replace(
        "đ", "d"
    )


def build_declared_category_scores(
    preferences: Iterable[str],
    weight: float = DECLARED_PREFERENCE_WEIGHT,
) -> dict[str, float]:
    """Mở rộng nhãn hồ sơ sang các canonical key cùng nhóm chủ đề."""
    normalized_preferences = {
        normalize_preference_label(preference)
        for preference in preferences
        if preference and preference.strip()
    }
    scores: dict[str, float] = {}
    for aliases, category_keys in _CATEGORY_FAMILIES:
        if aliases.isdisjoint(normalized_preferences):
            continue
        for category_key in category_keys:
            scores[category_key] = max(scores.get(category_key, 0.0), weight)
    return scores

