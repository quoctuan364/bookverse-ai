"""
ai_service/evaluation/benchmark_suite.py

Bộ Benchmark Đánh giá Mô hình Gợi ý Sách — Fail-Closed & Tái lập Nghiên cứu

Hỗ trợ 3 nguồn dữ liệu:
1. --data-source database: Kết nối database PostgreSQL test (bookverse_ai_test).
2. --data-source synthetic-artifact: Tải từ file artifact chuẩn 2.200 sách (bookverse_ultra_seed_2200.json).
3. --data-source test-fixture: Chỉ dùng trong unit test (không ghi đè output benchmark chính thức).

Quy trình Đánh giá:
- Temporal Split 3 giai đoạn: Train (< validationCutoff), Validation (validationCutoff -> testCutoff), Test (>= testCutoff).
- Tinh chỉnh và chọn cấu hình tối ưu TRÊN VALIDATION SET (không leakage sang test).
- Khóa cấu hình (Lock Config) và đánh giá duy nhất 1 lần trên Test Set.
- Quality Gate: Đảm bảo số lượng mẫu đủ lớn cho nghiên cứu học thuật.
- Xuất báo cáo chi tiết: JSON, CSV, Manifest, Checksum.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from typing import Any

import pandas as pd

from ai_service import main as production
from ai_service.evaluation.artifact_loader import load_evaluation_data_from_artifact
from ai_service.evaluation.core import (
    COHORTS,
    EVALUATION_VERSION,
    build_behavior_neighbors,
    build_ground_truth,
    calculate_metrics_at_k,
    deduplicate_user_book_events,
    rank_behavior_candidates,
    seeded_random_rank,
    stable_temporal_split,
)
from ai_service.evaluation.database import EvaluationData, load_evaluation_data
from ai_service.evaluation.dynamic_alpha import (
    COLD_WEIGHTS,
    PRODUCTION_WEIGHTS,
    SPARSE_WEIGHTS,
    WARM_WEIGHTS,
    DynamicAlphaThresholds,
    DynamicAlphaWeights,
    get_dynamic_weights,
)
from ai_service.evaluation.hybrid_audit import reciprocal_rank_fusion
from ai_service.evaluation.runner import (
    DEFAULT_CUTOFF,
    DEFAULT_K_VALUES,
    HybridWeights,
    _build_popularity_frame,
    _build_train_feature_events,
    _candidate_books_at_cutoff,
    _empty_frame,
    _production_feature_groups,
    _rank_content,
    _rank_popularity,
    _rank_scored_hybrid,
    _seen_by_user,
    build_positive_events,
    dataset_fingerprint,
    normalize_cutoff,
    score_hybrid_candidates,
)

DEFAULT_VALIDATION_CUTOFF = "2026-05-01T00:00:00"
DEFAULT_TEST_CUTOFF = "2026-06-01T00:00:00"
DEFAULT_ARTIFACT_PATH = "data/json/bookverse_ultra_seed_2200.json"

MIN_ELIGIBLE_USERS = 100
MIN_CANDIDATE_BOOKS = 100
MIN_TEST_POSITIVES = 100

BENCHMARK_ALGORITHMS = (
    "popularity",
    "content",
    "behavior",
    "hybrid_production",
    "hybrid_dynamic_alpha",
    "hybrid_rrf",
    "random_seeded_sanity",
)


@dataclass(frozen=True)
class CandidateConfig:
    name: str
    description: str
    cold_max: int
    sparse_max: int
    cold_weights: DynamicAlphaWeights
    sparse_weights: DynamicAlphaWeights
    warm_weights: DynamicAlphaWeights


CANDIDATE_CONFIGS = [
    CandidateConfig(
        name="hybrid_production_fixed",
        description="Trọng số cố định production hiện tại (12 cat, 6 author, 8 purchase, 3 pop)",
        cold_max=0,
        sparse_max=0,
        cold_weights=PRODUCTION_WEIGHTS,
        sparse_weights=PRODUCTION_WEIGHTS,
        warm_weights=PRODUCTION_WEIGHTS,
    ),
    CandidateConfig(
        name="dynamic_alpha_gated_v1",
        description="Dynamic Alpha phân tầng (Cold: 0, Sparse: 1-4, Warm: >=5)",
        cold_max=0,
        sparse_max=4,
        cold_weights=COLD_WEIGHTS,
        sparse_weights=SPARSE_WEIGHTS,
        warm_weights=WARM_WEIGHTS,
    ),
    CandidateConfig(
        name="dynamic_alpha_gated_v2",
        description="Dynamic Alpha phân tầng nhanh (Cold: 0, Sparse: 1-2, Warm: >=3)",
        cold_max=0,
        sparse_max=2,
        cold_weights=COLD_WEIGHTS,
        sparse_weights=DynamicAlphaWeights(6.0, 3.0, 3.0, 2.5, "sparse"),
        warm_weights=WARM_WEIGHTS,
    ),
]


def run_benchmark_pipeline(
    data: EvaluationData,
    data_source: str,
    source_identifier: str,
    validation_cutoff_str: str = DEFAULT_VALIDATION_CUTOFF,
    test_cutoff_str: str = DEFAULT_TEST_CUTOFF,
    k_values: tuple[int, ...] = DEFAULT_K_VALUES,
    seed: int = 20260714,
    output_dir: Path | None = None,
    enforce_quality_gate: bool = True,
) -> dict[str, Any]:
    """
    Chạy toàn bộ pipeline benchmark 3 giai đoạn:
    1. Validation Tuning
    2. Locked Config Test Evaluation
    3. Metrics & Checksum Export
    """
    val_cutoff = normalize_cutoff(validation_cutoff_str)
    test_cutoff = normalize_cutoff(test_cutoff_str)

    if val_cutoff >= test_cutoff:
        raise ValueError("validationCutoff phải nhỏ hơn testCutoff.")

    all_positives = build_positive_events(data)
    positives_train_val, positives_test = stable_temporal_split(all_positives, test_cutoff)
    positives_train, positives_val = stable_temporal_split(positives_train_val, val_cutoff)

    # Candidate books & seen
    feature_train_full = _build_train_feature_events(data, positives_train_val, test_cutoff)
    seen_full = _seen_by_user(feature_train_full)
    candidate_books_test = _candidate_books_at_cutoff(data, test_cutoff)
    candidate_ids_test = set(candidate_books_test["bookId"].astype(str))

    # Ground truth test
    ground_truth_test, gt_stats_test = build_ground_truth(
        positives_test, seen_full, candidate_ids_test
    )

    # Ground truth validation
    feature_train_val = _build_train_feature_events(data, positives_train, val_cutoff)
    seen_val = _seen_by_user(feature_train_val)
    candidate_books_val = _candidate_books_at_cutoff(data, val_cutoff)
    candidate_ids_val = set(candidate_books_val["bookId"].astype(str))
    ground_truth_val, _ = build_ground_truth(
        positives_val, seen_val, candidate_ids_val
    )

    d_fingerprint = dataset_fingerprint(data)

    manifest = {
        "dataSource": data_source,
        "sourceIdentifier": source_identifier,
        "totalBooks": len(data.books),
        "totalInteractions": len(data.interactions),
        "totalReadingSessions": len(data.reading_sessions),
        "totalBookmarks": len(data.bookmarks),
        "totalReviews": len(data.reviews),
        "totalPurchases": len(data.purchases),
        "totalPositiveEvents": len(all_positives),
        "trainPositives": len(positives_train),
        "validationPositives": len(positives_val),
        "testPositives": len(positives_test),
        "eligibleValidationUsers": len(ground_truth_val),
        "eligibleTestUsers": len(ground_truth_test),
        "candidateBooksCount": len(candidate_ids_test),
        "validationCutoff": validation_cutoff_str,
        "testCutoff": test_cutoff_str,
        "datasetFingerprint": d_fingerprint,
    }

    # In Manifest
    print("=" * 60, file=sys.stderr)
    print("DATASET BENCHMARK MANIFEST", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    for k, v in manifest.items():
        print(f"  {k}: {v}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    # Quality gate
    if enforce_quality_gate:
        if (
            len(ground_truth_test) < MIN_ELIGIBLE_USERS
            or len(candidate_ids_test) < MIN_CANDIDATE_BOOKS
            or len(positives_test) < MIN_TEST_POSITIVES
        ):
            print(
                f"[QUALITY GATE FAILED] Dataset does not meet minimum threshold: "
                f"eligible_users={len(ground_truth_test)}/{MIN_ELIGIBLE_USERS}, "
                f"candidate_books={len(candidate_ids_test)}/{MIN_CANDIDATE_BOOKS}, "
                f"test_positives={len(positives_test)}/{MIN_TEST_POSITIVES}.",
                file=sys.stderr,
            )
            return {
                "status": "NOT_ENOUGH_EVALUATION_DATA",
                "manifest": manifest,
                "reason": "Dataset does not meet minimum quality gate for academic benchmark.",
            }

    # =========================================================================
    # PHASE 1: Validation Tuning
    # =========================================================================
    print("[PHASE 1] Evaluating candidate configurations on Validation Set...", file=sys.stderr)

    val_popularity_df, _ = _build_popularity_frame(data, val_cutoff)
    val_books_pop = production.build_popularity_scores(candidate_books_val, val_popularity_df)
    val_sessions, val_bookmarks, val_interactions, val_purchases = _production_feature_groups(data, val_cutoff)

    validation_results: list[dict[str, Any]] = []
    best_config = CANDIDATE_CONFIGS[0]
    best_val_ndcg = -1.0

    empty_sessions = _empty_frame(["bookId", "title", "authorName", "categoryId", "categoryName", "timeSpent", "sessionCount"])
    empty_bookmarks = _empty_frame(["bookId", "title", "authorName", "categoryId", "categoryName", "bookmarkCount"])
    empty_interactions = _empty_frame(["bookId", "actionType", "title", "authorName", "categoryId", "categoryName", "eventCount"])
    empty_purchases = _empty_frame(["bookId", "title", "authorName", "categoryId", "categoryName", "purchaseCount"])

    if ground_truth_val:
        for candidate in CANDIDATE_CONFIGS:
            val_rankings: dict[str, list[str]] = {}
            for uid in ground_truth_val:
                u_cand = val_books_pop[~val_books_pop["bookId"].astype(str).isin(seen_val.get(uid, set()))]
                sess = val_sessions.get(uid, empty_sessions)
                bkm = val_bookmarks.get(uid, empty_bookmarks)
                inter = val_interactions.get(uid, empty_interactions)
                pur = val_purchases.get(uid, empty_purchases)

                rc, ra = production.build_reading_preference_scores(sess, bkm, inter)
                pc = production.build_purchase_category_scores(pur)

                h_count = len(seen_val.get(uid, set()))
                if h_count <= candidate.cold_max:
                    w = candidate.cold_weights
                elif h_count <= candidate.sparse_max:
                    w = candidate.sparse_weights
                else:
                    w = candidate.warm_weights

                hw = HybridWeights(w.reading_category, w.reading_author, w.purchase_category, w.popularity)
                scored = score_hybrid_candidates(u_cand, rc, ra, pc, hw)
                ranked = _rank_scored_hybrid(scored, 10)
                val_rankings[uid] = [r["bookId"] for r in ranked]

            val_metrics = calculate_metrics_at_k(
                val_rankings, ground_truth_val, len(candidate_ids_val), 10
            )
            ndcg_val = val_metrics.get("ndcg", 0.0) or 0.0
            recall_val = val_metrics.get("recall", 0.0) or 0.0

            validation_results.append({
                "configName": candidate.name,
                "description": candidate.description,
                "validationNdcgAt10": round(ndcg_val, 6),
                "validationRecallAt10": round(recall_val, 6),
            })

            if ndcg_val > best_val_ndcg:
                best_val_ndcg = ndcg_val
                best_config = candidate

    print(f"[PHASE 1 COMPLETE] Best config selected on Validation: {best_config.name} (NDCG@10={best_val_ndcg:.6f})", file=sys.stderr)

    # =========================================================================
    # PHASE 2: Locked Config Test Evaluation
    # =========================================================================
    print("[PHASE 2] Evaluating all algorithms on Test Set (Locked Config)...", file=sys.stderr)

    test_popularity_df, _ = _build_popularity_frame(data, test_cutoff)
    books_with_pop = production.build_popularity_scores(candidate_books_test, test_popularity_df)
    session_groups, bookmark_groups, interaction_groups, purchase_groups = _production_feature_groups(data, test_cutoff)

    behavior_neighbors = build_behavior_neighbors(positives_train_val)
    strong_train_by_user = _seen_by_user(deduplicate_user_book_events(positives_train_val))

    max_k = max(k_values)
    rankings: dict[str, dict[str, list[str]]] = {algo: {} for algo in BENCHMARK_ALGORITHMS}
    timings: dict[str, list[float]] = {algo: [] for algo in BENCHMARK_ALGORITHMS}

    for user_id in sorted(ground_truth_test):
        user_candidates = books_with_pop[
            ~books_with_pop["bookId"].astype(str).isin(seen_full.get(user_id, set()))
        ].copy()
        user_candidate_ids = user_candidates["bookId"].astype(str).tolist()

        sessions = session_groups.get(user_id, empty_sessions)
        bookmarks = bookmark_groups.get(user_id, empty_bookmarks)
        interactions = interaction_groups.get(user_id, empty_interactions)
        purchases = purchase_groups.get(user_id, empty_purchases)

        reading_categories, reading_authors = production.build_reading_preference_scores(
            sessions, bookmarks, interactions
        )
        purchase_categories = production.build_purchase_category_scores(purchases)

        # 1. Popularity
        t0 = perf_counter()
        pop_rank = _rank_popularity(user_candidates, max_k)
        rankings["popularity"][user_id] = pop_rank
        timings["popularity"].append((perf_counter() - t0) * 1000.0)

        # 2. Content-based
        t0 = perf_counter()
        content_rank = _rank_content(
            user_candidates, reading_categories, reading_authors, purchase_categories, max_k
        )
        rankings["content"][user_id] = content_rank
        timings["content"].append((perf_counter() - t0) * 1000.0)

        # 3. Behavior-based
        t0 = perf_counter()
        behavior_rank = rank_behavior_candidates(
            user_candidate_ids, strong_train_by_user.get(user_id, set()), behavior_neighbors, max_k
        )
        rankings["behavior"][user_id] = behavior_rank
        timings["behavior"].append((perf_counter() - t0) * 1000.0)

        # 4. Hybrid Production (Fixed)
        t0 = perf_counter()
        scored_prod = score_hybrid_candidates(
            user_candidates, reading_categories, reading_authors, purchase_categories, None
        )
        prod_rows = _rank_scored_hybrid(scored_prod, max_k)
        rankings["hybrid_production"][user_id] = [r["bookId"] for r in prod_rows]
        timings["hybrid_production"].append((perf_counter() - t0) * 1000.0)

        # 5. Hybrid Dynamic Alpha (Selected Config from Validation)
        t0 = perf_counter()
        hist_count = len(seen_full.get(user_id, set()))
        if hist_count <= best_config.cold_max:
            sel_w = best_config.cold_weights
        elif hist_count <= best_config.sparse_max:
            sel_w = best_config.sparse_weights
        else:
            sel_w = best_config.warm_weights

        custom_weights = HybridWeights(
            sel_w.reading_category, sel_w.reading_author, sel_w.purchase_category, sel_w.popularity
        )
        scored_dyn = score_hybrid_candidates(
            user_candidates, reading_categories, reading_authors, purchase_categories, custom_weights
        )
        dyn_rows = _rank_scored_hybrid(scored_dyn, max_k)
        rankings["hybrid_dynamic_alpha"][user_id] = [r["bookId"] for r in dyn_rows]
        timings["hybrid_dynamic_alpha"].append((perf_counter() - t0) * 1000.0)

        # 6. Hybrid RRF
        t0 = perf_counter()
        source_rankings = {
            "content": content_rank,
            "behavior": behavior_rank,
            "popularity": pop_rank,
        }
        rrf_weights = {"content": 1.0, "behavior": 1.0, "popularity": 0.25}
        rrf_rank = reciprocal_rank_fusion(source_rankings, rrf_weights, rrf_k=60)[:max_k]
        rankings["hybrid_rrf"][user_id] = rrf_rank
        timings["hybrid_rrf"].append((perf_counter() - t0) * 1000.0)

        # 7. Random Seeded Sanity
        t0 = perf_counter()
        rankings["random_seeded_sanity"][user_id] = seeded_random_rank(
            user_candidate_ids, user_id, seed, max_k
        )
        timings["random_seeded_sanity"].append((perf_counter() - t0) * 1000.0)

    interaction_counts = {
        uid: len(seen_full.get(uid, set())) for uid in ground_truth_test
    }
    cohort_users = {
        "all": sorted(ground_truth_test),
        "cold_0": sorted(uid for uid, c in interaction_counts.items() if c == 0),
        "sparse_1_2": sorted(uid for uid, c in interaction_counts.items() if 1 <= c <= 2),
        "warm_3_plus": sorted(uid for uid, c in interaction_counts.items() if c >= 3),
    }

    metrics: dict[str, Any] = {}
    for algo in BENCHMARK_ALGORITHMS:
        metrics[algo] = {}
        for k in k_values:
            metrics[algo][f"k{k}"] = {
                cohort: calculate_metrics_at_k(
                    rankings[algo],
                    ground_truth_test,
                    len(candidate_ids_test),
                    k,
                    user_ids=cohort_users[cohort],
                )
                for cohort in COHORTS
            }

    summary_table: list[dict[str, Any]] = []
    for algo in BENCHMARK_ALGORITHMS:
        for k in k_values:
            for cohort in COHORTS:
                m = metrics[algo][f"k{k}"][cohort]
                if m["status"] == "AVAILABLE":
                    summary_table.append({
                        "algorithm": algo,
                        "k": k,
                        "cohort": cohort,
                        "users": m["users"],
                        "precision": round(m["precision"], 6),
                        "recall": round(m["recall"], 6),
                        "hitRate": round(m["hitRate"], 6),
                        "ndcg": round(m["ndcg"], 6),
                        "mrr": round(m["mrr"], 6),
                        "catalogCoverage": round(m["catalogCoverage"], 6),
                    })

    latencies: dict[str, float] = {
        algo: round(sum(times) / max(len(times), 1), 3)
        for algo, times in timings.items()
    }

    # Promotion Decision Logic
    prod_ndcg_10 = metrics["hybrid_production"]["k10"]["all"]["ndcg"] or 0.0
    dyn_ndcg_10 = metrics["hybrid_dynamic_alpha"]["k10"]["all"]["ndcg"] or 0.0
    pop_ndcg_10 = metrics["popularity"]["k10"]["all"]["ndcg"] or 0.0

    if dyn_ndcg_10 > prod_ndcg_10 and dyn_ndcg_10 >= pop_ndcg_10:
        selection_decision = "PROMOTED"
        no_promotion_reason = None
    else:
        selection_decision = "NO_PROMOTION"
        if dyn_ndcg_10 <= prod_ndcg_10:
            no_promotion_reason = "Dynamic Alpha did not outperform Fixed Production weights on Test Set."
        else:
            no_promotion_reason = "Dynamic Alpha did not outperform Popularity baseline on Test Set."

    report: dict[str, Any] = {
        "benchmarkVersion": "hybrid-benchmark-v2-reproducible",
        "dataLabel": "SYNTHETIC_DATA" if data_source != "test-fixture" else "TEST_FIXTURE",
        "generatedAt": datetime.now(UTC).isoformat(),
        "manifest": manifest,
        "validationTuning": {
            "selectionMetric": "validation_ndcg@10",
            "evaluatedConfigs": validation_results,
            "selectedConfig": {
                "name": best_config.name,
                "description": best_config.description,
                "coldMax": best_config.cold_max,
                "sparseMax": best_config.sparse_max,
            },
        },
        "testEvaluation": {
            "selectionDecision": selection_decision,
            "noPromotionReason": no_promotion_reason,
            "featureFlagDynamicAlpha": os.getenv("HYBRID_DYNAMIC_ALPHA", "false").lower() == "true",
            "cohortSizes": {cohort: len(users) for cohort, users in cohort_users.items()},
            "latenciesMs": latencies,
            "metrics": metrics,
            "summaryTable": summary_table,
        },
    }

    # Checksum tất định
    deterministic_payload = {
        "manifest": manifest,
        "validationTuning": report["validationTuning"],
        "testEvaluationSummary": summary_table,
    }
    canonical = json.dumps(deterministic_payload, ensure_ascii=False, sort_keys=True, default=str)
    report["checksum"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:32]

    # Xuất file nếu output_dir được cung cấp
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        json_path = output_dir / "hybrid_benchmark_results.json"
        csv_path = output_dir / "hybrid_benchmark_metrics.csv"

        json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

        if summary_table:
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(summary_table[0].keys()))
                writer.writeheader()
                writer.writerows(summary_table)

        report["outputPaths"] = {
            "json": str(json_path),
            "csv": str(csv_path),
        }

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Chạy Benchmark Hybrid Recommendation Reproducible")
    parser.add_argument(
        "--data-source",
        choices=["database", "synthetic-artifact", "test-fixture"],
        required=True,
        help="Nguồn dữ liệu đánh giá: database | synthetic-artifact | test-fixture",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", ""),
        help="URL kết nối PostgreSQL database test",
    )
    parser.add_argument(
        "--artifact-path",
        default=DEFAULT_ARTIFACT_PATH,
        help="Đường dẫn tới file artifact JSON (mặc định data/json/bookverse_ultra_seed_2200.json)",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/evaluation",
        help="Thư mục xuất file kết quả JSON và CSV",
    )
    parser.add_argument(
        "--validation-cutoff",
        default=DEFAULT_VALIDATION_CUTOFF,
        help="Thời điểm kết thúc tập train / bắt đầu tập validation",
    )
    parser.add_argument(
        "--test-cutoff",
        default=DEFAULT_TEST_CUTOFF,
        help="Thời điểm kết thúc tập validation / bắt đầu tập test",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=20260714,
        help="Random seed cho sanity baseline",
    )

    args = parser.parse_args()

    # 1. Fail-closed loading
    if args.data_source == "database":
        db_url = args.database_url.strip()
        if not db_url:
            print("[ERROR] --data-source=database requires --database-url or DATABASE_URL env var.", file=sys.stderr)
            return 1
        try:
            print(f"[INFO] Loading evaluation snapshot from database...", file=sys.stderr)
            data = load_evaluation_data(db_url)
            source_id = f"database:{data.database_name}"
        except Exception as err:
            print(f"[FAIL-CLOSED ERROR] Failed to connect to database ({err}). Exiting with code 1.", file=sys.stderr)
            return 1

    elif args.data_source == "synthetic-artifact":
        art_path = Path(args.artifact_path)
        if not art_path.exists():
            print(f"[FAIL-CLOSED ERROR] Artifact not found at {art_path}. Exiting with code 1.", file=sys.stderr)
            return 1
        try:
            print(f"[INFO] Loading evaluation dataset from artifact: {art_path}...", file=sys.stderr)
            data = load_evaluation_data_from_artifact(art_path)
            source_id = str(art_path)
        except Exception as err:
            print(f"[FAIL-CLOSED ERROR] Error reading artifact ({err}). Exiting with code 1.", file=sys.stderr)
            return 1

    elif args.data_source == "test-fixture":
        print("[FAIL-CLOSED ERROR] test-fixture is only allowed in programmatic test context.", file=sys.stderr)
        return 1
    else:
        return 1

    out_dir = Path(args.output_dir)
    results = run_benchmark_pipeline(
        data=data,
        data_source=args.data_source,
        source_identifier=source_id,
        validation_cutoff_str=args.validation_cutoff,
        test_cutoff_str=args.test_cutoff,
        seed=args.seed,
        output_dir=out_dir,
        enforce_quality_gate=True,
    )

    if results.get("status") == "NOT_ENOUGH_EVALUATION_DATA":
        print(f"[BENCHMARK FAILED] {results.get('reason')}", file=sys.stderr)
        return 2

    print(f"Benchmark completed successfully. Checksum: {results['checksum']}")
    print(f"Decision: {results['testEvaluation']['selectionDecision']}")
    if results['testEvaluation']['noPromotionReason']:
        print(f"Reason: {results['testEvaluation']['noPromotionReason']}")
    print(f"JSON output: {results.get('outputPaths', {}).get('json')}")
    print(f"CSV output: {results.get('outputPaths', {}).get('csv')}")

    return 0


if __name__ == "__main__":
    sys.exit(main())