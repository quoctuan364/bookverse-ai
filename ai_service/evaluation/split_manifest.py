"""Tạo manifest train/validation/final-test, không tính metric hoặc ghi database."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from ai_service.evaluation.core import (
    cohort_for_interaction_count,
    stable_three_way_temporal_split,
)
from ai_service.evaluation.database import EvaluationData
from ai_service.evaluation.runner import build_positive_events, dataset_fingerprint


DEFAULT_VALIDATION_START = "2026-06-01T00:00:00"
DEFAULT_FINAL_TEST_START = "2026-06-20T00:00:00"
SPLIT_VERSION = "three-window-temporal-v1"


def _range(frame: pd.DataFrame) -> dict[str, str | None]:
    if frame.empty:
        return {"min": None, "max": None}
    return {
        "min": frame["timestamp"].min().isoformat(),
        "max": frame["timestamp"].max().isoformat(),
    }


def _window_stats(frame: pd.DataFrame) -> dict[str, Any]:
    return {
        "events": int(len(frame)),
        "users": int(frame["userId"].nunique()),
        "books": int(frame["bookId"].nunique()),
        "userBookPairs": int(frame[["userId", "bookId"]].drop_duplicates().shape[0]),
        "timeRange": _range(frame),
    }


def build_three_window_manifest(
    data: EvaluationData,
    validation_start: str = DEFAULT_VALIDATION_START,
    final_test_start: str = DEFAULT_FINAL_TEST_START,
) -> dict[str, Any]:
    positives = build_positive_events(data)
    train, validation, final_test = stable_three_way_temporal_split(
        positives, validation_start, final_test_start
    )
    train_books_by_user = (
        train.groupby("userId")["bookId"].nunique().to_dict() if not train.empty else {}
    )
    evaluation_users = sorted(set(validation["userId"]) | set(final_test["userId"]))
    cohorts = {"cold_0": 0, "sparse_1_2": 0, "warm_3_plus": 0}
    for user_id in evaluation_users:
        cohort = cohort_for_interaction_count(int(train_books_by_user.get(user_id, 0)))
        cohorts[cohort] += 1

    event_sets = [set(frame["eventId"]) for frame in (train, validation, final_test)]
    overlap = sum(
        len(event_sets[left] & event_sets[right])
        for left in range(3)
        for right in range(left + 1, 3)
    )
    assertions = {
        "trainBeforeValidation": bool(train["timestamp"].max() < validation["timestamp"].min()),
        "validationBeforeFinalTest": bool(
            validation["timestamp"].max() < final_test["timestamp"].min()
        ),
        "crossWindowEventIdOverlap": overlap,
        "trainEventsAtOrAfterValidationStart": int(
            (train["timestamp"] >= pd.Timestamp(validation_start)).sum()
        ),
        "validationEventsAtOrAfterFinalTestStart": int(
            (validation["timestamp"] >= pd.Timestamp(final_test_start)).sum()
        ),
    }
    if not all(
        [
            assertions["trainBeforeValidation"],
            assertions["validationBeforeFinalTest"],
            overlap == 0,
            assertions["trainEventsAtOrAfterValidationStart"] == 0,
            assertions["validationEventsAtOrAfterFinalTestStart"] == 0,
        ]
    ):
        raise AssertionError("Three-window leakage assertion thất bại.")

    deterministic = {
        "splitVersion": SPLIT_VERSION,
        "databaseProfile": data.database_name,
        "datasetFingerprint": dataset_fingerprint(data),
        "validationStart": pd.Timestamp(validation_start).isoformat(),
        "finalTestStart": pd.Timestamp(final_test_start).isoformat(),
        "windows": {
            "train": _window_stats(train),
            "validation": _window_stats(validation),
            "finalTest": _window_stats(final_test),
        },
        "cohorts": cohorts,
        "assertions": assertions,
        "policy": {
            "cutoffSelection": "Chọn theo phân bố thời gian/count, không dựa trên metric.",
            "modelSelectionWindow": "validation",
            "finalTestUsage": "Chỉ đánh giá sau khi khóa model; F1 không tính final-test metric.",
            "checkpointETestPreviouslyViewed": True,
            "finalTestIsUnseen": False,
            "unseenPolicy": "Cần log instrumented phát sinh sau F1 để có test cuối thực sự unseen.",
        },
    }
    payload = json.dumps(
        deterministic, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return {
        **deterministic,
        "manifestChecksum": hashlib.sha256(payload).hexdigest(),
    }


def write_split_manifest(manifest: dict[str, Any], output_root: Path) -> dict[str, str]:
    generated_at = datetime.now(UTC)
    run_id = (
        generated_at.strftime("%Y%m%dT%H%M%S%fZ")
        + "-"
        + manifest["manifestChecksum"][:12]
    )
    directory = output_root / run_id
    directory.mkdir(parents=True, exist_ok=False)
    json_path = directory / "split-manifest.json"
    markdown_path = directory / "summary.md"
    output = {
        **manifest,
        "run": {"runId": run_id, "generatedAt": generated_at.isoformat()},
    }
    json_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    lines = [
        "# Three-window Temporal Split",
        "",
        f"- Checksum: `{manifest['manifestChecksum']}`",
        f"- Validation start: `{manifest['validationStart']}`",
        f"- Final-test start: `{manifest['finalTestStart']}`",
        "- F1 không tính hoặc tune final-test metric.",
        "- Final test hiện không còn unseen vì khoảng thời gian này đã được xem ở Checkpoint E.",
        "",
        "| Window | Events | Users | Books | User–Book |",
        "|---|---:|---:|---:|---:|",
    ]
    for key, label in (("train", "Train"), ("validation", "Validation"), ("finalTest", "Final test")):
        stats = manifest["windows"][key]
        lines.append(
            f"| {label} | {stats['events']} | {stats['users']} | {stats['books']} | {stats['userBookPairs']} |"
        )
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {"directory": str(directory), "json": str(json_path), "markdown": str(markdown_path)}
