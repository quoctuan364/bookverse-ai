"""Phân tích CSV UAT thật và tạo JSON/Markdown mới, không ghi đè input."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.evaluation.uat import analyze_uat, read_uat_csv  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Phân tích task success và SUS từ UAT thật.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--output-root", type=Path, default=Path("outputs/uat"))
    args = parser.parse_args()

    result = analyze_uat(read_uat_csv(args.csv_path))
    run_dir = args.output_root / datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    json_path = run_dir / "uat-summary.json"
    markdown_path = run_dir / "uat-summary.md"
    json_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    sus = result["sus"]
    lines = [
        "# Kết quả UAT BookVerse",
        "",
        f"- Người tham gia: **{result['participants']}**",
        f"- Lượt thực hiện task: **{result['taskAttempts']}**",
        f"- Quy mô nghiên cứu: **{result['studyScale']}**",
        f"- Người hoàn thành đủ 6 task: "
        f"**{result['protocolCompleteness']['completeParticipants']}**",
        f"- SUS trung bình: **{sus['mean']:.2f}/100**",
        f"- SUS trung vị: **{sus['median']:.2f}/100**",
        f"- CI 95% của SUS trung bình: "
        f"**{sus['ci95Low']:.2f}–{sus['ci95High']:.2f}**"
        if sus["ci95Low"] is not None
        else "- CI 95% của SUS: **chưa đủ mẫu để tính**",
        "",
        "## Kết quả theo task",
        "",
        "| Task | Lượt | Thành công | Trung vị (giây) | Lỗi TB | Trợ giúp TB |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for task, metric in result["tasks"].items():
        lines.append(
            f"| {task} | {metric['attempts']} | {metric['successRate']:.1%} | "
            f"{metric['medianDurationSeconds']:.1f} | {metric['averageErrors']:.2f} | "
            f"{metric['averageAssistance']:.2f} |"
        )
    lines.extend(
        [
            "",
            "## So sánh thiết bị",
            "",
            "| Thiết bị | Người | Lượt task | Thành công | Trung vị (giây) |",
            "|---|---:|---:|---:|---:|",
            *[
                f"| {device} | {metric['participants']} | {metric['attempts']} | "
                f"{metric['successRate']:.1%} | {metric['medianDurationSeconds']:.1f} |"
                for device, metric in result["devices"].items()
            ],
            "",
            "## Lưu ý diễn giải",
            "",
            result["interpretationNote"],
            "",
        ]
    )
    markdown_path.write_text("\n".join(lines), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "PASS",
                "participants": result["participants"],
                "json": str(json_path),
                "markdown": str(markdown_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
