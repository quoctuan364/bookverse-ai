"""CLI thực nghiệm validation/ablation/final-test cho recommendation BookVerse."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.evaluation.database import load_evaluation_data  # noqa: E402
from ai_service.evaluation.research import (  # noqa: E402
    DEFAULT_FINAL_TEST_START,
    DEFAULT_VALIDATION_START,
    run_research,
    write_research_outputs,
)
from ai_service.evaluation.runner import database_url_from_environment  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Chọn trọng số trên validation, chạy ablation và khóa final-test."
    )
    parser.add_argument("--validation-start", default=DEFAULT_VALIDATION_START)
    parser.add_argument("--final-test-start", default=DEFAULT_FINAL_TEST_START)
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("outputs/research-evaluation"),
    )
    parser.add_argument("--no-write", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = load_evaluation_data(database_url_from_environment())
    report = run_research(
        data,
        validation_start=args.validation_start,
        final_test_start=args.final_test_start,
    )
    outputs = None
    if not args.no_write:
        outputs = write_research_outputs(report, args.output_root)
    print(
        json.dumps(
            {
                "status": report["status"],
                "database": data.database_name,
                "selectedProfile": report["selectedProfile"],
                "productionWeightsChanged": False,
                "outputs": outputs,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()

