"""CLI nhỏ để TypeScript kiểm tra parity taxonomy với Python."""

from __future__ import annotations

import json

from ai_service.evaluation.taxonomy import taxonomy_manifest


if __name__ == "__main__":
    print(json.dumps(taxonomy_manifest(), ensure_ascii=False, sort_keys=True))
