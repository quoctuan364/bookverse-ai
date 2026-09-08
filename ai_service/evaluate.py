"""CLI đánh giá recommendation theo temporal split, không ghi database.

Ví dụ PowerShell:
    $env:DATABASE_URL="postgresql://.../bookverse_ai_test"
    python ai_service/evaluate.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


# Khi chạy trực tiếp file, thêm project root để import package ai_service ổn định.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.evaluation.database import load_evaluation_data  # noqa: E402
from ai_service.evaluation.runner import (  # noqa: E402
    DEFAULT_CUTOFF,
    DEFAULT_K_VALUES,
    EvaluationConfig,
    check_production_parity,
    database_url_from_environment,
    run_evaluation,
    write_evaluation_outputs,
)


DEFAULT_PARITY_FIXTURE = (
    PROJECT_ROOT / "ai_service" / "tests" / "fixtures" / "production_parity_expected.json"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Temporal evaluation read-only cho BookVerse AI recommendation."
    )
    parser.add_argument("--cutoff", default=DEFAULT_CUTOFF)
    parser.add_argument("--k", nargs="+", type=int, default=list(DEFAULT_K_VALUES))
    parser.add_argument("--seed", type=int, default=20260714)
    parser.add_argument("--output-root", type=Path, default=Path("outputs/evaluation"))
    parser.add_argument("--parity-fixture", type=Path, default=DEFAULT_PARITY_FIXTURE)
    parser.add_argument(
        "--parity-only",
        action="store_true",
        help="Chỉ so sánh endpoint production với fixture trước Checkpoint E.",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Chạy evaluation nhưng không tạo JSON/CSV/Markdown.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    database_url = database_url_from_environment()
    # Loader xác nhận đúng bookverse_ai_test và mở transaction READ ONLY.
    data = load_evaluation_data(database_url)

    if args.parity_only:
        result = check_production_parity(args.parity_fixture)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return

    config = EvaluationConfig(
        cutoff=args.cutoff,
        k_values=tuple(args.k),
        seed=args.seed,
        output_root=args.output_root,
        parity_fixture=args.parity_fixture,
    )
    report = run_evaluation(data, config)
    outputs = None if args.no_write else write_evaluation_outputs(report, args.output_root)
    summary = {
        "status": "PASS",
        "database": data.database_name,
        "eligibleUsers": report["statistics"]["eligibleUsers"],
        "candidateBooks": report["statistics"]["candidateBooks"],
        "reproducibilityChecksum": report["reproducibilityChecksum"],
        "productionParity": report["productionParity"],
        "outputs": outputs,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
