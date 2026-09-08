"""Tạo file Word .docx Báo cáo ĐATN chuẩn 100% theo mẫu PDF:
- Font: Times New Roman
- Size: 13pt nội dung, 16pt Heading 1, 14pt Heading 2, 13pt bold italic Heading 3
- Header & Footer: Có đường kẻ ngang phân cách, phân trang La Mã (i, ii...) cho phần đầu và Ả Rập (1, 2, 3...) cho các chương
- Đầy đủ: Trang Bìa, Đề cương chi tiết 12 tuần, Nhận xét GVHD, Nhận xét GVPB, Lời cảm ơn, Mục lục, Danh mục hình vẽ, Danh mục bảng biểu, Danh mục viết tắt, 5 Chương, Kết luận, Phụ lục, Tài liệu tham khảo
- Chèn đầy đủ hình ảnh sơ đồ & ảnh chụp màn hình
"""

from __future__ import annotations

import os
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "outputs" / "report-assets"
OUTPUT_DOCX = PROJECT_ROOT / "Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_Chuan_Mau.docx"


def set_cell_border(cell, **kwargs):
    """Đặt border cho ô bảng (top, bottom, left, right)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'auto'))
            tc_borders.append(element)
    tc_pr.append(tc_borders)


def set_cell_background(cell, fill_hex: str):
    """Đặt màu nền ô."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tc_pr.append(shd)


def set_cell_padding(cell, top=120, bottom=120, left=150, right=150):
    """Đặt padding cho ô."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tc_mar.append(node)
    tc_pr.append(tc_mar)


def add_bottom_border_to_paragraph(paragraph, color="000000", sz="6"):
    """Thêm đường kẻ ngang dưới đoạn văn (cho Header)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), sz)
    bottom.set(qn('w:space'), '4')
    bottom.set(qn('w:color'), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def add_top_border_to_paragraph(paragraph, color="000000", sz="6"):
    """Thêm đường kẻ ngang trên đoạn văn (cho Footer)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    top = OxmlElement('w:top')
    top.set(qn('w:val'), 'single')
    top.set(qn('w:sz'), sz)
    top.set(qn('w:space'), '4')
    top.set(qn('w:color'), color)
    pBdr.append(top)
    pPr.append(pBdr)


def build_document():
    doc = Document()

    # Cấu hình lề trang chuẩn đồ án tốt nghiệp
    for section in doc.sections:
        section.top_margin = Inches(0.79)     # 2.0 cm
        section.bottom_margin = Inches(0.79)  # 2.0 cm
        section.left_margin = Inches(1.18)    # 3.0 cm
        section.right_margin = Inches(0.79)   # 2.0 cm
        section.page_width = Inches(8.27)     # A4
        section.page_height = Inches(11.69)
        section.header_distance = Inches(0.4)
        section.footer_distance = Inches(0.4)

    # Style Normal mặc định
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    normal_style.paragraph_format.line_spacing = 1.3
    normal_style.paragraph_format.space_after = Pt(4)

    # ==========================================
    # 1. TRANG BÌA (COVER PAGE)
    # ==========================================
    p_b1 = doc.add_paragraph()
    p_b1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_b1.add_run("TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nVIỆN TRÍ TUỆ NHÂN TẠO VÀ CHUYỂN ĐỔI SỐ\nKHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO\n")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(13)
    r.bold = True

    p_star = doc.add_paragraph()
    p_star.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_star.add_run("\n\n\n")

    p_doan = doc.add_paragraph()
    p_doan.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_doan = p_doan.add_run("ĐỒ ÁN TỐT NGHIỆP\n\n")
    r_doan.font.name = 'Times New Roman'
    r_doan.font.size = Pt(20)
    r_doan.bold = True

    p_ten = doc.add_paragraph()
    p_ten.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_ten.paragraph_format.left_indent = Inches(0.5)
    r_tl = p_ten.add_run("Tên đề tài :\n")
    r_tl.font.name = 'Times New Roman'
    r_tl.font.size = Pt(14)
    r_tl.bold = True

    p_ten2 = doc.add_paragraph()
    p_ten2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t2 = p_ten2.add_run(
        "PHÁT TRIỂN SMART BOOKSTORE ONLINE\n"
        "BẰNG ỨNG DỤNG RECOMMEND SYSTEM VÀ TRỢ LÝ RAG\n"
        "(BOOKVERSE AI)\n\n\n\n"
    )
    r_t2.font.name = 'Times New Roman'
    r_t2.font.size = Pt(16)
    r_t2.bold = True

    p_gv = doc.add_paragraph()
    p_gv.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_gv.paragraph_format.right_indent = Inches(0.8)
    p_gv.paragraph_format.line_spacing = 1.4

    r_gv_lbl = p_gv.add_run("Người hướng dẫn:\t")
    r_gv_lbl.bold = False
    r_gv_val = p_gv.add_run("ThS. NGUYỄN HỒ HẢI\n")
    r_gv_val.bold = True

    r_sv_lbl = p_gv.add_run("Sinh viên thực hiện :\t")
    r_sv_lbl.bold = False
    r_sv_val = p_gv.add_run("LƯƠNG NGUYỄN QUỐC TUẤN\n")
    r_sv_val.bold = True

    r_ms_lbl = p_gv.add_run("Mã số sinh viên :\t")
    r_ms_lbl.bold = False
    r_ms_val = p_gv.add_run("22050098\n\n\n\n\n")
    r_ms_val.bold = True

    p_city = doc.add_paragraph()
    p_city.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_city = p_city.add_run("Thành phố Hồ Chí Minh, tháng 8 năm 2026")
    r_city.font.size = Pt(13)
    r_city.bold = True

    doc.add_page_break()

    # Setup Section 2 for Headers/Footers
    sec2 = doc.add_section()
    sec2.top_margin = Inches(0.79)
    sec2.bottom_margin = Inches(0.79)
    sec2.left_margin = Inches(1.18)
    sec2.right_margin = Inches(0.79)

    # Header section 2
    hdr = sec2.header
    p_hdr = hdr.paragraphs[0]
    p_hdr.text = "Đồ án tốt nghiệp"
    p_hdr.runs[0].font.name = "Times New Roman"
    p_hdr.runs[0].font.size = Pt(10)
    p_hdr.runs[0].italic = True
    add_bottom_border_to_paragraph(p_hdr)

    # Footer section 2
    ftr = sec2.footer
    p_ftr = ftr.paragraphs[0]
    p_ftr.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r_ftr_l = p_ftr.add_run("GVHD : ThS.Nguyễn Hồ Hải\t\t")
    r_ftr_l.font.name = "Times New Roman"
    r_ftr_l.font.size = Pt(10)

    r_ftr_r = p_ftr.add_run("SVTH : Lương Nguyễn Quốc Tuấn")
    r_ftr_r.font.name = "Times New Roman"
    r_ftr_r.font.size = Pt(10)
    add_top_border_to_paragraph(p_ftr)

    # Helper text formatting functions
    def h1(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(15)
        r.bold = True
        return p

    def h1_left(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(14)
        r.bold = True
        return p

    def h2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.bold = True
        return p

    def h3(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.bold = True
        r.italic = True
        return p

    def body(text, bullet=False, italic=False, bold_prefix=""):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(4)
        if bullet:
            p.paragraph_format.left_indent = Inches(0.3)
            r_b = p.add_run("•  ")
            r_b.bold = True
        if bold_prefix:
            r_p = p.add_run(bold_prefix)
            r_p.bold = True
        r = p.add_run(text)
        r.italic = italic
        return p

    def insert_image(filename, caption, width_inches=6.0):
        img_path = ASSETS_DIR / filename
        if img_path.exists():
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(6)
            p_img.paragraph_format.space_after = Pt(2)
            doc.add_picture(str(img_path), width=Inches(width_inches))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(8)
            r_cap = p_cap.add_run(caption)
            r_cap.font.name = 'Times New Roman'
            r_cap.font.size = Pt(11.5)
            r_cap.bold = True
            r_cap.italic = True

    # ==========================================
    # 2. ĐỀ CƯƠNG CHI TIẾT
    # ==========================================
    p_dec = doc.add_paragraph()
    p_dec.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_dec = p_dec.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\t\tCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\t\tĐộc lập – Tự do – Hạnh phúc\n\n")
    r_dec.font.name = 'Times New Roman'
    r_dec.font.size = Pt(12)
    r_dec.bold = True

    h1("ĐỀ CƯƠNG CHI TIẾT")

    # Table khung Đề cương
    tbl_dec = doc.add_table(rows=5, cols=1)
    tbl_dec.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    tbl_dec.rows[0].cells[0].text = "Tên đề tài: PHÁT TRIỂN SMART BOOKSTORE ONLINE BẰNG ỨNG DỤNG RECOMMEND SYSTEM VÀ TRỢ LÝ RAG (BOOKVERSE AI)"
    tbl_dec.rows[1].cells[0].text = "Giảng viên hướng dẫn: ThS. NGUYỄN HỒ HẢI"
    tbl_dec.rows[2].cells[0].text = "Thời gian thực hiện: Từ ngày 9/6/2026 đến ngày 31/8/2026"
    tbl_dec.rows[3].cells[0].text = "Sinh viên thực hiện: LƯƠNG NGUYỄN QUỐC TUẤN - MSSV: 22050098"
    tbl_dec.rows[4].cells[0].text = "Nội dung đề tài: "

    for row in tbl_dec.rows:
        for cell in row.cells:
            set_cell_padding(cell, 80, 80, 100, 100)
            for p in cell.paragraphs:
                p.runs[0].font.name = "Times New Roman"
                p.runs[0].font.size = Pt(12)
                p.runs[0].bold = True

    h2("1. Lý do chọn đề tài")
    body("Trong thời đại công nghệ số, thương mại điện tử ngày càng phát triển mạnh mẽ và trở thành xu hướng tất yếu. Các nhà sách truyền thống đang dần chuyển dịch sang môi trường trực tuyến để tiếp cận nhiều khách hàng hơn. Tuy nhiên, các nền tảng bán sách online hiện nay vẫn còn thiếu sự cá nhân hóa trải nghiệm người dùng. Việc gợi ý sách dựa trên sở thích, hành vi người dùng là một giải pháp cần thiết giúp nâng cao chất lượng phục vụ, giữ chân khách hàng, và tăng doanh số.")
    body("Vì vậy, việc phát triển một hệ thống nhà sách thông minh (Smart Bookstore Online - BookVerse AI) ứng dụng Recommendation System và Trợ lý RAG sẽ giúp người dùng dễ dàng tìm thấy các đầu sách phù hợp với sở thích và nhu cầu cá nhân, từ đó tạo ra một trải nghiệm mua sắm và đọc sách tiện lợi, thân thiện và hiệu quả.")

    h2("2. Mục tiêu của đề tài")
    body("Xây dựng ứng dụng website bán và đọc sách trực tuyến hiện đại.")
    body("Tích hợp hệ thống gợi ý cá nhân hóa để đề xuất sách cho người dùng dựa trên hành vi, sở thích, lịch sử tương tác...")
    body("Tích hợp Trợ lý AI RAG hiểu nghiệp vụ nhà sách, trả lời chính xác có dẫn nguồn tri thức.")
    body("Hỗ trợ người dùng tìm kiếm, chọn mua sách nhanh chóng và phù hợp.")
    body("Tối ưu trải nghiệm người dùng, giúp tăng doanh thu cho cửa hàng.")
    body("Hệ thống gợi ý sách theo: Sách đã xem, Sách đã mua, Sách tương tự người dùng quan tâm...")

    h2("3. Phạm vi thực hiện")
    body("Người dùng: Đăng ký, đăng nhập, tìm kiếm sách, thêm vào giỏ hàng, xem đề xuất sách, đọc Ebook trực tuyến, hỏi đáp với AI Assistant.", bullet=True)
    body("Người bán: Quản lý gian hàng sách cũ, đăng tin bán sách, theo dõi đơn hàng và doanh thu.", bullet=True)
    body("Quản trị viên: Quản lý danh mục sách, người dùng, đơn hàng, gói hội viên, thống kê doanh thu và hành vi người dùng.", bullet=True)
    body("Công nghệ sử dụng: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, PostgreSQL 16 pgvector, Prisma ORM, FastAPI (Python), NextAuth v5.", bullet=True)

    h2("4. Ý nghĩa của đề tài")
    body("Góp phần hiện đại hóa ngành bán lẻ và đọc sách thông qua việc ứng dụng trí tuệ nhân tạo (AI).", bullet=True)
    body("Tăng tính cá nhân hóa trong trải nghiệm khách hàng – một xu hướng tất yếu trong thương mại điện tử hiện đại.", bullet=True)
    body("Hướng đến khả năng mở rộng thành một hệ thống thương mại điện tử và thư viện số hoàn chỉnh.", bullet=True)

    h2("5. Đối tượng nghiên cứu")
    body("Người dùng truy cập và sử dụng nhà sách online (độc giả, người mua sách, người bán sách cũ).", bullet=True)
    body("Dữ liệu về sách, người dùng, hành vi đọc và mua hàng.", bullet=True)
    body("Các thuật toán gợi ý trong hệ thống đề xuất (Content-based, Collaborative Filtering, Hybrid) và kỹ thuật RAG.", bullet=True)

    h2("6. Phương pháp thực hiện")
    body("Nghiên cứu các hệ thống bán sách và đọc sách trực tuyến nổi bật (Fahasa, Tiki, Amazon Kindle, Goodreads...).", bullet=True)
    body("Phân tích yêu cầu người dùng, thiết kế hệ thống theo kiến trúc hiện đại Fullstack Next.js + FastAPI Microservice.", bullet=True)
    body("Xây dựng giao diện người dùng thích ứng (Adaptive Responsive UI) trên Desktop và Mobile.", bullet=True)
    body("Tích hợp cơ sở dữ liệu PostgreSQL + pgvector để lưu trữ dữ liệu quan hệ và vector embeddings.", bullet=True)
    body("Thiết kế mô hình gợi ý Hybrid Recommender và Trợ lý RAG 6 bước.", bullet=True)
    body("Thực hiện kiểm thử tự động toàn diện (Unit test, Python test, Playwright E2E & Accessibility) và tối ưu hiệu năng.", bullet=True)

    h2("7. Kết quả mong đợi")
    body("Một website hoàn chỉnh với đầy đủ tính năng đọc sách, chợ sách cũ, quản trị và AI.", bullet=True)
    body("Có khả năng đề xuất sách thông minh phù hợp cho từng người dùng.", bullet=True)
    body("Có trang quản trị riêng cho quản lý sách, người dùng và hệ thống.", bullet=True)
    body("Giao diện thân thiện, dễ sử dụng, đạt chuẩn tiếp cận WCAG 2.1 AA.", bullet=True)

    h2("Kế hoạch thực hiện (12 Tuần):")
    
    # Bảng 12 tuần
    tbl_plan = doc.add_table(rows=1, cols=4)
    tbl_plan.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_hdr = tbl_plan.rows[0].cells
    t_hdr[0].text = "Tuần"
    t_hdr[1].text = "Thời gian"
    t_hdr[2].text = "Công việc"
    t_hdr[3].text = "Người thực hiện"
    for c in t_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    weeks_data = [
        ("1", "09/06 – 15/06", "- Làm việc với GVHD để thống nhất đề tài.\n- Thu thập và nghiên cứu tài liệu liên quan.\n- Xác định phạm vi, mục tiêu nghiên cứu.", "Lương Nguyễn Quốc Tuấn"),
        ("2", "16/06 – 22/06", "- Phân tích yêu cầu hệ thống.\n- Viết chương 1: Giới thiệu đề tài (lý do, mục tiêu, ý nghĩa, phạm vi).", "Lương Nguyễn Quốc Tuấn"),
        ("3", "23/06 – 29/06", "- Thiết kế sơ đồ Use-case kiến trúc hệ thống.\n- Viết chương 2: Cơ sở lý thuyết.", "Lương Nguyễn Quốc Tuấn"),
        ("4", "30/06 – 06/07", "- Cài đặt môi trường Next.js, PostgreSQL pgvector, Prisma ORM, FastAPI.\n- Tạo cấu trúc dự án và cơ sở dữ liệu.\n- Viết 1 phần chương 3: Phân tích hệ thống.\n- Xây dựng hệ thống gợi ý cơ bản.", "Lương Nguyễn Quốc Tuấn"),
        ("5", "07/07 – 13/07", "- Thiết kế giao diện frontend (Trang chủ, Catalog, Đăng nhập/Đăng ký, Giỏ hàng).", "Lương Nguyễn Quốc Tuấn"),
        ("6", "14/07 – 20/07", "- Hoàn thiện các chức năng người dùng: tìm kiếm không dấu, xem chi tiết sách, đọc Ebook, đặt hàng.", "Lương Nguyễn Quốc Tuấn"),
        ("7", "21/07 – 27/07", "- Triển khai mô hình gợi ý trên nội dung (Content-based Filtering).\n- Biên tập dữ liệu để triển khai (Tên sách, tác giả, thể loại, NXB, mô tả).", "Lương Nguyễn Quốc Tuấn"),
        ("8", "28/07 – 03/08", "- Xây dựng mô hình gợi ý lai (Hybrid Recommendation System).\n- Biên tập kho tri thức và phân loại ý định cho Trợ lý RAG.", "Lương Nguyễn Quốc Tuấn"),
        ("9", "04/08 – 10/08", "- Xây dựng AI Microservice FastAPI và tích hợp RAG Assistant.", "Lương Nguyễn Quốc Tuấn"),
        ("10", "11/08 – 17/08", "- Tích hợp hoàn chỉnh Hybrid Recommendation System và RAG Assistant vào BookVerse AI.", "Lương Nguyễn Quốc Tuấn"),
        ("11", "18/08 – 24/08", "- Kiểm thử hệ thống toàn diện (Unit test 222 test, Python test 44 test, Playwright E2E & Accessibility).\n- Viết chương 4: Thử nghiệm – đánh giá.", "Lương Nguyễn Quốc Tuấn"),
        ("12", "25/08 – 31/08", "- Rà soát và hoàn thiện chương 5: Kết luận và hướng phát triển.\n- Chỉnh sửa toàn bộ báo cáo theo góp ý của GVHD.", "Lương Nguyễn Quốc Tuấn"),
    ]

    for w, t, task, p in weeks_data:
        row_c = tbl_plan.add_row().cells
        row_c[0].text = w
        row_c[1].text = t
        row_c[2].text = task
        row_c[3].text = p
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_sig = doc.add_paragraph()
    p_sig.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_sig.paragraph_format.space_before = Pt(16)
    r_s1 = p_sig.add_run("SINH VIÊN THỰC HIỆN\t\t\t\t\tCÁN BỘ HƯỚNG DẪN\n")
    r_s1.bold = True
    r_s2 = p_sig.add_run("(Ký và ghi rõ họ tên)\t\t\t\t\t(Ký và ghi rõ họ tên)\n\n\n\n")
    r_s2.italic = True
    r_s3 = p_sig.add_run("Lương Nguyễn Quốc Tuấn\t\t\t\t\tThS. Nguyễn Hồ Hải")
    r_s3.bold = True

    doc.add_page_break()

    # ==========================================
    # 3. NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN
    # ==========================================
    h1("NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN")
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.add_run("-----o0o-----\n\n")

    for _ in range(12):
        p_dot = doc.add_paragraph()
        p_dot.add_run("........................................................................................................................................................................")

    p_gv_date = doc.add_paragraph()
    p_gv_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_gv_date.paragraph_format.space_before = Pt(16)
    p_gv_date.add_run("Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\n").italic = True
    p_gv_date.add_run("Giảng viên hướng dẫn\n\n\n\n\n").bold = True
    p_gv_date.add_run("ThS. Nguyễn Hồ Hải").bold = True

    doc.add_page_break()

    # ==========================================
    # 4. NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN
    # ==========================================
    h1("NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN")
    p_sub2 = doc.add_paragraph()
    p_sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub2.add_run("-----o0o-----\n\n")

    for _ in range(12):
        p_dot = doc.add_paragraph()
        p_dot.add_run("........................................................................................................................................................................")

    p_pb_date = doc.add_paragraph()
    p_pb_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_pb_date.paragraph_format.space_before = Pt(16)
    p_pb_date.add_run("Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\n").italic = True
    p_pb_date.add_run("Giảng viên phản biện\n\n\n\n\n").bold = True

    doc.add_page_break()

    # ==========================================
    # 5. LỜI CẢM ƠN
    # ==========================================
    h1("LỜI CẢM ƠN")
    body("Trước tiên, em xin gửi lời cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng toàn thể quý thầy cô Trường Đại học Bình Dương đã tận tình giảng dạy, truyền đạt cho em những kiến thức quý báu trong suốt quá trình học tập và rèn luyện tại trường.")
    body("Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến ThS. Nguyễn Hồ Hải – người đã trực tiếp hướng dẫn, chỉ bảo tận tình, giúp đỡ em trong suốt quá trình thực hiện và hoàn thành đồ án tốt nghiệp. Sự tận tâm, trách nhiệm và những đóng góp quý báu của thầy đã giúp em có được định hướng rõ ràng, hoàn thiện nội dung nghiên cứu cũng như nâng cao kỹ năng thực tiễn.")
    body("Bên cạnh đó, em cũng xin cảm ơn gia đình và bạn bè đã luôn động viên, khích lệ và hỗ trợ em trong suốt thời gian học tập và thực hiện đồ án.")
    body("Mặc dù đã nỗ lực hết sức, nhưng do kiến thức và kinh nghiệm còn hạn chế, đồ án không thể tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp của quý thầy cô để có thể hoàn thiện hơn trong tương lai.")
    body("Em xin chân thành cảm ơn!")

    p_sv_sign = doc.add_paragraph()
    p_sv_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sv_sign.paragraph_format.space_before = Pt(16)
    p_sv_sign.add_run("SINH VIÊN THỰC HIỆN\n\n\n").bold = True
    p_sv_sign.add_run("Lương Nguyễn Quốc Tuấn").bold = True

    doc.add_page_break()

    # ==========================================
    # 6. MỤC LỤC
    # ==========================================
    h1("MỤC LỤC")
    
    toc_items = [
        ("LỜI CẢM ƠN", "i"),
        ("CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN", "1"),
        ("1.1. Lý do thực hiện đề tài", "1"),
        ("    1.1.1 Hiện trạng", "1"),
        ("    1.1.2 Lý do chọn đề tài", "1"),
        ("    1.1.3 Tính cần thiết của đề tài", "2"),
        ("    1.1.4 Quy trình nghiệp vụ tổng quan", "2"),
        ("1.2. Các hệ thống tương tự", "4"),
        ("    1.2.1 Các nghiên cứu, hệ thống đã có", "4"),
        ("    1.2.2 Vấn đề tồn tại và tính mới của đề tài", "5"),
        ("1.3. Phát biểu bài toán", "6"),
        ("    1.3.1 Mục tiêu", "6"),
        ("    1.3.2 Phạm vi", "6"),
        ("    1.3.3 Ràng buộc", "6"),
        ("    1.3.4 Các giả định và phụ thuộc", "7"),
        ("1.4. Kết quả cần đạt", "7"),
        ("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT", "9"),
        ("2.1. Cơ sở lý thuyết", "9"),
        ("    2.1.1 Recommender System", "9"),
        ("        2.1.1.1 Tổng quan về Recommender System", "9"),
        ("        2.1.1.2 Content-based Filtering RS", "9"),
        ("        2.1.1.3 Collaborative Filtering RS", "10"),
        ("    2.1.2 Trợ lý RAG & Chatbot AI", "10"),
        ("    2.1.3 Tài liệu tham khảo", "11"),
        ("2.2. Cách tiếp cận, giải quyết vấn đề", "11"),
        ("    2.2.1 Mô hình tiếp cận", "11"),
        ("    2.2.2 Phương pháp phát triển hệ thống", "12"),
        ("    2.2.3 Quy trình thực hiện", "12"),
        ("2.3. Công nghệ sử dụng", "13"),
        ("CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ", "15"),
        ("3.1. Các yêu cầu chức năng [Use case view]", "15"),
        ("    3.1.1 Ngữ cảnh sử dụng", "15"),
        ("        3.1.1.1 Danh sách actor", "15"),
        ("        3.1.1.2 Sơ đồ ngữ cảnh (context diagram)", "16"),
        ("    3.1.2 Các use case", "17"),
        ("        3.1.2.1 Danh sách use case", "17"),
        ("        3.1.2.2 Sơ đồ use case chính", "18"),
        ("3.2. Các yêu cầu phi chức năng", "19"),
        ("3.3. Mô hình hệ thống [Logical view]", "21"),
        ("    3.3.1 Mô hình tổng quát", "21"),
        ("    3.3.2 Mô hình chi tiết", "23"),
        ("    3.3.3 Cơ sở toán học cho hệ thống", "28"),
        ("    3.3.4 Thuật toán - giải thuật áp dụng", "30"),
        ("3.4. Mô hình xử lý / tương tác", "40"),
        ("    3.4.1 Use case chi tiết (UC01 – UC17)", "40"),
        ("    3.4.2 Sơ đồ tuần tự (sequence diagram)", "59"),
        ("    3.4.3 Sơ đồ hoạt động (activity diagram)", "62"),
        ("3.5. Thiết kế nguyên mẫu giao diện người dùng", "66"),
        ("3.6. Thiết kế chi tiết triển khai", "68"),
        ("CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM", "73"),
        ("4.1 Các kịch bản thử nghiệm", "73"),
        ("4.2 Kết quả thử nghiệm các kịch bản", "74"),
        ("4.3 Xử lý các trường hợp ngoại lệ", "77"),
        ("CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN", "79"),
        ("5.1 Kết quả đối chiếu với mục tiêu", "79"),
        ("5.2 Các hạn chế của đồ án", "81"),
        ("5.3 Hướng phát triển", "81"),
        ("KẾT LUẬN", "83"),
        ("PHỤ LỤC", "84"),
        ("TÀI LIỆU THAM KHẢO", "89"),
    ]

    for item, page_str in toc_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.line_spacing = 1.15
        p_t.paragraph_format.space_after = Pt(2)
        dots = "." * max(5, int((75 - len(item) - len(page_str)) * 1.6))
        r_txt = p_t.add_run(f"{item} {dots} {page_str}")
        if item.startswith("CHƯƠNG") or item in ("LỜI CẢM ƠN", "KẾT LUẬN", "PHỤ LỤC", "TÀI LIỆU THAM KHẢO"):
            r_txt.bold = True

    doc.add_page_break()

    # ==========================================
    # 7. MỤC LỤC CÁC HÌNH VẼ
    # ==========================================
    h1("MỤC LỤC CÁC HÌNH VẼ")
    fig_items = [
        ("Hình 1-1: Sơ đồ quy trình nghiệp vụ tổng quan", "4"),
        ("Hình 3-1: Sơ đồ ngữ cảnh (Context Diagram)", "16"),
        ("Hình 3-2: Sơ đồ use case của toàn hệ thống", "19"),
        ("Hình 3-3: Mô hình tổng quát nghiệp vụ tổng quan", "21"),
        ("Hình 3-4: Mô hình chi tiết Browser (Client)", "24"),
        ("Hình 3-5: Mô hình chi tiết Application Server (Next.js)", "25"),
        ("Hình 3-6: Mô hình chi tiết Service Layer", "26"),
        ("Hình 3-7: Mô hình chi tiết Database (PostgreSQL pgvector)", "27"),
        ("Hình 3-8: Mô hình chi tiết Trợ lý RAG AI", "28"),
        ("Hình 3-9: Cơ sở dữ liệu Sản phẩm", "30"),
        ("Hình 3-10: Minh họa code trích xuất đặc trưng", "31"),
        ("Hình 3-11: Minh họa code biểu diễn dưới dạng vector TF-IDF", "31"),
        ("Hình 3-12: Minh họa code tính độ tương đồng cosine", "32"),
        ("Hình 3-13: Minh họa code chọn sách tương tự nhất", "32"),
        ("Hình 3-14: Minh họa code trả về danh sách gợi ý", "33"),
        ("Hình 3-15: Cơ sở dữ liệu rating", "33"),
        ("Hình 3-16: Minh họa code xây dựng ma trận Khachhang-Sanpham", "34"),
        ("Hình 3-17: Minh họa code tính độ tương đồng các sách", "35"),
        ("Hình 3-18: Minh họa code dự đoán độ quan tâm khách hàng", "35"),
        ("Hình 3-19: Minh họa code cho gợi ý lai (hybrid recommendation)", "36"),
        ("Hình 3-20: Minh họa code tiền xử lý dữ liệu RAG Assistant", "37"),
        ("Hình 3-21: Minh họa code phân loại ý định (Intent Routing)", "37"),
        ("Hình 3-22: Minh họa code trích xuất thực thể", "38"),
        ("Hình 3-23: Minh họa code quản lý ngữ cảnh hội thoại", "39"),
        ("Hình 3-24: Minh họa code thực thi hành động và Fallback", "39"),
        ("Hình 3-25: Sơ đồ use case UC01 Xem sách", "40"),
        ("Hình 3-26: Sơ đồ use case UC02 Gợi ý sách (chưa đăng nhập)", "41"),
        ("Hình 3-27: Sơ đồ use case UC03 Đăng ký", "42"),
        ("Hình 3-28: Sơ đồ use case UC04 Đăng nhập", "43"),
        ("Hình 3-29: Sơ đồ use case UC05 Đăng xuất", "44"),
        ("Hình 3-30: Sơ đồ use case UC06 Gợi ý sách (đã đăng nhập)", "46"),
        ("Hình 3-31: Sơ đồ use case UC07 Giỏ hàng", "47"),
        ("Hình 3-32: Sơ đồ use case UC08 Mua và thanh toán", "48"),
        ("Hình 3-33: Sơ đồ use case UC09 Đánh giá sách", "49"),
        ("Hình 3-34: Sơ đồ use case UC10 Quản lý tài khoản", "50"),
        ("Hình 3-35: Sơ đồ use case UC11 Xem lịch sử mua hàng", "51"),
        ("Hình 3-36: Sơ đồ use case UC12 Liên hệ", "52"),
        ("Hình 3-37: Sơ đồ use case UC13 Chatbot hỗ trợ", "53"),
        ("Hình 3-38: Sơ đồ use case UC14 Quản lý sản phẩm", "54"),
        ("Hình 3-39: Sơ đồ use case UC15 Quản lý tin tức", "55"),
        ("Hình 3-40: Sơ đồ use case UC16 Quản lý khách hàng", "56"),
        ("Hình 3-41: Sơ đồ use case UC17 Quản lý đơn hàng", "57"),
        ("Hình 3-42: Sơ đồ tuần tự tổng quát", "59"),
        ("Hình 3-43: Sơ đồ tuần tự Đăng ký / Đăng nhập", "59"),
        ("Hình 3-44: Sơ đồ tuần tự Xem sách + Gợi ý sách", "60"),
        ("Hình 3-45: Sơ đồ tuần tự Giỏ hàng + Thanh toán", "60"),
        ("Hình 3-46: Sơ đồ tuần tự Lịch sử mua hàng + Đánh giá sách", "61"),
        ("Hình 3-47: Sơ đồ tuần tự Chatbot hỗ trợ / Liên hệ", "61"),
        ("Hình 3-48: Sơ đồ tuần tự Quản trị viên quản lý hệ thống", "62"),
        ("Hình 3-49: Sơ đồ hoạt động hệ thống gợi ý tổng quát", "62"),
        ("Hình 3-50: Sơ đồ hoạt động Content-based Filtering", "63"),
        ("Hình 3-51: Sơ đồ hoạt động Collaborative Filtering", "63"),
        ("Hình 3-52: Sơ đồ hoạt động Hybrid Recommendation", "64"),
        ("Hình 3-53: Sơ đồ hoạt động Trợ lý AI RAG Assistant", "64"),
        ("Hình 3-54: Sơ đồ hoạt động quản lý cho quản trị viên", "65"),
        ("Hình 3-55: Giao diện trang chủ BookVerse AI", "66"),
        ("Hình 3-56: Giao diện đề xuất gợi ý và Catalog", "67"),
        ("Hình 3-57: Giao diện Trợ lý AI Assistant", "68"),
        ("Hình 3-58: Giao diện Quản lý tin đăng Người bán", "68"),
    ]

    for item, page_str in fig_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.line_spacing = 1.15
        p_t.paragraph_format.space_after = Pt(2)
        dots = "." * max(5, int((75 - len(item) - len(page_str)) * 1.6))
        p_t.add_run(f"{item} {dots} {page_str}")

    doc.add_page_break()

    # ==========================================
    # 8. MỤC LỤC CÁC BẢNG BIỂU
    # ==========================================
    h1("MỤC LỤC CÁC BẢNG BIỂU")
    tbl_items = [
        ("Bảng 1-1: Kết quả cần đạt", "8"),
        ("Bảng 2-1: Công nghệ sử dụng", "13"),
        ("Bảng 3-1: Danh sách actor", "15"),
        ("Bảng 3-2: Use Case cho Khách hàng chưa đăng nhập", "17"),
        ("Bảng 3-3: Use Case cho Khách hàng đã đăng nhập", "17"),
        ("Bảng 3-4: Use Case cho Quản trị viên (Admin)", "18"),
        ("Bảng 3-5: Minh họa toán học Content-based Filtering", "28"),
        ("Bảng 3-6: Minh họa toán học Collaborative filtering", "29"),
        ("Bảng 3-7 đến Bảng 3-23: Mô tả chi tiết sơ đồ use case UC01 – UC17", "40-58"),
        ("Bảng 4-1: Kết quả thử nghiệm các kịch bản Recommendation system", "75"),
        ("Bảng 4-2: Các tình huống thử nghiệm của chatbot", "76"),
        ("Bảng 4-3: Kết quả thử nghiệm Trợ lý RAG / Chatbot", "76"),
        ("Bảng 4-4: Bảng xử lý các trường hợp ngoại lệ trong Recommendation system", "77"),
        ("Bảng 4-5: Bảng xử lý các tình huống ngoại lệ trong Chatbot", "78"),
        ("Bảng 5-1: Kết quả đối chiếu với mục tiêu", "79"),
    ]

    for item, page_str in tbl_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.line_spacing = 1.15
        p_t.paragraph_format.space_after = Pt(2)
        dots = "." * max(5, int((75 - len(item) - len(page_str)) * 1.6))
        p_t.add_run(f"{item} {dots} {page_str}")

    doc.add_page_break()

    # ==========================================
    # 9. MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT
    # ==========================================
    h1("MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT")
    tbl_abbr = doc.add_table(rows=1, cols=2)
    tbl_abbr.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_abbr.rows[0].cells[0].text = "Từ viết tắt"
    tbl_abbr.rows[0].cells[1].text = "Ý nghĩa / Giải thích"
    for c in tbl_abbr.rows[0].cells:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    abbr_data = [
        ("AI", "Artificial Intelligence – Trí tuệ nhân tạo"),
        ("API", "Application Programming Interface – Giao diện lập trình ứng dụng"),
        ("CB / CBF", "Content-Based Filtering – Gợi ý dựa trên nội dung"),
        ("CF", "Collaborative Filtering – Gợi ý dựa trên lọc cộng tác"),
        ("DB", "Database – Cơ sở dữ liệu"),
        ("ML", "Machine Learning – Học máy"),
        ("MVC", "Model – View – Controller (Kiến trúc phân lớp)"),
        ("NLP", "Natural Language Processing – Xử lý ngôn ngữ tự nhiên"),
        ("RAG", "Retrieval-Augmented Generation – Tạo sinh tăng cường truy xuất"),
        ("LLM", "Large Language Model – Mô hình ngôn ngữ lớn (GPT-4o, Gemini)"),
        ("RecSys", "Recommendation System – Hệ thống gợi ý"),
        ("UI", "User Interface – Giao diện người dùng"),
        ("UX", "User Experience – Trải nghiệm người dùng"),
        ("RBAC", "Role-Based Access Control – Kiểm soát truy cập dựa trên vai trò"),
        ("ORM", "Object-Relational Mapping – Ánh xạ quan hệ đối tượng (Prisma)"),
        ("TTS", "Text-to-Speech – Chuyển đổi văn bản thành giọng nói"),
        ("WCAG", "Web Content Accessibility Guidelines – Chuẩn tiếp cận Web"),
    ]

    for a, d in abbr_data:
        row_c = tbl_abbr.add_row().cells
        row_c[0].text = a
        row_c[1].text = d
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN
    # ==========================================
    h1("CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN")

    h2("1.1. Lý do thực hiện đề tài :")
    h3("1.1.1 Hiện trạng")
    body("Trong thời đại số hóa, việc lựa chọn và tìm kiếm sách phù hợp là một thách thức đối với người đọc. Người dùng thường phải dựa vào danh sách phổ biến, xếp hạng chung hoặc tự tìm kiếm trong các cửa hàng trực tuyến, dẫn đến trải nghiệm chưa cá nhân hóa và mất nhiều thời gian.")
    body("Các thư viện truyền thống và nền tảng sách trực tuyến hiện nay thường có những hạn chế sau:")
    body("Thiếu cá nhân hóa: Các gợi ý thường dựa trên số lượt xem, đánh giá chung hoặc thể loại phổ biến, chưa thực sự phản ánh sở thích riêng của từng người dùng.", bullet=True)
    body("Tương tác hạn chế: Hầu hết các hệ thống chưa tích hợp chatbot hay công cụ tư vấn trực tuyến để giải đáp thắc mắc từ người dùng.", bullet=True)
    body("Khả năng mở rộng: Khi số lượng người dùng và sách tăng lên, nhiều hệ thống gặp khó khăn về tốc độ gợi ý và xử lý dữ liệu lớn.", bullet=True)
    body("Trong khi các mô hình gợi ý (Recommendation System) đã được nghiên cứu nhiều, việc kết hợp gợi ý cá nhân hóa và hỗ trợ người dùng thông qua chatbot trong lĩnh vực sách còn hạn chế.")

    h3("1.1.2 Lý do chọn đề tài")
    body("Xuất phát từ nhu cầu thực tế: Người dùng cần một hệ thống gợi ý sách cá nhân hóa để tiết kiệm thời gian và nâng cao trải nghiệm mua sắm.")
    body("Khoảng trống công nghệ: Các nhà sách trực tuyến hiện tại còn hạn chế trong việc áp dụng công nghệ AI, đặc biệt là Recommendation System và Chatbot RAG.")
    body("Ý nghĩa học thuật: Đề tài cho phép áp dụng kiến thức đã học về Fullstack Web, hệ thống gợi ý (Collaborative Filtering, Content-based Filtering, Hybrid), và Chatbot NLP/RAG vào một ứng dụng thực tiễn.")
    body("Ý nghĩa thực tiễn: Nâng cao chất lượng dịch vụ khách hàng, tăng tính cạnh tranh và doanh thu cho doanh nghiệp, giúp người dùng tiếp cận sách nhanh chóng, dễ dàng và phù hợp hơn.")

    h3("1.1.3 Tính cần thiết của đề tài")
    body("Về phía người dùng: Đáp ứng nhu cầu tìm kiếm, lựa chọn sách nhanh chóng và phù hợp với sở thích cá nhân.")
    body("Về phía doanh nghiệp: Nâng cao khả năng cạnh tranh, tối ưu hóa hoạt động bán hàng, gia tăng sự hài lòng của khách hàng.")
    body("Về phía học thuật và nghiên cứu: Tạo cơ hội cho sinh viên áp dụng kiến thức đã học vào dự án thực tế, đặc biệt trong các lĩnh vực AI, Machine Learning và phát triển ứng dụng web.")
    body("Xu hướng phát triển: Việc kết hợp Recommendation System + Chatbot thông minh là hướng đi phù hợp với xu thế hiện nay trong các hệ thống thương mại điện tử.")

    h3("1.1.4 Quy trình nghiệp vụ tổng quan")
    body("Bước 1: Đăng ký / Đăng nhập: Người dùng tạo tài khoản hoặc đăng nhập; hệ thống lưu thông tin phục vụ cho việc cá nhân hóa gợi ý.")
    body("Bước 2: Duyệt sách: Người dùng xem danh sách sách và chi tiết sách; hệ thống ghi lại lượt xem/click làm dữ liệu đầu vào cho mô hình.")
    body("Bước 3: Tương tác với sách: Đánh giá (rating), lưu yêu thích, bookmark, highlight hoặc mua sách; dữ liệu được lưu vào Database.")
    body("Bước 4: Gợi ý sách cá nhân hóa: Hệ thống học máy nhận dữ liệu tương tác và đặc trưng sách, tính toán điểm gợi ý (score) và hiển thị.")
    body("Bước 5: Chatbot hỗ trợ: Người dùng đặt câu hỏi tự nhiên; Chatbot RAG phân loại ý định, truy xuất tri thức và đưa ra câu trả lời cá nhân hóa.")
    body("Bước 6: Cập nhật mô hình và dữ liệu: Lưu lịch sử tương tác và phản hồi để nâng cao chất lượng gợi ý.")

    insert_image("hinh_1_1_quy_trinh_nghiep_vu.png", "Hình 1-1: Sơ đồ quy trình nghiệp vụ tổng quan", width_inches=5.5)

    h2("1.2. Các hệ thống tương tự")
    h3("1.2.1. Các nghiên cứu, hệ thống đã có")
    body("Fahasa, Vinabook, Bookbuy: Các nền tảng này chủ yếu đưa ra gợi ý dựa trên danh mục sách cùng thể loại, sách bán chạy hoặc sách có khuyến mãi. Một số trường hợp có gợi ý “sách tương tự” nhưng thường chỉ dừng ở mức dựa trên metadata (thể loại, tác giả).", bullet=True)
    body("Goodreads: Cung cấp gợi ý dựa trên đánh giá và review của cộng đồng. Tuy nhiên, hệ thống này thiên về mạng xã hội sách, chưa chú trọng vào việc tích hợp vào quy trình mua sắm hay cá nhân hóa tức thời.", bullet=True)
    body("Các nghiên cứu học thuật trước đây: Nhiều công trình tập trung phát triển mô hình Content-based hoặc Collaborative Filtering, nhưng việc triển khai thực tế thường gặp hạn chế trong xử lý cold-start và chưa kết hợp với chatbot để hỗ trợ người dùng.", bullet=True)

    h3("1.2.2. Vấn đề tồn tại và tính mới của đề tài")
    body("Tồn tại: Gợi ý chưa thực sự cá nhân hóa sâu; hạn chế trong xử lý cold-start; thiếu chatbot thông minh tương tác trực tiếp.")
    body("Tính mới của đề tài:\n"
         "• Đề xuất hệ thống Hybrid Recommendation kết hợp Content-based và Collaborative Filtering kèm Diversity Policy khắc phục nhược điểm cold-start.\n"
         "• Phân tách rõ hai nhóm người dùng: khách chưa đăng nhập được gợi ý bằng Content-based, khách đã đăng nhập được gợi ý bằng Hybrid.\n"
         "• Tích hợp Trợ lý RAG AI hỗ trợ hỏi đáp nghiệp vụ và dữ liệu tài khoản có kiểm soát nguồn gốc (Grounding).\n"
         "• Thiết kế hệ thống có khả năng mở rộng, đáp ứng yêu cầu nghiên cứu lẫn ứng dụng thực tiễn.")

    h2("1.3. Phát biểu bài toán:")
    h3("1.3.1. Mục tiêu:")
    body("Xây dựng hệ thống gợi ý sách trực tuyến có khả năng đưa ra các đề xuất cá nhân hóa cho người dùng.")
    body("Ứng dụng các kỹ thuật Content-based Filtering, Collaborative Filtering và Hybrid Recommendation để cải thiện độ chính xác gợi ý.")
    body("Hỗ trợ người dùng mới (cold-start) bằng cách khai thác đặc trưng nội dung sách, đồng thời tận dụng lịch sử tương tác cho người dùng đã đăng nhập.")
    body("Tích hợp chatbot RAG để cung cấp thông tin về cửa hàng và tư vấn sách thông minh.")

    h3("1.3.2. Phạm vi")
    body("Đối tượng sử dụng: Người dùng cá nhân có nhu cầu tìm kiếm, đọc Ebook và mua bán sách trực tuyến.")
    body("Loại dữ liệu xử lý: Metadata của sách (tiêu đề, tác giả, thể loại, mô tả, nhà xuất bản) và dữ liệu hành vi (lượt xem, đánh giá, tiến độ đọc, mua hàng).")
    body("Tính năng chính: Gợi ý sách Content-based, Collaborative, Hybrid; Trình đọc Ebook; Sàn sách cũ P2P; Chatbot RAG Assistant.")

    h3("1.3.3. Ràng buộc")
    body("Ràng buộc nghiệp vụ: Người dùng cần đăng nhập để lưu giỏ hàng, tiến độ đọc và nhận gợi ý cá nhân hóa. Số lượng tồn kho không được âm.")
    body("Ràng buộc công nghệ: Nền tảng Next.js 15, React 19, TypeScript, PostgreSQL pgvector, Prisma ORM, FastAPI.")
    body("Ràng buộc hiệu năng: Thời gian phản hồi trang dưới 2 giây để đảm bảo trải nghiệm mượt mà.")

    h3("1.3.4. Các giả định và phụ thuộc:")
    body("Giả định: Người dùng sử dụng trình duyệt hiện đại (Chrome, Edge, Firefox). Dữ liệu sách cung cấp ban đầu đầy đủ.")
    body("Phụ thuộc: Chất lượng gợi ý phụ thuộc vào mật độ dữ liệu tương tác. Khả năng thông minh của Chatbot phụ thuộc vào mô hình NLP/RAG.")

    h2("1.4. Kết quả cần đạt :")
    
    # Bảng 1-1
    tbl_1_1 = doc.add_table(rows=1, cols=3)
    tbl_1_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_1_1.rows[0].cells
    c_hdr[0].text = "Kết quả cần đạt"
    c_hdr[1].text = "Tiêu chí đánh giá"
    c_hdr[2].text = "Tính ứng dụng"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    kpi_data = [
        ("Hệ thống gợi ý theo nội dung (Content-based)", "- Precision@K, Recall@K, F1-score đạt > 60%.\n- Thời gian phản hồi < 2s.", "Giúp người dùng mới (chưa có lịch sử) nhanh chóng tìm thấy sách cùng chủ đề, tác giả."),
        ("Hệ thống gợi ý dựa trên hành vi (Collaborative)", "- Độ chính xác cao hơn Content-based với người có lịch sử.\n- Khám phá sách liên quan ngầm.", "Tăng khả năng cá nhân hóa cho người dùng đã đăng nhập."),
        ("Hệ thống gợi ý lai (Hybrid Recommendation)", "- F1-score cao hơn 5-10% so với mô hình riêng lẻ.\n- Giải quyết triệt để cold-start.", "Kết hợp ưu điểm cả hai phương pháp, tối ưu trải nghiệm tổng thể."),
        ("Trợ lý RAG / Chatbot hỗ trợ thông tin", "- Tỷ lệ nhận diện đúng intent > 80%.\n- Thời gian phản hồi < 2s.", "Cải thiện tương tác, trả lời chính xác thông tin nhà sách và tư vấn sách."),
        ("Giao diện hiển thị kết quả gợi ý", "- Trực quan, thân thiện, hiển thị Top-N sách rõ ràng.\n- Đánh giá hài lòng > 70%.", "Giúp người dùng dễ dàng thao tác, tiếp cận sách nhanh chóng."),
        ("Khả năng mở rộng dữ liệu", "- Xử lý tốt hàng nghìn đến chục nghìn bản ghi sách.", "Có thể triển khai thực tế cho nhà sách trực tuyến hoặc thư viện số."),
    ]

    for r1, r2, r3 in kpi_data:
        row_c = tbl_1_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
    # ==========================================
    h1("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT")

    h2("2.1. Cơ sở lý thuyết:")
    h3("2.1.1 Recommender System")
    h3("2.1.1.1 Tổng quan về Recommender System")
    body("Hệ thống gợi ý (Recommender System – RS) là một tập hợp các thuật toán và mô hình được thiết kế nhằm dự đoán và gợi ý cho người dùng những mục (items) có khả năng phù hợp với sở thích hoặc nhu cầu của họ [1]. Các hệ thống này ngày càng được ứng dụng rộng rãi trong thương mại điện tử (Amazon, eBay), giải trí (Netflix, Spotify), mạng xã hội (Facebook, YouTube) và giáo dục (Coursera, EdX).")
    body("Vấn đề cốt lõi mà RS giải quyết là cá nhân hóa trải nghiệm người dùng. Thay vì để người dùng tự tìm kiếm trong kho dữ liệu khổng lồ, hệ thống sẽ tự động lọc và đưa ra danh sách đề xuất dựa trên:")
    body("Nội dung sản phẩm (tên, mô tả, thể loại, tác giả, nhà xuất bản…).", bullet=True)
    body("Hành vi người dùng (lịch sử xem, đánh giá, mua hàng).", bullet=True)
    body("Mối quan hệ giữa các người dùng.", bullet=True)

    h3("2.1.1.2 Content-based Filtering RS")
    body("Content-Based Filtering (CBF) là một phương pháp gợi ý dựa trên đặc trưng nội dung của sản phẩm. Ý tưởng chính: nếu người dùng đã thích một sản phẩm, hệ thống sẽ tìm và gợi ý các sản phẩm khác có đặc trưng tương tự [3].")
    body("Quy trình CBF: (1) Biểu diễn sản phẩm dưới dạng vector đặc trưng (TF-IDF / Embeddings); (2) Tính toán độ tương đồng (Cosine similarity, Euclidean distance); (3) Xếp hạng và gợi ý Top-K sản phẩm.")
    body("Ưu điểm: Cá nhân hóa tốt, chỉ cần dữ liệu của một người dùng, không phụ thuộc cộng đồng.")
    body("Nhược điểm: Thiếu tính đa dạng (chỉ gợi ý các mục giống nhau), khó mở rộng khi đặc trưng phức tạp.")

    h3("2.1.1.3 Collaborative Filtering RS")
    body("Collaborative Filtering (CF) là phương pháp gợi ý dựa trên hành vi của cộng đồng người dùng. Nguyên lý: “Người dùng có hành vi giống nhau trong quá khứ sẽ có sở thích giống nhau trong tương lai” [4].")
    body("Gồm hai loại chính: User-based CF (tìm người dùng có sở thích tương đồng) và Item-based CF (tìm mối quan hệ giữa các sản phẩm dựa trên sự đồng xuất hiện trong lịch sử).")
    body("Ưu điểm: Khám phá sản phẩm mới ngoài phạm vi sở thích ban đầu, hoạt động tốt khi có nhiều dữ liệu.")
    body("Nhược điểm: Vấn đề cold-start (người dùng mới / sách mới) và vấn đề sparsity (dữ liệu đánh giá thưa).")

    h3("2.1.2 Trợ lý RAG & Chatbot AI")
    body("Kỹ thuật RAG (Retrieval-Augmented Generation) kết hợp mô hình ngôn ngữ lớn (LLM) với kho tri thức xác thực. Mô hình hỗ trợ hai thành phần: NLU (phân loại intent, trích xuất entity) và Dialogue Management (quản lý hội thoại, truy xuất dữ liệu từ Database để trả lời chính xác).")

    h2("2.2. Cách tiếp cận, giải quyết vấn đề")
    h3("2.2.1. Mô hình tiếp cận")
    body("Hệ thống kết hợp mô hình gợi ý sách thông minh và Trợ lý RAG hỗ trợ thông tin:")
    body("Content-based Filtering: Khai thác đặc trưng nội dung sách (tên, tác giả, thể loại, mô tả, NXB).", bullet=True)
    body("Collaborative Filtering: Dựa trên hành vi và sở thích của cộng đồng người dùng.", bullet=True)
    body("Hybrid Recommendation: Kết hợp cả hai phương pháp để khắc phục hạn chế Cold-start và tăng độ chính xác.", bullet=True)
    body("Chatbot RAG: Phân loại ý định, truy vấn Database/Recommender trả lời tự nhiên, có nguồn dẫn.", bullet=True)

    h3("2.2.2. Phương pháp phát triển hệ thống")
    body("Mô hình Client–Server: Client (Next.js Frontend) giao tiếp qua HTTP REST API với Server (Next.js Server Actions & FastAPI AI Service).")
    body("Kiến trúc phân lớp chuẩn mực: Controller/Router -> Service Layer -> Repository/ORM Layer -> Database.")

    h2("2.3. Công nghệ sử dụng :")
    
    # Bảng 2-1
    tbl_2_1 = doc.add_table(rows=1, cols=3)
    tbl_2_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_2_1.rows[0].cells
    c_hdr[0].text = "Công nghệ / Công cụ"
    c_hdr[1].text = "Mô tả"
    c_hdr[2].text = "Vai trò trong hệ thống"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    tech_data = [
        ("Next.js 15 & React 19", "Framework Web Fullstack hiện đại với App Router & Server Actions.", "Xây dựng toàn bộ giao diện Web, xử lý logic nghiệp vụ và tối ưu hóa tải trang."),
        ("TypeScript", "Ngôn ngữ định kiểu tĩnh an toàn.", "Đảm bảo tính chặt chẽ của mã nguồn, hạn chế lỗi runtime."),
        ("Tailwind CSS & Shadcn UI", "Framework CSS tiện ích & thư viện UI component.", "Xây dựng giao diện responsive đẹp mắt, đạt chuẩn Accessibility WCAG 2.1 AA."),
        ("PostgreSQL 16 + pgvector", "Hệ quản trị CSDL quan hệ tích hợp tìm kiếm vector.", "Lưu trữ dữ liệu sách, người dùng, đơn hàng và vector embeddings."),
        ("Prisma ORM v6", "Object-Relational Mapping thế hệ mới.", "Truy vấn và thao tác cơ sở dữ liệu an toàn, giảm thiểu lỗi SQL injection."),
        ("FastAPI (Python 3.14)", "Microservice framework hiệu năng cao.", "Xử lý thuật toán gợi ý (Recommender) và pipeline Trợ lý RAG AI."),
        ("NextAuth v5", "Thư viện xác thực & phân quyền bảo mật.", "Quản lý phiên đăng nhập, mã hóa bcrypt, phân quyền RBAC và rate limiting."),
        ("Playwright & Axe-core", "Framework kiểm thử tự động E2E & Accessibility.", "Kiểm thử tự động toàn diện giao diện trên Desktop và Mobile."),
    ]

    for c1, c2, c3 in tech_data:
        row_c = tbl_2_1.add_row().cells
        row_c[0].text = c1
        row_c[1].text = c2
        row_c[2].text = c3
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ
    # ==========================================
    h1("CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ")

    h2("3.1. Các yêu cầu chức năng [Use case view]")
    h3("3.1.1. Ngữ cảnh sử dụng")
    h3("3.1.1.1. Danh sách actor")
    
    # Bảng 3-1
    tbl_3_1 = doc.add_table(rows=1, cols=3)
    tbl_3_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_3_1.rows[0].cells
    c_hdr[0].text = "Actor"
    c_hdr[1].text = "Mô tả"
    c_hdr[2].text = "Quyền hạn / Chức năng chính"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    actor_data = [
        ("Khách hàng chưa đăng nhập", "Người dùng truy cập website mà chưa có tài khoản.", "- Xem danh sách và chi tiết sách.\n- Sử dụng chatbot hỏi thông tin cơ bản.\n- Nhận gợi ý sách Content-based.\n- Đăng ký tài khoản mới."),
        ("Khách hàng đã đăng nhập (Độc giả)", "Người dùng có tài khoản đã xác thực.", "- Toàn bộ quyền của khách chưa đăng nhập.\n- Đọc Ebook, lưu bookmark, highlight, ghi chú.\n- Mua gói hội viên, đặt hàng giỏ hàng, đánh giá sách.\n- Nhận gợi ý sách cá nhân hóa Hybrid Recommender.\n- Chatbot hỗ trợ theo dữ liệu cá nhân."),
        ("Người bán (Seller)", "Người dùng đăng ký bán sách cũ trên sàn P2P.", "- Đăng tin bán sách cũ, tải ảnh tình trạng sách.\n- Quản lý tin đăng, tồn kho, đơn hàng và doanh thu."),
        ("Quản trị viên (Admin)", "Người chịu trách nhiệm quản lý toàn bộ hệ thống.", "- Quản lý người dùng, danh mục sách, đơn hàng, gói hội viên.\n- Xem báo cáo Analytics doanh thu và kiểm tra chất lượng dữ liệu."),
    ]

    for a1, a2, a3 in actor_data:
        row_c = tbl_3_1.add_row().cells
        row_c[0].text = a1
        row_c[1].text = a2
        row_c[2].text = a3
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    h3("3.1.1.2. Sơ đồ ngữ cảnh (context diagram)")
    body("Sơ đồ ngữ cảnh mô tả các tác nhân chính (Khách chưa đăng nhập, Khách đã đăng nhập, Người bán, Quản trị viên) tương tác với hệ thống trung tâm BookVerse AI cùng các dịch vụ liên kết (Cơ sở dữ liệu PostgreSQL pgvector, AI Service FastAPI, Cổng thanh toán Sandbox).")

    h2("3.2. Các yêu cầu phi chức năng")
    body("Tính dễ sử dụng: Giao diện thân thiện, dễ thao tác, bố cục rõ ràng trên cả Desktop và Mobile.")
    body("Hiệu suất hoạt động: Phản hồi nhanh (< 1.5s), tải trang mượt mà nhờ Next.js Server Components.")
    body("Tính ổn định: Xử lý ngoại lệ chặt chẽ, có cơ chế Fallback nội bộ khi mất kết nối LLM ngoài.")
    body("Khả năng bảo trì: Kiến trúc phân lớp rõ ràng, mã nguồn viết bằng TypeScript có type-safety.")
    body("Tính bảo mật: Mã hóa mật khẩu bcrypt, kiểm soát quyền hạn RBAC nghiêm ngặt, chống brute-force bằng HMAC rate limit.")
    body("Khả năng mở rộng: Dễ dàng nâng cấp thêm mô hình học sâu (Deep Learning) và mở rộng kho sách lớn.")

    h2("3.3. Mô hình hệ thống [Logical view]")
    h3("3.3.1 Mô hình tổng quát")
    body("Hệ thống được thiết kế theo mô hình 3 tầng: Client (Browser) – Application Server (Next.js) – AI Microservice (FastAPI) – Database (PostgreSQL pgvector).")

    h3("3.3.3 Cơ sở toán học cho hệ thống :")
    h3("3.3.3.1 Gợi ý dựa trên nội dung (Content-based Filtering)")
    body("Mỗi cuốn sách i được biểu diễn bằng một vector đặc trưng d_i = (w_i1, w_i2, ..., w_in) với w_ij là trọng số TF-IDF của từ khóa j trong sách i.")
    body("Độ tương đồng giữa 2 cuốn sách i và j được tính bằng Cosine Similarity:")
    body("Sim(i, j) = (d_i . d_j) / (||d_i|| * ||d_j||)")

    # Bảng 3-5 Minh họa Content-based
    tbl_3_5 = doc.add_table(rows=1, cols=5)
    tbl_3_5.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_3_5.rows[0].cells
    c_hdr[0].text = "Tựa sách"
    c_hdr[1].text = "CNTT"
    c_hdr[2].text = "Kinh tế"
    c_hdr[3].text = "Văn học"
    c_hdr[4].text = "Feature Vector"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    cb_data = [
        ("Lập trình Web Next.js", "0.95", "0.10", "0.05", "x1 = [0.95, 0.10, 0.05]"),
        ("Tư duy nhanh và chậm", "0.20", "0.90", "0.15", "x2 = [0.20, 0.90, 0.15]"),
        ("Nhà giả kim", "0.05", "0.20", "0.95", "x3 = [0.05, 0.20, 0.95]"),
        ("Trí tuệ nhân tạo thế hệ mới", "0.98", "0.15", "0.02", "x4 = [0.98, 0.15, 0.02]"),
    ]
    for r1, r2, r3, r4, r5 in cb_data:
        row_c = tbl_3_5.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_c5 = doc.add_paragraph()
    p_c5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c5.add_run("Bảng 3-5: Minh họa toán học Content-based Filtering").italic = True

    h3("3.3.3.2 Gợi ý dựa trên cộng tác (Collaborative Filtering – CF)")
    body("Tính toán độ tương đồng hành vi giữa người dùng u và v dựa trên ma trận đánh giá/tương tác:")
    body("Sim(u, v) = sum((R_ui - mean(R_u)) * (R_vi - mean(R_v))) / (sqrt(sum((R_ui - mean(R_u))^2)) * sqrt(sum((R_vi - mean(R_v))^2)))")

    # Bảng 3-6 Minh họa CF
    tbl_3_6 = doc.add_table(rows=1, cols=6)
    tbl_3_6.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_3_6.rows[0].cells
    c_hdr[0].text = "User / Book"
    c_hdr[1].text = "B01"
    c_hdr[2].text = "B02"
    c_hdr[3].text = "B03"
    c_hdr[4].text = "B04"
    c_hdr[5].text = "B05"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    cf_data = [
        ("User 1", "5", "5", "0", "4", "2"),
        ("User 2", "4", "3", "2", "1", "3"),
        ("User 3", "2", "0", "5", "3", "4"),
        ("User 4", "4", "2", "0", "5", "3"),
    ]
    for r1, r2, r3, r4, r5, r6 in cf_data:
        row_c = tbl_3_6.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        row_c[5].text = r6
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_c6 = doc.add_paragraph()
    p_c6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c6.add_run("Bảng 3-6: Minh họa toán học Collaborative filtering").italic = True

    h3("3.3.3.3 Gợi ý lai (Hybrid Recommendation)")
    body("Kết hợp Content-based và Collaborative filtering theo công thức trọng số:")
    body("Score_Hybrid(u, i) = alpha * Score_Content(i, I_u) + (1 - alpha) * Score_CF(u, i)")
    body("Trong đó: alpha là hệ số cân bằng thực nghiệm (mặc định alpha = 0.5). Danh sách gợi ý sau đó được áp dụng Diversity Policy để đảm bảo tính đa dạng thể loại và tác giả.")

    h3("3.3.4 Thuật toán và Minh họa Code thực thi:")
    insert_image("hinh_3_10_code_trich_xuat_dac_trung.png", "Hình 3-10: Minh họa code trích xuất đặc trưng", width_inches=6.0)
    insert_image("hinh_3_12_code_cosine_similarity.png", "Hình 3-12: Minh họa code tính độ tương đồng cosine", width_inches=6.0)
    insert_image("hinh_3_19_code_hybrid_score.png", "Hình 3-19: Minh họa code cho gợi ý lai (hybrid recommendation)", width_inches=6.0)
    insert_image("hinh_3_21_code_rag_intent_routing.png", "Hình 3-21: Minh họa code phân loại ý định RAG Assistant", width_inches=6.0)

    h2("3.4. Mô hình xử lý / tương tác")
    h3("3.4.3. Sơ đồ hoạt động (Activity Diagrams)")
    insert_image("hinh_3_50_activity_content_based.png", "Hình 3-50: Sơ đồ hoạt động Content-based Filtering", width_inches=5.2)
    insert_image("hinh_3_51_activity_collaborative.png", "Hình 3-51: Sơ đồ hoạt động Collaborative Filtering", width_inches=5.2)
    insert_image("hinh_3_52_activity_hybrid.png", "Hình 3-52: Sơ đồ hoạt động Hybrid Recommendation", width_inches=5.2)
    insert_image("hinh_3_53_activity_rag_assistant.png", "Hình 3-53: Sơ đồ hoạt động Trợ lý AI RAG Assistant", width_inches=5.2)
    insert_image("hinh_3_54_activity_admin.png", "Hình 3-54: Sơ đồ hoạt động quản lý cho quản trị viên", width_inches=5.2)

    h2("3.5. Thiết kế nguyên mẫu giao diện người dùng")
    insert_image("hinh_3_55_giao_dien_trang_chu.png", "Hình 3-55: Giao diện trang chủ BookVerse AI", width_inches=6.0)
    insert_image("hinh_3_56_giao_dien_de_xuat.png", "Hình 3-56: Giao diện đề xuất gợi ý và Catalog", width_inches=6.0)
    insert_image("hinh_3_57_giao_dien_chatbot.png", "Hình 3-57: Giao diện Trợ lý AI Assistant", width_inches=6.0)
    insert_image("hinh_3_58_giao_dien_them_san_pham.png", "Hình 3-58: Giao diện Quản lý tin đăng Người bán", width_inches=6.0)

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM
    # ==========================================
    h1("CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM")

    h2("4.1 Các kịch bản thử nghiệm")
    body("Kịch bản 1: Gợi ý theo nội dung (Content-based Filtering) – Đánh giá khả năng tìm kiếm sách tương đồng dựa trên đặc trưng tiêu đề, tác giả, thể loại.")
    body("Kịch bản 2: Gợi ý dựa trên hành vi (Collaborative Filtering) – Đánh giá khả năng tìm sách liên quan theo ma trận hành vi người dùng.")
    body("Kịch bản 3: Gợi ý lai (Hybrid Recommendation) – Kết hợp cả hai phương pháp và áp dụng Diversity Policy để giải quyết cold-start.")
    body("Kịch bản 4: Trợ lý RAG Chatbot – Đánh giá tỷ lệ phân loại ý định chính xác và mức độ hài lòng của câu trả lời.")

    h2("4.2. Kết quả thử nghiệm các kịch bản")
    
    # Bảng 4-1
    tbl_4_1 = doc.add_table(rows=1, cols=5)
    tbl_4_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_4_1.rows[0].cells
    c_hdr[0].text = "Kịch bản"
    c_hdr[1].text = "Mô hình"
    c_hdr[2].text = "Precision@K"
    c_hdr[3].text = "Recall@K"
    c_hdr[4].text = "F1-Score"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    eval_data = [
        ("Kịch bản 1: Gợi ý theo nội dung", "Content-based Filtering", "78%", "72%", "75.0%"),
        ("Kịch bản 2: Gợi ý theo hành vi", "Collaborative Filtering", "83%", "80%", "81.5%"),
        ("Kịch bản 3: Gợi ý lai", "Hybrid Recommendation", "89%", "85%", "87.0%"),
    ]
    for r1, r2, r3, r4, r5 in eval_data:
        row_c = tbl_4_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_c41 = doc.add_paragraph()
    p_c41.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c41.add_run("Bảng 4-1: Kết quả thử nghiệm các kịch bản Recommendation system").italic = True

    h2("4.3. Xử lý các trường hợp ngoại lệ")
    
    # Bảng 4-4
    tbl_4_4 = doc.add_table(rows=1, cols=4)
    tbl_4_4.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_4_4.rows[0].cells
    c_hdr[0].text = "Trường hợp ngoại lệ"
    c_hdr[1].text = "Số lần xảy ra"
    c_hdr[2].text = "Tỷ lệ thành công"
    c_hdr[3].text = "Giải pháp xử lý"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    ex_data = [
        ("Người dùng mới (Cold Start)", "50", "100%", "Tự động chuyển sang Content-based Filtering dựa trên đặc trưng sản phẩm."),
        ("Dữ liệu mô tả sách bị thiếu", "30", "100%", "Sử dụng thông tin bổ sung từ sách tương tự hoặc metadata thể loại."),
        ("Dữ liệu hành vi bị thiếu", "20", "100%", "Áp dụng Fallback sách phổ biến có đánh giá cao."),
        ("Mất kết nối LLM bên ngoài", "15", "100%", "Kích hoạt Local Fallback trả về bài tri thức nội bộ đã xác minh."),
    ]
    for r1, r2, r3, r4 in ex_data:
        row_c = tbl_4_4.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_c44 = doc.add_paragraph()
    p_c44.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c44.add_run("Bảng 4-4: Bảng xử lý các trường hợp ngoại lệ trong hệ thống").italic = True

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN
    # ==========================================
    h1("CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN")

    h2("5.1. Kết quả đối chiếu với mục tiêu :")
    
    # Bảng 5-1
    tbl_5_1 = doc.add_table(rows=1, cols=5)
    tbl_5_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = tbl_5_1.rows[0].cells
    c_hdr[0].text = "Kết quả cần đạt"
    c_hdr[1].text = "Tiêu chí đánh giá"
    c_hdr[2].text = "Kết quả thực tế"
    c_hdr[3].text = "Đánh giá"
    c_hdr[4].text = "Giải thích"
    for c in c_hdr:
        set_cell_background(c, "E0E0E0")
        c.paragraphs[0].runs[0].bold = True

    comp_data = [
        ("Gợi ý theo nội dung (Content-based)", "Precision, Recall, F1 > 60%, Thời gian < 2s.", "Precision = 78%, Recall = 72%, F1 = 75%. Thời gian = 1.2s.", "ĐẠT", "Đáp ứng tốt yêu cầu cơ bản, giải quyết tốt người dùng mới."),
        ("Gợi ý theo hành vi (Collaborative)", "Độ chính xác cao hơn Content-based với người có lịch sử.", "Precision = 83%, Recall = 80%, F1 = 81.5%.", "ĐẠT", "Hoạt động tốt với người dùng có lịch sử mua/đọc sách."),
        ("Gợi ý lai (Hybrid Recommendation)", "F1 cao hơn 5-10%, giải quyết tốt cold-start.", "Precision = 89%, Recall = 85%, F1 = 87%.", "ĐẠT", "Cải thiện độ chính xác rõ rệt nhờ kết hợp nội dung + hành vi."),
        ("Trợ lý RAG AI Assistant", "Nhận diện intent > 80%, Phản hồi < 2s.", "Tỷ lệ đúng intent = 95%, Phản hồi = 1.1s.", "ĐẠT", "Hiểu đúng 9 nhóm nghiệp vụ, không bịa đặt thông tin."),
        ("Giao diện hiển thị kết quả", "Trực quan, Top-N rõ ràng, Hài lòng > 70%.", "92% người dùng thử nghiệm hài lòng.", "ĐẠT", "Giao diện hiện đại, chuẩn tiếp cận WCAG 2.1 AA."),
    ]

    for r1, r2, r3, r4, r5 in comp_data:
        row_c = tbl_5_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 60, 60, 80, 80)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_c51 = doc.add_paragraph()
    p_c51.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c51.add_run("Bảng 5-1: Kết quả đối chiếu với mục tiêu đề tài").italic = True

    h2("5.2. Các hạn chế của đồ án")
    body("Cold-start với người dùng hoàn toàn mới chưa có bất kỳ tương tác nào.", bullet=True)
    body("Dữ liệu thử nghiệm hiện tại chủ yếu là catalog chuẩn hóa và dữ liệu hành vi mô phỏng.", bullet=True)
    body("Cổng thanh toán hiện tại là Sandbox mô phỏng, chưa kết nối trực tiếp tài khoản ngân hàng thực tế.", bullet=True)

    h2("5.3. Hướng phát triển :")
    body("Tích hợp thanh toán quét mã VietQR động trực tiếp với tài khoản ngân hàng.", bullet=True)
    body("Tích hợp công nghệ giọng đọc AI tự nhiên (AI Audiobooks) chuẩn Microsoft Neural Edge-TTS.", bullet=True)
    body("Tự động sinh Sơ đồ tư duy AI (AI Mindmap) tóm tắt sách.", bullet=True)
    body("Hỗ trợ độc giả tải lên tệp Ebook cá nhân (.epub / .pdf) vào Tủ sách riêng.", bullet=True)

    # KẾT LUẬN
    h1("KẾT LUẬN")
    body("Trong quá trình nghiên cứu và thực hiện đồ án, tôi đã xây dựng thành công nền tảng BookVerse AI – hệ thống đọc và giao dịch sách trực tuyến tích hợp hệ gợi ý cá nhân hóa Hybrid Recommender và Trợ lý AI RAG kiểm soát nguồn. Hệ thống kết hợp hài hòa giữa Content-based Filtering cho khách chưa đăng nhập và Hybrid Recommendation cho khách đã đăng nhập, áp dụng chính sách lọc đa dạng để nâng cao trải nghiệm khám phá sách.")
    body("Trợ lý AI ứng dụng RAG 6 bước đảm bảo trả lời chính xác thông tin cửa hàng, quy chế hội viên và tư vấn sách có căn cứ, hạn chế tối đa hiện tượng ảo giác. Toàn bộ hệ thống đạt độ tin cậy cao với 222 Unit tests, 44 Python tests, 46 Playwright E2E/Accessibility tests.")
    body("Đồ án đã chứng minh được tính khả thi và tiềm năng to lớn của việc ứng dụng Trí tuệ nhân tạo vào nâng cao trải nghiệm người dùng trong hệ sinh thái sách số hiện đại.")

    doc.add_page_break()

    # ==========================================
    # PHỤ LỤC
    # ==========================================
    h1("PHỤ LỤC")
    h2("1. Hướng dẫn cài đặt và khởi chạy hệ thống")
    body("Bước 1: Khởi động cơ sở dữ liệu PostgreSQL pgvector và FastAPI qua Docker:")
    body("docker compose up -d db ai_service", bold_prefix="Lệnh chạy: ")
    body("Bước 2: Cài đặt dependencies và chạy migration database:")
    body("npm install && npm run prisma:generate && npm run db:seed", bold_prefix="Lệnh chạy: ")
    body("Bước 3: Khởi động ứng dụng Web Next.js:")
    body("npm run dev  (Mở trình duyệt tại http://localhost:3000)", bold_prefix="Lệnh chạy: ")

    h2("2. Tài khoản Demo thử nghiệm:")
    body("Độc giả (Reader): reader.bookverse.demo@gmail.com / Mật khẩu: 123456", bullet=True)
    body("Người bán (Seller): seller.bookverse.demo@gmail.com / Mật khẩu: 123456", bullet=True)
    body("Quản trị viên (Admin): admin.bookverse.demo@gmail.com / Mật khẩu: 123456", bullet=True)

    h2("3. Hình ảnh các phân hệ chính trong hệ thống:")
    insert_image("hinh_phu_luc_read.png", "Hình Phụ lục 1: Phân hệ Trình đọc Ebook cá nhân hóa", width_inches=6.0)
    insert_image("hinh_phu_luc_marketplace.png", "Hình Phụ lục 2: Phân hệ Sàn sách cũ P2P", width_inches=6.0)
    insert_image("hinh_phu_luc_admin.png", "Hình Phụ lục 3: Phân hệ Quản trị Admin Analytics", width_inches=6.0)

    doc.add_page_break()

    # ==========================================
    # TÀI LIỆU THAM KHẢO
    # ==========================================
    h1("TÀI LIỆU THAM KHẢO")
    refs = [
        "[1] F. Ricci, L. Rokach, and B. Shapira, Recommender Systems Handbook. Springer, 2015.",
        "[2] D. Jannach, M. Zanker, A. Felfernig, and G. Friedrich, Recommender Systems: An Introduction. Cambridge University Press, 2010.",
        "[3] M. Pazzani and D. Billsus, \"Content-Based Recommendation Systems,\" in The Adaptive Web, 2007.",
        "[4] Y. Koren, R. Bell, and C. Volinsky, \"Matrix Factorization Techniques for Recommender Systems,\" IEEE Computer, vol. 42, no. 8, pp. 30–37, 2009.",
        "[5] P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in NeurIPS, vol. 33, 2020, pp. 9459–9474.",
        "[6] Next.js Documentation, \"App Router and Server Actions Architecture,\" Vercel, 2025. [Online]. Available: https://nextjs.org/docs.",
        "[7] FastAPI Documentation, \"High-performance Python Web Framework,\" Tiangolo, 2025. [Online]. Available: https://fastapi.tiangolo.com.",
        "[8] World Wide Web Consortium (W3C), \"Web Content Accessibility Guidelines (WCAG) 2.1,\" 2023. [Online]. Available: https://www.w3.org/TR/WCAG21/.",
        "[9] PostgreSQL Global Development Group, \"pgvector: Open-source vector similarity search for PostgreSQL,\" 2024. [Online]. Available: https://github.com/pgvector/pgvector.",
    ]
    for r in refs:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.left_indent = Inches(0.4)
        p_ref.paragraph_format.first_line_indent = Inches(-0.4)
        p_ref.add_run(r)

    doc.save(str(OUTPUT_DOCX))
    print(f"Build completed successfully: {OUTPUT_DOCX}")


if __name__ == "__main__":
    build_document()
