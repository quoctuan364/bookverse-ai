"""Chạy Python integration và lưu bằng chứng tái lập không chứa mật khẩu."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_DATABASE = "bookverse_ai_test"


def _run_git(*args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return completed.stdout.strip()


def source_manifest() -> tuple[str, int]:
    """Băm cả file tracked và untracked không bị ignore để nhận diện source."""
    listed = _run_git("ls-files", "--cached", "--others", "--exclude-standard", "-z")
    paths = sorted(path for path in listed.split("\0") if path)
    digest = hashlib.sha256()
    included = 0
    for relative in paths:
        path = PROJECT_ROOT / relative
        if not path.is_file():
            continue
        digest.update(relative.replace("\\", "/").encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
        included += 1
    return digest.hexdigest(), included


def database_identity(database_url: str) -> dict[str, str | int | None]:
    parsed = urlsplit(database_url)
    database = unquote(parsed.path.lstrip("/").split("/", maxsplit=1)[0])
    if database != EXPECTED_DATABASE:
        raise ValueError(
            f"Chỉ được chạy evidence trên {EXPECTED_DATABASE}, không phải {database}."
        )
    return {
        "host": parsed.hostname or "",
        "port": parsed.port or 5432,
        "database": database,
        "schema": "public",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Chạy toàn bộ pytest, bật PostgreSQL integration và lưu evidence."
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("outputs/test-evidence"),
    )
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise ValueError("Thiếu DATABASE_URL.")
    database = database_identity(database_url)
    manifest_hash, source_file_count = source_manifest()
    commit = _run_git("rev-parse", "HEAD")
    dirty = bool(_run_git("status", "--porcelain"))

    started_at = datetime.now(UTC)
    started = time.perf_counter()
    command = [sys.executable, "-m", "pytest", "ai_service/tests", "-q"]
    environment = os.environ.copy()
    environment["RUN_EVALUATION_INTEGRATION"] = "1"
    completed = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    duration = time.perf_counter() - started
    finished_at = datetime.now(UTC)
    status = "PASS" if completed.returncode == 0 else "FAIL"

    run_id = finished_at.strftime("%Y%m%dT%H%M%S%fZ")
    run_dir = args.output_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    report = {
        "status": status,
        "startedAt": started_at.isoformat(),
        "finishedAt": finished_at.isoformat(),
        "durationSeconds": round(duration, 3),
        "commit": commit,
        "workingTreeDirty": dirty,
        "sourceManifestSha256": manifest_hash,
        "sourceFileCount": source_file_count,
        "environment": {
            "RUN_EVALUATION_INTEGRATION": "1",
            "database": database,
            "python": sys.version.split()[0],
        },
        "command": "python -m pytest ai_service/tests -q",
        "exitCode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
    }
    json_path = run_dir / "python-integration-evidence.json"
    markdown_path = run_dir / "python-integration-evidence.md"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    markdown_path.write_text(
        "\n".join(
            [
                "# Bằng chứng Python/PostgreSQL integration",
                "",
                f"- Trạng thái: **{status}**",
                f"- Thời gian UTC: `{started_at.isoformat()}`",
                f"- Commit nền: `{commit}`",
                f"- Working tree dirty: `{str(dirty).lower()}`",
                f"- Source manifest SHA-256: `{manifest_hash}` ({source_file_count} file)",
                f"- Database: `{database['database']}` tại "
                f"`{database['host']}:{database['port']}`",
                "- `RUN_EVALUATION_INTEGRATION=1`",
                f"- Exit code: `{completed.returncode}`",
                "",
                "## Kết quả pytest",
                "",
                "```text",
                completed.stdout.strip(),
                "```",
                "",
                "Mật khẩu và username database không được ghi vào artifact.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(completed.stdout, end="")
    print(
        json.dumps(
            {
                "status": status,
                "json": str(json_path),
                "markdown": str(markdown_path),
                "sourceManifestSha256": manifest_hash,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


if __name__ == "__main__":
    main()
