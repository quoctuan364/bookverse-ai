"""
ai_service/evaluation/dynamic_alpha.py

Dynamic alpha cho Hybrid Recommendation — module thuần (không kết nối DB).

Ý tưởng: thay vì dùng trọng số cố định cho mọi user, chọn trọng số
dựa trên số lượng interaction lịch sử của user.

- COLD (0 interaction): chỉ dùng popularity (cold-start)
- SPARSE (1-4 interaction): content-based + popularity
- WARM (5+ interaction): content + behavior + popularity

Ngưỡng và trọng số này được CHỌN TRÊN VALIDATION, không phải trên test.
Kết quả từ hybrid_audit.py (FUSION_PROFILES['gated_history']) chứng minh
phương án này không tệ hơn production baseline trên dữ liệu synthetic.

KHÔNG bật làm default trong production vì:
1. Chưa có final_v2 trên dữ liệu thật
2. Hybrid audit trên synthetic không đủ chứng cứ
Feature flag: HYBRID_DYNAMIC_ALPHA=true (mặc định false)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple


class DynamicAlphaWeights(NamedTuple):
    """Trọng số cho từng thành phần hybrid."""
    reading_category: float
    reading_author: float
    purchase_category: float
    popularity: float
    tier: str  # "cold" | "sparse" | "warm"


# Ngưỡng được chọn từ validation của gated_history profile trong hybrid_audit
# (xem FUSION_PROFILES['gated_history'] trong hybrid_audit.py)
@dataclass(frozen=True)
class DynamicAlphaThresholds:
    cold_max: int = 0    # 0 interaction -> cold tier
    sparse_max: int = 4  # 1-4 interaction -> sparse tier
    # >= 5 interaction -> warm tier


# Trọng số per tier — căn chỉnh với FUSION_PROFILES['gated_history']
COLD_WEIGHTS = DynamicAlphaWeights(
    reading_category=0.0,
    reading_author=0.0,
    purchase_category=0.0,
    popularity=3.0,
    tier="cold",
)

SPARSE_WEIGHTS = DynamicAlphaWeights(
    reading_category=6.0,
    reading_author=3.0,
    purchase_category=3.0,
    popularity=2.5,
    tier="sparse",
)

WARM_WEIGHTS = DynamicAlphaWeights(
    reading_category=12.0,
    reading_author=6.0,
    purchase_category=8.0,
    popularity=3.0,
    tier="warm",
)

# Production weights (để so sánh parity)
PRODUCTION_WEIGHTS = DynamicAlphaWeights(
    reading_category=12.0,
    reading_author=6.0,
    purchase_category=8.0,
    popularity=3.0,
    tier="warm",  # Production không phân tier
)


def get_dynamic_weights(
    interaction_count: int,
    thresholds: DynamicAlphaThresholds | None = None,
) -> DynamicAlphaWeights:
    """
    Trả về trọng số phù hợp dựa trên số interaction của user.

    Parameters
    ----------
    interaction_count:
        Tổng số interaction có ý nghĩa của user (reading + bookmarks + purchases + events)
    thresholds:
        Ngưỡng cold/sparse/warm. Mặc định dùng DynamicAlphaThresholds().

    Returns
    -------
    DynamicAlphaWeights với tier phù hợp

    Notes
    -----
    Ngưỡng được chọn trên validation, không trên test.
    Thay đổi ngưỡng sau khi xem test metric là HiPPO (vi phạm nghiên cứu).
    """
    if interaction_count < 0:
        raise ValueError(f"interaction_count phải >= 0, nhận: {interaction_count}")

    t = thresholds or DynamicAlphaThresholds()

    if interaction_count <= t.cold_max:
        return COLD_WEIGHTS
    if interaction_count <= t.sparse_max:
        return SPARSE_WEIGHTS
    return WARM_WEIGHTS


def weights_to_dict(weights: DynamicAlphaWeights) -> dict[str, float]:
    """Chuyển DynamicAlphaWeights thành dict để log/audit."""
    return {
        "reading_category": weights.reading_category,
        "reading_author": weights.reading_author,
        "purchase_category": weights.purchase_category,
        "popularity": weights.popularity,
        "tier": weights.tier,
    }


def is_production_equivalent(weights: DynamicAlphaWeights) -> bool:
    """Kiểm tra weights có giống production không (để audit parity)."""
    return (
        weights.reading_category == PRODUCTION_WEIGHTS.reading_category
        and weights.reading_author == PRODUCTION_WEIGHTS.reading_author
        and weights.purchase_category == PRODUCTION_WEIGHTS.purchase_category
        and weights.popularity == PRODUCTION_WEIGHTS.popularity
    )