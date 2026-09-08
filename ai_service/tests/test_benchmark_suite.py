"""
Tests cho ai_service/evaluation/benchmark_suite.py

Kiểm tra:
1. Benchmark chạy trọn vẹn và tạo đủ output JSON + CSV
2. Đủ 6 mô hình + baseline random
3. Metrics tại K=5 và K=10
4. Phân nhóm COLD, SPARSE, WARM
5. Checksum tái lập
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ai_service.evaluation.benchmark_suite import (
    BENCHMARK_ALGORITHMS,
    run_benchmark_pipeline,
)
from ai_service.tests.test_evaluation_runner import sample_data


def test_benchmark_suite_generates_all_algorithms_and_metrics(tmp_path: Path) -> None:
    data = sample_data()
    report = run_benchmark_pipeline(
        data=data,
        data_source="test-fixture",
        source_identifier="test_sample_data",
        output_dir=tmp_path,
        enforce_quality_gate=False,
    )

    # 1. Kiểm tra manifest và cấu trúc
    assert report["dataLabel"] == "TEST_FIXTURE"
    assert report["manifest"]["dataSource"] == "test-fixture"
    assert len(report["checksum"]) == 32
    assert "validationTuning" in report
    assert "testEvaluation" in report

    # 2. Kiểm tra test metrics
    metrics = report["testEvaluation"]["metrics"]
    for algo in BENCHMARK_ALGORITHMS:
        assert algo in metrics
        for k in (5, 10):
            assert f"k{k}" in metrics[algo]
            for cohort in ("all", "cold_0", "sparse_1_2", "warm_3_plus"):
                assert cohort in metrics[algo][f"k{k}"]

    # 3. Kiểm tra file output
    json_path = tmp_path / "hybrid_benchmark_results.json"
    csv_path = tmp_path / "hybrid_benchmark_metrics.csv"
    assert json_path.exists()
    assert csv_path.exists()

    loaded = json.loads(json_path.read_text(encoding="utf-8"))
    assert loaded["benchmarkVersion"] == "hybrid-benchmark-v2-reproducible"
    assert len(loaded["testEvaluation"]["summaryTable"]) > 0


def test_benchmark_reproducibility_checksum(tmp_path: Path) -> None:
    data = sample_data()
    r1 = run_benchmark_pipeline(
        data=data,
        data_source="test-fixture",
        source_identifier="test_sample_data",
        output_dir=tmp_path / "run1",
        enforce_quality_gate=False,
    )
    r2 = run_benchmark_pipeline(
        data=data,
        data_source="test-fixture",
        source_identifier="test_sample_data",
        output_dir=tmp_path / "run2",
        enforce_quality_gate=False,
    )
    assert r1["checksum"] == r2["checksum"]