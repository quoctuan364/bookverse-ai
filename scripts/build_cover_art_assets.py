"""Cắt contact sheet artwork gốc thành 8 nền bìa 2:3 cho BookVerse.

Script chỉ tạo asset mới trong ``public/covers/demo-art-v2`` và không đọc/ghi
database hoặc ghi đè dataset. Contact sheet phải có lưới 4x2, gutter gần đen.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageStat


CATEGORIES = (
    "technology",
    "business",
    "literature",
    "history",
    "health",
    "language",
    "science",
    "travel",
)


def dark_column(image: Image.Image, x: int, threshold: float = 8.0) -> bool:
    return sum(ImageStat.Stat(image.crop((x, 0, x + 1, image.height))).mean) / 3 < threshold


def dark_row(image: Image.Image, y: int, threshold: float = 8.0) -> bool:
    return sum(ImageStat.Stat(image.crop((0, y, image.width, y + 1))).mean) / 3 < threshold


def content_intervals(flags: list[bool]) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    start: int | None = None
    for index, is_dark in enumerate([*flags, True]):
        if not is_dark and start is None:
            start = index
        elif is_dark and start is not None:
            intervals.append((start, index))
            start = None
    return intervals


def crop_to_two_by_three(panel: Image.Image) -> Image.Image:
    target_ratio = 2 / 3
    current_ratio = panel.width / panel.height
    if current_ratio > target_ratio:
        width = round(panel.height * target_ratio)
        left = (panel.width - width) // 2
        panel = panel.crop((left, 0, left + width, panel.height))
    elif current_ratio < target_ratio:
        height = round(panel.width / target_ratio)
        top = (panel.height - height) // 2
        panel = panel.crop((0, top, panel.width, top + height))
    return panel.resize((320, 480), Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGB")
    columns = content_intervals([dark_column(image, x) for x in range(image.width)])
    rows = content_intervals([dark_row(image, y) for y in range(image.height)])
    if len(columns) != 4 or len(rows) != 2:
        raise ValueError(f"Contact sheet phải có 4x2 panel, nhận được {len(columns)}x{len(rows)}")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []
    for index, category in enumerate(CATEGORIES):
        row, column = divmod(index, 4)
        left, right = columns[column]
        top, bottom = rows[row]
        panel = crop_to_two_by_three(image.crop((left, top, right, bottom)))
        destination = args.out_dir / f"{category}.webp"
        panel.save(destination, "WEBP", quality=90, method=6)
        manifest.append(
            {
                "category": category,
                "path": f"/covers/demo-art-v2/{destination.name}",
                "width": panel.width,
                "height": panel.height,
                "dataLabel": "GENERATED_DEMO_ASSET",
                "license": "Original AI-generated artwork for this project; not a publisher cover.",
            }
        )

    (args.out_dir / "manifest.json").write_text(
        json.dumps({"version": "demo-art-v2", "assets": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"status": "VERIFIED", "assets": len(manifest), "size": "320x480"}))


if __name__ == "__main__":
    main()
