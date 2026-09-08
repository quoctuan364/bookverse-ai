"""CLI tạo split manifest ba cửa sổ trên bookverse_ai_test read-only."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.evaluation.database import load_evaluation_data  # noqa: E402
from ai_service.evaluation.runner import database_url_from_environment  # noqa: E402
from ai_service.evaluation.split_manifest import (  # noqa: E402
    DEFAULT_FINAL_TEST_START,
    DEFAULT_VALIDATION_START,
    build_three_window_manifest,
    write_split_manifest,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Tạo train/validation/final-test manifest.")
    parser.add_argument("--validation-start", default=DEFAULT_VALIDATION_START)
    parser.add_argument("--final-test-start", default=DEFAULT_FINAL_TEST_START)
    parser.add_argument(
        "--output-root", type=Path, default=Path("outputs/evaluation/splits")
    )
    args = parser.parse_args()
    data = load_evaluation_data(database_url_from_environment())
    manifest = build_three_window_manifest(
        data, args.validation_start, args.final_test_start
    )
    outputs = write_split_manifest(manifest, args.output_root)
    print(
        json.dumps(
            {
                "status": "PASS",
                "checksum": manifest["manifestChecksum"],
                "windows": manifest["windows"],
                "assertions": manifest["assertions"],
                "outputs": outputs,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
