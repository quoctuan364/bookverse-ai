import argparse
import csv
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from textwrap import wrap

from .config import COVER_DIR, DATA_DIR


def _write_csv(path: Path, rows: list[dict], overwrite: bool = False) -> bool:
    """Ghi CSV demo khi file chưa tồn tại; không ghi đè nếu chưa bật overwrite."""
    if path.exists() and not overwrite:
        return False

    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return True


def _make_cover(book: dict, overwrite: bool = False) -> str:
    """Tạo ảnh bìa PNG đơn giản để app có visual asset cục bộ."""
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    path = COVER_DIR / f"{book['book_id']}.png"
    rel_path = f"covers/{book['book_id']}.png"
    if path.exists() and not overwrite:
        return rel_path

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return ""

    palette = {
        "Trí tuệ nhân tạo": ("#0f766e", "#99f6e4"),
        "Lập trình": ("#1d4ed8", "#bfdbfe"),
        "Dữ liệu": ("#7c3aed", "#ddd6fe"),
        "Kinh doanh": ("#b45309", "#fde68a"),
        "Marketing": ("#be123c", "#fecdd3"),
        "Thiết kế": ("#047857", "#bbf7d0"),
        "Kỹ năng": ("#334155", "#e2e8f0"),
        "Tài chính": ("#166534", "#dcfce7"),
        "Tâm lý học": ("#a21caf", "#f5d0fe"),
        "Văn học": ("#9f1239", "#ffe4e6"),
        "Giáo dục": ("#0369a1", "#bae6fd"),
        "Khởi nghiệp": ("#c2410c", "#fed7aa"),
    }
    bg, accent = palette.get(book["genre"], ("#111827", "#e5e7eb"))

    image = Image.new("RGB", (360, 520), bg)
    draw = ImageDraw.Draw(image)
    draw.rectangle((18, 18, 342, 502), outline=accent, width=4)
    draw.rectangle((38, 40, 322, 120), fill=accent)

    title_font = ImageFont.load_default(size=26)
    small_font = ImageFont.load_default(size=18)
    tiny_font = ImageFont.load_default(size=14)

    draw.text((54, 66), "SMARTBOOK", fill=bg, font=small_font)
    y = 168
    for line in wrap(book["title"].upper(), width=18)[:5]:
        draw.text((42, y), line, fill="#ffffff", font=title_font)
        y += 36
    draw.text((42, 410), book["author"], fill="#ffffff", font=small_font)
    draw.text((42, 448), book["genre"], fill=accent, font=tiny_font)
    draw.text((42, 474), f"{book['level']} | {book['format']}", fill="#ffffff", font=tiny_font)

    image.save(path)
    return rel_path


def _base_books() -> list[dict]:
    books = [
        {
            "book_id": "B001",
            "title": "AI nhập môn cho sinh viên",
            "author": "Nguyễn Minh Khoa",
            "genre": "Trí tuệ nhân tạo",
            "tags": "AI;machine learning;python;nhập môn;dữ liệu",
            "level": "Cơ bản",
            "format": "ebook",
            "price": 89000,
            "rating": 4.8,
            "pages": 220,
            "publish_year": 2025,
            "is_ebook": 1,
            "description": "Giải thích nền tảng AI bằng ví dụ gần gũi, phù hợp sinh viên mới bắt đầu học Python và dữ liệu.",
        },
        {
            "book_id": "B002",
            "title": "Xây dựng hệ gợi ý bằng Python",
            "author": "Trần Hạ Vy",
            "genre": "Trí tuệ nhân tạo",
            "tags": "recommendation;python;pandas;content-based;hybrid",
            "level": "Trung cấp",
            "format": "ebook",
            "price": 129000,
            "rating": 4.7,
            "pages": 280,
            "publish_year": 2026,
            "is_ebook": 1,
            "description": "Hướng dẫn xây dựng recommendation engine từ dữ liệu hành vi, hồ sơ sở thích và nội dung sách.",
        },
        {
            "book_id": "B003",
            "title": "FastAPI thực chiến",
            "author": "Lê Hoàng Nam",
            "genre": "Lập trình",
            "tags": "fastapi;backend;api;python;database",
            "level": "Trung cấp",
            "format": "both",
            "price": 155000,
            "rating": 4.6,
            "pages": 310,
            "publish_year": 2024,
            "is_ebook": 1,
            "description": "Thiết kế API, xác thực, kết nối cơ sở dữ liệu và triển khai backend Python dễ hiểu.",
        },
        {
            "book_id": "B004",
            "title": "Next.js và thương mại điện tử",
            "author": "Phạm An Nhiên",
            "genre": "Lập trình",
            "tags": "nextjs;typescript;web;ecommerce;frontend",
            "level": "Trung cấp",
            "format": "paper",
            "price": 179000,
            "rating": 4.5,
            "pages": 340,
            "publish_year": 2025,
            "is_ebook": 0,
            "description": "Xây dựng giao diện web bán hàng, catalog, giỏ hàng và luồng đặt hàng giả lập bằng Next.js.",
        },
        {
            "book_id": "B005",
            "title": "PostgreSQL cho đồ án",
            "author": "Đỗ Gia Bảo",
            "genre": "Dữ liệu",
            "tags": "postgresql;sql;database;schema;prisma",
            "level": "Cơ bản",
            "format": "both",
            "price": 99000,
            "rating": 4.4,
            "pages": 240,
            "publish_year": 2023,
            "is_ebook": 1,
            "description": "Thiết kế bảng, khóa ngoại, truy vấn thống kê và chuẩn hóa dữ liệu cho project sinh viên.",
        },
        {
            "book_id": "B006",
            "title": "Dashboard dữ liệu với Python",
            "author": "Hoàng Nhật Linh",
            "genre": "Dữ liệu",
            "tags": "dashboard;streamlit;pandas;plotly;analytics",
            "level": "Cơ bản",
            "format": "ebook",
            "price": 109000,
            "rating": 4.7,
            "pages": 260,
            "publish_year": 2025,
            "is_ebook": 1,
            "description": "Tạo dashboard phân tích hành vi người dùng, đơn hàng và hiệu quả gợi ý bằng Python.",
        },
        {
            "book_id": "B007",
            "title": "Marketplace sách từ A đến Z",
            "author": "Võ Thanh Tùng",
            "genre": "Kinh doanh",
            "tags": "marketplace;bán hàng;vận hành;listing;khách hàng",
            "level": "Cơ bản",
            "format": "paper",
            "price": 135000,
            "rating": 4.3,
            "pages": 210,
            "publish_year": 2022,
            "is_ebook": 0,
            "description": "Các bước xây dựng sàn mua bán sách, quản lý người bán, bài đăng và trải nghiệm người mua.",
        },
        {
            "book_id": "B008",
            "title": "Tối ưu bài đăng bán sách",
            "author": "Bùi Khánh Chi",
            "genre": "Marketing",
            "tags": "marketing;seo;listing;copywriting;từ khóa",
            "level": "Cơ bản",
            "format": "ebook",
            "price": 79000,
            "rating": 4.2,
            "pages": 180,
            "publish_year": 2024,
            "is_ebook": 1,
            "description": "Cách viết tiêu đề, mô tả, tag và từ khóa để bài đăng bán sách dễ được tìm thấy hơn.",
        },
        {
            "book_id": "B009",
            "title": "UX cho ứng dụng đọc sách",
            "author": "Mai Phương Anh",
            "genre": "Thiết kế",
            "tags": "ux;ui;reader;trải nghiệm;wireframe",
            "level": "Trung cấp",
            "format": "ebook",
            "price": 119000,
            "rating": 4.6,
            "pages": 230,
            "publish_year": 2025,
            "is_ebook": 1,
            "description": "Thiết kế trải nghiệm đọc online, lưu tiến độ, bookmark, highlight và giao diện dễ tập trung.",
        },
        {
            "book_id": "B010",
            "title": "Kỹ năng tự học trong thời đại số",
            "author": "Ngô Thiên Ân",
            "genre": "Kỹ năng",
            "tags": "tự học;thói quen;sinh viên;năng suất;mục tiêu",
            "level": "Cơ bản",
            "format": "both",
            "price": 69000,
            "rating": 4.5,
            "pages": 190,
            "publish_year": 2023,
            "is_ebook": 1,
            "description": "Phương pháp tự học, lập kế hoạch đọc sách và duy trì thói quen học tập bền vững.",
        },
        {
            "book_id": "B011",
            "title": "Tài chính cá nhân cho người mới",
            "author": "Đặng Quốc Huy",
            "genre": "Tài chính",
            "tags": "tài chính;ngân sách;tiết kiệm;đầu tư;cơ bản",
            "level": "Cơ bản",
            "format": "paper",
            "price": 125000,
            "rating": 4.4,
            "pages": 260,
            "publish_year": 2022,
            "is_ebook": 0,
            "description": "Quản lý chi tiêu, lập ngân sách cá nhân và hiểu các khái niệm đầu tư cơ bản.",
        },
        {
            "book_id": "B012",
            "title": "Tâm lý học hành vi người đọc",
            "author": "Lâm Tuệ Minh",
            "genre": "Tâm lý học",
            "tags": "tâm lý;hành vi;đọc sách;cộng đồng;cảm xúc",
            "level": "Trung cấp",
            "format": "ebook",
            "price": 99000,
            "rating": 4.5,
            "pages": 245,
            "publish_year": 2024,
            "is_ebook": 1,
            "description": "Phân tích động lực đọc, chia sẻ review và cách cộng đồng tác động đến lựa chọn sách.",
        },
        {
            "book_id": "B013",
            "title": "Một mùa đọc chậm",
            "author": "Hà Diệu Thanh",
            "genre": "Văn học",
            "tags": "văn học;truyện ngắn;đọc thư giãn;cảm xúc",
            "level": "Cơ bản",
            "format": "both",
            "price": 88000,
            "rating": 4.1,
            "pages": 170,
            "publish_year": 2021,
            "is_ebook": 1,
            "description": "Tập truyện ngắn nhẹ nhàng về thói quen đọc sách, ký ức tuổi trẻ và những ngày yên tĩnh.",
        },
        {
            "book_id": "B014",
            "title": "Giáo dục số và lớp học AI",
            "author": "Phan Bảo Trâm",
            "genre": "Giáo dục",
            "tags": "giáo dục;ai;lớp học;sinh viên;chuyển đổi số",
            "level": "Trung cấp",
            "format": "ebook",
            "price": 145000,
            "rating": 4.6,
            "pages": 300,
            "publish_year": 2026,
            "is_ebook": 1,
            "description": "Ứng dụng AI trong học tập, cá nhân hóa nội dung và phân tích dữ liệu giáo dục.",
        },
        {
            "book_id": "B015",
            "title": "Khởi nghiệp sản phẩm số",
            "author": "Trịnh Minh Đức",
            "genre": "Khởi nghiệp",
            "tags": "startup;mvp;sản phẩm;khách hàng;kinh doanh",
            "level": "Cơ bản",
            "format": "paper",
            "price": 149000,
            "rating": 4.3,
            "pages": 250,
            "publish_year": 2023,
            "is_ebook": 0,
            "description": "Từ ý tưởng đến MVP, kiểm chứng nhu cầu người dùng và xây dựng mô hình kinh doanh sản phẩm số.",
        },
        {
            "book_id": "B016",
            "title": "Machine Learning nâng cao",
            "author": "Nguyễn Minh Khoa",
            "genre": "Trí tuệ nhân tạo",
            "tags": "machine learning;feature engineering;model evaluation;nâng cao",
            "level": "Nâng cao",
            "format": "ebook",
            "price": 189000,
            "rating": 4.8,
            "pages": 420,
            "publish_year": 2026,
            "is_ebook": 1,
            "description": "Các kỹ thuật đánh giá mô hình, chọn đặc trưng và xây dựng pipeline ML cho bài toán thực tế.",
        },
        {
            "book_id": "B017",
            "title": "Python xử lý dữ liệu",
            "author": "Trần Hạ Vy",
            "genre": "Dữ liệu",
            "tags": "python;pandas;numpy;cleaning;visualization",
            "level": "Cơ bản",
            "format": "both",
            "price": 115000,
            "rating": 4.7,
            "pages": 295,
            "publish_year": 2024,
            "is_ebook": 1,
            "description": "Làm sạch dữ liệu, phân tích bằng pandas và trực quan hóa kết quả cho báo cáo đồ án.",
        },
        {
            "book_id": "B018",
            "title": "Thiết kế cơ sở dữ liệu ứng dụng",
            "author": "Đỗ Gia Bảo",
            "genre": "Dữ liệu",
            "tags": "database;erd;normalization;postgresql;system design",
            "level": "Trung cấp",
            "format": "paper",
            "price": 139000,
            "rating": 4.5,
            "pages": 310,
            "publish_year": 2023,
            "is_ebook": 0,
            "description": "Phân tích thực thể, quan hệ, chuẩn hóa và thiết kế ERD cho hệ thống web có nhiều module.",
        },
        {
            "book_id": "B019",
            "title": "Community Growth cho nền tảng nội dung",
            "author": "Bùi Khánh Chi",
            "genre": "Marketing",
            "tags": "community;content;growth;review;reaction",
            "level": "Trung cấp",
            "format": "ebook",
            "price": 98000,
            "rating": 4.4,
            "pages": 205,
            "publish_year": 2025,
            "is_ebook": 1,
            "description": "Tăng trưởng cộng đồng đọc sách bằng nội dung chất lượng, review, bình luận và cơ chế phản hồi.",
        },
        {
            "book_id": "B020",
            "title": "Clean Code Python dễ hiểu",
            "author": "Lê Hoàng Nam",
            "genre": "Lập trình",
            "tags": "python;clean code;testing;refactor;sinh viên",
            "level": "Cơ bản",
            "format": "ebook",
            "price": 99000,
            "rating": 4.6,
            "pages": 230,
            "publish_year": 2024,
            "is_ebook": 1,
            "description": "Viết code Python rõ ràng, dễ đọc, có kiểm thử và phù hợp với project sinh viên.",
        },
    ]

    for book in books:
        book["cover_path"] = _make_cover(book)
    return books


def _build_authors(books: list[dict]) -> list[dict]:
    authors = []
    for index, name in enumerate(sorted({book["author"] for book in books}), start=1):
        authors.append(
            {
                "author_id": f"A{index:03d}",
                "name": name,
                "country": "Việt Nam",
                "description": f"Tác giả demo thuộc kho sách SmartBook, chuyên viết về {index % 4 + 1} nhóm chủ đề chính.",
            }
        )
    return authors


def _base_users() -> list[dict]:
    return [
        {
            "user_id": "U001",
            "name": "Tuấn",
            "role": "reader",
            "persona": "Sinh viên công nghệ muốn học AI và làm đồ án",
            "preferred_genres": "Trí tuệ nhân tạo;Lập trình;Dữ liệu",
            "level": "Cơ bản",
            "budget": 150000,
        },
        {
            "user_id": "U002",
            "name": "Vy",
            "role": "reader",
            "persona": "Người đọc thích phát triển bản thân và quản lý tài chính",
            "preferred_genres": "Kỹ năng;Tài chính;Tâm lý học",
            "level": "Cơ bản",
            "budget": 120000,
        },
        {
            "user_id": "U003",
            "name": "Nam",
            "role": "reader",
            "persona": "Backend developer muốn nâng cấp kỹ năng hệ thống",
            "preferred_genres": "Lập trình;Dữ liệu;Trí tuệ nhân tạo",
            "level": "Trung cấp",
            "budget": 200000,
        },
        {
            "user_id": "U004",
            "name": "An",
            "role": "reader",
            "persona": "Người bán sách muốn tối ưu bài đăng và marketing",
            "preferred_genres": "Kinh doanh;Marketing;Khởi nghiệp",
            "level": "Cơ bản",
            "budget": 160000,
        },
        {
            "user_id": "U005",
            "name": "Chi",
            "role": "reader",
            "persona": "Designer quan tâm trải nghiệm đọc và cộng đồng",
            "preferred_genres": "Thiết kế;Marketing;Tâm lý học",
            "level": "Trung cấp",
            "budget": 130000,
        },
        {
            "user_id": "U006",
            "name": "Huy",
            "role": "reader",
            "persona": "Bạn đọc cần sách nhẹ nhàng sau giờ làm",
            "preferred_genres": "Văn học;Kỹ năng;Tâm lý học",
            "level": "Cơ bản",
            "budget": 100000,
        },
        {
            "user_id": "U007",
            "name": "Trâm",
            "role": "reader",
            "persona": "Giảng viên quan tâm giáo dục số và dữ liệu học tập",
            "preferred_genres": "Giáo dục;Trí tuệ nhân tạo;Dữ liệu",
            "level": "Trung cấp",
            "budget": 180000,
        },
        {
            "user_id": "U008",
            "name": "Minh Bookstore",
            "role": "seller",
            "persona": "Nhà bán sách giấy và ebook chuyên ngành",
            "preferred_genres": "Lập trình;Dữ liệu;Kinh doanh",
            "level": "Trung cấp",
            "budget": 0,
        },
        {
            "user_id": "U009",
            "name": "Admin Demo",
            "role": "admin",
            "persona": "Quản trị viên hệ thống",
            "preferred_genres": "Dữ liệu;Kinh doanh",
            "level": "Trung cấp",
            "budget": 0,
        },
        {
            "user_id": "U010",
            "name": "Mod Demo",
            "role": "moderator",
            "persona": "Kiểm duyệt viên cộng đồng",
            "preferred_genres": "Văn học;Kỹ năng",
            "level": "Cơ bản",
            "budget": 0,
        },
    ]


def _build_interactions(books: list[dict], users: list[dict]) -> list[dict]:
    random.seed(98)
    base_date = datetime(2026, 6, 20, 8, 30)
    reader_users = [user for user in users if user["role"] == "reader"]
    interactions = []
    event_id = 1

    for user in reader_users:
        preferred = set(user["preferred_genres"].split(";"))
        matching_books = [book for book in books if book["genre"] in preferred]
        other_books = [book for book in books if book["genre"] not in preferred]
        chosen_books = random.sample(matching_books, min(6, len(matching_books)))
        chosen_books += random.sample(other_books, 2)

        for book in chosen_books:
            events = ["view"]
            if book["is_ebook"]:
                events.append("read")
            if book["price"] <= int(user["budget"] or 0) or random.random() > 0.45:
                events.append("cart_add")
            if random.random() > 0.52:
                events.append("purchase")
            if random.random() > 0.55:
                events.append("bookmark")
            if random.random() > 0.63:
                events.append("highlight")
            if random.random() > 0.58:
                events.append("review")

            for event_type in events:
                happened_at = base_date + timedelta(days=random.randint(0, 12), hours=random.randint(0, 10))
                interactions.append(
                    {
                        "event_id": f"E{event_id:04d}",
                        "user_id": user["user_id"],
                        "book_id": book["book_id"],
                        "event_type": event_type,
                        "event_time": happened_at.strftime("%Y-%m-%d %H:%M:%S"),
                        "minutes_read": random.randint(8, 55) if event_type == "read" else 0,
                        "progress_percent": random.randint(10, 88) if event_type == "read" else 0,
                        "query": "" if event_type != "search" else book["genre"].lower(),
                    }
                )
                event_id += 1

        search_book = random.choice(chosen_books)
        interactions.append(
            {
                "event_id": f"E{event_id:04d}",
                "user_id": user["user_id"],
                "book_id": search_book["book_id"],
                "event_type": "search",
                "event_time": (base_date + timedelta(days=random.randint(0, 12))).strftime("%Y-%m-%d %H:%M:%S"),
                "minutes_read": 0,
                "progress_percent": 0,
                "query": random.choice(["sách học AI", "python cơ bản", "dashboard dữ liệu", "tối ưu listing"]),
            }
        )
        event_id += 1

    return interactions


def _build_orders(interactions: list[dict], books: list[dict]) -> list[dict]:
    price_by_book = {book["book_id"]: int(book["price"]) for book in books}
    orders = []
    order_id = 1
    for event in interactions:
        if event["event_type"] != "purchase":
            continue
        orders.append(
            {
                "order_id": f"O{order_id:04d}",
                "user_id": event["user_id"],
                "book_id": event["book_id"],
                "quantity": 1,
                "total_amount": price_by_book[event["book_id"]],
                "status": "paid_demo",
                "created_at": event["event_time"],
            }
        )
        order_id += 1
    return orders


def _build_reviews(interactions: list[dict], books: list[dict]) -> list[dict]:
    random.seed(22050098)
    titles = {book["book_id"]: book["title"] for book in books}
    templates = [
        "Nội dung dễ hiểu, có thể dùng làm tài liệu tham khảo cho đồ án.",
        "Ví dụ thực tế, trình bày rõ và phù hợp để học từng bước.",
        "Sách có nhiều ý hay nhưng cần thêm bài tập thực hành.",
        "Phần giải thích tốt, giúp mình chọn hướng học tiếp theo.",
        "Nên đọc nếu muốn nắm nhanh chủ đề này trong thời gian ngắn.",
    ]
    reviews = []
    review_id = 1
    seen = set()
    for event in interactions:
        if event["event_type"] != "review":
            continue
        key = (event["user_id"], event["book_id"])
        if key in seen:
            continue
        seen.add(key)
        reviews.append(
            {
                "review_id": f"R{review_id:04d}",
                "user_id": event["user_id"],
                "book_id": event["book_id"],
                "rating": random.choice([4, 4, 5, 5, 5]),
                "review_text": f"{random.choice(templates)} Mình đánh dấu lại vài chương trong '{titles[event['book_id']]}'.",
                "created_at": event["event_time"],
            }
        )
        review_id += 1
    return reviews


def _build_listings(books: list[dict]) -> list[dict]:
    listings = []
    for index, book in enumerate(books, start=1):
        seller_id = "U008" if index % 3 else "U004"
        quality_variant = index % 5
        short_description = quality_variant == 0
        missing_cover = quality_variant == 1
        listing_tags = book["tags"] if quality_variant != 2 else book["genre"].lower()

        listings.append(
            {
                "listing_id": f"L{index:04d}",
                "seller_id": seller_id,
                "book_id": book["book_id"],
                "condition": "new" if book["format"] != "paper" else random.choice(["new", "used_good", "used_fair"]),
                "price": max(45000, int(book["price"]) - random.randint(0, 25000)),
                "status": random.choice(["approved", "approved", "pending_review"]),
                "views": random.randint(20, 420),
                "cart_adds": random.randint(2, 70),
                "purchases": random.randint(0, 28),
                "title": book["title"] if quality_variant != 3 else f"Bán {book['title']}",
                "description": "Sách còn tốt." if short_description else f"{book['description']} Bài đăng có thông tin tình trạng sách, nhóm độc giả phù hợp và lý do nên đọc.",
                "tags": listing_tags,
                "has_cover": 0 if missing_cover else 1,
                "target_audience": "" if quality_variant == 4 else f"Bạn đọc quan tâm {book['genre'].lower()} ở mức {book['level'].lower()}",
                "created_at": (datetime(2026, 6, 18) + timedelta(days=index % 10)).strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
    return listings


def _build_posts(books: list[dict], users: list[dict]) -> list[dict]:
    random.seed(20260703)
    reader_ids = [user["user_id"] for user in users if user["role"] == "reader"]
    posts = []
    for index, book in enumerate(books[:14], start=1):
        posts.append(
            {
                "post_id": f"P{index:04d}",
                "user_id": random.choice(reader_ids),
                "book_id": book["book_id"],
                "title": f"Thảo luận về {book['title']}",
                "content": f"Mình đang đọc {book['title']} và thấy phần liên quan đến {book['genre'].lower()} khá hữu ích cho việc học.",
                "tags": book["tags"],
                "reactions": random.randint(3, 95),
                "comments": random.randint(0, 24),
                "reports": 1 if index in {6, 13} else 0,
                "status": "reported" if index in {6, 13} else "published",
                "created_at": (datetime(2026, 6, 21) + timedelta(days=index)).strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
    return posts


def _build_reading_progress(interactions: list[dict], books: list[dict]) -> list[dict]:
    pages = {book["book_id"]: int(book["pages"]) for book in books}
    latest_read = {}
    for event in interactions:
        if event["event_type"] != "read":
            continue
        key = (event["user_id"], event["book_id"])
        latest_read[key] = event

    progress_rows = []
    for (user_id, book_id), event in latest_read.items():
        percent = int(event["progress_percent"])
        progress_rows.append(
            {
                "user_id": user_id,
                "book_id": book_id,
                "current_page": max(1, round(pages[book_id] * percent / 100)),
                "progress_percent": percent,
                "total_minutes": int(event["minutes_read"]) + random.randint(15, 180),
                "last_read_at": event["event_time"],
            }
        )
    return progress_rows


def generate_demo_data(overwrite: bool = False) -> dict[str, bool]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    books = _base_books()
    authors = _build_authors(books)
    users = _base_users()
    interactions = _build_interactions(books, users)
    orders = _build_orders(interactions, books)
    reviews = _build_reviews(interactions, books)
    listings = _build_listings(books)
    posts = _build_posts(books, users)
    reading_progress = _build_reading_progress(interactions, books)

    files = {
        "authors.csv": authors,
        "books.csv": books,
        "users.csv": users,
        "interactions.csv": interactions,
        "orders.csv": orders,
        "reviews.csv": reviews,
        "listings.csv": listings,
        "community_posts.csv": posts,
        "reading_progress.csv": reading_progress,
    }

    result = {}
    for filename, rows in files.items():
        result[filename] = _write_csv(DATA_DIR / filename, rows, overwrite=overwrite)
    return result


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Sinh dữ liệu CSV demo cho SmartBook AI.")
    parser.add_argument("--force", action="store_true", help="Ghi đè CSV demo đã có.")
    args = parser.parse_args()

    result = generate_demo_data(overwrite=args.force)
    for filename, created in result.items():
        status = "đã tạo/cập nhật" if created else "đã tồn tại, bỏ qua"
        print(f"{filename}: {status}")


if __name__ == "__main__":
    main()
