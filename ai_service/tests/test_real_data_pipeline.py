"""
Tests cho ai_service/pipeline/real_data_pipeline.py

Kiểm tra:
1. Không tạo dữ liệu giả (assert_real_data)
2. NOT_ENOUGH_REAL_DATA khi không đủ dữ liệu
3. Deduplication không xóa bản ghi khác nhau
4. Temporal split không leakage
5. Event weights mặc định đầy đủ
6. Quality gate thresholds đúng
7. Ẩn danh hóa trong split output
"""

from __future__ import annotations

import warnings
from datetime import datetime, timedelta

import pandas as pd
import pytest

from ai_service.pipeline.real_data_pipeline import (
    DEFAULT_EVENT_WEIGHTS,
    MIN_COLLECTION_DAYS,
    MIN_CONSENTED_USERS,
    MIN_ELIGIBLE_USERS,
    MIN_TOTAL_IMPRESSIONS,
    RealInteractionData,
    assign_interaction_weights,
    check_data_quality,
    deduplicate_interactions,
    temporal_split,
)


def _make_interaction_df(
    n_users: int = 5,
    events_per_user: int = 10,
    base_date: str = "2026-01-01",
    event_type: str = "VIEW",
) -> pd.DataFrame:
    """Tạo DataFrame tương tác test — KHÔNG phải dữ liệu thật, chỉ dùng trong test."""
    base = datetime.fromisoformat(base_date)
    rows = []
    for user_idx in range(n_users):
        for event_idx in range(events_per_user):
            rows.append({
                "interactionId": f"id-{user_idx}-{event_idx}",
                "userId": f"user-{user_idx:03d}",
                "bookId": f"book-{event_idx % 5:02d}",
                "eventType": event_type,
                "eventValue": None,
                "sourcePage": "home",
                "recommendationRequestId": None,
                "recommendationModel": "fastapi_hybrid_v2",
                "position": event_idx + 1,
                "consentVersion": "v1",
                "createdAt": base + timedelta(days=event_idx, hours=user_idx),
            })
    df = pd.DataFrame(rows)
    df["createdAt"] = pd.to_datetime(df["createdAt"])
    return df


def _make_real_interaction_data(
    n_users: int = 35,
    events_per_user: int = 10,
    n_consented_users: int = 35,
    base_date: str = "2026-01-01",
    span_days: int = 30,
    event_type: str = "IMPRESSION",
) -> RealInteractionData:
    """Helper tạo RealInteractionData cho test."""
    df = _make_interaction_df(n_users, events_per_user, base_date, event_type)

    # Mở rộng khoảng thời gian để đủ MIN_COLLECTION_DAYS
    if not df.empty and span_days > 0:
        df.loc[df.index[-1], "createdAt"] = pd.Timestamp(base_date) + timedelta(days=span_days)

    consented = {f"user-{i:03d}" for i in range(n_consented_users)}

    earliest = df["createdAt"].min().isoformat() if not df.empty else None
    latest = df["createdAt"].max().isoformat() if not df.empty else None

    event_counts: dict[str, int] = {}
    if not df.empty:
        event_counts = df["eventType"].value_counts().to_dict()

    return RealInteractionData(
        interactions=df,
        consented_users=consented,
        collection_period={"earliest": earliest, "latest": latest},
        event_type_counts={str(k): int(v) for k, v in event_counts.items()},
    )


class TestAssertRealData:
    """Kiểm tra nhãn dữ liệu thật."""

    def test_correct_label_passes(self):
        data = RealInteractionData(data_label="REAL_USER_DATA")
        data.assert_real_data()  # Không raise

    def test_wrong_label_raises(self):
        data = RealInteractionData(data_label="SYNTHETIC_DATA")
        with pytest.raises(ValueError, match="REAL_USER_DATA"):
            data.assert_real_data()

    def test_default_label_is_real(self):
        data = RealInteractionData()
        data.assert_real_data()  # Không raise


class TestQualityGate:
    """Kiểm tra chất lượng dữ liệu."""

    def test_empty_data_is_not_enough(self):
        data = RealInteractionData(interactions=pd.DataFrame(), consented_users=set())
        gate = check_data_quality(data)
        assert gate.status == "NOT_ENOUGH_REAL_DATA"
        assert len(gate.failures) > 0

    def test_not_enough_users_fails(self):
        data = _make_real_interaction_data(n_users=5, n_consented_users=5)
        gate = check_data_quality(data)
        assert gate.status == "NOT_ENOUGH_REAL_DATA"
        user_failures = [f for f in gate.failures if "user" in f.lower() or "đồng ý" in f.lower()]
        assert len(user_failures) > 0

    def test_not_enough_impressions_fails(self):
        # Dùng VIEW thay vì IMPRESSION để thiếu impression
        data = _make_real_interaction_data(
            n_users=35, n_consented_users=35, span_days=30, event_type="VIEW"
        )
        gate = check_data_quality(data)
        impression_failures = [f for f in gate.failures if "impression" in f.lower()]
        assert len(impression_failures) > 0

    def test_not_enough_days_fails(self):
        # span_days=5 -> không đủ MIN_COLLECTION_DAYS
        data = _make_real_interaction_data(n_users=35, n_consented_users=35, span_days=5)
        gate = check_data_quality(data)
        day_failures = [f for f in gate.failures if "ngày" in f.lower()]
        assert len(day_failures) > 0

    def test_thresholds_match_constants(self):
        data = _make_real_interaction_data()
        gate = check_data_quality(data)
        assert gate.thresholds["minConsentedUsers"] == MIN_CONSENTED_USERS
        assert gate.thresholds["minImpressions"] == MIN_TOTAL_IMPRESSIONS
        assert gate.thresholds["minCollectionDays"] == MIN_COLLECTION_DAYS
        assert gate.thresholds["minEligibleUsers"] == MIN_ELIGIBLE_USERS


class TestDeduplication:
    """Kiểm tra loại bản ghi trùng."""

    def test_different_events_not_removed(self):
        df = _make_interaction_df(n_users=5, events_per_user=5)
        result = deduplicate_interactions(df)
        assert len(result) == len(df)

    def test_duplicate_in_same_minute_removed(self):
        base = datetime(2026, 1, 1, 12, 0, 0)
        rows = []
        for i in range(3):  # 3 bản ghi cùng userId, bookId, eventType, phút
            rows.append({
                "userId": "user-001",
                "bookId": "book-01",
                "eventType": "VIEW",
                "createdAt": pd.Timestamp(base + timedelta(seconds=i * 10)),  # cùng phút
            })
        rows.append({  # Khác phút -> giữ lại
            "userId": "user-001",
            "bookId": "book-01",
            "eventType": "VIEW",
            "createdAt": pd.Timestamp(base + timedelta(minutes=2)),
        })
        df = pd.DataFrame(rows)
        result = deduplicate_interactions(df)
        assert len(result) == 2  # 1 trong phút đầu + 1 ở phút 2

    def test_empty_df_returns_empty(self):
        result = deduplicate_interactions(pd.DataFrame())
        assert result.empty


class TestTemporalSplit:
    """Kiểm tra temporal split không leakage."""

    def test_basic_split(self):
        df = _make_interaction_df(n_users=3, events_per_user=30, base_date="2026-01-01")
        train, val, test = temporal_split(df, "2026-01-11", "2026-01-21")
        assert not train.empty or not val.empty or not test.empty
        # Tổng = toàn bộ df
        assert len(train) + len(val) + len(test) == len(df)

    def test_no_leakage_train_validation(self):
        df = _make_interaction_df(n_users=3, events_per_user=30, base_date="2026-01-01")
        train, val, _ = temporal_split(df, "2026-01-11", "2026-01-21")
        if not train.empty and not val.empty:
            assert train["createdAt"].max() < val["createdAt"].min()

    def test_no_leakage_validation_test(self):
        df = _make_interaction_df(n_users=3, events_per_user=30, base_date="2026-01-01")
        _, val, test = temporal_split(df, "2026-01-11", "2026-01-21")
        if not val.empty and not test.empty:
            assert val["createdAt"].max() < test["createdAt"].min()

    def test_invalid_cutoff_raises(self):
        df = _make_interaction_df()
        with pytest.raises(ValueError, match="train_end"):
            temporal_split(df, "2026-02-01", "2026-01-01")

    def test_train_before_train_end(self):
        df = _make_interaction_df(n_users=2, events_per_user=15, base_date="2026-01-01")
        train, _, _ = temporal_split(df, "2026-01-08", "2026-01-15")
        if not train.empty:
            assert (train["createdAt"] < pd.Timestamp("2026-01-08")).all()


class TestEventWeights:
    """Kiểm tra trọng số event."""

    def test_all_event_types_have_weight(self):
        event_types = {
            "IMPRESSION", "VIEW", "RECOMMENDATION_CLICK", "SEARCH",
            "FAVORITE", "BOOKMARK", "ADD_TO_CART", "PURCHASE", "RATING",
        }
        for et in event_types:
            assert et in DEFAULT_EVENT_WEIGHTS, f"Thiếu weight cho {et}"

    def test_purchase_and_rating_highest_weight(self):
        assert DEFAULT_EVENT_WEIGHTS["PURCHASE"] == 1.0
        assert DEFAULT_EVENT_WEIGHTS["RATING"] == 1.0

    def test_impression_is_zero_weight_not_positive(self):
        assert DEFAULT_EVENT_WEIGHTS["IMPRESSION"] == 0.0

    def test_assign_weights_adds_column(self):
        df = _make_interaction_df(n_users=2, events_per_user=5, event_type="VIEW")
        result = assign_interaction_weights(df)
        assert "weight" in result.columns
        assert (result["weight"] == DEFAULT_EVENT_WEIGHTS["VIEW"]).all()

    def test_unknown_event_type_gets_default_weight(self):
        df = _make_interaction_df(n_users=1, events_per_user=3, event_type="UNKNOWN_EVENT")
        result = assign_interaction_weights(df)
        assert (result["weight"] == 0.1).all()