"""Tạo phiếu relevance mù và secret mapping từ candidate CSV có thật."""

from __future__ import annotations

import argparse
import csv
from datetime import UTC, datetime
from pathlib import Path

from ai_service.evaluation.human_relevance import prepare_blinded_assignments


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    if not rows:
        raise ValueError("Không có candidate hợp lệ để tạo phiếu.")
    with path.open("x", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", type=Path, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument(
        "--output-root", type=Path, default=Path("outputs/human-relevance")
    )
    args = parser.parse_args()
    with args.candidates.open(encoding="utf-8-sig", newline="") as handle:
        candidates = list(csv.DictReader(handle))
    public, secret = prepare_blinded_assignments(candidates, args.seed)
    run_dir = args.output_root / datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    write_csv(run_dir / "participant-rating-form.csv", public)
    write_csv(run_dir / "organizer-secret-key.csv", secret)
    print(run_dir)


if __name__ == "__main__":
    main()
