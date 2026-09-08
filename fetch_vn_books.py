import csv
import html
import random
import re
import shutil
import time
from pathlib import Path
from typing import Any

import requests


API_URL = "https://www.googleapis.com/books/v1/volumes"
OUTPUT_FILE = Path("data/demo/books.csv")
BACKUP_FILE = Path("data/demo/books.csv.bak")
START_BOOK_INDEX = 21
MAX_RESULTS = 40
PAGES_PER_KEYWORD = 3
REQUEST_TIMEOUT = 20

KEYWORDS = [
    "tiểu thuyết Việt Nam",
    "kinh doanh",
    "tâm lý học",
    "lịch sử Việt Nam",
    "kỹ năng sống",
    "khoa học",
    "giáo dục",
    "văn học Việt Nam",
    "thiếu nhi",
    "khởi nghiệp",
    "quản trị",
    "công nghệ",
]

CSV_FIELDS = [
    "id",
    "title",
    "author",
    "description",
    "price",
    "coverImage",
    "categoryId",
]


def strip_html(raw_text: str) -> str:
    """Google Books đôi khi trả mô tả có thẻ HTML."""
    text = re.sub(r"<[^>]+>", " ", raw_text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_cover_url(url: str) -> str:
    return url.replace("http://", "https://", 1)


def random_price() -> int:
    return random.randrange(50_000, 300_001, 1_000)


def random_category_id() -> str:
    return f"C{random.randint(1, 12):02d}"


def get_first_author(volume_info: dict[str, Any]) -> str:
    authors = volume_info.get("authors")
    if isinstance(authors, list) and authors:
        first_author = str(authors[0]).strip()
        if first_author:
            return first_author

    return "Đang cập nhật"


def get_thumbnail(volume_info: dict[str, Any]) -> str:
    image_links = volume_info.get("imageLinks")
    if not isinstance(image_links, dict):
        return ""

    thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    if not thumbnail:
        return ""

    return normalize_cover_url(str(thumbnail).strip())


def build_book_row(book_number: int, item: dict[str, Any]) -> dict[str, str] | None:
    volume_info = item.get("volumeInfo")
    if not isinstance(volume_info, dict):
        return None

    title = str(volume_info.get("title") or "").strip()
    cover_image = get_thumbnail(volume_info)

    # Thiếu title hoặc ảnh bìa thì dữ liệu demo sẽ khó hiển thị đẹp, bỏ qua.
    if not title or not cover_image:
        return None

    raw_description = str(volume_info.get("description") or "").strip()
    description = strip_html(raw_description) if raw_description else "Chưa có mô tả"

    return {
        "id": f"B{book_number:03d}",
        "title": title,
        "author": get_first_author(volume_info),
        "description": description,
        "price": str(random_price()),
        "coverImage": cover_image,
        "categoryId": random_category_id(),
    }


def fetch_keyword(keyword: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for page in range(PAGES_PER_KEYWORD):
        start_index = page * MAX_RESULTS
        params = {
            "q": keyword,
            "maxResults": MAX_RESULTS,
            "startIndex": start_index,
            "langRestrict": "vi",
            "printType": "books",
        }

        try:
            response = requests.get(API_URL, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as error:
            print(f"[LỖI] Bỏ qua '{keyword}' trang {page + 1}: {error}")
            continue
        except ValueError:
            print(f"[LỖI] API trả JSON không hợp lệ cho '{keyword}' trang {page + 1}.")
            continue

        page_items = payload.get("items", [])
        if not isinstance(page_items, list) or not page_items:
            print(f"[INFO] Không còn dữ liệu cho '{keyword}' ở trang {page + 1}.")
            break

        items.extend(page_items)
        print(f"[OK] '{keyword}' trang {page + 1}: lấy {len(page_items)} sách.")
        time.sleep(0.3)

    return items


def backup_existing_file() -> None:
    if OUTPUT_FILE.exists() and not BACKUP_FILE.exists():
        shutil.copy2(OUTPUT_FILE, BACKUP_FILE)
        print(f"[OK] Đã tạo backup: {BACKUP_FILE}")
    elif OUTPUT_FILE.exists():
        print(f"[INFO] Backup đã tồn tại, giữ nguyên: {BACKUP_FILE}")


def write_csv(rows: list[dict[str, str]]) -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    backup_existing_file()

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    random.seed()
    rows: list[dict[str, str]] = []
    seen_keys: set[str] = set()
    next_book_number = START_BOOK_INDEX

    print("[START] Đang lấy dữ liệu sách tiếng Việt từ Google Books API...")

    for keyword_index, keyword in enumerate(KEYWORDS, start=1):
        print(f"\n[{keyword_index}/{len(KEYWORDS)}] Từ khóa: {keyword}")
        items = fetch_keyword(keyword)

        for item in items:
            row = build_book_row(next_book_number, item)
            if row is None:
                continue

            unique_key = f"{row['title'].lower()}::{row['author'].lower()}"
            if unique_key in seen_keys:
                continue

            seen_keys.add(unique_key)
            rows.append(row)
            next_book_number += 1

        print(f"[PROGRESS] Tổng số sách hợp lệ hiện tại: {len(rows)}")

    if not rows:
        raise RuntimeError("Không lấy được sách hợp lệ nào. Hãy kiểm tra mạng hoặc Google Books API.")

    write_csv(rows)
    print(f"\n[DONE] Đã ghi {len(rows)} sách vào {OUTPUT_FILE} bằng UTF-8 không BOM.")


if __name__ == "__main__":
    main()
