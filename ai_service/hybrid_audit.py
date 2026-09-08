"""CLI chạy audit hybrid rolling temporal, chỉ đọc bookverse_ai_test."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.evaluation.database import load_evaluation_data  # noqa: E402
from ai_service.evaluation.hybrid_audit import (  # noqa: E402
    run_hybrid_audit,
    write_hybrid_audit_outputs,
)
from ai_service.evaluation.runner import database_url_from_environment  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit hybrid bằng rolling temporal backtest, không tune final cũ."
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("outputs/hybrid-audit"),
    )
    args = parser.parse_args()
    data = load_evaluation_data(database_url_from_environment())
    report = run_hybrid_audit(data, project_root=PROJECT_ROOT)
    outputs = write_hybrid_audit_outputs(report, args.output_root)
    print(
        json.dumps(
            {
                "status": report["status"],
                "decision": report["decisionGate"]["decision"],
                "bestBaseline": report["decisionGate"]["bestBaseline"],
                "bestCandidate": report["decisionGate"]["bestCandidate"],
                "outputs": outputs,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
