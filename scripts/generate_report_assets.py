"""Tạo tất cả hình ảnh sơ đồ (Diagrams) và chụp màn hình thực tế (Screenshots) cho Báo cáo ĐATN."""

from __future__ import annotations

import os
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image, ImageDraw, ImageFont


ASSETS_DIR = Path("outputs/report-assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def create_code_image(filename: str, title: str, code_lines: list[str]):
    """Tạo ảnh khối code phong cách Dark Theme Visual Studio Code sắc nét."""
    font_size = 14
    line_height = 22
    padding = 20
    width = 800
    height = len(code_lines) * line_height + padding * 2 + 30

    img = Image.new("RGB", (width, height), color="#1E1E1E")
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (width, 28)], fill="#2D2D2D")
    draw.ellipse([(12, 9), (22, 19)], fill="#FF5F56")
    draw.ellipse([(28, 9), (38, 19)], fill="#FFBD2E")
    draw.ellipse([(44, 9), (54, 19)], fill="#27C93F")
    draw.text((70, 6), title, fill="#CCCCCC")

    y = 38
    for i, line in enumerate(code_lines):
        line_num = f"{i+1:2d}  "
        draw.text((padding, y), line_num, fill="#5A5A5A")
        
        # Simple syntax coloring
        text_x = padding + 40
        color = "#D4D4D4"
        if line.strip().startswith("//") or line.strip().startswith("#"):
            color = "#6A9955"
        elif "public" in line or "class" in line or "def " in line or "return" in line or "var " in line or "import " in line:
            color = "#569CD6"
        elif "double" in line or "int " in line or "string" in line or "List<" in line:
            color = "#4EC9B0"
        elif '"' in line or "'" in line:
            color = "#CE9178"
        
        draw.text((text_x, y), line, fill=color)
        y += line_height

    out_path = ASSETS_DIR / filename
    img.save(str(out_path), "PNG")
    print(f"Saved: {out_path}")


def create_diagram_flowchart(filename: str, title: str, steps: list[str], is_decision=False):
    """Tạo sơ đồ khối quy trình/hoạt động chuẩn."""
    fig, ax = plt.subplots(figsize=(8, len(steps) * 1.0 + 1), dpi=200)
    ax.axis("off")

    y_pos = len(steps)
    for i, step in enumerate(steps):
        # Box
        box_color = "#E1F5FE" if i % 2 == 0 else "#E8F5E9"
        edge_color = "#0288D1" if i % 2 == 0 else "#388E3C"
        
        if is_decision and i == 1:
            # Diamond decision
            diamond = patches.Polygon([[4, y_pos - 0.4], [6, y_pos], [4, y_pos + 0.4], [2, y_pos]], closed=True, facecolor="#FFF9C4", edgecolor="#FBC02D", lw=1.5)
            ax.add_patch(diamond)
            ax.text(4, y_pos, step, ha="center", va="center", fontsize=9, fontweight="bold", color="#333333")
        else:
            box = patches.FancyBboxPatch((1.5, y_pos - 0.3), 5.0, 0.6, boxstyle="round,pad=0.1", facecolor=box_color, edgecolor=edge_color, lw=1.5)
            ax.add_patch(box)
            ax.text(4, y_pos, step, ha="center", va="center", fontsize=9.5, fontweight="bold", color="#1A237E")

        if i < len(steps) - 1:
            ax.annotate("", xy=(4, y_pos - 0.7), xytext=(4, y_pos - 0.3), arrowprops=dict(arrowstyle="->", color="#37474F", lw=1.5))
        y_pos -= 1.0

    ax.set_xlim(0, 8)
    ax.set_ylim(0, len(steps) + 0.8)
    out_path = ASSETS_DIR / filename
    plt.tight_layout()
    plt.savefig(str(out_path), bbox_inches="tight")
    plt.close()
    print(f"Saved: {out_path}")


def generate_all_diagrams():
    # Sơ đồ quy trình tổng quan
    create_diagram_flowchart(
        "hinh_1_1_quy_trinh_nghiep_vu.png",
        "Sơ đồ quy trình nghiệp vụ tổng quan",
        [
            "Bước 1: Đăng ký / Đăng nhập tài khoản",
            "Đăng nhập thành công?",
            "Bước 2: Duyệt danh mục & Chi tiết sách",
            "Bước 3: Tương tác (Đọc, Bookmark, Highlight, Mua)",
            "Bước 4: Tính toán Gợi ý cá nhân hóa (Hybrid Recommender)",
            "Bước 5: Trợ lý AI RAG hỗ trợ theo ngữ cảnh",
            "Bước 6: Ghi nhận nhật ký & Cập nhật mô hình"
        ],
        is_decision=True
    )

    # Activity Diagrams
    create_diagram_flowchart(
        "hinh_3_50_activity_content_based.png",
        "Sơ đồ hoạt động Content-based Filtering",
        [
            "Nhận thông tin sách người dùng quan tâm",
            "Trích xuất đặc trưng nội dung (Thể loại, Tác giả, Từ khóa mô tả)",
            "Tính vector đặc trưng cho sách (TF-IDF / Embeddings)",
            "Tính toán độ tương đồng Cosine Similarity giữa các sách",
            "Chọn lọc Top-K sách có độ tương đồng cao nhất",
            "Trả về danh sách gợi ý hiển thị trên giao diện"
        ]
    )

    create_diagram_flowchart(
        "hinh_3_51_activity_collaborative.png",
        "Sơ đồ hoạt động Collaborative Filtering",
        [
            "Thu thập ma trận tương tác User - Book (Đọc, Đánh giá, Mua)",
            "Xây dựng ma trận tương đồng Item - Item",
            "Tính toán độ tương quan hành vi giữa các độc giả",
            "Dự đoán điểm quan tâm của người dùng hiện tại",
            "Xếp hạng và lọc danh mục gợi ý",
            "Trả về danh sách sách tiềm năng được độc giả tương tự yêu thích"
        ]
    )

    create_diagram_flowchart(
        "hinh_3_52_activity_hybrid.png",
        "Sơ đồ hoạt động Hybrid Recommendation",
        [
            "Nhận dữ liệu người dùng (Hành vi + Thuộc tính sách quan tâm)",
            "Thực hiện song song Content-based và Collaborative Filtering",
            "Tính điểm số tổng hợp: Score = a * Score_Content + (1-a) * Score_CF",
            "Áp dụng Diversity Policy (Tối đa 2 sách/thể loại, 1 sách/tác giả)",
            "Trả về danh sách Top-N sách đa dạng và phù hợp nhất"
        ]
    )

    create_diagram_flowchart(
        "hinh_3_53_activity_rag_assistant.png",
        "Sơ đồ hoạt động Trợ lý AI RAG Assistant",
        [
            "Người dùng gửi câu hỏi tự nhiên vào Trợ lý BookVerse",
            "Phân loại ý định nghiệp vụ (Intent Routing 9 nhóm)",
            "Truy xuất bài viết tri thức tĩnh & Số liệu tài khoản từ Database",
            "Xây dựng Grounding Context loại bỏ nguy cơ ảo giác (Hallucination)",
            "Chuyển tiếp Context tới LLM (GPT-4o-mini / Gemini 1.5)",
            "Fallback nội bộ an toàn nếu mất kết nối LLM ngoài",
            "Hiển thị phản hồi kèm thẻ sách & liên kết trực tiếp"
        ]
    )

    create_diagram_flowchart(
        "hinh_3_54_activity_admin.png",
        "Sơ đồ hoạt động Quản trị viên Admin",
        [
            "Quản trị viên đăng nhập Admin Center",
            "Kiểm tra xác thực & Quyền hạn Quản trị (RBAC)",
            "Xem Dashboard Analytics, Thống kê doanh thu & Thuê bao hội viên",
            "Quản lý danh mục sách & Kiểm tra chất lượng dữ liệu (Data Quality)",
            "Giám sát trạng thái kết nối hạ tầng AI Service và PostgreSQL pgvector",
            "Lưu vết nhật ký và đồng bộ dữ liệu"
        ]
    )

    # Code Snippets Images
    create_code_image(
        "hinh_3_10_code_trich_xuat_dac_trung.png",
        "ExtractFeatures.cs - Trích xuất đặc trưng sách",
        [
            "public List<string> ExtractFeatures(Book book) {",
            "    var features = new List<string>();",
            "    // Metadata: Thể loại, tác giả, nhà xuất bản",
            "    if (!string.IsNullOrWhiteSpace(book.Category?.Name))",
            "        features.Add(book.Category.Name.ToLower());",
            "    if (!string.IsNullOrWhiteSpace(book.Author))",
            "        features.Add(book.Author.ToLower());",
            "    if (!string.IsNullOrWhiteSpace(book.Publisher))",
            "        features.Add(book.Publisher.ToLower());",
            "    // Tách từ khóa tiêu đề và tóm tắt",
            "    if (!string.IsNullOrWhiteSpace(book.Title))",
            "        features.AddRange(book.Title.ToLower().Split(' '));",
            "    return features;",
            "}"
        ]
    )

    create_code_image(
        "hinh_3_12_code_cosine_similarity.png",
        "CosineSimilarity.cs - Tính toán độ tương đồng Cosine",
        [
            "public double CosineSimilarity(double[] vectorA, double[] vectorB) {",
            "    double dotProduct = 0.0, normA = 0.0, normB = 0.0;",
            "    for (int i = 0; i < vectorA.Length; i++) {",
            "        dotProduct += vectorA[i] * vectorB[i];",
            "        normA += vectorA[i] * vectorA[i];",
            "        normB += vectorB[i] * vectorB[i];",
            "    }",
            "    if (normA == 0.0 || normB == 0.0) return 0.0;",
            "    return dotProduct / (Math.Sqrt(normA) * Math.Sqrt(normB));",
            "}"
        ]
    )

    create_code_image(
        "hinh_3_19_code_hybrid_score.png",
        "HybridRecommender.cs - Kết hợp điểm số Hybrid và Diversity Policy",
        [
            "public List<BookRecommendation> CalculateHybridScore(string userId, string currentBookId, double alpha = 0.5) {",
            "    var contentScores = GetContentBasedScores(currentBookId);",
            "    var behaviorScores = GetCollaborativeScores(userId);",
            "    var hybridList = new List<BookRecommendation>();",
            "    foreach (var bookId in allCandidateBookIds) {",
            "        double cb = contentScores.GetValueOrDefault(bookId, 0.0);",
            "        double cf = behaviorScores.GetValueOrDefault(bookId, 0.0);",
            "        double finalScore = alpha * cb + (1.0 - alpha) * cf;",
            "        hybridList.Add(new BookRecommendation(bookId, finalScore));",
            "    }",
            "    return ApplyDiversityPolicy(hybridList.OrderByDescending(x => x.Score));",
            "}"
        ]
    )

    create_code_image(
        "hinh_3_21_code_rag_intent_routing.png",
        "rag_intent_router.py - Phân loại ý định RAG 6 bước tất định",
        [
            "@router.post('/api/assistant/chat')",
            "async def assistant_chat(req: ChatRequest, user: CurrentUser):",
            "    # 1. Phân loại ý định tất định (Intent Routing)",
            "    intent = classify_intent(req.message)",
            "    # 2. Truy xuất bài viết tri thức tĩnh theo intent",
            "    knowledge_context = retrieve_static_knowledge(intent)",
            "    # 3. Truy xuất cơ sở dữ liệu tài khoản thuộc đúng user",
            "    user_context = await get_user_ownership_data(user.id)",
            "    # 4. Tạo prompt xác thực & gọi LLM kèm Fallback",
            "    response = await generate_grounded_response(req.message, knowledge_context, user_context)",
            "    return {'reply': response.content, 'sources': response.sources}",
        ]
    )


if __name__ == "__main__":
    generate_all_diagrams()
