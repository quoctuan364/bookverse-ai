"""
Tests cho ai_service/evaluation/dynamic_alpha.py

Kiểm tra:
1. Phân tier đúng theo interaction_count
2. Production weights không thay đổi
3. Tier cold -> sparse -> warm
4. Cold-start fallback
5. Deterministic (cùng input = cùng output)
"""

from __future__ import annotations

import pytest
from ai_service.evaluation.dynamic_alpha import (
    COLD_WEIGHTS,
    SPARSE_WEIGHTS,
    WARM_WEIGHTS,
    PRODUCTION_WEIGHTS,
    DynamicAlphaThresholds,
    get_dynamic_weights,
    is_production_equivalent,
    weights_to_dict,
)


# Dùng thresholds mặc định (cold_max=0, sparse_max=4)
THRESHOLDS = DynamicAlphaThresholds()


class TestDynamicAlphaTiers:
    """Kiểm tra phân tier theo interaction count."""

    def test_zero_interactions_is_cold(self):
        w = get_dynamic_weights(0, THRESHOLDS)
        assert w.tier == "cold"
        assert w == COLD_WEIGHTS

    def test_one_interaction_is_sparse(self):
        w = get_dynamic_weights(1, THRESHOLDS)
        assert w.tier == "sparse"
        assert w == SPARSE_WEIGHTS

    def test_four_interactions_is_sparse(self):
        w = get_dynamic_weights(4, THRESHOLDS)
        assert w.tier == "sparse"
        assert w == SPARSE_WEIGHTS

    def test_five_interactions_is_warm(self):
        w = get_dynamic_weights(5, THRESHOLDS)
        assert w.tier == "warm"
        assert w == WARM_WEIGHTS

    def test_hundred_interactions_is_warm(self):
        w = get_dynamic_weights(100, THRESHOLDS)
        assert w.tier == "warm"
        assert w == WARM_WEIGHTS


class TestDynamicAlphaProductionParity:
    """Kiểm tra production weights không thay đổi."""

    def test_warm_weights_equal_production(self):
        """Khi user có nhiều interaction, warm tier giống production."""
        w = get_dynamic_weights(10, THRESHOLDS)
        assert is_production_equivalent(w), (
            f"Warm weights {weights_to_dict(w)} khác production "
            f"{weights_to_dict(PRODUCTION_WEIGHTS)}"
        )

    def test_production_weights_unchanged(self):
        """Đảm bảo production weights không bị vô ý sửa đổi."""
        assert PRODUCTION_WEIGHTS.reading_category == 12.0
        assert PRODUCTION_WEIGHTS.reading_author == 6.0
        assert PRODUCTION_WEIGHTS.purchase_category == 8.0
        assert PRODUCTION_WEIGHTS.popularity == 3.0

    def test_cold_is_not_production_equivalent(self):
        """Cold start không giống production."""
        assert not is_production_equivalent(COLD_WEIGHTS)

    def test_sparse_is_not_production_equivalent(self):
        """Sparse tier không giống production."""
        assert not is_production_equivalent(SPARSE_WEIGHTS)


class TestDynamicAlphaDeterministic:
    """Cùng input phải cho cùng output."""

    def test_same_count_same_result(self):
        w1 = get_dynamic_weights(3)
        w2 = get_dynamic_weights(3)
        assert w1 == w2

    def test_weights_to_dict_contains_tier(self):
        d = weights_to_dict(WARM_WEIGHTS)
        assert "tier" in d
        assert d["tier"] == "warm"


class TestDynamicAlphaEdgeCases:
    """Kiểm tra edge case và validation."""

    def test_negative_count_raises(self):
        with pytest.raises(ValueError, match="interaction_count"):
            get_dynamic_weights(-1)

    def test_custom_thresholds(self):
        thresholds = DynamicAlphaThresholds(cold_max=2, sparse_max=10)
        assert get_dynamic_weights(2, thresholds).tier == "cold"
        assert get_dynamic_weights(3, thresholds).tier == "sparse"
        assert get_dynamic_weights(10, thresholds).tier == "sparse"
        assert get_dynamic_weights(11, thresholds).tier == "warm"

    def test_cold_weights_have_zero_content_signal(self):
        """Cold tier không dùng content-based signal."""
        assert COLD_WEIGHTS.reading_category == 0.0
        assert COLD_WEIGHTS.reading_author == 0.0
        assert COLD_WEIGHTS.purchase_category == 0.0
        assert COLD_WEIGHTS.popularity > 0.0

    def test_warm_weights_have_strong_content_signal(self):
        """Warm tier ưu tiên content-based."""
        assert WARM_WEIGHTS.reading_category >= WARM_WEIGHTS.popularity
        assert WARM_WEIGHTS.purchase_category >= WARM_WEIGHTS.popularity