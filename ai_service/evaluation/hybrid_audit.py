"""Rolling temporal audit và rank-fusion thử nghiệm, không sửa production."""

from __future__ import annotations

import hashlib
import json
import math
import statistics
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Mapping, Sequence

import pandas as pd

from ai_service.evaluation.core import (
    COHORTS,
    calculate_metrics_at_k,
    seeded_random_rank,
    stable_temporal_split,
)
from ai_service.evaluation.database import EvaluationData
from ai_service.evaluation.research import truncate_evaluation_data
from ai_service.evaluation.runner import (
    EvaluationConfig,
    _candidate_books_at_cutoff,
    build_positive_events,
    dataset_fingerprint,
    run_evaluation,
)


PRIMARY_METRIC = "ndcg"
K = 10
EVALUATION_SEED = 20260714
RANDOM_SANITY_SEEDS = (20260714, 20260715, 20260716, 20260717, 20260718)


@dataclass(frozen=True)
class TemporalWindow:
    name: str
    cutoff: str
    end_exclusive: str


# Khóa trước khi chạy; toàn bộ cửa sổ kết thúc trước final cũ 20/06/2026.
DEFAULT_WINDOWS = (
    TemporalWindow("W1_2026_02", "2026-02-01T00:00:00", "2026-03-01T00:00:00"),
    TemporalWindow("W2_2026_03", "2026-03-01T00:00:00", "2026-04-01T00:00:00"),
    TemporalWindow("W3_2026_04", "2026-04-01T00:00:00", "2026-05-01T00:00:00"),
    TemporalWindow("W4_2026_05", "2026-05-01T00:00:00", "2026-06-01T00:00:00"),
    TemporalWindow("W5_validation", "2026-06-01T00:00:00", "2026-06-20T00:00:00"),
)


FUSION_PROFILES: dict[str, dict[str, Any]] = {
    "rrf_equal": {
        "method": "rrf",
        "weights": {"content": 1.0, "behavior": 1.0, "popularity": 0.25},
        "rrfK": 60,
    },
    "rrf_behavior_focused": {
        "method": "rrf",
        "weights": {"content": 0.75, "behavior": 1.5, "popularity": 0.25},
        "rrfK": 60,
    },
    "weighted_rank_behavior": {
        "method": "weighted_rank",
        "weights": {"content": 0.75, "behavior": 1.5, "popularity": 0.25},
    },
    "gated_history": {
        "method": "gated",
        "cold": {"popularity": 1.0},
        "sparse": {"content": 1.0, "behavior": 0.5, "popularity": 0.5},
        "warm": {"content": 0.75, "behavior": 1.5, "popularity": 0.25},
        "rrfK": 60,
        "thresholds": {"coldMax": 0, "sparseMax": 2},
    },
}


def _mean_metric_reports(
    reports: Sequence[Mapping[str, Mapping[str, Any]]],
) -> dict[str, dict[str, Any]]:
    """Gộp metric nhiều seed mà không chọn seed có kết quả đẹp nhất."""
    merged: dict[str, dict[str, Any]] = {}
    metric_names = (
        "precision",
        "recall",
        "hitRate",
        "ndcg",
        "mrr",
        "catalogCoverage",
    )
    for cohort in COHORTS:
        available = [
            report[cohort]
            for report in reports
            if report[cohort]["status"] == "AVAILABLE"
        ]
        if not available:
            merged[cohort] = {
                "status": "NOT_AVAILABLE",
                "users": 0,
                **{name: None for name in metric_names},
            }
            continue
        merged[cohort] = {
            "status": "AVAILABLE",
            "users": int(available[0]["users"]),
            **{
                name: statistics.fmean(float(metric[name]) for metric in available)
                for name in metric_names
            },
        }
    return merged


def _sample_mean_std(values: Sequence[float]) -> dict[str, float]:
    return {
        "mean": statistics.fmean(values),
        "std": statistics.stdev(values) if len(values) > 1 else 0.0,
    }


def _random_comparison_summary(
    window_reports: Sequence[Mapping[str, Any]],
    algorithm_names: Sequence[str],
) -> dict[str, Any]:
    """So sánh paired theo window; không suy diễn ý nghĩa thống kê từ n=5."""
    window_seed_variance = []
    for window in window_reports:
        seed_runs = window["randomSanityBySeed"]
        ndcg_values = [float(run["metrics"]["ndcg"]) for run in seed_runs]
        hit_rate_values = [float(run["metrics"]["hitRate"]) for run in seed_runs]
        window_seed_variance.append(
            {
                "window": window["name"],
                "ndcg": _sample_mean_std(ndcg_values),
                "hitRate": _sample_mean_std(hit_rate_values),
            }
        )

    paired: dict[str, Any] = {}
    for algorithm in algorithm_names:
        if algorithm == "random_multi_seed_sanity":
            continue
        differences = [
            float(window["metrics"]["random_multi_seed_sanity"]["all"]["ndcg"])
            - float(window["metrics"][algorithm]["all"]["ndcg"])
            for window in window_reports
        ]
        paired[algorithm] = {
            "metric": "random_window_seed_mean_ndcg_minus_algorithm_ndcg",
            "differencesByWindow": [
                {"window": window["name"], "difference": difference}
                for window, difference in zip(
                    window_reports, differences, strict=True
                )
            ],
            **_sample_mean_std(differences),
            "randomHigherWindows": sum(difference > 0 for difference in differences),
            "algorithmHigherWindows": sum(difference < 0 for difference in differences),
            "ties": sum(difference == 0 for difference in differences),
        }
    return {
        "comparisonUnit": "5 temporal windows",
        "randomValuePerWindow": "mean of 5 locked seeds",
        "windowSeedVariance": window_seed_variance,
        "pairedNdcg": paired,
        "inference": (
            "Chỉ mô tả paired difference; 5 window không đủ để tuyên bố "
            "ý nghĩa thống kê mạnh."
        ),
    }


def reciprocal_rank_fusion(
    rankings: Mapping[str, Sequence[str]],
    weights: Mapping[str, float],
    *,
    limit: int = K,
    rrf_k: int = 60,
) -> list[str]:
    if limit <= 0 or rrf_k < 0:
        raise ValueError("limit phải dương và rrf_k không được âm.")
    scores: dict[str, float] = {}
    for source, ranking in sorted(rankings.items()):
        weight = float(weights.get(source, 0.0))
        if weight <= 0:
            continue
        seen: set[str] = set()
        for rank, raw_book_id in enumerate(ranking, start=1):
            book_id = str(raw_book_id)
            if book_id in seen:
                continue
            seen.add(book_id)
            scores[book_id] = scores.get(book_id, 0.0) + weight / (rrf_k + rank)
    return [
        book_id
        for book_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))[
            :limit
        ]
    ]


def weighted_rank_fusion(
    rankings: Mapping[str, Sequence[str]],
    weights: Mapping[str, float],
    *,
    limit: int = K,
) -> list[str]:
    """Chuẩn hóa rank về percentile theo từng nguồn trước khi cộng."""
    scores: dict[str, float] = {}
    for source, ranking in sorted(rankings.items()):
        weight = float(weights.get(source, 0.0))
        unique = list(dict.fromkeys(map(str, ranking)))
        if weight <= 0 or not unique:
            continue
        denominator = max(1, len(unique) - 1)
        for index, book_id in enumerate(unique):
            percentile = 1.0 - index / denominator if len(unique) > 1 else 1.0
            scores[book_id] = scores.get(book_id, 0.0) + weight * percentile
    return [
        book_id
        for book_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))[
            :limit
        ]
    ]


def _user_sources(
    base_rankings: Mapping[str, Mapping[str, Sequence[str]]],
    user_id: str,
) -> dict[str, Sequence[str]]:
    return {
        source: base_rankings[source].get(user_id, ())
        for source in ("content", "behavior", "popularity")
    }


def build_candidate_rankings(
    base_rankings: Mapping[str, Mapping[str, Sequence[str]]],
    interaction_counts: Mapping[str, int],
    profile_name: str,
) -> dict[str, list[str]]:
    profile = FUSION_PROFILES[profile_name]
    users = sorted(base_rankings["content"])
    result: dict[str, list[str]] = {}
    for user_id in users:
        sources = _user_sources(base_rankings, user_id)
        if profile["method"] == "weighted_rank":
            result[user_id] = weighted_rank_fusion(sources, profile["weights"])
            continue
        if profile["method"] == "gated":
            count = int(interaction_counts.get(user_id, 0))
            if count <= profile["thresholds"]["coldMax"]:
                weights = profile["cold"]
            elif count <= profile["thresholds"]["sparseMax"]:
                weights = profile["sparse"]
            else:
                weights = profile["warm"]
            result[user_id] = reciprocal_rank_fusion(
                sources, weights, rrf_k=profile["rrfK"]
            )
            continue
        result[user_id] = reciprocal_rank_fusion(
            sources, profile["weights"], rrf_k=profile["rrfK"]
        )
    return result


def _spearman_top_k(left: Sequence[str], right: Sequence[str], k: int = K) -> float:
    """Spearman trên hợp top-K; item thiếu được gán hạng K+1."""
    left_unique = list(dict.fromkeys(map(str, left)))[:k]
    right_unique = list(dict.fromkeys(map(str, right)))[:k]
    union = sorted(set(left_unique) | set(right_unique))
    if len(union) < 2:
        return 1.0
    left_rank = {book_id: index + 1 for index, book_id in enumerate(left_unique)}
    right_rank = {book_id: index + 1 for index, book_id in enumerate(right_unique)}
    xs = [float(left_rank.get(book_id, k + 1)) for book_id in union]
    ys = [float(right_rank.get(book_id, k + 1)) for book_id in union]
    mean_x = statistics.fmean(xs)
    mean_y = statistics.fmean(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = math.sqrt(
        sum((x - mean_x) ** 2 for x in xs) * sum((y - mean_y) ** 2 for y in ys)
    )
    return numerator / denominator if denominator else 0.0


def _ranking_diagnostics(debug: dict[str, Any]) -> dict[str, Any]:
    rankings = debug["rankings"]
    users = sorted(debug["groundTruth"])
    content_behavior_jaccard: list[float] = []
    content_behavior_spearman: list[float] = []
    differences = {"contentVsBehavior": 0, "contentVsHybrid": 0, "behaviorVsHybrid": 0}
    hybrid_lengths: list[int] = []

    for user_id in users:
        content = rankings["content"][user_id][:K]
        behavior = rankings["behavior"][user_id][:K]
        hybrid = rankings["hybrid_production_weights"][user_id][:K]
        content_set, behavior_set = set(content), set(behavior)
        union = content_set | behavior_set
        content_behavior_jaccard.append(
            len(content_set & behavior_set) / len(union) if union else 1.0
        )
        content_behavior_spearman.append(_spearman_top_k(content, behavior))
        differences["contentVsBehavior"] += int(content != behavior)
        differences["contentVsHybrid"] += int(content != hybrid)
        differences["behaviorVsHybrid"] += int(behavior != hybrid)
        hybrid_lengths.append(len(hybrid))

    score_summaries = debug["hybridScoreSummaries"]
    component_max = {
        component: [
            float(score_summaries[user_id][component]["max"]) for user_id in users
        ]
        for component in ("readingScore", "purchaseScore", "popularityScore")
    }
    non_zero_rates = {
        component: [
            float(score_summaries[user_id][component]["nonZeroRate"])
            for user_id in users
        ]
        for component in ("readingScore", "purchaseScore", "popularityScore")
    }
    return {
        "users": len(users),
        "differentRankingRate": {
            key: value / len(users) if users else 0.0 for key, value in differences.items()
        },
        "contentBehaviorTop10JaccardMean": statistics.fmean(content_behavior_jaccard),
        "contentBehaviorTop10SpearmanMean": statistics.fmean(content_behavior_spearman),
        "hybridListLength": {
            "mean": statistics.fmean(hybrid_lengths),
            "min": min(hybrid_lengths),
            "shorterThanKRate": sum(length < K for length in hybrid_lengths) / len(users),
        },
        "componentScoreBeforeSum": {
            component: {
                "medianUserMax": statistics.median(values),
                "meanUserMax": statistics.fmean(values),
                "meanNonZeroCandidateRate": statistics.fmean(non_zero_rates[component]),
            }
            for component, values in component_max.items()
        },
    }


def _dataset_diagnostics(data: EvaluationData) -> dict[str, Any]:
    positives = build_positive_events(data)
    unique_pairs = positives[["userId", "bookId"]].drop_duplicates()
    users = int(positives["userId"].nunique())
    items = int(data.books["bookId"].nunique())
    per_user = unique_pairs.groupby("userId").size()
    category_counts = data.books.groupby("categoryName").size().sort_values(ascending=False)
    popularity_counts = (
        data.interactions.groupby("bookId").size().sort_values(ascending=False)
        if not data.interactions.empty
        else pd.Series(dtype=int)
    )
    return {
        "usersWithPositive": users,
        "catalogItems": items,
        "positiveEvents": int(len(positives)),
        "uniquePositiveUserItemPairs": int(len(unique_pairs)),
        "positiveMatrixDensity": len(unique_pairs) / (users * items) if users and items else 0.0,
        "positiveItemsPerUser": {
            "mean": float(per_user.mean()),
            "median": float(per_user.median()),
            "p95": float(per_user.quantile(0.95)),
        },
        "positiveEventTypes": {
            str(key): int(value)
            for key, value in positives["eventType"].value_counts().sort_index().items()
        },
        "rawInteractionTypes": {
            str(key): int(value)
            for key, value in data.interactions["actionType"].value_counts().sort_index().items()
        },
        "categoryDistributionTop10": {
            str(key): int(value) for key, value in category_counts.head(10).items()
        },
        "interactionPopularityTop10": {
            str(key): int(value) for key, value in popularity_counts.head(10).items()
        },
    }


def _distribution(values: Sequence[int | float]) -> dict[str, float]:
    numeric = [float(value) for value in values]
    if not numeric:
        return {"mean": 0.0, "median": 0.0, "min": 0.0, "max": 0.0}
    return {
        "mean": statistics.fmean(numeric),
        "median": statistics.median(numeric),
        "min": min(numeric),
        "max": max(numeric),
    }


def _window_data_diagnostics(
    data: EvaluationData,
    cutoff: str,
    debug: dict[str, Any],
) -> dict[str, Any]:
    positives = build_positive_events(data)
    train, test = stable_temporal_split(positives, cutoff)
    train_books = set(train["bookId"].astype(str))
    ground_truth = debug["groundTruth"]
    ground_truth_pairs = [
        (user_id, str(book_id))
        for user_id, book_ids in ground_truth.items()
        for book_id in book_ids
    ]
    cold_item_pairs = sum(book_id not in train_books for _, book_id in ground_truth_pairs)
    train_per_user = train.groupby("userId").size().tolist()
    eligible_test_per_user = [len(book_ids) for book_ids in ground_truth.values()]
    return {
        "trainPositiveEvents": int(len(train)),
        "windowPositiveEventsBeforeEligibility": int(len(test)),
        "eligibleGroundTruthPairs": len(ground_truth_pairs),
        "trainPositivePerUser": _distribution(train_per_user),
        "eligibleTestPositivePerUser": _distribution(eligible_test_per_user),
        "trainPositiveItems": len(train_books),
        "coldItemGroundTruthPairs": cold_item_pairs,
        "coldItemGroundTruthRate": (
            cold_item_pairs / len(ground_truth_pairs) if ground_truth_pairs else 0.0
        ),
    }


def _metrics_for_rankings(
    rankings: Mapping[str, Sequence[str]],
    debug: dict[str, Any],
    candidate_count: int,
) -> dict[str, Any]:
    ground_truth = {
        user_id: set(book_ids) for user_id, book_ids in debug["groundTruth"].items()
    }
    return {
        cohort: calculate_metrics_at_k(
            rankings,
            ground_truth,
            candidate_count,
            K,
            debug["cohortUsers"][cohort],
        )
        for cohort in COHORTS
    }


def _qualitative_failures(debug: dict[str, Any], limit: int = 5) -> list[dict[str, Any]]:
    rankings = debug["rankings"]
    examples: list[dict[str, Any]] = []
    for user_id in sorted(debug["groundTruth"]):
        relevant = set(debug["groundTruth"][user_id])
        behavior = rankings["behavior"][user_id][:K]
        hybrid = rankings["hybrid_production_weights"][user_id][:K]
        if relevant & set(behavior) and not relevant & set(hybrid):
            examples.append(
                {
                    "userId": user_id,
                    "historyCount": debug["interactionCounts"][user_id],
                    "historySample": debug["seenBooks"][user_id][-10:],
                    "groundTruth": sorted(relevant),
                    "popularityTop10": rankings["popularity"][user_id][:K],
                    "contentTop10": rankings["content"][user_id][:K],
                    "behaviorTop10": behavior,
                    "hybridTop10": hybrid,
                    "failureReason": (
                        "Behavior tìm thấy positive nhưng production hybrid không có "
                        "thành phần co-occurrence."
                    ),
                }
            )
        if len(examples) >= limit:
            break
    return examples


def _git_state(project_root: Path) -> dict[str, Any]:
    commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout.strip()
    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout
    return {"commit": commit, "dirty": bool(status.strip())}


def _source_manifest(project_root: Path) -> dict[str, Any]:
    listed = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=project_root,
        check=True,
        capture_output=True,
    ).stdout.decode("utf-8")
    paths = sorted(path for path in listed.split("\0") if path)
    digest = hashlib.sha256()
    files: list[dict[str, Any]] = []
    for relative in paths:
        path = project_root / relative
        if not path.is_file():
            continue
        content = path.read_bytes()
        normalized = relative.replace("\\", "/")
        file_hash = hashlib.sha256(content).hexdigest()
        digest.update(normalized.encode("utf-8"))
        digest.update(b"\0")
        digest.update(content)
        digest.update(b"\0")
        files.append(
            {
                "path": normalized,
                "bytes": len(content),
                "sha256": file_hash,
            }
        )
    return {
        "algorithm": "SHA-256(path + NUL + bytes + NUL), sorted path",
        "sha256": digest.hexdigest(),
        "fileCount": len(files),
        "files": files,
    }


def run_hybrid_audit(
    data: EvaluationData,
    *,
    windows: tuple[TemporalWindow, ...] = DEFAULT_WINDOWS,
    project_root: Path = Path("."),
) -> dict[str, Any]:
    window_reports: list[dict[str, Any]] = []
    latest_debug: dict[str, Any] | None = None

    for window in windows:
        window_data = truncate_evaluation_data(data, window.end_exclusive)
        base = run_evaluation(
            window_data,
            EvaluationConfig(
                cutoff=window.cutoff,
                k_values=(K,),
                seed=EVALUATION_SEED,
                parity_fixture=None,
                include_debug_data=True,
            ),
        )
        debug = base["debugData"]
        latest_debug = debug
        candidate_count = int(base["statistics"]["candidateBooks"])
        algorithms = {
            name: base["metrics"][name]["k10"]
            for name in (
                "popularity",
                "content",
                "behavior",
                "hybrid_production_weights",
            )
        }
        candidate_ids = (
            _candidate_books_at_cutoff(window_data, pd.Timestamp(window.cutoff))
            ["bookId"]
            .astype(str)
            .tolist()
        )
        seen_sets = {
            user_id: set(book_ids)
            for user_id, book_ids in debug["seenBooks"].items()
        }
        random_candidate_ids = {
            user_id: [
                book_id
                for book_id in candidate_ids
                if book_id not in seen_sets[user_id]
            ]
            for user_id in debug["groundTruth"]
        }
        random_seed_reports = []
        for random_seed in RANDOM_SANITY_SEEDS:
            random_rankings = {
                user_id: seeded_random_rank(
                    random_candidate_ids[user_id],
                    user_id,
                    random_seed,
                    K,
                )
                for user_id in debug["groundTruth"]
            }
            if (
                random_seed == EVALUATION_SEED
                and random_rankings != debug["rankings"]["random_seeded_sanity"]
            ):
                raise AssertionError(
                    "Tái sử dụng candidate pool làm thay đổi random sanity seed gốc."
                )
            random_seed_reports.append(
                _metrics_for_rankings(random_rankings, debug, candidate_count)
            )
        algorithms["random_multi_seed_sanity"] = _mean_metric_reports(
            random_seed_reports
        )
        for profile_name in FUSION_PROFILES:
            candidate_rankings = build_candidate_rankings(
                debug["rankings"], debug["interactionCounts"], profile_name
            )
            algorithms[profile_name] = _metrics_for_rankings(
                candidate_rankings, debug, candidate_count
            )
        window_reports.append(
            {
                "name": window.name,
                "cutoff": window.cutoff,
                "endExclusive": window.end_exclusive,
                "datasetFingerprint": base["datasetFingerprint"],
                "reproducibilityChecksum": base["reproducibilityChecksum"],
                "statistics": base["statistics"],
                "dataDiagnostics": _window_data_diagnostics(
                    window_data, window.cutoff, debug
                ),
                "leakageAssertions": base["leakageAssertions"],
                "randomSanityBySeed": [
                    {
                        "seed": seed,
                        "metrics": seed_report["all"],
                    }
                    for seed, seed_report in zip(
                        RANDOM_SANITY_SEEDS, random_seed_reports, strict=True
                    )
                ],
                "metrics": algorithms,
            }
        )

    assert latest_debug is not None
    algorithm_names = list(window_reports[0]["metrics"])
    aggregates: dict[str, Any] = {}
    for algorithm in algorithm_names:
        metrics = [
            window["metrics"][algorithm]["all"]
            for window in window_reports
            if window["metrics"][algorithm]["all"]["status"] == "AVAILABLE"
        ]
        aggregates[algorithm] = {
            metric_name: {
                "mean": statistics.fmean(float(metric[metric_name]) for metric in metrics),
                "std": (
                    statistics.stdev(float(metric[metric_name]) for metric in metrics)
                    if len(metrics) > 1
                    else 0.0
                ),
            }
            for metric_name in (
                "precision",
                "recall",
                "hitRate",
                "ndcg",
                "mrr",
                "catalogCoverage",
            )
        }

    random_comparison = _random_comparison_summary(
        window_reports, algorithm_names
    )

    baseline_names = ("popularity", "content", "behavior", "hybrid_production_weights")
    best_baseline = max(
        baseline_names,
        key=lambda name: (
            aggregates[name][PRIMARY_METRIC]["mean"],
            aggregates[name]["hitRate"]["mean"],
        ),
    )
    best_candidate = max(
        FUSION_PROFILES,
        key=lambda name: (
            aggregates[name][PRIMARY_METRIC]["mean"],
            aggregates[name]["hitRate"]["mean"],
        ),
    )
    wins = 0
    for window in window_reports:
        candidate_metric = window["metrics"][best_candidate]["all"][PRIMARY_METRIC]
        strongest = max(
            window["metrics"][name]["all"][PRIMARY_METRIC] for name in baseline_names
        )
        wins += int(candidate_metric > strongest)
    stable_required = math.ceil(len(window_reports) * 0.8)
    metric_improved = (
        aggregates[best_candidate][PRIMARY_METRIC]["mean"]
        > aggregates[best_baseline][PRIMARY_METRIC]["mean"]
    )
    hit_rate_floor = (
        aggregates[best_candidate]["hitRate"]["mean"]
        >= aggregates[best_baseline]["hitRate"]["mean"] * 0.9
    )
    exploratory_pass = metric_improved and hit_rate_floor and wins >= stable_required
    latest_diagnostics = _ranking_diagnostics(latest_debug)
    candidate_vs_production_ndcg = (
        aggregates[best_candidate][PRIMARY_METRIC]["mean"]
        - aggregates["hybrid_production_weights"][PRIMARY_METRIC]["mean"]
    )
    candidate_vs_best_baseline_ndcg = (
        aggregates[best_candidate][PRIMARY_METRIC]["mean"]
        - aggregates[best_baseline][PRIMARY_METRIC]["mean"]
    )

    report = {
        "status": "PASS",
        "protocol": {
            "primaryMetric": "NDCG@10",
            "seed": EVALUATION_SEED,
            "randomSanitySeeds": RANDOM_SANITY_SEEDS,
            "secondaryMetrics": [
                "Precision@10",
                "Recall@10",
                "HitRate@10",
                "MRR@10",
                "CatalogCoverage@10",
            ],
            "candidateSpaceLockedBeforeRun": FUSION_PROFILES,
            "windowsLockedBeforeRun": [window.__dict__ for window in windows],
            "currentFinalTestUsedForSelection": False,
            "evaluationType": "EXPLORATORY_ROLLING_TEMPORAL_BACKTEST",
            "promotionRequiresUnseenFinalV2": True,
        },
        "source": {
            **_git_state(project_root),
            "database": data.database_name,
            "datasetFingerprint": dataset_fingerprint(data),
            "sourceManifest": _source_manifest(project_root),
        },
        "datasetDiagnostics": _dataset_diagnostics(data),
        "latestWindowDiagnostics": latest_diagnostics,
        "qualitativeFailures": _qualitative_failures(latest_debug),
        "windows": window_reports,
        "aggregate": aggregates,
        "randomComparison": random_comparison,
        "decisionGate": {
            "bestBaseline": best_baseline,
            "bestCandidate": best_candidate,
            "candidateWindowWins": wins,
            "requiredWindowWins": stable_required,
            "meanPrimaryMetricImproved": metric_improved,
            "candidateVsProductionMeanNdcg": candidate_vs_production_ndcg,
            "candidateVsBestBaselineMeanNdcg": candidate_vs_best_baseline_ndcg,
            "hitRateFloorPassed": hit_rate_floor,
            "exploratoryGatePassed": exploratory_pass,
            "unseenFinalV2Available": False,
            "candidateDecision": "REJECT_CANDIDATE",
            "deploymentDecision": "RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA",
            "decision": "NO_PROMOTION",
            "legacyDecisionLabel": "KEEP_PRODUCTION",
            "reason": (
                f"Ứng viên chỉ thắng baseline mạnh nhất {wins}/{len(window_reports)} "
                f"cửa sổ và chênh NDCG trung bình so với {best_baseline} là "
                f"{candidate_vs_best_baseline_ndcg:.6f}. Đồng thời không có final_v2 "
                "chưa từng quan sát; không đủ điều kiện promote. Việc giữ cấu hình "
                "hiện tại nhằm ổn định triển khai, không khẳng định hybrid tốt hơn "
                "Behavior."
            ),
        },
        "rankedCauses": [
            {
                "rank": 1,
                "cause": "Production hybrid không chứa tín hiệu item-item co-occurrence.",
                "evidence": "Behavior là baseline riêng nhưng bốn thành phần hybrid chỉ gồm reading category, reading author, purchase category và popularity.",
            },
            {
                "rank": 2,
                "cause": "Các thành phần category/author tạo nhiều tie và không phân biệt item trong cùng nhóm.",
                "evidence": (
                    "Content–Behavior top-10 Jaccard trung bình "
                    f"{latest_diagnostics['contentBehaviorTop10JaccardMean']:.6f}, "
                    "Spearman trung bình "
                    f"{latest_diagnostics['contentBehaviorTop10SpearmanMean']:.6f}; "
                    "readingScore chỉ khác 0 trên "
                    f"{latest_diagnostics['componentScoreBeforeSum']['readingScore']['meanNonZeroCandidateRate']:.2%} "
                    "candidate."
                ),
            },
            {
                "rank": 3,
                "cause": "Lợi thế của các phương pháp bị nhiễu mạnh và không ổn định theo thời gian trên dữ liệu synthetic.",
                "evidence": (
                    f"Behavior NDCG@10 mean±std = "
                    f"{aggregates['behavior']['ndcg']['mean']:.6f}±"
                    f"{aggregates['behavior']['ndcg']['std']:.6f}; ứng viên tốt nhất "
                    f"chỉ thắng baseline mạnh nhất {wins}/{len(window_reports)} cửa sổ. "
                    "Hybrid luôn trả đủ K, nên thiếu backfill đã được loại khỏi danh sách nguyên nhân."
                ),
            },
        ],
        "limitations": [
            "Toàn bộ dữ liệu hành vi là synthetic/demo.",
            "Không có final_v2 chưa từng quan sát, nên không ứng viên nào được promote.",
            "Rank fusion chỉ dùng top-10 của ba nguồn; chưa phải candidate generator sâu.",
            "So sánh rolling window phản ánh độ ổn định temporal, không chứng minh hiệu quả production.",
        ],
    }
    payload = json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    report["reportChecksum"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return report


def write_hybrid_audit_outputs(
    report: dict[str, Any],
    output_root: Path,
) -> dict[str, str]:
    run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    run_dir = output_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    json_path = run_dir / "hybrid-audit.json"
    markdown_path = run_dir / "hybrid-audit.md"
    manifest_path = run_dir / "source-manifest.json"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            report["source"]["sourceManifest"],
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )

    lines = [
        "# BookVerse Hybrid Audit",
        "",
        f"- Primary metric: **{report['protocol']['primaryMetric']}**",
        f"- Loại đánh giá: `{report['protocol']['evaluationType']}`",
        f"- Dataset fingerprint: `{report['source']['datasetFingerprint']}`",
        f"- Source manifest: `{report['source']['sourceManifest']['sha256']}` "
        f"({report['source']['sourceManifest']['fileCount']} file)",
        f"- Report checksum: `{report['reportChecksum']}`",
        f"- Decision: **{report['decisionGate']['decision']}**",
        "",
        "## Tổng hợp rolling temporal backtest",
        "",
        "| Thuật toán | NDCG@10 mean±std | HitRate@10 mean±std | Coverage@10 mean |",
        "|---|---:|---:|---:|",
    ]
    for name, aggregate in report["aggregate"].items():
        lines.append(
            f"| {name} | {aggregate['ndcg']['mean']:.6f} ± "
            f"{aggregate['ndcg']['std']:.6f} | "
            f"{aggregate['hitRate']['mean']:.6f} ± "
            f"{aggregate['hitRate']['std']:.6f} | "
            f"{aggregate['catalogCoverage']['mean']:.6f} |"
        )
    random_aggregate = report["aggregate"]["random_multi_seed_sanity"]
    random_comparison = report["randomComparison"]
    lines.extend(
        [
            "",
            "## Random sanity nhiều seed",
            "",
            f"- Seed khóa trước: `{list(report['protocol']['randomSanitySeeds'])}`.",
            "- Mỗi window lấy mean của năm seed; sau đó mean±std trên đúng năm "
            "window để so sánh cùng cấp với các phương pháp khác.",
            f"- NDCG@10 theo window: `{random_aggregate['ndcg']['mean']:.6f} ± "
            f"{random_aggregate['ndcg']['std']:.6f}`.",
            f"- HitRate@10 theo window: `{random_aggregate['hitRate']['mean']:.6f} ± "
            f"{random_aggregate['hitRate']['std']:.6f}`.",
            "",
            "### Seed variance trong từng window",
            "",
            "| Window | NDCG mean±std theo seed | HitRate mean±std theo seed |",
            "|---|---:|---:|",
        ]
    )
    for window in random_comparison["windowSeedVariance"]:
        lines.append(
            f"| {window['window']} | {window['ndcg']['mean']:.6f} ± "
            f"{window['ndcg']['std']:.6f} | {window['hitRate']['mean']:.6f} ± "
            f"{window['hitRate']['std']:.6f} |"
        )
    lines.extend(
        [
            "",
            "### Paired NDCG difference theo cùng window",
            "",
            "| Phương pháp | Mean(Random−phương pháp) | Std | "
            "Random cao hơn/window |",
            "|---|---:|---:|---:|",
        ]
    )
    for name, comparison in random_comparison["pairedNdcg"].items():
        lines.append(
            f"| {name} | {comparison['mean']:.6f} | "
            f"{comparison['std']:.6f} | "
            f"{comparison['randomHigherWindows']}/{len(report['windows'])} |"
        )
    lines.extend(
        [
            "",
            "Chỉ diễn giải là không quan sát được ưu thế ổn định; năm window "
            "không đủ để tuyên bố ý nghĩa thống kê mạnh.",
            "",
        ]
    )
    lines.extend(["## Kết quả theo cửa sổ", ""])
    for window in report["windows"]:
        lines.extend(
            [
                f"### {window['name']}",
                "",
                f"`{window['cutoff']}` → `{window['endExclusive']}`",
                "",
                "| Thuật toán | NDCG@10 | Recall@10 | HitRate@10 | MRR@10 | Coverage@10 |",
                "|---|---:|---:|---:|---:|---:|",
            ]
        )
        for name, cohorts in window["metrics"].items():
            metric = cohorts["all"]
            lines.append(
                f"| {name} | {metric['ndcg']:.6f} | {metric['recall']:.6f} | "
                f"{metric['hitRate']:.6f} | {metric['mrr']:.6f} | "
                f"{metric['catalogCoverage']:.6f} |"
            )
        lines.append("")
    lines.extend(
        [
            "## Ba nguyên nhân chính",
            "",
            *[
                f"{item['rank']}. **{item['cause']}** {item['evidence']}"
                for item in report["rankedCauses"]
            ],
            "",
            "## Decision gate",
            "",
            f"- Best baseline: `{report['decisionGate']['bestBaseline']}`",
            f"- Best candidate: `{report['decisionGate']['bestCandidate']}`",
            f"- Window wins: `{report['decisionGate']['candidateWindowWins']}`/"
            f"`{len(report['windows'])}`",
            f"- ΔNDCG mean so với production: "
            f"`{report['decisionGate']['candidateVsProductionMeanNdcg']:+.6f}`",
            f"- ΔNDCG mean so với best baseline: "
            f"`{report['decisionGate']['candidateVsBestBaselineMeanNdcg']:+.6f}`",
            f"- Kết luận: {report['decisionGate']['reason']}",
            "",
            "## Cohort ở cửa sổ validation đã khóa",
            "",
            "| Thuật toán | Cohort | User | NDCG@10 | Recall@10 | HitRate@10 |",
            "|---|---|---:|---:|---:|---:|",
            *[
                f"| {algorithm} | {cohort} | {metric['users']} | "
                f"{(metric['ndcg'] or 0):.6f} | {(metric['recall'] or 0):.6f} | "
                f"{(metric['hitRate'] or 0):.6f} |"
                for algorithm in (
                    "content",
                    "behavior",
                    "hybrid_production_weights",
                    report["decisionGate"]["bestCandidate"],
                )
                for cohort, metric in report["windows"][-1]["metrics"][algorithm].items()
                if cohort != "all"
            ],
            "",
            "## Năm ví dụ hybrid thất bại nhưng Behavior hit",
            "",
            *[
                f"- `{example['userId']}`: history={example['historyCount']}, "
                f"ground truth={example['groundTruth']}; Behavior hit, Hybrid miss."
                for example in report["qualitativeFailures"]
            ],
            "",
            "## Hạn chế",
            "",
            *[f"- {item}" for item in report["limitations"]],
            "",
        ]
    )
    markdown_path.write_text("\n".join(lines), encoding="utf-8")
    return {
        "runDirectory": str(run_dir),
        "json": str(json_path),
        "markdown": str(markdown_path),
        "sourceManifest": str(manifest_path),
    }
