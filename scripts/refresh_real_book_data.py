"""Làm mới dữ liệu sách demo bằng các đầu sách thật hơn.

Script này giữ nguyên mã sách B001-B020 để không làm gãy interactions,
orders, reviews và listings đang có trong demo. Trước khi ghi file mới,
script luôn backup CSV cũ vào data/backups/real_books_<timestamp>.

Chạy:
    python scripts/refresh_real_book_data.py
"""

from __future__ import annotations

import csv
import html
import json
import re
import shutil
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data" / "demo"
BACKUP_ROOT = ROOT_DIR / "data" / "backups"
GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"
REQUEST_TIMEOUT_SECONDS = 15

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FALLBACK_COVER_URLS: dict[str, str] = {
    "B001": "https://covers.openlibrary.org/b/isbn/9780134610993-L.jpg",
    "B002": "https://covers.openlibrary.org/b/isbn/9783319296579-L.jpg",
    "B003": "https://covers.openlibrary.org/b/isbn/9781492056355-L.jpg",
    "B004": "https://covers.openlibrary.org/b/isbn/9781492051725-L.jpg",
    "B005": "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
    "B006": "https://covers.openlibrary.org/b/isbn/9781098104030-L.jpg",
    "B007": "https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg",
    "B008": "https://covers.openlibrary.org/b/isbn/9781451686586-L.jpg",
    "B009": "https://covers.openlibrary.org/b/isbn/9780465050659-L.jpg",
    "B010": "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    "B011": "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
    "B012": "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
    "B013": "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg",
    "B014": "https://covers.openlibrary.org/b/isbn/9780345472328-L.jpg",
    "B015": "https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg",
    "B016": "https://covers.openlibrary.org/b/isbn/9781098125974-L.jpg",
    "B017": "https://covers.openlibrary.org/b/isbn/9781119002253-L.jpg",
    "B018": "https://covers.openlibrary.org/b/isbn/9780321884497-L.jpg",
    "B019": "https://covers.openlibrary.org/b/isbn/9781400064281-L.jpg",
    "B020": "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
}


@dataclass(frozen=True)
class CuratedBook:
    book_id: str
    query: str
    title: str
    author: str
    genre: str
    tags: str
    level: str
    book_format: str
    price: int
    rating: float
    pages: int
    publish_year: int
    is_ebook: int
    description: str


CURATED_BOOKS: list[CuratedBook] = [
    CuratedBook(
        "B001",
        "Artificial Intelligence A Modern Approach Stuart Russell Peter Norvig",
        "Artificial Intelligence: A Modern Approach",
        "Stuart Russell, Peter Norvig",
        "Trí tuệ nhân tạo",
        "AI;machine learning;agent;search;logic",
        "Nâng cao",
        "both",
        245000,
        4.8,
        1136,
        2021,
        1,
        "Giáo trình kinh điển về trí tuệ nhân tạo, phù hợp để trình bày nền tảng thuật toán, tìm kiếm, suy luận và học máy trong đồ án.",
    ),
    CuratedBook(
        "B002",
        "Recommender Systems The Textbook Charu Aggarwal",
        "Recommender Systems: The Textbook",
        "Charu C. Aggarwal",
        "Trí tuệ nhân tạo",
        "recommendation;collaborative filtering;content-based;hybrid;ranking",
        "Nâng cao",
        "ebook",
        229000,
        4.7,
        498,
        2016,
        1,
        "Tài liệu chuyên sâu về hệ gợi ý, bao gồm collaborative filtering, content-based recommendation, đánh giá mô hình và các biến thể hybrid.",
    ),
    CuratedBook(
        "B003",
        "Fluent Python Luciano Ramalho",
        "Fluent Python",
        "Luciano Ramalho",
        "Lập trình",
        "python;clean code;data model;async;oop",
        "Trung cấp",
        "both",
        189000,
        4.7,
        1012,
        2022,
        1,
        "Cuốn sách giúp lập trình viên hiểu Python sâu hơn, viết code rõ ràng, tận dụng data model, function, class và async.",
    ),
    CuratedBook(
        "B004",
        "Learning React Alex Banks Eve Porcello",
        "Learning React",
        "Alex Banks, Eve Porcello",
        "Lập trình",
        "react;frontend;typescript;component;web",
        "Trung cấp",
        "ebook",
        169000,
        4.5,
        350,
        2020,
        1,
        "Tài liệu thực tế để hiểu component, state, hooks và cách xây dựng giao diện web hiện đại bằng React.",
    ),
    CuratedBook(
        "B005",
        "Designing Data-Intensive Applications Martin Kleppmann",
        "Designing Data-Intensive Applications",
        "Martin Kleppmann",
        "Dữ liệu",
        "database;distributed systems;storage;consistency;scalability",
        "Nâng cao",
        "paper",
        259000,
        4.9,
        616,
        2017,
        0,
        "Một trong những sách nền tảng về hệ thống dữ liệu, giúp giải thích storage, replication, partitioning và consistency.",
    ),
    CuratedBook(
        "B006",
        "Python for Data Analysis Wes McKinney",
        "Python for Data Analysis",
        "Wes McKinney",
        "Dữ liệu",
        "python;pandas;numpy;data cleaning;analysis",
        "Trung cấp",
        "both",
        175000,
        4.6,
        579,
        2022,
        1,
        "Sách thực hành xử lý dữ liệu bằng pandas và NumPy, phù hợp cho phần phân tích hành vi người dùng và dữ liệu recommendation.",
    ),
    CuratedBook(
        "B007",
        "The Lean Startup Eric Ries",
        "The Lean Startup",
        "Eric Ries",
        "Kinh doanh",
        "startup;mvp;business;validation;growth",
        "Cơ bản",
        "paper",
        139000,
        4.5,
        336,
        2011,
        0,
        "Cuốn sách kinh điển về xây dựng MVP, kiểm chứng giả thuyết sản phẩm và cải tiến theo dữ liệu người dùng.",
    ),
    CuratedBook(
        "B008",
        "Contagious Why Things Catch On Jonah Berger",
        "Contagious: Why Things Catch On",
        "Jonah Berger",
        "Marketing",
        "marketing;word of mouth;viral;consumer behavior;content",
        "Cơ bản",
        "ebook",
        128000,
        4.4,
        256,
        2013,
        1,
        "Giải thích vì sao một ý tưởng, sản phẩm hoặc nội dung có thể lan truyền, hữu ích cho module marketplace và community.",
    ),
    CuratedBook(
        "B009",
        "The Design of Everyday Things Don Norman",
        "The Design of Everyday Things",
        "Don Norman",
        "Thiết kế",
        "ux;product design;usability;interface;human-centered design",
        "Trung cấp",
        "both",
        149000,
        4.6,
        368,
        2013,
        1,
        "Tài liệu nền tảng về thiết kế trải nghiệm người dùng, affordance, feedback và cách tạo sản phẩm dễ dùng.",
    ),
    CuratedBook(
        "B010",
        "Atomic Habits James Clear",
        "Atomic Habits",
        "James Clear",
        "Kỹ năng",
        "habit;productivity;self improvement;behavior;goal",
        "Cơ bản",
        "both",
        118000,
        4.8,
        320,
        2018,
        1,
        "Cuốn sách nổi tiếng về xây dựng thói quen nhỏ, cải thiện bản thân và duy trì tiến bộ bền vững.",
    ),
    CuratedBook(
        "B011",
        "The Psychology of Money Morgan Housel",
        "The Psychology of Money",
        "Morgan Housel",
        "Tài chính",
        "money;personal finance;investing;behavior;wealth",
        "Cơ bản",
        "paper",
        132000,
        4.7,
        256,
        2020,
        0,
        "Một góc nhìn dễ hiểu về tài chính cá nhân, hành vi tiền bạc, tiết kiệm, đầu tư và cách ra quyết định dài hạn.",
    ),
    CuratedBook(
        "B012",
        "Thinking Fast and Slow Daniel Kahneman",
        "Thinking, Fast and Slow",
        "Daniel Kahneman",
        "Tâm lý học",
        "psychology;behavior;decision making;cognitive bias;thinking",
        "Trung cấp",
        "ebook",
        158000,
        4.6,
        499,
        2011,
        1,
        "Tác phẩm kinh điển về hai hệ thống tư duy, thiên kiến nhận thức và cách con người ra quyết định.",
    ),
    CuratedBook(
        "B013",
        "The Alchemist Paulo Coelho",
        "The Alchemist",
        "Paulo Coelho",
        "Văn học",
        "văn học;tiểu thuyết;triết lý;hành trình;kinh điển",
        "Cơ bản",
        "both",
        98000,
        4.6,
        208,
        1988,
        1,
        "Tiểu thuyết nổi tiếng về hành trình theo đuổi ước mơ, phù hợp với nhóm độc giả thích văn học truyền cảm hứng.",
    ),
    CuratedBook(
        "B014",
        "Mindset The New Psychology of Success Carol Dweck",
        "Mindset: The New Psychology of Success",
        "Carol S. Dweck",
        "Giáo dục",
        "education;growth mindset;learning;motivation;psychology",
        "Cơ bản",
        "ebook",
        125000,
        4.5,
        320,
        2006,
        1,
        "Cuốn sách nổi tiếng về tư duy phát triển, động lực học tập và cách giáo dục ảnh hưởng đến năng lực cá nhân.",
    ),
    CuratedBook(
        "B015",
        "Zero to One Peter Thiel",
        "Zero to One",
        "Peter Thiel, Blake Masters",
        "Khởi nghiệp",
        "startup;innovation;business model;monopoly;technology",
        "Cơ bản",
        "paper",
        135000,
        4.5,
        224,
        2014,
        0,
        "Sách khởi nghiệp nổi tiếng về cách tạo sản phẩm khác biệt, xây dựng lợi thế cạnh tranh và tư duy từ 0 đến 1.",
    ),
    CuratedBook(
        "B016",
        "Hands-On Machine Learning with Scikit-Learn Keras TensorFlow Aurelien Geron",
        "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
        "Aurélien Géron",
        "Trí tuệ nhân tạo",
        "machine learning;scikit-learn;tensorflow;deep learning;python",
        "Nâng cao",
        "ebook",
        269000,
        4.8,
        856,
        2022,
        1,
        "Sách thực hành machine learning nổi tiếng, phù hợp để liên hệ với phần AI microservice, pipeline và đánh giá mô hình.",
    ),
    CuratedBook(
        "B017",
        "Storytelling with Data Cole Nussbaumer Knaflic",
        "Storytelling with Data",
        "Cole Nussbaumer Knaflic",
        "Dữ liệu",
        "data visualization;dashboard;analytics;presentation;storytelling",
        "Cơ bản",
        "both",
        145000,
        4.6,
        288,
        2015,
        1,
        "Hướng dẫn trình bày dữ liệu trực quan, rõ ý và thuyết phục, rất phù hợp cho dashboard và báo cáo đồ án.",
    ),
    CuratedBook(
        "B018",
        "Database Design for Mere Mortals Michael Hernandez",
        "Database Design for Mere Mortals",
        "Michael J. Hernandez",
        "Dữ liệu",
        "database design;erd;normalization;sql;schema",
        "Trung cấp",
        "paper",
        169000,
        4.4,
        672,
        2013,
        0,
        "Tài liệu dễ tiếp cận về thiết kế cơ sở dữ liệu quan hệ, ERD, chuẩn hóa và mô hình hóa dữ liệu nghiệp vụ.",
    ),
    CuratedBook(
        "B019",
        "Made to Stick Chip Heath Dan Heath",
        "Made to Stick",
        "Chip Heath, Dan Heath",
        "Marketing",
        "marketing;communication;ideas;content;storytelling",
        "Cơ bản",
        "ebook",
        126000,
        4.5,
        336,
        2007,
        1,
        "Cuốn sách về cách làm ý tưởng trở nên dễ nhớ, dễ lan truyền và có sức ảnh hưởng trong truyền thông.",
    ),
    CuratedBook(
        "B020",
        "Clean Code Robert C. Martin",
        "Clean Code",
        "Robert C. Martin",
        "Lập trình",
        "clean code;software engineering;refactoring;testing;maintainability",
        "Trung cấp",
        "both",
        185000,
        4.7,
        464,
        2008,
        1,
        "Sách kinh điển về cách viết code dễ đọc, dễ bảo trì, đặt tên tốt, tách hàm hợp lý và cải thiện chất lượng phần mềm.",
    ),
]


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_cover_url(url: str) -> str:
    return url.replace("http://", "https://", 1)


def fetch_google_book(book: CuratedBook) -> dict[str, str]:
    params = urlencode({"q": book.query, "maxResults": "5", "printType": "books"})
    request = Request(
        f"{GOOGLE_BOOKS_API}?{params}",
        headers={"User-Agent": "BookVerseAI-Demo/1.0"},
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as error:  # noqa: BLE001 - script demo cần bỏ qua lỗi mạng.
        print(f"[WARN] Không lấy được Google Books cho {book.book_id}: {error}")
        return {}

    items = payload.get("items", [])
    if not isinstance(items, list):
        return {}

    for item in items:
        volume_info = item.get("volumeInfo", {})
        if not isinstance(volume_info, dict):
            continue

        image_links = volume_info.get("imageLinks", {})
        if not isinstance(image_links, dict):
            continue

        thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
        if not thumbnail:
            continue

        description = volume_info.get("description")
        return {
            "cover_path": normalize_cover_url(str(thumbnail)),
            "api_title": str(volume_info.get("title") or ""),
            "api_author": ", ".join(str(author) for author in volume_info.get("authors", []))
            if isinstance(volume_info.get("authors"), list)
            else "",
            "api_description": strip_html(str(description)) if description else "",
        }

    return {}


def create_backup() -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = BACKUP_ROOT / f"real_books_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    for file_name in ("books.csv", "listings.csv", "reviews.csv"):
        source = DATA_DIR / file_name
        if source.exists():
            shutil.copy2(source, backup_dir / file_name)

    print(f"[OK] Đã backup CSV cũ vào: {backup_dir}")
    return backup_dir


def build_books_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for index, book in enumerate(CURATED_BOOKS, start=1):
        remote = fetch_google_book(book)
        description = remote.get("api_description") or book.description
        cover_path = remote.get("cover_path") or FALLBACK_COVER_URLS.get(book.book_id, "")

        if not cover_path:
            print(f"[WARN] {book.book_id} thiếu cover từ API, giữ cover_path rỗng.")

        rows.append(
            {
                "book_id": book.book_id,
                "title": book.title,
                "author": book.author,
                "genre": book.genre,
                "tags": book.tags,
                "level": book.level,
                "format": book.book_format,
                "price": str(book.price),
                "rating": f"{book.rating:.1f}",
                "pages": str(book.pages),
                "publish_year": str(book.publish_year),
                "is_ebook": str(book.is_ebook),
                "description": description[:900],
                "cover_path": cover_path,
            }
        )

        print(f"[{index:02d}/20] {book.book_id} - {book.title}")
        time.sleep(0.2)

    return rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_listings_rows(books: list[dict[str, str]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for index, book in enumerate(books, start=1):
        listing_id = f"L{index:04d}"
        seller_id = "U008" if index % 3 else "U004"
        price = max(45_000, round(int(book["price"]) * 0.86 / 1000) * 1000)
        status = "pending_review" if index in (1, 20) else "approved"
        condition = "new" if index % 4 else "used_fair"

        rows.append(
            {
                "listing_id": listing_id,
                "seller_id": seller_id,
                "book_id": book["book_id"],
                "condition": condition,
                "price": str(price),
                "status": status,
                "views": str(90 + index * 17),
                "cart_adds": str(4 + (index * 7) % 60),
                "purchases": str((index * 5) % 24),
                "title": book["title"],
                "description": f"{book['description'][:260]} Bản demo marketplace có thông tin tình trạng, giá bán và nhóm độc giả phù hợp.",
                "tags": book["tags"],
                "has_cover": "1" if book["cover_path"] else "0",
                "target_audience": f"Bạn đọc quan tâm {book['genre'].lower()} ở mức {book['level'].lower()}",
                "created_at": f"2026-06-{18 + (index % 10):02d} 00:00:00",
            }
        )

    return rows


def build_reviews_rows(books_by_id: dict[str, dict[str, str]]) -> list[dict[str, str]]:
    review_sources = [
        ("R0001", "U001", "B020", "5"),
        ("R0002", "U001", "B016", "5"),
        ("R0003", "U002", "B012", "5"),
        ("R0004", "U002", "B010", "5"),
        ("R0005", "U002", "B001", "4"),
        ("R0006", "U003", "B020", "5"),
        ("R0007", "U003", "B018", "4"),
        ("R0008", "U003", "B017", "5"),
        ("R0009", "U004", "B016", "4"),
        ("R0010", "U004", "B011", "4"),
        ("R0011", "U005", "B008", "4"),
        ("R0012", "U005", "B012", "5"),
        ("R0013", "U005", "B019", "5"),
        ("R0014", "U005", "B005", "5"),
        ("R0015", "U006", "B012", "5"),
        ("R0016", "U006", "B015", "4"),
        ("R0017", "U007", "B018", "5"),
        ("R0018", "U007", "B002", "5"),
        ("R0019", "U007", "B016", "5"),
        ("R0020", "U007", "B005", "5"),
        ("R0021", "U007", "B013", "5"),
    ]
    templates = [
        "Sách thật, nội dung có chiều sâu và phù hợp để đưa vào hệ thống gợi ý của BookVerse AI.",
        "Bìa và metadata rõ ràng hơn dữ liệu demo cũ, dễ dùng khi quay video báo cáo.",
        "Phần nội dung có thể liên hệ tốt với lịch sử đọc, review và recommendation evidence.",
    ]
    rows: list[dict[str, str]] = []

    for index, (review_id, user_id, book_id, rating) in enumerate(review_sources):
        book = books_by_id[book_id]
        rows.append(
            {
                "review_id": review_id,
                "user_id": user_id,
                "book_id": book_id,
                "rating": rating,
                "review_text": f"{templates[index % len(templates)]} Mình đánh dấu lại vài chương trong '{book['title']}'.",
                "created_at": f"2026-06-{20 + (index % 12):02d} 10:30:00",
            }
        )

    return rows


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    create_backup()

    books = build_books_rows()
    books_by_id = {book["book_id"]: book for book in books}
    listings = build_listings_rows(books)
    reviews = build_reviews_rows(books_by_id)

    write_csv(
        DATA_DIR / "books.csv",
        [
            "book_id",
            "title",
            "author",
            "genre",
            "tags",
            "level",
            "format",
            "price",
            "rating",
            "pages",
            "publish_year",
            "is_ebook",
            "description",
            "cover_path",
        ],
        books,
    )
    write_csv(
        DATA_DIR / "listings.csv",
        [
            "listing_id",
            "seller_id",
            "book_id",
            "condition",
            "price",
            "status",
            "views",
            "cart_adds",
            "purchases",
            "title",
            "description",
            "tags",
            "has_cover",
            "target_audience",
            "created_at",
        ],
        listings,
    )
    write_csv(
        DATA_DIR / "reviews.csv",
        ["review_id", "user_id", "book_id", "rating", "review_text", "created_at"],
        reviews,
    )

    print("[DONE] Đã làm mới books.csv, listings.csv và reviews.csv bằng dữ liệu sách thật hơn.")


if __name__ == "__main__":
    main()
