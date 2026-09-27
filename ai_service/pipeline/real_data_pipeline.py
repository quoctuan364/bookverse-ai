"""
ai_service/pipeline/real_data_pipeline.py

Pipeline xử lý dữ liệu tương tác người dùng thật từ user_interaction_logs.

Nguyên tắc:
- CHỈ đọc bản ghi có consentVersion IS NOT NULL và consented = true
- KHÔNG trộn với dữ liệu synthetic
- Dán nhãn rõ ràng REAL_USER_DATA trong mọi output
- Trả trạng thái NOT_ENOUGH_REAL_DATA nếu chưa đủ ngưỡng
- Không tạo dữ liệu giả rồi gọi là dữ liệu thật

Ngưỡng minimum (theo INTERACTION_PILOT_PROTOCOL.md):
- MIN_CONSENTED_USERS = 30
- MIN_INTERACTIONS_PER_USER_FOR_MODELING = 3
- MIN_TOTAL_IMPRESSIONS = 500
- MIN_COLLECTION_DAYS = 28
"""

from __future__ import annotations

import hashlib
import json
import os
import warnings
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

import pandas as pd
from sqlalchemy import create_engine, text

# Trọng số implicit feedback cho modeling sở thích tích cực.
# Chú ý: IMPRESSION đại diện cho exposure/cơ hội hiển thị, KHÔNG phải tín hiệu yêu thích tích cực (weight 0.0).
# Có thể dùng impression để tính CTR/exposure hoặc negative candidate theo protocol, không cộng trực tiếp vào preference score.
DEFAULT_EVENT_WEIGHTS: dict[str, float] = {
    "IMPRESSION": 0.0,            # Exposure/hiển thị — không phải positive preference
    "VIEW": 0.3,                   # Mở xem chi tiết
    "SEARCH": 0.2,                 # Tìm kiếm chủ động
    "RECOMMENDATION_CLICK": 0.5,  # Click từ gợi ý
    "BOOKMARK": 0.7,               # Bookmark lưu lại
    "FAVORITE": 0.8,               # Thêm yêu thích
    "ADD_TO_CART": 0.9,            # Thêm giỏ hàng
    "PURCHASE": 1.0,               # Mua — tín hiệu mạnh nhất
    "RATING": 1.0,                 # Đánh giá — tín hiệu mạnh nhất
}

# Ngưỡng minimum operational (không phải statistical power)
MIN_CONSENTED_USERS = 30
MIN_INTERACTIONS_PER_USER_FOR_MODELING = 3
MIN_TOTAL_IMPRESSIONS = 500
MIN_COLLECTION_DAYS = 28
MIN_ELIGIBLE_USERS = 10  # Số user có đủ interaction cho modeling

PIPELINE_VERSION = "real-data-pipeline-v1"


def _normalize_database_url(url: str) -> str:
    """Chuẩn hóa URL: bỏ query param schema=public (Prisma thêm tự động)."""
    if "?" not in url:
        return url
    base, params = url.split("?", 1)
    filtered = "&".join(
        p for p in params.split("&") if not p.startswith("schema=")
    )
    return f"{base}?{filtered}" if filtered else base


@dataclass(frozen=True)
class RealDataQualityGate:
    """Kết quả kiểm tra chất lượng dữ liệu thật."""
    status: str  # "READY_FOR_PIPELINE" | "NOT_ENOUGH_REAL_DATA"
    consented_users: int
    eligible_users: int  # >= MIN_INTERACTIONS_PER_USER_FOR_MODELING
    total_interactions: int
    total_impressions: int
    collection_days: int
    failures: list[str]
    thresholds: dict[str, int]


@dataclass
class RealInteractionData:
    """Container cho dữ liệu tương tác người dùng thật."""
    data_label: str = "REAL_USER_DATA"
    pipeline_version: str = PIPELINE_VERSION
    interactions: pd.DataFrame = field(default_factory=pd.DataFrame)
    consented_users: set[str] = field(default_factory=set)
    collection_period: dict[str, str | None] = field(default_factory=dict)
    event_type_counts: dict[str, int] = field(default_factory=dict)
    quality_gate: RealDataQualityGate | None = None

    def assert_real_data(self) -> None:
        """Bảo vệ khỏi nhầm lẫn với synthetic data."""
        if self.data_label != "REAL_USER_DATA":
            raise ValueError(
                f"Dữ liệu không có nhãn REAL_USER_DATA: {self.data_label}. "
                "Không được dùng làm dữ liệu thật."
            )


def load_real_interaction_data(database_url: str) -> RealInteractionData:
    """
    Đọc tương tác người dùng thật từ bảng user_interaction_logs.

    Chỉ lấy bản ghi từ user đã consent (consented = true, revokedAt IS NULL).
    Không đọc interaction_events (synthetic) để tránh trộn lẫn.

    Sử dụng transaction READ ONLY để không sửa dữ liệu.
    """
    clean_url = _normalize_database_url(database_url)
    engine = create_engine(clean_url, pool_pre_ping=True)

    try:
        with engine.connect() as conn:
            txn = conn.begin()
            try:
                conn.execute(text("SET TRANSACTION READ ONLY"))

                # Chỉ lấy userId đã consent và không thu hồi
                consented_user_ids = pd.read_sql_query(
                    text("""
                        SELECT DISTINCT "userId"
                        FROM user_research_consents
                        WHERE consented = true
                          AND "revokedAt" IS NULL
                          AND "consentVersion" IS NOT NULL
                    """),
                    conn,
                )

                if consented_user_ids.empty:
                    return RealInteractionData(
                        interactions=pd.DataFrame(),
                        consented_users=set(),
                    )

                # Lấy interaction của user đã consent, join để xác nhận lại
                # Không tin consentVersion trong log đơn thuần — xác minh qua bảng consent
                interactions = pd.read_sql_query(
                    text("""
                        SELECT
                          uil.id        AS "interactionId",
                          uil."userId",
                          uil."bookId",
                          uil."eventType",
                          uil."eventValue",
                          uil."sourcePage",
                          uil."recommendationRequestId",
                          uil."recommendationModel",
                          uil."position",
                          uil."consentVersion",
                          uil."createdAt"
                        FROM user_interaction_logs uil
                        INNER JOIN user_research_consents urc
                          ON urc."userId" = uil."userId"
                          AND urc.consented = true
                          AND urc."revokedAt" IS NULL
                        WHERE uil."userId" IS NOT NULL
                          AND uil."consentVersion" IS NOT NULL
                        ORDER BY uil."createdAt", uil.id
                    """),
                    conn,
                )
            finally:
                txn.rollback()
    finally:
        engine.dispose()

    if interactions.empty:
        return RealInteractionData(
            interactions=pd.DataFrame(),
            consented_users=set(),
        )

    # Chuẩn hóa timestamps
    interactions["createdAt"] = pd.to_datetime(interactions["createdAt"], errors="coerce", utc=True)
    interactions["createdAt"] = interactions["createdAt"].dt.tz_localize(None)

    # Bỏ bản ghi có timestamp không hợp lệ
    invalid_ts = interactions["createdAt"].isna()
    if invalid_ts.any():
        warnings.warn(
            f"Bỏ {invalid_ts.sum()} bản ghi có createdAt không hợp lệ.",
            UserWarning,
            stacklevel=2,
        )
        interactions = interactions[~invalid_ts].copy()

    consented_users = set(consented_user_ids["userId"].dropna().astype(str).tolist())

    earliest = interactions["createdAt"].min()
    latest = interactions["createdAt"].max()
    event_type_counts = (
        interactions["eventType"].value_counts().to_dict()
        if not interactions.empty
        else {}
    )

    return RealInteractionData(
        interactions=interactions,
        consented_users=consented_users,
        collection_period={
            "earliest": earliest.isoformat() if pd.notna(earliest) else None,
            "latest": latest.isoformat() if pd.notna(latest) else None,
        },
        event_type_counts={str(k): int(v) for k, v in event_type_counts.items()},
    )


def check_data_quality(data: RealInteractionData) -> RealDataQualityGate:
    """
    Kiểm tra chất lượng dữ liệu thật trước khi modeling.
    Trả NOT_ENOUGH_REAL_DATA nếu chưa đạt ngưỡng.
    """
    data.assert_real_data()

    failures: list[str] = []
    df = data.interactions

    consented_count = len(data.consented_users)
    if consented_count < MIN_CONSENTED_USERS:
        failures.append(
            f"Chưa đủ user đồng ý: {consented_count}/{MIN_CONSENTED_USERS}."
        )

    total_interactions = len(df)
    impressions = int(data.event_type_counts.get("IMPRESSION", 0))

    if impressions < MIN_TOTAL_IMPRESSIONS:
        failures.append(
            f"Chưa đủ impression: {impressions}/{MIN_TOTAL_IMPRESSIONS}."
        )

    # Kiểm tra số ngày thu thập
    collection_days = 0
    if data.collection_period.get("earliest") and data.collection_period.get("latest"):
        t0 = datetime.fromisoformat(data.collection_period["earliest"])
        t1 = datetime.fromisoformat(data.collection_period["latest"])
        collection_days = max(0, (t1 - t0).days)

    if collection_days < MIN_COLLECTION_DAYS:
        failures.append(
            f"Chưa đủ ngày thu thập: {collection_days}/{MIN_COLLECTION_DAYS}."
        )

    # Số user có đủ interaction để modeling
    eligible_users = 0
    if not df.empty and "userId" in df.columns:
        user_counts = df.groupby("userId").size()
        eligible_users = int((user_counts >= MIN_INTERACTIONS_PER_USER_FOR_MODELING).sum())
        if eligible_users < MIN_ELIGIBLE_USERS:
            failures.append(
                f"Chưa đủ user eligible (≥{MIN_INTERACTIONS_PER_USER_FOR_MODELING} interaction): "
                f"{eligible_users}/{MIN_ELIGIBLE_USERS}."
            )

    status = "NOT_ENOUGH_REAL_DATA" if failures else "READY_FOR_PIPELINE"

    return RealDataQualityGate(
        status=status,
        consented_users=consented_count,
        eligible_users=eligible_users,
        total_interactions=total_interactions,
        total_impressions=impressions,
        collection_days=collection_days,
        failures=failures,
        thresholds={
            "minConsentedUsers": MIN_CONSENTED_USERS,
            "minEligibleUsers": MIN_ELIGIBLE_USERS,
            "minImpressions": MIN_TOTAL_IMPRESSIONS,
            "minCollectionDays": MIN_COLLECTION_DAYS,
            "minInteractionsPerUser": MIN_INTERACTIONS_PER_USER_FOR_MODELING,
        },
    )


def deduplicate_interactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Loại bản ghi trùng lặp:
    - Cùng userId + bookId + eventType trong cùng phút (collapse burst clicks)
    - Ưu tiên giữ bản ghi đầu tiên trong window
    """
    if df.empty:
        return df

    work = df.copy()
    work["_minute_bucket"] = work["createdAt"].dt.floor("min")

    # Giữ bản ghi đầu tiên trong cùng (userId, bookId, eventType, phút)
    deduped = work.drop_duplicates(
        subset=["userId", "bookId", "eventType", "_minute_bucket"],
        keep="first",
    ).drop(columns=["_minute_bucket"])

    removed = len(work) - len(deduped)
    if removed > 0:
        warnings.warn(
            f"Loại {removed} bản ghi trùng lặp trong cùng phút.",
            UserWarning,
            stacklevel=2,
        )

    return deduped.reset_index(drop=True)


def assign_interaction_weights(
    df: pd.DataFrame,
    event_weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    """
    Gán trọng số implicit feedback cho mỗi event.
    Trả DataFrame với cột 'weight' mới.
    """
    weights = event_weights or DEFAULT_EVENT_WEIGHTS
    result = df.copy()
    result["weight"] = result["eventType"].map(weights).fillna(0.1)
    return result


def temporal_split(
    df: pd.DataFrame,
    train_end: str,
    validation_end: str,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Chia dữ liệu thành train / validation / test theo thời gian.

    - train: [bắt đầu, train_end)
    - validation: [train_end, validation_end)
    - test: [validation_end, kết thúc]

    Chống leakage: chọn cutoff TRƯỚC khi xem metric.
    """
    train_cut = pd.Timestamp(train_end)
    val_cut = pd.Timestamp(validation_end)

    if train_cut >= val_cut:
        raise ValueError("train_end phải trước validation_end.")

    train = df[df["createdAt"] < train_cut].copy()
    validation = df[(df["createdAt"] >= train_cut) & (df["createdAt"] < val_cut)].copy()
    test = df[df["createdAt"] >= val_cut].copy()

    # Assertion chống leakage
    if not train.empty and not validation.empty:
        assert train["createdAt"].max() < validation["createdAt"].min(), \
            "LEAKAGE: train có timestamp >= validation min."
    if not validation.empty and not test.empty:
        assert validation["createdAt"].max() < test["createdAt"].min(), \
            "LEAKAGE: validation có timestamp >= test min."

    return train, validation, test


def _compute_checksum(data: dict[str, Any]) -> str:
    """Checksum reproducibility dùng SHA-256."""
    canonical = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]


def run_real_data_pipeline(
    database_url: str,
    output_dir: Path,
    train_end: str,
    validation_end: str,
    event_weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    """
    Chạy toàn bộ pipeline dữ liệu thật.

    Trả về report dict có:
    - dataLabel: "REAL_USER_DATA" (không bao giờ là synthetic)
    - status: "NOT_ENOUGH_REAL_DATA" | "PIPELINE_COMPLETE"
    - qualityGate: kết quả kiểm tra ngưỡng
    - splitManifest: thông tin temporal split
    - checksum: reproducibility checksum

    Nếu status = NOT_ENOUGH_REAL_DATA, không xuất file split và không train model.
    """
    # Bước 1: Load dữ liệu thật
    data = load_real_interaction_data(database_url)
    data.assert_real_data()

    # Bước 2: Quality gate
    gate = check_data_quality(data)
    data.quality_gate = gate

    report: dict[str, Any] = {
        "dataLabel": "REAL_USER_DATA",
        "pipelineVersion": PIPELINE_VERSION,
        "generatedAt": datetime.now(UTC).isoformat(),
        "qualityGate": {
            "status": gate.status,
            "consentedUsers": gate.consented_users,
            "eligibleUsers": gate.eligible_users,
            "totalInteractions": gate.total_interactions,
            "totalImpressions": gate.total_impressions,
            "collectionDays": gate.collection_days,
            "failures": gate.failures,
            "thresholds": gate.thresholds,
        },
        "collectionPeriod": data.collection_period,
        "eventTypeCounts": data.event_type_counts,
    }

    if gate.status == "NOT_ENOUGH_REAL_DATA":
        report["status"] = "NOT_ENOUGH_REAL_DATA"
        report["note"] = (
            "Chưa đủ dữ liệu người dùng thật. Không thực hiện split hoặc modeling. "
            "Tiếp tục thu thập theo INTERACTION_PILOT_PROTOCOL.md."
        )
        report["checksum"] = _compute_checksum(report)
        output_dir.mkdir(parents=True, exist_ok=True)
        report_path = output_dir / "real_data_pipeline_report.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )
        return report

    # Bước 3: Xử lý dữ liệu
    df = data.interactions.copy()
    df_deduped = deduplicate_interactions(df)
    df_weighted = assign_interaction_weights(df_deduped, event_weights)

    # Bước 4: Temporal split
    train, validation, test = temporal_split(df_weighted, train_end, validation_end)

    # Bước 5: Tạo output
    output_dir.mkdir(parents=True, exist_ok=True)

    train_path = output_dir / "real_train.csv"
    validation_path = output_dir / "real_validation.csv"
    test_path = output_dir / "real_test.csv"

    # Không export userId thô — hash để ẩn danh
    def _anonymize(frame: pd.DataFrame) -> pd.DataFrame:
        anon = frame.copy()
        if "userId" in anon.columns:
            salt = os.getenv("PIPELINE_ANONYMIZATION_SALT", "bookverse-pipeline-2026")
            anon["anonymizedUserId"] = anon["userId"].apply(
                lambda uid: hashlib.sha256(
                    f"{salt}:{uid}".encode()
                ).hexdigest()[:16]
                if pd.notna(uid)
                else None
            )
            anon = anon.drop(columns=["userId"])
        return anon

    _anonymize(train).to_csv(train_path, index=False, encoding="utf-8")
    _anonymize(validation).to_csv(validation_path, index=False, encoding="utf-8")
    _anonymize(test).to_csv(test_path, index=False, encoding="utf-8")

    split_manifest = {
        "trainEnd": train_end,
        "validationEnd": validation_end,
        "trainRows": len(train),
        "validationRows": len(validation),
        "testRows": len(test),
        "trainUsers": int(train["userId"].nunique()) if not train.empty else 0,
        "validationUsers": int(validation["userId"].nunique()) if not validation.empty else 0,
        "testUsers": int(test["userId"].nunique()) if not test.empty else 0,
        "leakageAssertions": {
            "trainBeforeValidation": True,
            "validationBeforeTest": True,
        },
    }

    report["status"] = "PIPELINE_COMPLETE"
    report["splitManifest"] = split_manifest
    report["outputs"] = {
        "train": str(train_path),
        "validation": str(validation_path),
        "test": str(test_path),
    }
    report["eventWeights"] = event_weights or DEFAULT_EVENT_WEIGHTS
    report["checksum"] = _compute_checksum(report)

    report_path = output_dir / "real_data_pipeline_report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    return report


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="BookVerse Real Data Pipeline")
    parser.add_argument("--database-url", required=True, help="DATABASE_URL production")
    parser.add_argument("--output-dir", required=True, help="Thư mục output")
    parser.add_argument("--train-end", required=True, help="ISO8601: cutoff cuối train")
    parser.add_argument("--validation-end", required=True, help="ISO8601: cutoff cuối validation")
    args = parser.parse_args()

    result = run_real_data_pipeline(
        database_url=args.database_url,
        output_dir=Path(args.output_dir),
        train_end=args.train_end,
        validation_end=args.validation_end,
    )

    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))