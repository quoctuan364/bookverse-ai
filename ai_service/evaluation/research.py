"""Thực nghiệm trọng số hybrid trên validation, khóa cấu hình rồi đánh giá final.

Module này tuyệt đối không cập nhật trọng số production. Mục đích là tạo bằng
chứng học thuật: ablation, lựa chọn trên validation và một lần đọc final-test.
"""

from __future__ import annotations

import json
import math
import statistics
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from ai_service.evaluation.database import EvaluationData
from ai_service.evaluation.runner import (
    EvaluationConfig,
    HybridWeights,
    PRODUCTION_HYBRID_WEIGHTS,
    run_evaluation,
)


DEFAULT_VALIDATION_START = "2026-06-01T00:00:00"
DEFAULT_FINAL_TEST_START = "2026-06-20T00:00:00"
DEFAULT_SEEDS = (20260714, 20260715, 20260716, 20260717, 20260718)


@dataclass(frozen=True)
class WeightProfile:
    name: str
    weights: HybridWeights
    kind: str


WEIGHT_PROFILES = (
    WeightProfile("production", PRODUCTION_HYBRID_WEIGHTS, "baseline"),
    WeightProfile("no_reading_category", HybridWeights(0, 6, 8, 3), "ablation"),
    WeightProfile("no_reading_author", HybridWeights(12, 0, 8, 3), "ablation"),
    WeightProfile("no_purchase", HybridWeights(12, 6, 0, 3), "ablation"),
    WeightProfile("no_popularity", HybridWeights(12, 6, 8, 0), "ablation"),
    WeightProfile("balanced", HybridWeights(8, 4, 6, 4), "candidate"),
    WeightProfile("content_focused", HybridWeights(12, 8, 2, 2), "candidate"),
    WeightProfile("purchase_focused", HybridWeights(6, 3, 12, 2), "candidate"),
    WeightProfile("popularity_guarded", HybridWeights(8, 4, 4, 8), "candidate"),
    WeightProfile("reading_only", HybridWeights(12, 6, 0, 0), "candidate"),
)


def _before(frame: pd.DataFrame, column: str, cutoff: pd.Timestamp) -> pd.DataFrame:
    return frame[frame[column] < cutoff].copy().reset_index(drop=True)


def truncate_evaluation_data(
    data: EvaluationData, end_exclusive: str | pd.Timestamp
) -> EvaluationData:
    """Ẩn toàn bộ event final khi lựa chọn trọng số trên validation."""
    cutoff = pd.Timestamp(end_exclusive)
    if cutoff.tzinfo is not None:
        cutoff = cutoff.tz_convert("UTC").tz_localize(None)
    return replace(
        data,
        books=_before(data.books, "createdAt", cutoff),
        interactions=_before(data.interactions, "createdAt", cutoff),
        reading_sessions=_before(data.reading_sessions, "createdAt", cutoff),
        bookmarks=_before(data.bookmarks, "createdAt", cutoff),
        favorites=_before(data.favorites, "createdAt", cutoff),
        reviews=_before(data.reviews, "createdAt", cutoff),
        purchases=_before(data.purchases, "createdAt", cutoff),
    )


def metric_at(
    report: dict[str, Any],
    *,
    algorithm: str = "hybrid_production_weights",
    k: int = 10,
    cohort: str = "all",
) -> dict[str, Any]:
    return report["metrics"][algorithm][f"k{k}"][cohort]


def profile_score(row: dict[str, Any]) -> tuple[float, float, float, float, str]:
    """Ưu tiên NDCG, sau đó Recall, Hit Rate và Coverage; tên là tie-break."""
    metric = row["metric"]
    if metric["status"] != "AVAILABLE":
        return (-math.inf, -math.inf, -math.inf, -math.inf, row["profile"])
    return (
        float(metric["ndcg"]),
        float(metric["recall"]),
        float(metric["hitRate"]),
        float(metric["catalogCoverage"]),
        row["profile"],
    )


def choose_validation_profile(rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
    candidates = list(rows)
    if not candidates:
        raise ValueError("Không có kết quả validation để chọn trọng số.")
    available = [row for row in candidates if row["metric"]["status"] == "AVAILABLE"]
    if not available:
        raise ValueError("Mọi profile đều không có metric validation.")
    return max(available, key=profile_score)


def summarize_random_seeds(reports: Iterable[dict[str, Any]]) -> dict[str, Any]:
    metrics = [
        metric_at(report, algorithm="random_seeded_sanity")
        for report in reports
    ]
    available = [metric for metric in metrics if metric["status"] == "AVAILABLE"]
    if not available:
        return {"status": "NOT_AVAILABLE", "runs": 0}

    summary: dict[str, Any] = {"status": "AVAILABLE", "runs": len(available)}
    for key in ("precision", "recall", "hitRate", "ndcg", "mrr", "catalogCoverage"):
        values = [float(metric[key]) for metric in available]
        summary[key] = {
            "mean": statistics.fmean(values),
            "std": statistics.stdev(values) if len(values) > 1 else 0.0,
            "min": min(values),
            "max": max(values),
        }
    return summary


def compare_final_metrics(
    selected: dict[str, Any],
    production: dict[str, Any],
    baselines: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Kết luận triển khai từ final-test, không dùng final để chọn lại profile."""
    available_baselines = {
        name: metric
        for name, metric in baselines.items()
        if metric["status"] == "AVAILABLE"
    }
    if (
        selected["status"] != "AVAILABLE"
        or production["status"] != "AVAILABLE"
        or not available_baselines
    ):
        return {
            "status": "NOT_AVAILABLE",
            "deploymentDecision": "KEEP_PRODUCTION",
            "reason": "Không đủ metric final-test để so sánh.",
        }

    best_baseline_name, best_baseline = max(
        available_baselines.items(),
        key=lambda item: (
            float(item[1]["ndcg"]),
            float(item[1]["recall"]),
            float(item[1]["hitRate"]),
        ),
    )
    metric_keys = ("precision", "recall", "hitRate", "ndcg", "mrr", "catalogCoverage")
    selected_vs_production = {
        key: float(selected[key]) - float(production[key]) for key in metric_keys
    }
    selected_vs_best_baseline = {
        key: float(selected[key]) - float(best_baseline[key]) for key in metric_keys
    }
    beats_production = selected_vs_production["ndcg"] > 0
    beats_best_baseline = selected_vs_best_baseline["ndcg"] > 0
    deploy = beats_production and beats_best_baseline

    return {
        "status": "AVAILABLE",
        "bestBaseline": best_baseline_name,
        "selectedVsProduction": selected_vs_production,
        "selectedVsBestBaseline": selected_vs_best_baseline,
        "selectedBeatsProductionOnNdcg": beats_production,
        "selectedBeatsBestBaselineOnNdcg": beats_best_baseline,
        "deploymentDecision": "PROMOTE_SELECTED" if deploy else "KEEP_PRODUCTION",
        "generalizedFromValidation": deploy,
        "reason": (
            "Profile đã khóa vượt production và baseline tốt nhất trên NDCG@10."
            if deploy
            else (
                "Profile thắng trên validation nhưng không vượt đồng thời production "
                "và baseline tốt nhất ở final-test; không triển khai."
            )
        ),
    }


def run_research(
    data: EvaluationData,
    *,
    validation_start: str = DEFAULT_VALIDATION_START,
    final_test_start: str = DEFAULT_FINAL_TEST_START,
    profiles: tuple[WeightProfile, ...] = WEIGHT_PROFILES,
    seeds: tuple[int, ...] = DEFAULT_SEEDS,
) -> dict[str, Any]:
    """Chọn profile trên validation và chỉ sau đó đánh giá final-test."""
    validation_data = truncate_evaluation_data(data, final_test_start)
    validation_rows: list[dict[str, Any]] = []
    random_reports: list[dict[str, Any]] = []

    for profile in profiles:
        report = run_evaluation(
            validation_data,
            EvaluationConfig(
                cutoff=validation_start,
                k_values=(5, 10),
                seed=seeds[0],
                parity_fixture=None,
                hybrid_weights=profile.weights,
            ),
        )
        validation_rows.append(
            {
                "profile": profile.name,
                "kind": profile.kind,
                "weights": profile.weights.as_dict(),
                "metric": metric_at(report),
                "checksum": report["reproducibilityChecksum"],
            }
        )

    # Random là sanity baseline phụ thuộc seed; hybrid/content/behavior deterministic.
    for seed in seeds:
        random_reports.append(
            run_evaluation(
                validation_data,
                EvaluationConfig(
                    cutoff=validation_start,
                    k_values=(10,),
                    seed=seed,
                    parity_fixture=None,
                    hybrid_weights=PRODUCTION_HYBRID_WEIGHTS,
                ),
            )
        )

    selected = choose_validation_profile(validation_rows)
    selected_profile = next(
        profile for profile in profiles if profile.name == selected["profile"]
    )

    selected_final = run_evaluation(
        data,
        EvaluationConfig(
            cutoff=final_test_start,
            k_values=(5, 10),
            seed=seeds[0],
            parity_fixture=None,
            hybrid_weights=selected_profile.weights,
        ),
    )
    production_final = run_evaluation(
        data,
        EvaluationConfig(
            cutoff=final_test_start,
            k_values=(5, 10),
            seed=seeds[0],
            parity_fixture=None,
            hybrid_weights=PRODUCTION_HYBRID_WEIGHTS,
        ),
    )

    selected_final_metric = metric_at(selected_final)
    production_final_metric = metric_at(production_final)
    final_baselines = {
        algorithm: metric_at(selected_final, algorithm=algorithm)
        for algorithm in ("popularity", "content", "behavior")
    }

    return {
        "status": "PASS",
        "methodology": {
            "validationStart": validation_start,
            "finalTestStart": final_test_start,
            "selectionMetric": "NDCG@10; tie-break Recall, Hit Rate, Coverage",
            "finalReadPolicy": "Profile được khóa trước khi đọc final-test.",
            "productionWeightsChanged": False,
            "seeds": list(seeds),
        },
        "dataset": {
            "database": data.database_name,
            "validationFingerprint": validation_rows[0]["checksum"],
            "finalFingerprint": selected_final["datasetFingerprint"],
        },
        "validationProfiles": validation_rows,
        "selectedProfile": selected,
        "randomSeedSummary": summarize_random_seeds(random_reports),
        "finalTest": {
            "selectedProfile": selected_final_metric,
            "productionProfile": production_final_metric,
            "baselines": final_baselines,
            "cohorts": {
                cohort: metric_at(selected_final, cohort=cohort)
                for cohort in ("cold_0", "sparse_1_2", "warm_3_plus")
            },
            "decision": compare_final_metrics(
                selected_final_metric,
                production_final_metric,
                final_baselines,
            ),
            "selectedChecksum": selected_final["reproducibilityChecksum"],
            "productionChecksum": production_final["reproducibilityChecksum"],
        },
        "limitations": [
            "Dữ liệu synthetic không đại diện trực tiếp hành vi production.",
            "Tập profile được định trước, không phải tìm kiếm siêu tham số liên tục.",
            "Final-test chỉ dùng để báo cáo; không được dùng để chọn lại profile.",
            "Không tự động cập nhật trọng số production từ kết quả nghiên cứu.",
        ],
    }


def write_research_outputs(report: dict[str, Any], output_root: Path) -> dict[str, str]:
    generated_at = datetime.now(UTC)
    run_id = generated_at.strftime("%Y%m%dT%H%M%S%fZ")
    run_dir = output_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)

    json_path = run_dir / "research-evaluation.json"
    markdown_path = run_dir / "summary.md"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# BookVerse AI - Validation, Ablation và Final Test",
        "",
        f"- Profile được chọn: `{report['selectedProfile']['profile']}`",
        "- Trọng số production đã thay đổi: **Không**",
        f"- Validation bắt đầu: `{report['methodology']['validationStart']}`",
        f"- Final-test bắt đầu: `{report['methodology']['finalTestStart']}`",
        "",
        "## Ablation và profile ứng viên trên validation",
        "",
        "| Profile | Loại | NDCG@10 | Recall@10 | Hit Rate@10 | Coverage@10 |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for row in report["validationProfiles"]:
        metric = row["metric"]
        lines.append(
            f"| {row['profile']} | {row['kind']} | {metric.get('ndcg', 0):.6f} | "
            f"{metric.get('recall', 0):.6f} | {metric.get('hitRate', 0):.6f} | "
            f"{metric.get('catalogCoverage', 0):.6f} |"
        )
    final_test = report["finalTest"]
    final_rows = [
        ("Selected (đã khóa)", final_test["selectedProfile"]),
        ("Production", final_test["productionProfile"]),
        *[
            (f"Baseline {name}", metric)
            for name, metric in final_test["baselines"].items()
        ],
    ]
    lines.extend(
        [
            "",
            "## Final-test",
            "",
            "Profile đã khóa trên validation được so với trọng số production và ba baseline.",
            "Không dùng kết quả final để chọn lại trọng số.",
            "",
            "| Phương pháp | NDCG@10 | Recall@10 | Hit Rate@10 | MRR@10 | Coverage@10 |",
            "|---|---:|---:|---:|---:|---:|",
            *[
                f"| {name} | {metric['ndcg']:.6f} | {metric['recall']:.6f} | "
                f"{metric['hitRate']:.6f} | {metric['mrr']:.6f} | "
                f"{metric['catalogCoverage']:.6f} |"
                for name, metric in final_rows
            ],
            "",
            "## Quyết định sau final-test",
            "",
            f"- Quyết định: **{final_test['decision']['deploymentDecision']}**.",
            f"- Baseline tốt nhất theo NDCG@10: "
            f"`{final_test['decision']['bestBaseline']}`.",
            f"- Kết luận: {final_test['decision']['reason']}",
            "- Final-test chỉ dùng để chấp nhận/bác bỏ cấu hình đã khóa; "
            "không quay lại tối ưu trọng số.",
            "",
            "## Random sanity qua nhiều seed",
            "",
            f"- Số lượt: **{report['randomSeedSummary']['runs']}**.",
            f"- NDCG@10 trung bình ± độ lệch chuẩn: "
            f"`{report['randomSeedSummary']['ndcg']['mean']:.6f} ± "
            f"{report['randomSeedSummary']['ndcg']['std']:.6f}`.",
            f"- Hit Rate@10 trung bình ± độ lệch chuẩn: "
            f"`{report['randomSeedSummary']['hitRate']['mean']:.6f} ± "
            f"{report['randomSeedSummary']['hitRate']['std']:.6f}`.",
            "",
            "## Giới hạn",
            "",
            *[f"- {item}" for item in report["limitations"]],
            "",
        ]
    )
    markdown_path.write_text("\n".join(lines), encoding="utf-8")
    return {"runDirectory": str(run_dir), "json": str(json_path), "markdown": str(markdown_path)}
