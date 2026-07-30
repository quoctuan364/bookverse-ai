"""Phân tích rating người thật; không tạo hoặc điền rating mẫu."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import UTC, datetime
from pathlib import Path

from ai_service.evaluation.human_relevance import analyze_blinded_ratings


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ratings", type=Path, required=True)
    parser.add_argument("--secret-key", type=Path, required=True)
    parser.add_argument(
        "--output-root", type=Path, default=Path("outputs/human-relevance-analysis")
    )
    args = parser.parse_args()
    report = analyze_blinded_ratings(
        read_csv(args.ratings), read_csv(args.secret_key)
    )
    run_dir = args.output_root / datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    output = run_dir / "human-relevance-analysis.json"
    output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(output)


if __name__ == "__main__":
    main()
