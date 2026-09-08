# -*- coding: utf-8 -*-
"""
Tạo các sơ đồ và biểu đồ chất lượng cao cho đồ án BookVerse AI
"""
import os
import shutil
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DIAGRAM_DIR = 'D:/Doantotnghiep/thesis_screenshots'
os.makedirs(DIAGRAM_DIR, exist_ok=True)

plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['axes.unicode_minus'] = False

# -------------------------------------------------------------
# 1. BIỂU ĐỒ ĐÁNH GIÁ THỰC NGHIỆM AI RECOMMENDATION
# -------------------------------------------------------------
def make_eval_chart():
    methods = ['Popularity\n(Baseline)', 'Content-based\n(CB)', 'Behavior\n(CF)', 'Hybrid\n(Production)', 'Random\n(Seeded)']
    metrics = {
        'Hit Rate@10 (x100)': [1.366, 1.996, 2.101, 0.840, 1.050],
        'Recall@10 (x100)': [0.620, 1.081, 1.053, 0.245, 0.525],
        'NDCG@10 (x100)': [0.352, 0.642, 0.537, 0.150, 0.237],
        'Coverage@10 (x10)': [0.065, 2.065, 9.665, 1.995, 9.900]
    }

    x = np.arange(len(methods))
    width = 0.20
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)

    colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#9013FE']
    for i, (m_name, vals) in enumerate(metrics.items()):
        rects = ax.bar(x + i*width - 1.5*width, vals, width, label=m_name, color=colors[i], alpha=0.9, edgecolor='black', linewidth=0.5)
        for rect in rects:
            h = rect.get_height()
            if h > 0.3:
                ax.annotate(f'{h:.2f}',
                            xy=(rect.get_x() + rect.get_width() / 2, h),
                            xytext=(0, 3), textcoords="offset points",
                            ha='center', va='bottom', fontsize=8, fontweight='bold')

    ax.set_ylabel('Giá trị chuẩn hóa (%)', fontsize=12, fontweight='bold')
    ax.set_title('So sánh hiệu năng các thuật toán gợi ý (Top-K=10 trên temporal split)', fontsize=14, fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(methods, fontsize=11, fontweight='bold')
    ax.legend(frameon=True, facecolor='white', edgecolor='none', shadow=True, fontsize=10)
    ax.grid(axis='y', linestyle='--', alpha=0.5)
    ax.set_axisbelow(True)

    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_10_evaluation_chart.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 2. SƠ ĐỒ NGỮ CẢNH HỆ THỐNG (CONTEXT DIAGRAM)
# -------------------------------------------------------------
def make_context_diagram():
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis('off')

    # Central system
    center_box = patches.FancyBboxPatch((4.2, 2.2), 3.6, 2.6, boxstyle="round,pad=0.2",
                                        ec="#1B365D", fc="#2E5B88", lw=2)
    ax.add_patch(center_box)
    ax.text(6.0, 3.8, "HỆ THỐNG BOOKVERSE AI\n(Smart Bookstore Platform)", color="white",
            fontsize=13, fontweight='bold', ha='center', va='center')
    ax.text(6.0, 2.8, "• Next.js Web App\n• FastAPI AI Engine\n• PostgreSQL + pgvector",
            color="#E0E6ED", fontsize=10, ha='center', va='center')

    # External entities
    actors = [
        ("Độc giả (Reader)", 1.5, 5.5, "#4A90E2", "Tìm sách, Đọc Ebook,\nMua hội viên, Dùng AI"),
        ("Người bán (Seller)", 1.5, 3.5, "#50E3C2", "Đăng tin bán sách cũ,\nQuản lý đơn hàng"),
        ("Quản trị (Admin)", 1.5, 1.5, "#F5A623", "Kiểm duyệt, Phân quyền,\nThống kê, Cấu hình"),
        ("OpenAI / Gemini LLM", 10.5, 5.5, "#9013FE", "Sinh câu trả lời RAG\n(Có Local Fallback)"),
        ("PostgreSQL Database", 10.5, 3.5, "#417505", "Lưu trữ quan hệ,\nVector embeddings"),
        ("Cổng Sandbox Thanh toán", 10.5, 1.5, "#D0021B", "Mô phỏng thanh toán\nHội viên & Đơn hàng")
    ]

    for name, x, y, color, desc in actors:
        box = patches.FancyBboxPatch((x-1.3, y-0.65), 2.6, 1.3, boxstyle="round,pad=0.1",
                                     ec=color, fc="#F8FAFC", lw=2)
        ax.add_patch(box)
        ax.text(x, y+0.25, name, fontsize=10, fontweight='bold', ha='center', va='center', color="#1E293B")
        ax.text(x, y-0.25, desc, fontsize=8.5, ha='center', va='center', color="#64748B")

        # Arrows
        if x < 6:
            ax.annotate('', xy=(4.2, 3.5), xytext=(x+1.3, y),
                        arrowprops=dict(arrowstyle="<->", color="#334155", lw=1.5))
        else:
            ax.annotate('', xy=(x-1.3, y), xytext=(7.8, 3.5),
                        arrowprops=dict(arrowstyle="<->", color="#334155", lw=1.5))

    ax.set_title("SƠ ĐỒ NGỮ CẢNH HỆ THỐNG BOOKVERSE AI (CONTEXT DIAGRAM)", fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_01_context_diagram.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 3. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ (ARCHITECTURE)
# -------------------------------------------------------------
def make_architecture_diagram():
    fig, ax = plt.subplots(figsize=(13, 8.5), dpi=300)
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    # Layer 1: Client
    ax.add_patch(patches.Rectangle((0.8, 7.0), 11.4, 1.1, ec="#2563EB", fc="#EFF6FF", lw=1.5))
    ax.text(1.2, 7.55, "CLIENT LAYER", fontsize=11, fontweight='bold', color="#1E40AF")
    ax.text(6.5, 7.55, "Desktop Browser (1280px+)  |  Mobile Responsive (375px+)  |  NextAuth JWT Session", fontsize=10.5, ha='center', color="#1E293B")

    # Layer 2: Next.js Presentation & Logic
    ax.add_patch(patches.Rectangle((0.8, 3.8), 7.2, 2.8, ec="#0D9488", fc="#F0FDFA", lw=1.5))
    ax.text(1.2, 6.25, "NEXT.JS 15 FULLSTACK APPLICATION (Port 3000)", fontsize=11, fontweight='bold', color="#0F766E")

    components = [
        ("React Server / Client Components", 2.5, 5.5, "#CCFBF1"),
        ("Server Actions & Route Handlers", 6.0, 5.5, "#CCFBF1"),
        ("Auth.js v5 (NextAuth)", 2.5, 4.5, "#E6FFFA"),
        ("Assistant RAG Service + Local Fallback", 6.0, 4.5, "#E6FFFA"),
    ]
    for text, cx, cy, bg in components:
        ax.add_patch(patches.FancyBboxPatch((cx-1.6, cy-0.35), 3.2, 0.7, boxstyle="round,pad=0.05", ec="#14B8A6", fc=bg))
        ax.text(cx, cy, text, fontsize=9, fontweight='bold', ha='center', va='center', color="#134E4A")

    # Layer 2b: AI Microservice
    ax.add_patch(patches.Rectangle((8.3, 3.8), 3.9, 2.8, ec="#7C3AED", fc="#F5F3FF", lw=1.5))
    ax.text(8.5, 6.25, "FASTAPI AI SERVICE (Port 8000)", fontsize=11, fontweight='bold', color="#6D28D9")

    ai_comps = [
        ("Recommendation Engine", 10.25, 5.5, "#EDE9FE"),
        ("Hybrid (CB + CF + Pop + Diversity)", 10.25, 4.5, "#EDE9FE"),
    ]
    for text, cx, cy, bg in ai_comps:
        ax.add_patch(patches.FancyBboxPatch((cx-1.65, cy-0.35), 3.3, 0.7, boxstyle="round,pad=0.05", ec="#8B5CF6", fc=bg))
        ax.text(cx, cy, text, fontsize=9, fontweight='bold', ha='center', va='center', color="#4C1D95")

    # Layer 3: Data & Infrastructure
    ax.add_patch(patches.Rectangle((0.8, 0.6), 11.4, 2.7, ec="#EA580C", fc="#FFF7ED", lw=1.5))
    ax.text(1.2, 2.95, "DATA & INFRASTRUCTURE LAYER (Docker Compose)", fontsize=11, fontweight='bold', color="#C2410C")

    dbs = [
        ("PostgreSQL 16 + pgvector", 3.0, 1.8, "RDBMS, Quan hệ dữ liệu,\nVector embeddings cho RAG", "#FED7AA"),
        ("Prisma 6 ORM", 6.5, 1.8, "Schema migrations,\nType-safe Database client", "#FED7AA"),
        ("File Storage & Assets", 10.0, 1.8, "Ebook Chunks, Bìa sách WebP,\nDemo artifacts", "#FED7AA"),
    ]
    for title, cx, cy, desc, bg in dbs:
        ax.add_patch(patches.FancyBboxPatch((cx-1.5, cy-0.7), 3.0, 1.4, boxstyle="round,pad=0.08", ec="#F97316", fc=bg))
        ax.text(cx, cy+0.3, title, fontsize=9.5, fontweight='bold', ha='center', va='center', color="#7C2D12")
        ax.text(cx, cy-0.2, desc, fontsize=8.5, ha='center', va='center', color="#9A3412")

    # Connectors
    ax.annotate('', xy=(6.5, 6.6), xytext=(6.5, 7.0), arrowprops=dict(arrowstyle="<->", color="#1E293B", lw=2))
    ax.annotate('', xy=(8.3, 5.0), xytext=(8.0, 5.0), arrowprops=dict(arrowstyle="<->", color="#1E293B", lw=2))
    ax.annotate('', xy=(4.4, 3.3), xytext=(4.4, 3.8), arrowprops=dict(arrowstyle="<->", color="#1E293B", lw=2))
    ax.annotate('', xy=(10.25, 3.3), xytext=(10.25, 3.8), arrowprops=dict(arrowstyle="<->", color="#1E293B", lw=2))

    ax.set_title("KIẾN TRÚC PHÂN TẦNG HỆ THỐNG BOOKVERSE AI", fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_03_architecture.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 4. SƠ ĐỒ ERD CƠ SỞ DỮ LIỆU
# -------------------------------------------------------------
def make_erd_diagram():
    fig, ax = plt.subplots(figsize=(14, 9), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9)
    ax.axis('off')

    entities = [
        ("USER", 2.2, 7.2, ["• id (PK, String)", "• email (UK, String)", "• passwordHash", "• role (BUYER, SELLER, ADMIN)", "• isLocked (Boolean)"], "#1E40AF"),
        ("BOOK", 6.8, 7.2, ["• id (PK, String)", "• title, author", "• categoryId (FK)", "• isEbook (Boolean)", "• averageRating"], "#065F46"),
        ("CATEGORY", 11.2, 7.2, ["• id (PK, String)", "• name, slug", "• parentId (FK, Self)"], "#92400E"),
        ("BOOK_EDITION", 6.8, 4.4, ["• id (PK, String)", "• bookId (FK)", "• editionType (PAPER, EBOOK)", "• price, stock"], "#065F46"),
        ("DIGITAL_ASSET", 11.2, 4.4, ["• id (PK, String)", "• editionId (FK)", "• filePath, fileHash", "• samplePages (Int)"], "#065F46"),
        ("ORDER & ORDER_ITEM", 2.2, 4.4, ["• id (PK, String)", "• buyerId (FK)", "• status (PENDING, PAID...)", "• totalAmount, snapshot"], "#991B1B"),
        ("SUBSCRIPTION", 2.2, 1.8, ["• id (PK, String)", "• userId (FK)", "• planId (FK)", "• status, startsAt, endsAt"], "#3730A3"),
        ("READING_PROGRESS", 6.8, 1.8, ["• id (PK, String)", "• userId, bookId (FK)", "• progressPercentage", "• bookmarks, highlights"], "#1E3A8A"),
        ("CHATBOT_SESSION", 11.2, 1.8, ["• id (PK, String)", "• userId (FK)", "• title, messages[]", "• feedback (thumbs)"], "#581C87"),
    ]

    for title, cx, cy, fields, color in entities:
        box = patches.FancyBboxPatch((cx-1.6, cy-1.1), 3.2, 2.2, boxstyle="round,pad=0.08", ec=color, fc="#F8FAFC", lw=1.8)
        ax.add_patch(box)
        hdr = patches.Rectangle((cx-1.6, cy+0.6), 3.2, 0.5, fc=color)
        ax.add_patch(hdr)
        ax.text(cx, cy+0.85, title, fontsize=10, fontweight='bold', ha='center', va='center', color="white")

        y_offset = 0.35
        for f in fields:
            ax.text(cx-1.4, cy+y_offset, f, fontsize=8.5, ha='left', va='center', color="#334155")
            y_offset -= 0.32

    # Relationship Lines
    relations = [
        ((3.8, 7.2), (5.2, 7.2), "1 : N (Tương tác)"),
        ((8.4, 7.2), (9.6, 7.2), "N : 1 (Thuộc nhóm)"),
        ((6.8, 6.1), (6.8, 5.5), "1 : N (Có phiên bản)"),
        ((8.4, 4.4), (9.6, 4.4), "1 : 1 (File số)"),
        ((2.2, 6.1), (2.2, 5.5), "1 : N (Đặt hàng)"),
        ((2.2, 3.3), (2.2, 2.9), "1 : N (Hội viên)"),
        ((5.2, 1.8), (3.8, 1.8), "N : 1 (Độc giả)"),
        ((8.4, 1.8), (9.6, 1.8), "N : 1 (Hỏi đáp)"),
    ]

    for start, end, label in relations:
        ax.annotate('', xy=end, xytext=start, arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
        mx, my = (start[0] + end[0])/2, (start[1] + end[1])/2
        ax.text(mx, my+0.15, label, fontsize=7.5, ha='center', color="#64748B", backgroundcolor="white")

    ax.set_title("SƠ ĐỒ QUAN HỆ THỰC THỂ CƠ SỞ DỮ LIỆU (ERD) BOOKVERSE AI", fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_04_erd.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 5. SƠ ĐỒ USE CASE
# -------------------------------------------------------------
def make_usecase_diagram():
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # System boundary
    rect = patches.Rectangle((3.5, 0.4), 8.8, 7.2, ec="#3B82F6", fc="#F8FAFC", lw=2, linestyle='--')
    ax.add_patch(rect)
    ax.text(7.9, 7.3, "HỆ THỐNG BOOKVERSE AI", fontsize=13, fontweight='bold', ha='center', color="#1E40AF")

    actors = [
        ("Khách\n(Guest)", 1.5, 6.5, "#64748B"),
        ("Độc giả\n(Reader)", 1.5, 4.2, "#2563EB"),
        ("Người bán\n(Seller)", 1.5, 2.2, "#059669"),
        ("Quản trị\n(Admin)", 1.5, 0.8, "#D97706"),
    ]

    for name, ax_x, ax_y, col in actors:
        circle = patches.Circle((ax_x, ax_y+0.2), 0.25, ec=col, fc="#E2E8F0", lw=1.5)
        ax.add_patch(circle)
        ax.text(ax_x, ax_y-0.25, name, fontsize=9.5, fontweight='bold', ha='center', color="#1E293B")

    usecases = [
        ("UC01: Xem Catalog & Tìm kiếm", 5.5, 6.6),
        ("UC02: Đọc thử Ebook (10%)", 5.5, 5.8),
        ("UC03: Đăng ký / Đăng nhập", 5.5, 5.0),
        ("UC04: Đọc toàn bộ & Bookmark", 8.0, 5.8),
        ("UC05: Mua sách & Đăng ký gói", 8.0, 5.0),
        ("UC06: Hỏi Trợ lý AI (RAG)", 8.0, 4.2),
        ("UC07: Thống kê & Mục tiêu đọc", 8.0, 3.4),
        ("UC08: Đăng tin bán sách cũ", 10.5, 4.2),
        ("UC09: Xử lý đơn hàng gian hàng", 10.5, 3.4),
        ("UC10: Kiểm duyệt tin & Sách", 10.5, 2.2),
        ("UC11: Quản lý User & Phân quyền", 10.5, 1.4),
        ("UC12: Xem Báo cáo Analytics", 10.5, 0.6),
    ]

    for title, ux, uy in usecases:
        ellipse = patches.Ellipse((ux, uy), 2.2, 0.65, ec="#3B82F6", fc="#EFF6FF", lw=1.2)
        ax.add_patch(ellipse)
        ax.text(ux, uy, title, fontsize=8, ha='center', va='center', color="#1E3A8A", fontweight='bold')

    # Connections from actors
    connections = [
        (1.8, 6.7, 4.4, 6.6), (1.8, 6.7, 4.4, 5.8), (1.8, 6.7, 4.4, 5.0),
        (1.8, 4.2, 4.4, 5.0), (1.8, 4.2, 6.9, 5.8), (1.8, 4.2, 6.9, 5.0), (1.8, 4.2, 6.9, 4.2), (1.8, 4.2, 6.9, 3.4),
        (1.8, 2.2, 9.4, 4.2), (1.8, 2.2, 9.4, 3.4),
        (1.8, 0.8, 9.4, 2.2), (1.8, 0.8, 9.4, 1.4), (1.8, 0.8, 9.4, 0.6),
    ]

    for sx, sy, ex, ey in connections:
        ax.plot([sx, ex], [sy, ey], color="#94A3B8", lw=1, linestyle='-')

    ax.set_title("SƠ ĐỒ USE CASE TOÀN HỆ THỐNG BOOKVERSE AI", fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_02_usecase_diagram.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 6. SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS)
# -------------------------------------------------------------
def make_sequence_diagrams():
    # 6a. Sequence Auth
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis('off')

    cols = [("User / Browser", 1.5), ("Login UI", 4.0), ("Auth.js API", 6.5), ("PostgreSQL DB", 9.5)]
    for name, cx in cols:
        ax.add_patch(patches.FancyBboxPatch((cx-1.0, 5.3), 2.0, 0.5, boxstyle="round,pad=0.05", ec="#2563EB", fc="#DBEAFE"))
        ax.text(cx, 5.55, name, fontsize=9.5, fontweight='bold', ha='center', va='center')
        ax.plot([cx, cx], [0.5, 5.3], color="#94A3B8", linestyle="--", lw=1.2)

    messages = [
        (1.5, 4.0, 4.0, "1. Nhập email + mật khẩu", "->"),
        (4.0, 6.5, 3.3, "2. signIn('credentials', {email, pass})", "->"),
        (6.5, 9.5, 2.6, "3. findUnique({where: {email}})", "->"),
        (9.5, 6.5, 1.9, "4. Trả User Record (Hash, Role, isLocked)", "-->"),
        (6.5, 6.5, 1.5, "[bcrypt.compare mật khẩu]", "loop"),
        (6.5, 4.0, 1.0, "5. Sinh JWT Token (userId, role)", "-->"),
        (4.0, 1.5, 0.6, "6. Đăng nhập thành công, chuyển hướng", "-->"),
    ]

    for sx, ex, y, text, style in messages:
        if style == "loop":
            ax.text(sx+0.1, y, text, fontsize=8.5, color="#D97706", fontweight='bold')
        else:
            ls = "--" if style == "-->" else "-"
            ax.annotate('', xy=(ex, y), xytext=(sx, y), arrowprops=dict(arrowstyle="->", color="#1E293B", lw=1.2, linestyle=ls))
            ax.text((sx+ex)/2, y+0.12, text, fontsize=8.5, ha='center', va='bottom', color="#1E293B")

    ax.set_title("SƠ ĐỒ TUẦN TỰ ĐĂNG NHẬP VÀ XÁC THỰC PHÂN QUYỀN", fontsize=13, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_06_seq_auth.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

    # 6b. Sequence RAG
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis('off')

    cols = [("User", 1.2), ("/api/chat", 3.8), ("Knowledge & DB", 6.8), ("OpenAI / Fallback", 9.8)]
    for name, cx in cols:
        ax.add_patch(patches.FancyBboxPatch((cx-1.0, 5.3), 2.0, 0.5, boxstyle="round,pad=0.05", ec="#7C3AED", fc="#EDE9FE"))
        ax.text(cx, 5.55, name, fontsize=9.5, fontweight='bold', ha='center', va='center')
        ax.plot([cx, cx], [0.5, 5.3], color="#94A3B8", linestyle="--", lw=1.2)

    messages = [
        (1.2, 3.8, 4.0, "1. Gửi câu hỏi tự nhiên + sessionId", "->"),
        (3.8, 3.8, 3.5, "[Phân loại Intent (9 nhóm)]", "loop"),
        (3.8, 6.8, 2.9, "2. Truy xuất bài tri thức & Catalog", "->"),
        (6.8, 3.8, 2.3, "3. Trả Context + Validated Book IDs", "-->"),
        (3.8, 9.8, 1.7, "4. Gửi Context đã đóng gói", "->"),
        (9.8, 3.8, 1.1, "5. Phản hồi câu trả lời có nguồn", "-->"),
        (3.8, 1.2, 0.6, "6. Trả lời hiển thị (Answer, Books, Provider)", "-->"),
    ]

    for sx, ex, y, text, style in messages:
        if style == "loop":
            ax.text(sx+0.1, y, text, fontsize=8.5, color="#7C3AED", fontweight='bold')
        else:
            ls = "--" if style == "-->" else "-"
            ax.annotate('', xy=(ex, y), xytext=(sx, y), arrowprops=dict(arrowstyle="->", color="#1E293B", lw=1.2, linestyle=ls))
            ax.text((sx+ex)/2, y+0.12, text, fontsize=8.5, ha='center', va='bottom', color="#1E293B")

    ax.set_title("SƠ ĐỒ TUẦN TỰ TRỢ LÝ AI RAG (RETRIEVAL-AUGMENTED GENERATION)", fontsize=13, fontweight='bold', pad=10)
    plt.tight_layout()
    out = os.path.join(DIAGRAM_DIR, 'fig_08_seq_rag.png')
    plt.savefig(out, dpi=300)
    plt.close()
    print("Created:", out)

# -------------------------------------------------------------
# 7. COPY DEMO FRAMES VÀO THESIS SCREENSHOTS
# -------------------------------------------------------------
def map_demo_frames():
    src_dir = 'D:/Doantotnghiep/actual_demo_frames_run2'
    if not os.path.exists(src_dir):
        print("Source frames dir not found:", src_dir)
        return

    mapping = {
        '0001.jpg': '01_homepage.png',
        '0010.jpg': '02_catalog.png',
        '0023.jpg': '08_book_detail.png',
        '0033.jpg': '05_marketplace.png',
        '0045.jpg': '04_login.png',
        '0050.jpg': '09_membership.png',
        '0060.jpg': '10_reader.png',
        '0066.jpg': '12b_reading_insights.png',
        '0078.jpg': '11_assistant.png',
        '0088.jpg': '06_recommendations.png',
        '0092.jpg': '13_admin.png',
    }

    for src_f, dst_f in mapping.items():
        src_p = os.path.join(src_dir, src_f)
        dst_p = os.path.join(DIAGRAM_DIR, dst_f)
        if os.path.exists(src_p):
            # Open with PIL and save as PNG/JPG
            im = Image.open(src_p)
            im.save(dst_p, quality=95)
            print(f"Mapped {src_f} -> {dst_f}")

if __name__ == '__main__':
    print("=== Generating Diagrams ===")
    make_eval_chart()
    make_context_diagram()
    make_architecture_diagram()
    make_erd_diagram()
    make_usecase_diagram()
    make_sequence_diagrams()
    print("=== Mapping Demo Frames ===")
    map_demo_frames()
    print("=== All Assets Created Successfully ===")
