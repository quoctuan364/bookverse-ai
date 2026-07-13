from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data" / "demo"
COVER_DIR = DATA_DIR / "covers"

REQUIRED_CSV = {
    "authors": "authors.csv",
    "books": "books.csv",
    "users": "users.csv",
    "interactions": "interactions.csv",
    "orders": "orders.csv",
    "reviews": "reviews.csv",
    "listings": "listings.csv",
    "community_posts": "community_posts.csv",
    "reading_progress": "reading_progress.csv",
}

EVENT_WEIGHTS = {
    "view": 1.0,
    "search": 0.5,
    "read": 3.0,
    "bookmark": 2.0,
    "highlight": 1.5,
    "cart_add": 4.0,
    "purchase": 6.0,
    "review": 4.0,
    "comment": 2.0,
    "reaction": 1.0,
}

GENRE_KEYWORDS = {
    "Trí tuệ nhân tạo": ["ai", "trí tuệ", "tri tue", "machine learning", "chatbot", "gợi ý", "goi y"],
    "Lập trình": ["lập trình", "lap trinh", "python", "javascript", "web", "backend", "frontend"],
    "Dữ liệu": ["dữ liệu", "du lieu", "data", "dashboard", "phân tích", "phan tich", "sql", "bi"],
    "Kinh doanh": ["kinh doanh", "bán hàng", "ban hang", "thương mại", "thuong mai", "marketplace"],
    "Marketing": ["marketing", "nội dung", "noi dung", "thương hiệu", "thuong hieu", "khách hàng", "khach hang"],
    "Thiết kế": ["thiết kế", "thiet ke", "ux", "ui", "giao diện", "giao dien", "trải nghiệm", "trai nghiem"],
    "Kỹ năng": ["kỹ năng", "ky nang", "thói quen", "thoi quen", "giao tiếp", "giao tiep", "làm việc", "lam viec"],
    "Tài chính": ["tài chính", "tai chinh", "đầu tư", "dau tu", "tiền", "tien", "ngân sách", "ngan sach"],
    "Tâm lý học": ["tâm lý", "tam ly", "hành vi", "hanh vi", "cảm xúc", "cam xuc"],
    "Văn học": ["văn học", "van hoc", "tiểu thuyết", "tieu thuyet", "truyện", "truyen", "đọc thư giãn", "doc thu gian"],
    "Giáo dục": ["giáo dục", "giao duc", "học tập", "hoc tap", "sinh viên", "sinh vien", "giảng dạy", "giang day"],
    "Khởi nghiệp": ["khởi nghiệp", "khoi nghiep", "startup", "sản phẩm", "san pham", "mvp"],
}

LEVEL_KEYWORDS = {
    "Cơ bản": ["mới", "moi", "nhập môn", "nhap mon", "cơ bản", "co ban", "beginner", "dễ hiểu", "de hieu"],
    "Trung cấp": ["trung cấp", "trung cap", "thực chiến", "thuc chien", "ứng dụng", "ung dung"],
    "Nâng cao": ["nâng cao", "nang cao", "chuyên sâu", "chuyen sau", "expert", "kiến trúc", "kien truc"],
}
