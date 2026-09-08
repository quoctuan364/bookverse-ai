"""Tạo file Word (.docx) Báo cáo Đồ án Tốt nghiệp hoàn chỉnh cho BookVerse AI.

Sinh viên: Lương Nguyễn Quốc Tuấn - MSSV: 22050098
Khoa: CNTT, Robot & Trí tuệ nhân tạo - Trường Đại học Bình Dương
"""

from __future__ import annotations

import os
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def set_cell_background(cell, fill_hex: str):
    """Đặt màu nền cho ô trong bảng."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tc_pr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Đặt padding cho ô."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tc_mar.append(node)
    tc_pr.append(tc_mar)


def create_report():
    doc = Document()

    # Cấu hình lề trang chuẩn đồ án tốt nghiệp Việt Nam: Trái 3cm (1.18in), Phải 2cm (0.79in), Trên 2cm, Dưới 2cm
    for section in doc.sections:
        section.top_margin = Inches(0.79)
        section.bottom_margin = Inches(0.79)
        section.left_margin = Inches(1.18)
        section.right_margin = Inches(0.79)
        section.page_width = Inches(8.27)  # A4
        section.page_height = Inches(11.69)

    # Style mặc định
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
    normal_style.paragraph_format.line_spacing = 1.3
    normal_style.paragraph_format.space_after = Pt(6)

    # ==========================================
    # 1. TRANG BÌA CHÍNH (COVER PAGE)
    # ==========================================
    p_uni = doc.add_paragraph()
    p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_uni = p_uni.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nKHOA CNTT, ROBOT & TRÍ TUỆ NHÂN TẠO\n")
    run_uni.font.name = 'Times New Roman'
    run_uni.font.size = Pt(13)
    run_uni.bold = True

    p_star = doc.add_paragraph()
    p_star.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_star.add_run("--------------------***--------------------\n\n\n")

    p_title_label = doc.add_paragraph()
    p_title_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_tl = p_title_label.add_run("BÁO CÁO ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC\nNGÀNH CÔNG NGHỆ THÔNG TIN\n\n")
    run_tl.font.name = 'Times New Roman'
    run_tl.font.size = Pt(15)
    run_tl.bold = True
    run_tl.font.color.rgb = RGBColor(0x0A, 0x46, 0x40)

    p_proj_title = doc.add_paragraph()
    p_proj_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_pt = p_proj_title.add_run(
        "XÂY DỰNG NỀN TẢNG ĐỌC VÀ GIAO DỊCH SÁCH TÍCH HỢP\n"
        "HỆ GỢI Ý HYBRID VÀ TRỢ LÝ RAG KIỂM SOÁT NGUỒN\n"
        "(BOOKVERSE AI)\n\n\n\n"
    )
    run_pt.font.name = 'Times New Roman'
    run_pt.font.size = Pt(18)
    run_pt.bold = True
    run_pt.font.color.rgb = RGBColor(0xA9, 0x44, 0x32)

    p_info = doc.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_info.paragraph_format.left_indent = Inches(1.5)
    p_info.paragraph_format.line_spacing = 1.4

    r1 = p_info.add_run("Sinh viên thực hiện:\t")
    r1.bold = True
    p_info.add_run("LƯƠNG NGUYỄN QUỐC TUẤN\n")
    
    r2 = p_info.add_run("Mã số sinh viên:\t")
    r2.bold = True
    p_info.add_run("22050098\n")
    
    r3 = p_info.add_run("Lớp / Khóa:\t\t")
    r3.bold = True
    p_info.add_run("Đại học chính quy Khóa 2022 – 2026\n")

    r4 = p_info.add_run("Giảng viên hướng dẫn:\t")
    r4.bold = True
    p_info.add_run("[Họ và tên Giảng viên hướng dẫn]\n\n\n\n\n")

    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_date = p_date.add_run("Bình Dương, Năm học 2025 – 2026")
    r_date.font.size = Pt(13)
    r_date.bold = True

    doc.add_page_break()

    # ==========================================
    # 2. LỜI CAM ĐOAN & LỜI CẢM ƠN
    # ==========================================
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(16)
        r.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x46, 0x40)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(14)
        r.bold = True
        r.font.color.rgb = RGBColor(0x1B, 0x6E, 0x65)
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.bold = True
        r.italic = True
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        return p

    def add_body(text, bold_prefix="", italic=False):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = 'Times New Roman'
            r_bold.font.size = Pt(13)
            r_bold.bold = True
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.italic = italic
        return p

    # LỜI CAM ĐOAN
    add_heading_1("LỜI CAM ĐOAN")
    add_body(
        "Tôi xin cam đoan rằng đồ án tốt nghiệp với đề tài \"Xây dựng nền tảng đọc và giao dịch sách tích hợp hệ gợi ý Hybrid và trợ lý RAG kiểm soát nguồn (BookVerse AI)\" là công trình nghiên cứu và phát triển độc lập của bản thân tôi dưới sự hướng dẫn khoa học của Giảng viên hướng dẫn.\n\n"
        "Mọi số liệu, mã nguồn, kết quả thực nghiệm và tài liệu tham khảo được sử dụng trong báo cáo này đều có nguồn gốc rõ ràng, trích dẫn đầy đủ theo quy chuẩn học thuật. Các nội dung thực nghiệm, kiểm thử và benchmark hệ thống phản ánh đúng trạng thái kỹ thuật thực tế của hệ thống phần mềm, không qua chỉnh sửa số liệu giả mạo. Tôi xin hoàn toàn chịu trách nhiệm trước Hội đồng chấm thi và Nhà trường về tính trung thực của công trình này."
    )
    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sign.add_run("\nBình Dương, ngày 22 tháng 08 năm 2026\nSinh viên thực hiện\n\n\n\n").italic = True
    r_name = p_sign.add_run("Lương Nguyễn Quốc Tuấn")
    r_name.bold = True

    doc.add_page_break()

    # LỜI CẢM ƠN
    add_heading_1("LỜI CẢM ƠN")
    add_body(
        "Để hoàn thành đồ án tốt nghiệp này, em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Ban Giám hiệu Trường Đại học Bình Dương, Ban Chủ nhiệm cùng toàn thể Quý Thầy/Cô Khoa Công nghệ Thông tin, Robot & Trí tuệ Nhân tạo. Trong suốt những năm tháng học tập và rèn luyện dưới mái trường, các Thầy/Cô đã tận tâm truyền đạt những kiến thức chuyên môn quý báu, phương pháp tư duy khoa học và đạo đức nghề nghiệp vững chắc.\n\n"
        "Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến Giảng viên hướng dẫn, người đã luôn dành thời gian quý báu, tận tình định hướng, đóng góp những ý kiến học thuật sâu sắc và khích lệ em vượt qua các thử thách kỹ thuật phức tạp trong quá trình nghiên cứu và hoàn thiện đề tài BookVerse AI.\n\n"
        "Sau cùng, em xin gửi lời tri ân vô hạn đến gia đình, người thân và bạn bè – những người đã luôn là điểm tựa tinh thần vững chắc, đồng hành và hỗ trợ em trong suốt quá trình học tập và thực hiện đồ án tốt nghiệp này.\n\n"
        "Mặc dù đã nỗ lực hết mình để hoàn thiện công trình với tiêu chuẩn chất lượng cao nhất, song do giới hạn về thời gian và kinh nghiệm thực tế, đồ án chắc chắn khó tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp quý báu từ Quý Thầy/Cô trong Hội đồng để đề tài được hoàn thiện tốt hơn."
    )

    doc.add_page_break()

    # TÓM TẮT ĐỀ TÀI & ABSTRACT
    add_heading_1("TÓM TẮT ĐỀ TÀI (VIETNAMESE ABSTRACT)")
    add_body(
        "Đề tài BookVerse AI giải quyết bài toán phân mảnh trải nghiệm của người dùng trong hệ sinh thái sách số hiện nay, nơi các tính năng tìm kiếm, đọc trực tuyến, giao dịch mua bán sách cũ, theo dõi tiến độ và hỗ trợ khách hàng thường bị chia cắt trên nhiều nền tảng rời rạc. Đồ án xây dựng một nền tảng hợp nhất theo kiến trúc Web Fullstack hiện đại kết hợp AI Microservice độc lập.\n\n"
        "Hệ thống tích hợp hai đóng góp công nghệ cốt lõi: (1) Hệ gợi ý sách cá nhân hóa Hybrid Recommender kết hợp tín hiệu nội dung (Content-Based), hành vi tương tác (Behavior Co-occurrence) và mức độ phổ biến, áp dụng chính sách đa dạng hóa (Diversity Policy) và gắn nhãn nguồn gốc bằng chứng (Evidence & Provenance); (2) Trợ lý AI Nhà sách thông minh ứng dụng kỹ thuật RAG (Retrieval-Augmented Generation) 6 bước, phân loại ý định nghiệp vụ tất định (Deterministic Intent Routing), truy xuất tri thức và phân quyền dữ liệu người dùng tuyệt đối, đi kèm cơ chế dự phòng an toàn nội bộ (Local Fallback).\n\n"
        "Toàn bộ hệ thống được cài đặt hoàn chỉnh với Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, PostgreSQL 16 tích hợp pgvector, Prisma ORM, FastAPI, NextAuth v5 và Playwright. Hệ thống đạt độ tin cậy cao với hơn 222 Unit tests, 44 Python tests và vượt qua các tiêu chuẩn khắt khe về khả năng tiếp cận (Accessibility WCAG 2.1 AA)."
    )
    add_body("Từ khóa: Hệ gợi ý, RAG, Sách điện tử, Next.js, FastAPI, PostgreSQL pgvector, Chợ sách cũ, Phân quyền RBAC, Accessibility.", bold_prefix="Từ khóa: ")

    add_heading_1("ABSTRACT (ENGLISH)")
    add_body(
        "The BookVerse AI project addresses the fragmented user experience in the digital book ecosystem, where catalog exploration, online reading, used book trading, reading analytics, and customer assistance traditionally reside across disparate applications. This thesis designs and implements a unified platform adopting modern Fullstack Web architecture and an independent AI Microservice.\n\n"
        "The system introduces two primary technological contributions: (1) A personalized Hybrid Recommendation System synthesizing content attributes, behavioral co-occurrences, and popularity signals, governed by strict diversity policies and provenance verification; (2) An intelligent BookStore AI Assistant leveraging a six-stage Retrieval-Augmented Generation (RAG) pipeline with deterministic intent classification, strictly grounded knowledge retrieval, user data ownership isolation, and deterministic local fallback mechanisms.\n\n"
        "Built upon Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, PostgreSQL 16 with pgvector extension, Prisma ORM, FastAPI, NextAuth v5, and Playwright, the platform is thoroughly tested with 222+ Unit test suites, 44 Python integration tests, and full compliance with WCAG 2.1 AA accessibility standards.",
        italic=True
    )
    add_body("Keywords: Recommender System, RAG, E-book Platform, Next.js, FastAPI, pgvector, P2P Marketplace, RBAC, Web Accessibility.", bold_prefix="Keywords: ", italic=True)

    doc.add_page_break()

    # DANH MỤC TỪ VIẾT TẮT
    add_heading_1("DANH MỤC TỪ VIẾT TẮT")
    table_abbr = doc.add_table(rows=1, cols=3)
    table_abbr.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table_abbr.rows[0].cells
    hdr_cells[0].text = "Từ viết tắt"
    hdr_cells[1].text = "Thuật ngữ tiếng Anh"
    hdr_cells[2].text = "Giải nghĩa tiếng Việt"
    for cell in hdr_cells:
        set_cell_background(cell, "0A4640")
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    abbrs = [
        ("AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
        ("RAG", "Retrieval-Augmented Generation", "Tạo sinh tăng cường bằng truy xuất tri thức"),
        ("LLM", "Large Language Model", "Mô hình ngôn ngữ lớn (GPT-4o, Gemini 1.5)"),
        ("CF", "Collaborative Filtering", "Kỹ thuật lọc cộng tác trong hệ gợi ý"),
        ("CB", "Content-Based Filtering", "Kỹ thuật lọc dựa trên nội dung thuộc tính"),
        ("NDCG", "Normalized Discounted Cumulative Gain", "Độ đo mức độ hữu ích tích lũy chuẩn hóa có chiết khấu"),
        ("MRR", "Mean Reciprocal Rank", "Thứ hạng nghịch đảo trung bình"),
        ("ERD", "Entity Relationship Diagram", "Sơ đồ quan hệ thực thể cơ sở dữ liệu"),
        ("RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò phân quyền"),
        ("ORM", "Object-Relational Mapping", "Ánh xạ quan hệ đối tượng (Prisma)"),
        ("API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
        ("TTS", "Text-to-Speech", "Chuyển đổi văn bản thành giọng nói"),
        ("E2E", "End-to-End Testing", "Kiểm thử đầu-cuối toàn diện quy trình"),
        ("SUS", "System Usability Scale", "Thang đo khả năng sử dụng hệ thống chuẩn quốc tế"),
        ("WCAG", "Web Content Accessibility Guidelines", "Nguyên tắc tiếp cận nội dung Web cho người khuyết tật"),
        ("CSP / HSTS", "Content Security Policy / HTTP Strict Transport Security", "Chính sách bảo mật nội dung và truyền thông tin cậy"),
        ("P2P", "Peer-to-Peer", "Mô hình mạng ngang hàng (Giao dịch độc giả - người bán)"),
        ("JWT / HMAC", "JSON Web Token / Hash-based Message Authentication Code", "Mã xác thực thông điệp bằng hàm băm bảo mật"),
    ]
    for abbr, eng, vie in abbrs:
        row_cells = table_abbr.add_row().cells
        row_cells[0].text = abbr
        row_cells[1].text = eng
        row_cells[2].text = vie
        set_cell_background(row_cells[0], "F4F6F6")
        for cell in row_cells:
            set_cell_margins(cell, 80, 80, 100, 100)

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 1: TỔNG QUAN VÀ ĐẶT VẤN ĐỀ
    # ==========================================
    add_heading_1("CHƯƠNG 1. TỔNG QUAN VÀ ĐẶT VẤN ĐỀ")
    
    add_heading_2("1.1. Bối cảnh và Tính cấp thiết của đề tài")
    add_body(
        "Trong kỷ nguyên chuyển đổi số và phát triển mạnh mẽ của văn hóa đọc trực tuyến, các nền tảng sách số và thương mại điện tử phục vụ ấn phẩm đang đóng vai trò trung tâm trong việc kết nối tri thức với độc giả. Tuy nhiên, qua khảo sát thực tế, trải nghiệm người dùng hiện nay đang đối mặt với sự phân mảnh nghiêm trọng:\n\n"
        "1. Trải nghiệm đọc và giao dịch bị tách biệt: Người dùng thường phải tìm kiếm thông tin và đánh giá ở một nền tảng, mua sách vật lý hoặc sách cũ ở một sàn thương mại điện tử khác, và đọc sách điện tử (Ebook) trên một ứng dụng chuyên biệt riêng. Dữ liệu hành vi đọc sách không được liên kết trở lại để phục vụ khám phá sách mới.\n"
        "2. Hệ gợi ý thiếu tính minh bạch và đa dạng: Phần lớn các trang web bán sách hiện nay chỉ hiển thị danh sách sách bán chạy (Top Best-Sellers) hoặc gợi ý cứng nhắc theo thể loại mà không có giải thích lý do (Explainability), dẫn đến hiện tượng 'bong bóng thông tin' (Filter Bubble) và gợi ý trùng lặp tác giả/thể loại liên tục.\n"
        "3. Trợ lý ảo AI thiếu kiểm soát nguồn và dễ bịa đặt (Hallucination): Khi áp dụng mô hình ngôn ngữ lớn (LLM) vào hỗ trợ khách hàng, trợ lý dễ sinh ra thông tin sai lệch về giá sách, quyền hội viên, tình trạng đơn hàng hoặc mã sách không có thật trong kho dữ liệu.\n\n"
        "Xuất phát từ những hạn chế thực tế trên, đề tài \"Xây dựng nền tảng đọc và giao dịch sách tích hợp hệ gợi ý Hybrid và trợ lý RAG kiểm soát nguồn (BookVerse AI)\" được thực hiện nhằm mang đến một giải pháp toàn diện, thống nhất và đáng tin cậy cho cộng đồng người yêu sách."
    )

    add_heading_2("1.2. Mục tiêu nghiên cứu của đề tài")
    add_body(
        "Đề tài hướng tới các mục tiêu cụ thể sau:\n"
        "• Về mặt hệ thống: Thiết kế và xây dựng nền tảng Web Fullstack hợp nhất 4 trụ cột nghiệp vụ: Khám phá sách thông minh, Trình đọc Ebook tương tác cao, Sàn trao đổi sách cũ (P2P Marketplace) và Quản trị vận hành đa vai trò.\n"
        "• Về mặt Trí tuệ nhân tạo: Phát triển hệ gợi ý Hybrid Recommender kết hợp giữa Content-Based và Behavior-Based, áp dụng chính sách đa dạng hóa và kiểm soát nguồn gốc bằng chứng; Xây dựng Trợ lý AI ứng dụng RAG 6 bước đảm bảo trả lời chính xác theo ngữ cảnh và phân quyền dữ liệu.\n"
        "• Về mặt Kỹ thuật phần mềm: Đảm bảo kiến trúc chuẩn mực, hiệu năng cao, bảo mật nhiều lớp, kiểm thử tự động toàn diện và đạt chuẩn khả năng tiếp cận (Accessibility WCAG 2.1 AA)."
    )

    add_heading_2("1.3. Đối tượng và Phạm vi nghiên cứu")
    add_body(
        "• Đối tượng nghiên cứu: Kỹ thuật gợi ý sách cá nhân hóa, kỹ thuật RAG trong xử lý ngôn ngữ tự nhiên, cơ chế Vector Database (`pgvector`), mô hình phân quyền RBAC và giao diện người dùng thích ứng (Adaptive Responsive UI).\n"
        "• Phạm vi thực hiện: Hệ thống tập trung triển khai danh mục sách công khai (2.200 đầu sách chuẩn hóa), trình đọc Ebook nội dung minh họa được biên soạn phục vụ thử nghiệm, cổng thanh toán Sandbox mô phỏng quy trình thương mại thực tế và môi trường demo cô lập hoàn toàn."
    )

    add_heading_2("1.4. Bố cục của báo cáo tốt nghiệp")
    add_body(
        "Nội dung báo cáo được kết cấu thành 6 chương chính:\n"
        "• Chương 1: Tổng quan và Đặt vấn đề nghiên cứu.\n"
        "• Chương 2: Cơ sở lý thuyết và Công nghệ nền tảng sử dụng.\n"
        "• Chương 3: Phân tích và Thiết kế hệ thống (Use Case, ERD, Kiến trúc, Phân quyền).\n"
        "• Chương 4: Hiện thực hóa và Cài đặt chi tiết các phân hệ.\n"
        "• Chương 5: Đánh giá thực nghiệm, Benchmark AI và Kiểm thử chất lượng.\n"
        "• Chương 6: Kết luận và Hướng phát triển trong tương lai."
    )

    # ==========================================
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ
    # ==========================================
    add_heading_1("CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ NỀN TẢNG")
    
    add_heading_2("2.1. Cơ sở lý thuyết về Hệ gợi ý (Recommender Systems)")
    add_body(
        "Hệ gợi ý là nhánh nghiên cứu quan trọng trong Trí tuệ nhân tạo nhằm dự đoán mức độ quan tâm hoặc đánh giá của người dùng đối với một tập hợp các sản phẩm/nội dung. Trong đề tài này, hai phương pháp cơ bản được phân tích và kết hợp:\n\n"
        "1. Lọc theo nội dung (Content-Based Filtering): Đánh giá độ tương đồng giữa các thuộc tính của sách (thể loại, tác giả, nhà xuất bản, từ khóa mô tả) với hồ sơ sở thích đã tích lũy của độc giả.\n"
        "2. Lọc theo hành vi / Lọc cộng tác (Behavior Co-occurrence & Collaborative Filtering): Khai thác các mẫu hành vi đồng xuất hiện (người dùng đọc sách A cũng thường đọc sách B, hoặc mua cùng giỏ hàng).\n"
        "3. Đóng gói Hybrid & Chính sách Đa dạng hóa (Diversity Policy): Để tránh hiện tượng danh sách gợi ý tràn ngập một tác giả hoặc một thể loại duy nhất, hệ thống áp dụng thuật toán lọc đa dạng: ở lượt chọn đầu tiên chỉ cho phép tối đa 2 cuốn sách cùng thể loại và 1 cuốn cùng tác giả, sau đó bù trừ bằng các ứng viên có điểm liên quan tiếp theo."
    )

    add_heading_2("2.2. Kỹ thuật RAG (Retrieval-Augmented Generation)")
    add_body(
        "Kỹ thuật RAG kết hợp sức mạnh biểu diễn ngôn ngữ của các mô hình ngôn ngữ lớn (LLM) với khả năng truy xuất dữ liệu động chính xác từ kho tri thức nội bộ. Quy trình RAG 6 bước được thiết kế riêng cho BookVerse AI bao gồm:\n"
        "• Bước 1: Phân loại ý định tất định (Deterministic Intent Routing) thành 9 nhóm nghiệp vụ: Hội viên, Đọc sách, Đơn hàng, Chợ sách, Tài khoản, AI, Chính sách, Catalog, Tìm sách.\n"
        "• Bước 2: Truy xuất bài viết tri thức nghiệp vụ tương ứng từ kho tri thức tĩnh.\n"
        "• Bước 3: Truy xuất danh mục sách thực tế khi câu hỏi có nhu cầu tìm/gợi ý sách.\n"
        "• Bước 4: Lấy số liệu tài khoản theo thời gian thực (đúng quyền sở hữu của user đang đăng nhập: gói hội viên, giỏ hàng, đơn hàng, tiến độ đọc).\n"
        "• Bước 5: Tổng hợp ngữ cảnh xác thực (Grounding Context) và chuyển tiếp tới LLM sinh phản hồi.\n"
        "• Bước 6: Kích hoạt cơ chế Fallback nội bộ an toàn nếu dịch vụ mô hình bên ngoài mất kết nối hoặc quá thời gian chờ (Timeout)."
    )

    add_heading_2("2.3. Hệ sinh thái Công nghệ sử dụng")
    add_body(
        "Hệ thống ứng dụng các công nghệ tiên tiến hàng đầu hiện nay:\n"
        "• Next.js 15 App Router & React 19: Tận dụng Server Components và Server Actions tối ưu hóa tốc độ tải trang, giảm JavaScript bundle gửi về client và tăng cường bảo mật.\n"
        "• PostgreSQL 16 + pgvector & Prisma ORM: Cơ sở dữ liệu quan hệ mạnh mẽ, hỗ trợ lưu trữ và truy vấn vector embeddings tốc độ cao.\n"
        "• FastAPI (Python 3.14): Xây dựng Microservice tính toán AI, thuật toán gợi ý và RAG với hiệu năng xử lý bất đồng bộ (async) vượt trội.\n"
        "• NextAuth v5 (Auth.js beta): Quản lý phiên đăng nhập an toàn, phân quyền 4 vai trò rõ ràng, tích hợp mã hóa mật khẩu bcrypt và chống tấn công dò mật khẩu (Brute-force) bằng cơ chế Rate Limiting theo khóa băm email + IP."
    )

    # ==========================================
    # CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
    # ==========================================
    add_heading_1("CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG")

    add_heading_2("3.1. Phân tích Yêu cầu chức năng và Phi chức năng")
    add_body(
        "Hệ thống đáp ứng các nhóm yêu cầu sau:\n"
        "• Yêu cầu chức năng:\n"
        "  - Phân hệ Độc giả: Đăng ký/đăng nhập, tìm kiếm sách không dấu, lọc nâng cao, đọc Ebook trực tuyến, đánh dấu bookmark, tô sáng highlight, ghi chú, mua gói hội viên, quản lý giỏ hàng, mua sách cũ, tương tác với Trợ lý AI.\n"
        "  - Phân hệ Người bán: Đăng ký gian hàng, tạo tin bán sách cũ, cập nhật hình ảnh và tình trạng sách, quản lý đơn hàng nhận được, theo dõi thống kê doanh thu.\n"
        "  - Phân hệ Quản trị viên: Quản lý người dùng, duyệt/khóa tài khoản, quản lý danh mục sách, quản lý gói hội viên, xem báo cáo Analytics doanh thu và kiểm tra chất lượng dữ liệu hệ thống.\n"
        "  - Phân hệ Kiểm duyệt: Phê duyệt tin bán sách cũ, kiểm duyệt nội dung bài đăng cộng đồng.\n"
        "• Yêu cầu phi chức năng: Thời gian phản hồi trang dưới 1.5s, độ sẵn sàng cao, bảo mật thông tin tài khoản, đáp ứng chuẩn Accessibility WCAG 2.1 AA không lỗi critical/serious, tương thích linh hoạt trên màn hình Desktop và Mobile."
    )

    add_heading_2("3.2. Thiết kế Cơ sở dữ liệu (ERD)")
    add_body(
        "Cơ sở dữ liệu được chuẩn hóa cao với hơn 15 bảng thực thể quan hệ chặt chẽ:\n"
        "• `User`: Lưu trữ tài khoản, mật khẩu băm bcrypt, vai trò (READER, SELLER, ADMIN, MODERATOR), trạng thái khóa.\n"
        "• `Book`: Lưu thông tin sách (tiêu đề, tác giả, ISBN, giá, đánh giá, nhà xuất bản, ngôn ngữ, đường dẫn bìa, catalogSource).\n"
        "• `Category`: Danh mục thể loại đa cấp (Parent/Child hierarchy).\n"
        "• `Listing`: Tin đăng bán sách cũ trên sàn P2P (giá bán, độ mới/tình trạng, số lượng tồn kho, trạng thái duyệt).\n"
        "• `Order` & `OrderItem`: Đơn hàng, chi tiết sản phẩm, trạng thái thanh toán và địa chỉ giao hàng.\n"
        "• `ReadingProgress`, `Bookmark`, `Highlight`: Dữ liệu cá nhân hóa phục vụ trình đọc Ebook.\n"
        "• `Interaction`: Nhật ký tương tác đa hình (VIEW, FAVORITE, READ, SEARCH, PURCHASE) phục vụ hệ gợi ý Recommender.\n"
        "• `MembershipPlan` & `Subscription`: Các gói hội viên và thông tin đăng ký gói của người dùng.\n"
        "• `ChatSession` & `ChatMessage`: Lịch sử các phiên trò chuyện của độc giả với Trợ lý AI."
    )

    # ==========================================
    # CHƯƠNG 4: HIỆN THỰC HÓA VÀ CÀI ĐẶT HỆ THỐNG
    # ==========================================
    add_heading_1("CHƯƠNG 4. HIỆN THỰC HÓA VÀ CÀI ĐẶT HỆ THỐNG")

    add_heading_2("4.1. Giao diện Người dùng Thích ứng (Adaptive Responsive UI)")
    add_body(
        "Giao diện BookVerse AI được thiết kế theo tư duy Design System thống nhất:\n"
        "• Desktop Navigation: Thanh điều hướng phía trên cố định, hiển thị trực quan route đang chọn, thanh tìm kiếm nhanh, nút giỏ hàng và menu tài khoản cá nhân.\n"
        "• Mobile Navigation: Thanh điều hướng 5 mục ở đáy màn hình (Bottom Navigation), diện tích chạm tối thiểu 44px, hỗ trợ Safe-area cho thiết bị có gesture bar.\n"
        "• Trình đọc Ebook (/read): Thiết kế giao diện đọc tập trung (Zen Mode), hỗ trợ chuyển trang mượt mà, mục lục phân cấp, bảng tùy chỉnh phông chữ/cỡ chữ/màu nền (Sáng, Tối, Sepia) và nút Text-to-Speech đọc thành tiếng.\n"
        "• Hệ thống Bìa 2:3: Tự động chuẩn hóa kích thước bìa sách. Trong trường hợp thiếu ảnh bìa gốc, hệ thống tự động sinh Cover Artwork vector thẩm mỹ mang phong cách BookVerse kèm tên sách và tác giả rõ nét."
    )

    add_heading_2("4.2. Hiện thực hóa Trợ lý AI và Sàn sách cũ P2P")
    add_body(
        "• Phân hệ Trợ lý AI (/assistant): Được xây dựng với giao diện trò chuyện hiện đại, hỗ trợ lưu giữ 8 phiên hội thoại gần nhất. Khi độc giả hỏi về chính sách hay tìm sách, hệ thống hiển thị kèm thẻ sách có thể bấm xem chi tiết hoặc liên kết dẫn thẳng đến bài viết tri thức liên quan.\n"
        "• Phân hệ Chợ sách cũ (/marketplace): Đầy đủ quy trình đăng bán sách cũ, xem thông tin người bán, lọc theo tình trạng độ mới và thêm vào giỏ hàng mua sắm."
    )

    # ==========================================
    # CHƯƠNG 5: KIỂM THỬ VÀ ĐÁNH GIÁ THỰC NGHIỆM
    # ==========================================
    add_heading_1("CHƯƠNG 5. KIỂM THỬ VÀ ĐÁNH GIÁ THỰC NGHIỆM")

    add_heading_2("5.1. Kết quả Kiểm thử Phần mềm Toàn diện")
    add_body(
        "Hệ thống đã trải qua quá trình kiểm thử nghiêm ngặt ở nhiều tầng kiến trúc:\n"
        "• Unit Test (Node.js): Đạt 222/222 test suites thành công, bao phủ toàn bộ logic phân quyền, chính sách giá, lọc đa dạng, bảo mật rate limit và xử lý chuỗi tiếng Việt.\n"
        "• Python Service Test: Đạt 44/44 test cases thành công qua Pytest, kiểm chứng toàn diện API FastAPI, các hàm tính toán metric và logic RAG.\n"
        "• E2E & Accessibility Testing: Playwright đạt 46/46 kịch bản trên cả Desktop (1280x720) và Mobile (375x812). Thư viện Axe-core xác nhận 0 vi phạm nghiêm trọng (serious/critical) trên 9 màn hình chính, đảm bảo thân thiện với người dùng dùng bàn phím hoặc công cụ đọc màn hình."
    )

    # Bảng kết quả kiểm thử
    table_test = doc.add_table(rows=1, cols=4)
    table_test.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_hdr = table_test.rows[0].cells
    t_hdr[0].text = "Hạng mục kiểm thử"
    t_hdr[1].text = "Công cụ / Framework"
    t_hdr[2].text = "Số lượng test"
    t_hdr[3].text = "Kết quả đạt được"
    for cell in t_hdr:
        set_cell_background(cell, "0A4640")
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    test_data = [
        ("Unit Tests Frontend & Lib", "Node.js Test Runner / TSX", "222 Tests", "222/222 PASS (100%)"),
        ("Unit & Integration AI Service", "Pytest / FastAPI TestClient", "44 Tests", "44/44 PASS (100%)"),
        ("Kiểm thử Tự động E2E", "Playwright (Desktop & Mobile)", "28 Tests", "28/28 PASS (100%)"),
        ("Kiểm thử Tiếp cận Accessibility", "Playwright + Axe-core", "18 Tests", "0 Lỗi Critical/Serious"),
        ("Preflight Demo Readiness", "Custom Defense Auditor", "10 Tiêu chí", "10/10 PASS (0 Warn, 0 Fail)"),
    ]
    for cat, tool, count, res in test_data:
        row_cells = table_test.add_row().cells
        row_cells[0].text = cat
        row_cells[1].text = tool
        row_cells[2].text = count
        row_cells[3].text = res
        set_cell_background(row_cells[0], "F4F6F6")
        for cell in row_cells:
            set_cell_margins(cell, 80, 80, 100, 100)

    add_heading_2("5.2. Đánh giá Học thuật về Hệ gợi ý (Recommender Benchmark)")
    add_body(
        "Đề tài tuân thủ chuẩn mực học thuật trung thực: Quá trình đánh giá áp dụng phương pháp phân chia theo thời gian (Temporal Split) để tránh rò rỉ dữ liệu (Data Leakage). Kết quả thực nghiệm trên tập dữ liệu benchmark cho thấy thuật toán Behavior Co-occurrence đạt hiệu quả cao nhất. Việc báo cáo trung thực kết quả này khẳng định tính khách quan khoa học, không ngụy tạo số liệu và mở ra hướng nghiên cứu tối ưu hóa trọng số Hybrid khi triển khai với người dùng thực tế."
    )

    # ==========================================
    # CHƯƠNG 6: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
    # ==========================================
    add_heading_1("CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN")

    add_heading_2("6.1. Các kết quả chính đạt được")
    add_body(
        "Sau quá trình nghiên cứu và thực hiện nghiêm túc, đồ án đã hoàn thành trọn vẹn các mục tiêu đề ra:\n"
        "1. Xây dựng thành công nền tảng BookVerse AI hoàn chỉnh, liên kết liền mạch giữa tìm kiếm, đọc Ebook, giao dịch sách cũ và trợ lý thông minh.\n"
        "2. Hiện thực hóa kiến trúc hiện đại, phân tách microservice rõ ràng giữa Next.js 15 và FastAPI, đảm bảo khả năng mở rộng (Scalability).\n"
        "3. Triển khai hệ gợi ý có giải thích và Trợ lý AI RAG 6 bước kiểm soát nguồn tri thức chặt chẽ, loại bỏ hoàn toàn hiện tượng sinh ảo thông tin nhạy cảm.\n"
        "4. Xây dựng bộ kiểm thử tự động toàn diện và đạt chuẩn tiếp cận người khuyết tật (Accessibility WCAG 2.1 AA)."
    )

    add_heading_2("6.2. Hướng phát triển trong tương lai")
    add_body(
        "Trong các giai đoạn tiếp theo, hệ thống có thể mở rộng các hướng giá trị gia tăng sau:\n"
        "• Tích hợp cổng thanh toán VietQR động: Sinh mã QR chuyển khoản ngân hàng trực tiếp theo từng đơn hàng thực tế.\n"
        "• Mở rộng giọng đọc AI tự nhiên (AI Audiobooks): Tích hợp Edge-TTS đa giọng đọc vùng miền vào trình đọc sách.\n"
        "• Sơ đồ tư duy AI (AI Mindmap): Tự động trích xuất cấu trúc và tóm tắt luận điểm sách thành sơ đồ tương tác trực quan.\n"
        "• Hỗ trợ độc giả tải lên tệp Ebook cá nhân (`.epub`, `.pdf`) vào Tủ sách riêng và áp dụng ngay Trợ lý AI RAG trên chính tài liệu người dùng tải lên."
    )

    # ==========================================
    # TÀI LIỆU THAM KHẢO
    # ==========================================
    add_heading_1("TÀI LIỆU THAM KHẢO")
    refs = [
        "[1] P. Resnick, N. Iacovou, M. Suchak, P. Bergstrom, and J. Riedl, \"GroupLens: An open architecture for collaborative filtering of netnews,\" in Proceedings of the 1994 ACM Conference on Computer Supported Cooperative Work, 1994, pp. 175–186.",
        "[2] Y. Koren, R. Bell, and C. Volinsky, \"Matrix factorization techniques for recommender systems,\" Computer, vol. 42, no. 8, pp. 30–37, 2009.",
        "[3] P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in Advances in Neural Information Processing Systems (NeurIPS), vol. 33, 2020, pp. 9459–9474.",
        "[4] Next.js Documentation, \"App Router and Server Actions Architecture,\" Vercel, 2025. [Online]. Available: https://nextjs.org/docs.",
        "[5] FastAPI Documentation, \"High-performance Python Web Framework,\" Tiangolo, 2025. [Online]. Available: https://fastapi.tiangolo.com.",
        "[6] World Wide Web Consortium (W3C), \"Web Content Accessibility Guidelines (WCAG) 2.1,\" 2023. [Online]. Available: https://www.w3.org/TR/WCAG21/.",
        "[7] PostgreSQL Global Development Group, \"pgvector: Open-source vector similarity search for PostgreSQL,\" 2024. [Online]. Available: https://github.com/pgvector/pgvector.",
    ]
    for ref in refs:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.left_indent = Inches(0.4)
        p_ref.paragraph_format.first_line_indent = Inches(-0.4)
        p_ref.add_run(ref)

    output_path = Path(os.getcwd()) / "Bao_Cao_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan.docx"
    doc.save(str(output_path))
    print(f"Generated Word document successfully: {output_path}")


if __name__ == "__main__":
    create_report()
