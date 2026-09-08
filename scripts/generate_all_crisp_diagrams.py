"""Vẽ toàn bộ sơ đồ đồ họa (Context, Use Case, Sequence, Activity, Architecture) chất lượng cao chuẩn đồ án."""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

ASSETS_DIR = Path("outputs/report-assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def save_fig(fig, filename):
    out_path = ASSETS_DIR / filename
    plt.tight_layout()
    plt.savefig(str(out_path), dpi=250, bbox_inches="tight")
    plt.close()
    print(f"Generated: {out_path}")


def draw_context_diagram():
    """Hình 3-1: Sơ đồ ngữ cảnh (Context Diagram)."""
    fig, ax = plt.subplots(figsize=(10, 6.5))
    ax.axis("off")

    # Actors (Top)
    ax.text(5, 5.8, "CÁC TÁC NHÂN (ACTORS)", ha="center", fontsize=11, fontweight="bold", color="#0A4640")
    
    # Actor 1: Khách chưa đăng nhập
    b1 = patches.FancyBboxPatch((0.5, 4.8), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#E1F5FE", edgecolor="#0288D1", lw=1.5)
    ax.add_patch(b1)
    ax.text(1.75, 5.15, "Khách hàng\nChưa đăng nhập", ha="center", va="center", fontsize=9, fontweight="bold")

    # Actor 2: Khách đã đăng nhập
    b2 = patches.FancyBboxPatch((3.75, 4.8), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#E8F5E9", edgecolor="#388E3C", lw=1.5)
    ax.add_patch(b2)
    ax.text(5.0, 5.15, "Khách hàng\nĐã đăng nhập (Độc giả)", ha="center", va="center", fontsize=9, fontweight="bold")

    # Actor 3: Quản trị viên
    b3 = patches.FancyBboxPatch((7.0, 4.8), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#FFF3E0", edgecolor="#F57C00", lw=1.5)
    ax.add_patch(b3)
    ax.text(8.25, 5.15, "Quản trị viên\n(Admin & Seller)", ha="center", va="center", fontsize=9, fontweight="bold")

    # Central System
    b_center = patches.FancyBboxPatch((2.5, 2.6), 5.0, 1.2, boxstyle="round,pad=0.1", facecolor="#E0F2F1", edgecolor="#00796B", lw=2)
    ax.add_patch(b_center)
    ax.text(5.0, 3.4, "HỆ THỐNG SMART BOOKSTORE ONLINE\n(BOOKVERSE AI)", ha="center", va="center", fontsize=11, fontweight="bold", color="#004D40")
    ax.text(5.0, 2.9, "Nền tảng đọc sách, gợi ý Hybrid & Trợ lý RAG", ha="center", va="center", fontsize=9, color="#004D40")

    # External Systems (Bottom)
    ax.text(5, 1.5, "HỆ THỐNG BÊN NGOÀI & HẠ TẦNG", ha="center", fontsize=10, fontweight="bold", color="#555555")
    
    ext1 = patches.FancyBboxPatch((0.5, 0.4), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#FCE4EC", edgecolor="#C2185B", lw=1.5)
    ax.add_patch(ext1)
    ax.text(1.75, 0.75, "Trợ lý AI RAG\n(FastAPI Microservice)", ha="center", va="center", fontsize=9, fontweight="bold")

    ext2 = patches.FancyBboxPatch((3.75, 0.4), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#EDE7F6", edgecolor="#512DA8", lw=1.5)
    ax.add_patch(ext2)
    ax.text(5.0, 0.75, "Cổng thanh toán Sandbox\n(Mô phỏng VietQR / Thẻ)", ha="center", va="center", fontsize=9, fontweight="bold")

    ext3 = patches.FancyBboxPatch((7.0, 0.4), 2.5, 0.7, boxstyle="round,pad=0.08", facecolor="#ECEFF1", edgecolor="#455A64", lw=1.5)
    ax.add_patch(ext3)
    ax.text(8.25, 0.75, "Cơ sở dữ liệu\nPostgreSQL pgvector", ha="center", va="center", fontsize=9, fontweight="bold")

    # Connecting Arrows
    arrow_props = dict(arrowstyle="<->", color="#37474F", lw=1.5)
    ax.annotate("", xy=(1.75, 4.8), xytext=(3.5, 3.8), arrowprops=arrow_props)
    ax.annotate("", xy=(5.0, 4.8), xytext=(5.0, 3.8), arrowprops=arrow_props)
    ax.annotate("", xy=(8.25, 4.8), xytext=(6.5, 3.8), arrowprops=arrow_props)

    ax.annotate("", xy=(1.75, 1.1), xytext=(3.5, 2.6), arrowprops=arrow_props)
    ax.annotate("", xy=(5.0, 1.1), xytext=(5.0, 2.6), arrowprops=arrow_props)
    ax.annotate("", xy=(8.25, 1.1), xytext=(6.5, 2.6), arrowprops=arrow_props)

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.2)
    save_fig(fig, "hinh_3_1_so_do_ngu_canh.png")


def draw_overall_use_case():
    """Hình 3-2: Sơ đồ use case của toàn hệ thống."""
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.axis("off")

    # Boundary Box
    bound = patches.FancyBboxPatch((2.2, 0.3), 5.6, 7.4, boxstyle="round,pad=0.1", facecolor="#FAFAFA", edgecolor="#0A4640", lw=2)
    ax.add_patch(bound)
    ax.text(5.0, 7.5, "HỆ THỐNG BOOKVERSE AI", ha="center", fontsize=12, fontweight="bold", color="#0A4640")

    # Actor Left: Khách hàng
    ax.plot([0.8], [5.8], "o", ms=14, color="#0288D1")
    ax.plot([0.8, 0.8], [5.5, 4.7], color="#0288D1", lw=2)
    ax.plot([0.4, 1.2], [5.2, 5.2], color="#0288D1", lw=2)
    ax.plot([0.8, 0.5], [4.7, 4.0], color="#0288D1", lw=2)
    ax.plot([0.8, 1.1], [4.7, 4.0], color="#0288D1", lw=2)
    ax.text(0.8, 3.7, "Khách hàng\n(Chưa/Đã đăng nhập)", ha="center", fontsize=9, fontweight="bold")

    # Actor Right: Admin
    ax.plot([9.2], [5.8], "o", ms=14, color="#F57C00")
    ax.plot([9.2, 9.2], [5.5, 4.7], color="#F57C00", lw=2)
    ax.plot([8.8, 9.6], [5.2, 5.2], color="#F57C00", lw=2)
    ax.plot([9.2, 8.9], [4.7, 4.0], color="#F57C00", lw=2)
    ax.plot([9.2, 9.5], [4.7, 4.0], color="#F57C00", lw=2)
    ax.text(9.2, 3.7, "Quản trị viên\n(Admin & Seller)", ha="center", fontsize=9, fontweight="bold")

    # Use Cases (Ellipses)
    ucs = [
        (5.0, 7.0, "UC01: Xem & Tìm kiếm sách"),
        (5.0, 6.3, "UC02: Gợi ý sách Content-based"),
        (5.0, 5.6, "UC03/04/05: Đăng ký / Đăng nhập / Đăng xuất"),
        (5.0, 4.9, "UC06: Gợi ý sách Hybrid Recommender"),
        (5.0, 4.2, "UC07/08: Giỏ hàng & Thanh toán Sandbox"),
        (5.0, 3.5, "UC09: Đọc Ebook, Bookmark, Highlight"),
        (5.0, 2.8, "UC13: Trợ lý AI RAG Assistant"),
        (5.0, 2.1, "UC14: Quản lý danh mục sản phẩm"),
        (5.0, 1.4, "UC16: Quản lý tài khoản người dùng"),
        (5.0, 0.7, "UC17: Quản lý đơn hàng & Doanh thu"),
    ]

    for x, y, name in ucs:
        ell = patches.Ellipse((x, y), 4.2, 0.52, facecolor="#FFF9C4", edgecolor="#FBC02D", lw=1.5)
        ax.add_patch(ell)
        ax.text(x, y, name, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#333333")
        
        # Link to actors
        if "UC14" in name or "UC16" in name or "UC17" in name:
            ax.plot([7.1, 8.8], [y, 5.0], color="#F57C00", lw=1.2, linestyle="--")
        else:
            ax.plot([1.2, 2.9], [5.0, y], color="#0288D1", lw=1.2, linestyle="--")

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8.0)
    save_fig(fig, "hinh_3_2_use_case_toan_he_thong.png")


def draw_architecture_diagram():
    """Hình 3-3: Mô hình kiến trúc tổng quát 3 tầng."""
    fig, ax = plt.subplots(figsize=(10, 7.5))
    ax.axis("off")

    # Layer 1: Browser Client
    b_client = patches.FancyBboxPatch((1.0, 6.0), 8.0, 1.1, boxstyle="round,pad=0.08", facecolor="#E1F5FE", edgecolor="#0288D1", lw=2)
    ax.add_patch(b_client)
    ax.text(5.0, 6.7, "TẦNG GIAO DIỆN (CLIENT BROWSER)", ha="center", fontsize=11, fontweight="bold", color="#01579B")
    ax.text(5.0, 6.3, "Next.js App Router (React 19, TypeScript, Tailwind CSS, Shadcn UI, Responsive Mobile & Desktop)", ha="center", fontsize=8.5)

    # Layer 2: Application Server Next.js
    b_app = patches.FancyBboxPatch((1.0, 4.0), 8.0, 1.5, boxstyle="round,pad=0.08", facecolor="#E8F5E9", edgecolor="#2E7D32", lw=2)
    ax.add_patch(b_app)
    ax.text(5.0, 5.15, "TẦNG ỨNG DỤNG & ĐIỀU PHỐI (APPLICATION SERVER - NEXT.JS / NODE.JS)", ha="center", fontsize=11, fontweight="bold", color="#1B5E20")
    
    # Sub-modules
    m1 = patches.Rectangle((1.3, 4.2), 2.2, 0.6, facecolor="#FFFFFF", edgecolor="#388E3C", lw=1.2)
    ax.add_patch(m1)
    ax.text(2.4, 4.5, "Controllers / Server Actions\n(Book, Auth, Cart, Order)", ha="center", va="center", fontsize=7.5, fontweight="bold")

    m2 = patches.Rectangle((3.9, 4.2), 2.2, 0.6, facecolor="#FFFFFF", edgecolor="#388E3C", lw=1.2)
    ax.add_patch(m2)
    ax.text(5.0, 4.5, "Service & Auth Layer\n(NextAuth v5, Permissions)", ha="center", va="center", fontsize=7.5, fontweight="bold")

    m3 = patches.Rectangle((6.5, 4.2), 2.2, 0.6, facecolor="#FFFFFF", edgecolor="#388E3C", lw=1.2)
    ax.add_patch(m3)
    ax.text(7.6, 4.5, "ORM & Repository Layer\n(Prisma Client v6)", ha="center", va="center", fontsize=7.5, fontweight="bold")

    # Layer 3: AI Service & Database
    b_ai = patches.FancyBboxPatch((1.0, 1.8), 3.8, 1.6, boxstyle="round,pad=0.08", facecolor="#F3E5F5", edgecolor="#7B1FA2", lw=2)
    ax.add_patch(b_ai)
    ax.text(2.9, 3.05, "AI MICROSERVICE (FASTAPI)", ha="center", fontsize=10, fontweight="bold", color="#4A148C")
    ax.text(2.9, 2.55, "• Hybrid Recommender Engine\n• 6-Step RAG Assistant\n• pgvector Embedding Search", ha="center", va="center", fontsize=8)

    b_db = patches.FancyBboxPatch((5.2, 1.8), 3.8, 1.6, boxstyle="round,pad=0.08", facecolor="#ECEFF1", edgecolor="#455A64", lw=2)
    ax.add_patch(b_db)
    ax.text(7.1, 3.05, "DATABASE (POSTGRESQL 16)", ha="center", fontsize=10, fontweight="bold", color="#263238")
    ax.text(7.1, 2.55, "• pgvector Vector Store\n• Relational Tables (15+ tables)\n• Transaction & Audit Logging", ha="center", va="center", fontsize=8)

    # External LLM
    b_llm = patches.FancyBboxPatch((1.0, 0.3), 8.0, 0.9, boxstyle="round,pad=0.08", facecolor="#FFFDE7", edgecolor="#FBC02D", lw=1.5)
    ax.add_patch(b_llm)
    ax.text(5.0, 0.75, "DỊCH VỤ MÔ HÌNH NGÔN NGỮ NGOÀI (OpenAI GPT-4o-mini / Gemini 1.5 Flash) & Local Fallback", ha="center", fontsize=9, fontweight="bold", color="#F57F17")

    # Arrows
    arr = dict(arrowstyle="<->", color="#37474F", lw=1.5)
    ax.annotate("", xy=(5.0, 6.0), xytext=(5.0, 5.5), arrowprops=arr)
    ax.annotate("", xy=(2.9, 4.0), xytext=(2.9, 3.4), arrowprops=arr)
    ax.annotate("", xy=(7.1, 4.0), xytext=(7.1, 3.4), arrowprops=arr)
    ax.annotate("", xy=(2.9, 1.8), xytext=(2.9, 1.2), arrowprops=arr)

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7.5)
    save_fig(fig, "hinh_3_3_mo_hinh_tong_quat.png")


def draw_sequence_diagram():
    """Hình 3-42: Sơ đồ tuần tự Sequence Diagram tổng quát."""
    fig, ax = plt.subplots(figsize=(10, 6.5))
    ax.axis("off")

    lifelines = [
        (1.2, "User\n(Độc giả)"),
        (3.4, "Browser\n(Client)"),
        (5.6, "App Server\n(Next.js)"),
        (7.8, "AI Service\n(FastAPI)"),
        (9.4, "Database\n(Postgres)")
    ]

    for x, label in lifelines:
        box = patches.Rectangle((x - 0.7, 5.6), 1.4, 0.6, facecolor="#E0F2F1", edgecolor="#00796B", lw=1.5)
        ax.add_patch(box)
        ax.text(x, 5.9, label, ha="center", va="center", fontsize=8.5, fontweight="bold")
        ax.plot([x, x], [5.6, 0.4], color="#90A4AE", linestyle="--", lw=1.2)

    # Message arrows
    msgs = [
        (1.2, 3.4, 5.1, "1: Truy cập / Đăng nhập", True),
        (3.4, 5.6, 4.6, "2: Gửi Request (Session / Search)", True),
        (5.6, 9.4, 4.1, "3: Truy vấn thông tin sách & hành vi", True),
        (9.4, 5.6, 3.6, "4: Trả về dữ liệu tương tác", False),
        (5.6, 7.8, 3.1, "5: Yêu cầu Recommender / RAG", True),
        (7.8, 5.6, 2.6, "6: Trả về Top-K gợi ý & Trả lời", False),
        (5.6, 3.4, 2.1, "7: Render Server Components", False),
        (3.4, 1.2, 1.6, "8: Hiển thị giao diện cá nhân hóa", False),
        (1.2, 3.4, 1.1, "9: Đọc Ebook / Highlight / Chat AI", True),
        (3.4, 5.6, 0.6, "10: Ghi nhận tiến độ thời gian thực", True)
    ]

    for x1, x2, y, text, is_req in msgs:
        style = "->" if is_req else "--"
        color = "#0D47A1" if is_req else "#2E7D32"
        ax.annotate("", xy=(x2, y), xytext=(x1, y), arrowprops=dict(arrowstyle="->", color=color, lw=1.3, linestyle="-" if is_req else "--"))
        ax.text((x1 + x2) / 2, y + 0.12, text, ha="center", fontsize=8, fontweight="bold", color="#263238")

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.5)
    save_fig(fig, "hinh_3_42_so_do_tuan_tu_tong_quat.png")


if __name__ == "__main__":
    draw_context_diagram()
    draw_overall_use_case()
    draw_architecture_diagram()
    draw_sequence_diagram()
