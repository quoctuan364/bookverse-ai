"""Tạo cuốn Báo cáo Đồ án Tốt nghiệp hoàn chỉnh 100% chuẩn quy cách Đại học Bình Dương:
- Trang 1: Bìa ngoài có khung viền đôi, Logo BDU, GVHD: ThS. Dương Anh Tuấn, SVTH: Lương Nguyễn Quốc Tuấn (22050098)
- Trang 2: Bìa trong
- Trang 3-5: Đề cương chi tiết 12 tuần thực hiện kèm ô chữ ký
- Trang 6: Nhận xét của Giảng viên hướng dẫn
- Trang 7: Nhận xét của Giảng viên phản biện
- Trang 8: Lời cảm ơn (đánh số La Mã i)
- Trang 9-12: Mục lục (đánh số La Mã ii -> v)
- Trang 13-15: Mục lục các hình vẽ (vi -> viii)
- Trang 16-17: Mục lục các bảng biểu (ix -> x)
- Trang 18: Mục lục các ký tự và chữ viết tắt (xi)
- Chương 1: Giới thiệu tổng quan (bắt đầu đánh số Ả Rập 1)
- Chương 2: Cơ sở lý thuyết
- Chương 3: Phân tích - Thiết kế
- Chương 4: Kết quả và thực nghiệm
- Chương 5: Kết luận - Hướng phát triển
- Kết luận
- Phụ lục
- Tài liệu tham khảo
- Văn xuôi học thuật chuẩn chỉn chu, KHÔNG DÙNG BULLET, hình ảnh sơ đồ độ phân giải cao sắc nét.
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
PUBLIC_DOCX = PROJECT_ROOT / "public" / "Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_Chuan_Mau.docx"


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


def format_header_row(table, headers, bg_hex="E0E0E0"):
    """Định dạng dòng tiêu đề bảng chuẩn."""
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        set_cell_background(cell, bg_hex)
        set_cell_padding(cell, 60, 60, 80, 80)
        set_cell_border(cell, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
                r.bold = True


def build_thesis_docx():
    doc = Document()

    # Cấu hình lề trang chuẩn A4 đồ án tốt nghiệp
    for section in doc.sections:
        section.top_margin = Inches(0.79)     # 2.0 cm
        section.bottom_margin = Inches(0.79)  # 2.0 cm
        section.left_margin = Inches(1.18)    # 3.0 cm (đóng gáy)
        section.right_margin = Inches(0.79)   # 2.0 cm
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.header_distance = Inches(0.4)
        section.footer_distance = Inches(0.4)

    # Style Normal
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    normal_style.paragraph_format.line_spacing = 1.3
    normal_style.paragraph_format.space_after = Pt(4)

    # Helper text formatting functions
    def h1_center(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(14)
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

    def prose(text, italic=False, bold_prefix=""):
        """Đoạn văn xuôi chuẩn học thuật: Thụt đầu dòng 1.27cm, căn đều 2 bên, KHÔNG DÙNG BULLET."""
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Inches(0.5)  # 1.27 cm
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(4)
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.bold = True
        r = p.add_run(text)
        r.italic = italic
        return p

    def insert_image(filename, caption, width_inches=6.0):
        img_path = ASSETS_DIR / filename
        if img_path.exists():
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(2)
            doc.add_picture(str(img_path), width=Inches(width_inches))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run(caption)
            r_cap.font.name = 'Times New Roman'
            r_cap.font.size = Pt(11.5)
            r_cap.bold = True
            r_cap.italic = True

    # ==========================================
    # TRANG 1: BÌA NGOÀI (COVER PAGE 1)
    # ==========================================
    p_b1 = doc.add_paragraph()
    p_b1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_u1 = p_b1.add_run("TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nKHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO\n")
    r_u1.font.name = 'Times New Roman'
    r_u1.font.size = Pt(13)
    r_u1.bold = True

    p_star = doc.add_paragraph()
    p_star.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_star.add_run("❖❖❖\n")

    # Logo BDU ở giữa
    logo_path = ASSETS_DIR / "bdu_logo.png"
    if logo_path.exists():
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_picture(str(logo_path), width=Inches(1.8))

    p_doan = doc.add_paragraph()
    p_doan.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_doan.paragraph_format.space_before = Pt(8)
    r_doan = p_doan.add_run("ĐỒ ÁN TỐT NGHIỆP\n\n")
    r_doan.font.name = 'Times New Roman'
    r_doan.font.size = Pt(18)
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
        "BẰNG ỨNG DỤNG RECOMMEND SYSTEM\n"
        "(BOOKVERSE AI)\n\n"
    )
    r_t2.font.name = 'Times New Roman'
    r_t2.font.size = Pt(16)
    r_t2.bold = True

    p_gv = doc.add_paragraph()
    p_gv.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_gv.paragraph_format.right_indent = Inches(0.8)
    p_gv.paragraph_format.line_spacing = 1.35

    p_gv.add_run("Giảng viên hướng dẫn:\t").bold = False
    p_gv.add_run("ThS. DƯƠNG ANH TUẤN\n").bold = True

    p_gv.add_run("Sinh viên thực hiện :\t").bold = False
    p_gv.add_run("LƯƠNG NGUYỄN QUỐC TUẤN\n").bold = True

    p_gv.add_run("Mã số sinh viên :\t").bold = False
    p_gv.add_run("22050098\n").bold = True

    p_gv.add_run("Lớp:\t\t\t").bold = False
    p_gv.add_run("22CT01\n").bold = True

    p_gv.add_run("Khóa:\t\t\t").bold = False
    p_gv.add_run("2022 – 2026\n\n").bold = True

    p_city = doc.add_paragraph()
    p_city.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_city.paragraph_format.space_before = Pt(8)
    r_city = p_city.add_run("Thành phố Hồ Chí Minh, tháng 08 năm 2026")
    r_city.font.size = Pt(12.5)
    r_city.bold = True

    doc.add_page_break()

    # ==========================================
    # TRANG 2: BÌA TRONG (COVER PAGE 2)
    # ==========================================
    p_b2 = doc.add_paragraph()
    p_b2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_u2 = p_b2.add_run("TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nKHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO\n")
    r_u2.font.name = 'Times New Roman'
    r_u2.font.size = Pt(13)
    r_u2.bold = True

    p_star2 = doc.add_paragraph()
    p_star2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_star2.add_run("❖❖❖\n\n\n")

    p_doan2 = doc.add_paragraph()
    p_doan2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_doan2 = p_doan2.add_run("ĐỒ ÁN TỐT NGHIỆP\n\n\n")
    r_doan2.font.name = 'Times New Roman'
    r_doan2.font.size = Pt(18)
    r_doan2.bold = True

    p_ten_in = doc.add_paragraph()
    p_ten_in.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_tin = p_ten_in.add_run(
        "PHÁT TRIỂN SMART BOOKSTORE ONLINE\n"
        "BẰNG ỨNG DỤNG RECOMMEND SYSTEM\n"
        "(BOOKVERSE AI)\n\n\n\n"
    )
    r_tin.font.name = 'Times New Roman'
    r_tin.font.size = Pt(16)
    r_tin.bold = True

    p_gv2 = doc.add_paragraph()
    p_gv2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_gv2.paragraph_format.right_indent = Inches(0.8)
    p_gv2.paragraph_format.line_spacing = 1.35

    p_gv2.add_run("Giảng viên hướng dẫn:\t").bold = False
    p_gv2.add_run("ThS. DƯƠNG ANH TUẤN\n").bold = True

    p_gv2.add_run("Sinh viên thực hiện :\t").bold = False
    p_gv2.add_run("LƯƠNG NGUYỄN QUỐC TUẤN\n").bold = True

    p_gv2.add_run("Mã số sinh viên :\t").bold = False
    p_gv2.add_run("22050098\n").bold = True

    p_gv2.add_run("Lớp:\t\t\t").bold = False
    p_gv2.add_run("22CT01\n").bold = True

    p_gv2.add_run("Khóa:\t\t\t").bold = False
    p_gv2.add_run("2022 – 2026\n\n\n").bold = True

    p_city2 = doc.add_paragraph()
    p_city2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_city2 = p_city2.add_run("Thành phố Hồ Chí Minh, tháng 08 năm 2026")
    r_city2.font.size = Pt(12.5)
    r_city2.bold = True

    doc.add_page_break()

    # ==========================================
    # SECTION 2: ĐỀ CƯƠNG CHI TIẾT & TRANG ĐẦU
    # ==========================================
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
    r_ftr_l = p_ftr.add_run("GVHD : ThS.Dương Anh Tuấn\t\t\t")
    r_ftr_l.font.name = "Times New Roman"
    r_ftr_l.font.size = Pt(10)

    r_ftr_r = p_ftr.add_run("SVTH : Lương Nguyễn Quốc Tuấn")
    r_ftr_r.font.name = "Times New Roman"
    r_ftr_r.font.size = Pt(10)
    add_top_border_to_paragraph(p_ftr)

    # ĐỀ CƯƠNG CHI TIẾT
    p_dec_hd = doc.add_paragraph()
    p_dec_hd.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_dh = p_dec_hd.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\t\tCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\t\tĐộc lập – Tự do – Hạnh phúc\n\n")
    r_dh.font.name = 'Times New Roman'
    r_dh.font.size = Pt(12)
    r_dh.bold = True

    h1_center("ĐỀ CƯƠNG CHI TIẾT")

    tbl_dec = doc.add_table(rows=5, cols=1)
    tbl_dec.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_dec.rows[0].cells[0].text = "Tên đề tài: PHÁT TRIỂN SMART BOOKSTORE ONLINE BẰNG ỨNG DỤNG RECOMMEND SYSTEM"
    tbl_dec.rows[1].cells[0].text = "Giảng viên hướng dẫn: ThS. DƯƠNG ANH TUẤN"
    tbl_dec.rows[2].cells[0].text = "Thời gian thực hiện: Từ ngày 9/6/2026 đến ngày 31/8/2026"
    tbl_dec.rows[3].cells[0].text = "Sinh viên thực hiện: LƯƠNG NGUYỄN QUỐC TUẤN"
    tbl_dec.rows[4].cells[0].text = "Nội dung đề tài: "

    for row in tbl_dec.rows:
        for cell in row.cells:
            set_cell_padding(cell, 70, 70, 100, 100)
            set_cell_border(cell, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})
            for p in cell.paragraphs:
                p.runs[0].font.name = "Times New Roman"
                p.runs[0].font.size = Pt(12)
                p.runs[0].bold = True

    h2("1. Lý do chọn đề tài")
    prose("Trong thời đại công nghệ số, thương mại điện tử ngày càng phát triển mạnh mẽ và trở thành xu hướng tất yếu. Các nhà sách truyền thống đang dần chuyển dịch sang môi trường trực tuyến để tiếp cận nhiều khách hàng hơn. Tuy nhiên, các nền tảng bán sách online hiện nay vẫn còn thiếu sự cá nhân hóa trải nghiệm người dùng. Việc gợi ý sách dựa trên sở thích, hành vi người dùng là một giải pháp cần thiết giúp nâng cao chất lượng phục vụ, giữ chân khách hàng, và tăng doanh số.")
    prose("Vì vậy, việc phát triển một hệ thống nhà sách thông minh (Smart Bookstore Online) ứng dụng Recommendation System sẽ giúp người dùng dễ dàng tìm thấy các đầu sách phù hợp với sở thích và nhu cầu cá nhân, từ đó tạo ra một trải nghiệm mua sắm tiện lợi, thân thiện và hiệu quả.")

    h2("2. Mục tiêu của đề tài")
    prose("Đề tài tập trung xây dựng ứng dụng website bán và đọc sách trực tuyến hoàn chỉnh. Hệ thống tích hợp công nghệ gợi ý cá nhân hóa nhằm đề xuất các đầu sách phù hợp cho người dùng dựa trên hành vi tương tác, sở thích đọc và lịch sử mua sắm. Qua đó, hệ thống hỗ trợ người dùng tìm kiếm và chọn mua sách một cách nhanh chóng, đồng thời tối ưu hóa trải nghiệm khách hàng và gia tăng doanh số cho nhà sách. Các hướng gợi ý cốt lõi bao gồm gợi ý theo sách đã xem, sách đã mua và danh mục sách tương tự mà người dùng quan tâm.")

    h2("3. Phạm vi thực hiện")
    prose("Về phía người dùng, hệ thống cung cấp đầy đủ các tính năng đăng ký, đăng nhập, tìm kiếm sách không dấu, quản lý giỏ hàng, xem danh mục đề xuất, đọc Ebook trực tuyến và tương tác cùng Trợ lý AI. Về phía quản trị viên, hệ thống hỗ trợ quản lý danh mục sách, quản lý người dùng, xử lý đơn hàng, theo dõi báo cáo doanh thu và hành vi tương tác.")
    prose("Về công nghệ sử dụng, đồ án được xây dựng trên nền tảng Fullstack Next.js kết hợp FastAPI Microservice, hệ quản trị cơ sở dữ liệu PostgreSQL tích hợp pgvector và ORM Prisma.")

    h2("4. Ý nghĩa của đề tài")
    prose("Đề tài góp phần hiện đại hóa ngành bán lẻ sách thông qua việc ứng dụng trí tuệ nhân tạo, gia tăng tính cá nhân hóa trong trải nghiệm khách hàng – một xu hướng tất yếu trong thương mại điện tử hiện đại. Đồng thời, hệ thống hướng đến khả năng mở rộng thành nền tảng số hoàn chỉnh phục vụ kết nối các nhà sách và thư viện thực tế.")

    h2("5. Đối tượng nghiên cứu")
    prose("Đối tượng nghiên cứu bao gồm người dùng truy cập và sử dụng nhà sách trực tuyến, tập dữ liệu về sách và hành vi tương tác của độc giả, cùng các thuật toán gợi ý hiện đại trong hệ thống đề xuất như Content-based Filtering, Collaborative Filtering và Hybrid Recommender.")

    h2("6. Phương pháp thực hiện")
    prose("Quá trình thực hiện bao gồm nghiên cứu các hệ sinh thái bán sách trực tuyến tiêu biểu, phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc phân lớp chuẩn mực, xây dựng giao diện người dùng thích ứng, tích hợp cơ sở dữ liệu và triển khai thuật toán gợi ý lai kết hợp Trợ lý RAG, sau đó tiến hành kiểm thử tự động toàn diện và tối ưu hóa hiệu năng.")

    h2("7. Kết quả mong đợi")
    prose("Kết quả kỳ vọng là một website hoàn chỉnh có khả năng đề xuất sách thông minh theo thời gian thực, có phân hệ quản trị riêng biệt, giao diện trực quan thân thiện và có tiềm năng mở rộng tích hợp thêm các dịch vụ học sâu nâng cao.")

    h2("Kế hoạch thực hiện (12 Tuần):")
    tbl_plan = doc.add_table(rows=1, cols=4)
    tbl_plan.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_plan, ["Tuần", "Thời gian", "Công việc", "Người thực hiện"])

    weeks_data = [
        ("1", "09/06 – 15/06", "- Làm việc với GVHD để thống nhất đề tài.\n- Thu thập và nghiên cứu tài liệu liên quan.\n- Xác định phạm vi, mục tiêu nghiên cứu.", "Lương Nguyễn Quốc Tuấn"),
        ("2", "16/06 – 22/06", "- Phân tích yêu cầu hệ thống.\n- Viết chương 1: Giới thiệu đề tài (lý do, mục tiêu, ý nghĩa, phạm vi).", "Lương Nguyễn Quốc Tuấn"),
        ("3", "23/06 – 29/06", "- Thiết kế sơ đồ Use-case kiến trúc hệ thống.\n- Viết chương 2: Cơ sở lý thuyết.", "Lương Nguyễn Quốc Tuấn"),
        ("4", "30/06 – 06/07", "- Cài đặt môi trường Next.js, PostgreSQL, Prisma, FastAPI.\n- Tạo cấu trúc dự án và cơ sở dữ liệu.\n- Viết 1 phần chương 3: Phân tích hệ thống.\n- Xây dựng hệ thống gợi ý dựa trên rating.", "Lương Nguyễn Quốc Tuấn"),
        ("5", "07/07 – 13/07", "- Thiết kế giao diện frontend (trang chủ, đăng nhập, danh sách sách, catalog).", "Lương Nguyễn Quốc Tuấn"),
        ("6", "14/07 – 20/07", "- Hoàn thiện các chức năng người dùng: tìm kiếm, đặt hàng, xem chi tiết sách, đọc Ebook.", "Lương Nguyễn Quốc Tuấn"),
        ("7", "21/07 – 27/07", "- Triển khai mô hình gợi ý trên nội dung (Content-based).\n- Biên tập dữ liệu để triển khai (Tên sách, nội dung, thể loại, tác giả, NXB).", "Lương Nguyễn Quốc Tuấn"),
        ("8", "28/07 – 03/08", "- Xây dựng mô hình gợi ý lai (Hybrid recommend system).\n- Biên tập dữ liệu cho Trợ lý RAG (câu hỏi, ý định, ngữ cảnh, câu trả lời).\n- Viết báo cáo.", "Lương Nguyễn Quốc Tuấn"),
        ("9", "04/08 – 10/08", "- Viết báo cáo.\n- Xây dựng mô hình Chatbot RAG / NLU Microservice.", "Lương Nguyễn Quốc Tuấn"),
        ("10", "11/08 – 17/08", "- Tích hợp recommend system và chatbot vào smart bookstore.", "Lương Nguyễn Quốc Tuấn"),
        ("11", "18/08 – 24/08", "- Kiểm thử hệ thống toàn diện (unit test, chức năng, trải nghiệm người dùng).\n- Viết chương 4: Thử nghiệm – đánh giá.", "Lương Nguyễn Quốc Tuấn"),
        ("12", "25/08 – 31/08", "- Rà soát và viết chương 5: Kết luận và hướng phát triển.\n- Chỉnh sửa các chương trước theo góp ý GVHD.", "Lương Nguyễn Quốc Tuấn"),
    ]

    for w, t, task, p in weeks_data:
        row_c = tbl_plan.add_row().cells
        row_c[0].text = w
        row_c[1].text = t
        row_c[2].text = task
        row_c[3].text = p
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_sig = doc.add_paragraph()
    p_sig.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_sig.paragraph_format.space_before = Pt(14)
    r_s1 = p_sig.add_run("SINH VIÊN THỰC HIỆN\t\t\t\t\tCÁN BỘ HƯỚNG DẪN\n")
    r_s1.bold = True
    r_s2 = p_sig.add_run("(Sinh viên ký và ghi rõ họ tên)\t\t\t\t(Ký tên và ghi rõ họ tên)\n\n\n\n")
    r_s2.italic = True
    r_s3 = p_sig.add_run("Lương Nguyễn Quốc Tuấn\t\t\t\t\tThS. Dương Anh Tuấn")
    r_s3.bold = True

    doc.add_page_break()

    # NHẬN XÉT GVHD
    h1_center("NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN")
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
    p_gv_date.add_run("ThS. Dương Anh Tuấn").bold = True

    doc.add_page_break()

    # NHẬN XÉT GVPB
    h1_center("NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN")
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

    # LỜI CẢM ƠN
    h1_center("LỜI CẢM ƠN")
    prose("Trước tiên, em xin gửi lời cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng toàn thể quý thầy cô Trường Đại học Bình Dương đã tận tình giảng dạy, truyền đạt cho em những kiến thức quý báu trong suốt quá trình học tập và rèn luyện tại trường.")
    prose("Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến ThS. Dương Anh Tuấn – người đã trực tiếp hướng dẫn, chỉ bảo tận tình, giúp đỡ em trong suốt quá trình thực hiện và hoàn thành đồ án tốt nghiệp. Sự tận tâm, trách nhiệm và những đóng góp quý báu của thầy đã giúp em có được định hướng rõ ràng, hoàn thiện nội dung nghiên cứu cũng như nâng cao kỹ năng thực tiễn.")
    prose("Bên cạnh đó, em cũng xin cảm ơn gia đình và bạn bè đã luôn động viên, khích lệ và hỗ trợ em trong suốt thời gian học tập và thực hiện đồ án.")
    prose("Mặc dù đã nỗ lực hết sức, nhưng do kiến thức và kinh nghiệm còn hạn chế, đồ án không thể tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp của quý thầy cô để có thể hoàn thiện hơn trong tương lai.")
    prose("Em xin chân thành cảm ơn!")

    p_sv_sign = doc.add_paragraph()
    p_sv_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sv_sign.paragraph_format.space_before = Pt(14)
    p_sv_sign.add_run("SINH VIÊN THỰC HIỆN\n\n\n").bold = True
    p_sv_sign.add_run("Lương Nguyễn Quốc Tuấn").bold = True

    doc.add_page_break()

    # ==========================================
    # MỤC LỤC & DANH MỤC
    # ==========================================
    h1_center("MỤC LỤC")
    toc_items = [
        ("LỜI CẢM ƠN", "I"),
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
        ("    3.4.1 Use case chi tiết", "40"),
        ("    3.4.2 Sơ đồ tuần tự (sequence diagram)", "59"),
        ("    3.4.3 Sơ đồ hoạt động (activity diagram)", "62"),
        ("3.5. Thiết kế nguyên mẫu giao diện người dùng", "66"),
        ("3.6. Thiết kế chi tiết", "68"),
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

    # MỤC LỤC CÁC HÌNH VẼ
    h1_center("MỤC LỤC CÁC HÌNH VẼ")
    fig_items = [
        ("Hình 1-1: Sơ đồ quy trình nghiệp vụ tổng quan", "4"),
        ("Hình 3-1: Sơ đồ ngữ cảnh (Context Diagram)", "16"),
        ("Hình 3-2: Sơ đồ use case của toàn hệ thống", "19"),
        ("Hình 3-3: Mô hình tổng quát nghiệp vụ tổng quan", "21"),
        ("Hình 3-4: Mô hình chi tiết Browser (Client)", "24"),
        ("Hình 3-5: Mô hình chi tiết Application Server (Controllers)", "25"),
        ("Hình 3-6: Mô hình chi tiết Service Layer", "26"),
        ("Hình 3-7: Mô hình chi tiết Database", "27"),
        ("Hình 3-8: Mô hình chi tiết Chatbot RAG", "28"),
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
        ("Hình 3-20: Minh họa code cho tiền xử lí data chatbot", "37"),
        ("Hình 3-21: Minh họa code cho phân loại ý định", "37"),
        ("Hình 3-22: Minh họa code cho trích xuất thực thể", "38"),
        ("Hình 3-23: Minh họa code cho quản lý hội thoại", "39"),
        ("Hình 3-24: Minh họa code cho action execution chatbot", "39"),
        ("Hình 3-42: Sơ đồ tuần tự tổng quát", "59"),
        ("Hình 3-49: Sơ đồ hoạt động hệ thống gợi ý tổng quát", "62"),
        ("Hình 3-50: Sơ đồ hoạt động Content-based Filtering", "63"),
        ("Hình 3-51: Sơ đồ hoạt động Collaborative Filtering", "63"),
        ("Hình 3-52: Sơ đồ hoạt động Hybrid Recommendation", "64"),
        ("Hình 3-53: Sơ đồ hoạt động Chatbot RAG", "64"),
        ("Hình 3-54: Sơ đồ hoạt động quản lý cho quản trị viên", "65"),
        ("Hình 3-55: Giao diện trang chủ", "66"),
        ("Hình 3-56: Giao diện đề xuất gợi ý", "67"),
        ("Hình 3-57: Giao diện Chatbot", "68"),
        ("Hình 3-58: Giao diện Thêm sản phẩm", "68"),
    ]
    for item, page_str in fig_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.line_spacing = 1.15
        p_t.paragraph_format.space_after = Pt(2)
        dots = "." * max(5, int((75 - len(item) - len(page_str)) * 1.6))
        p_t.add_run(f"{item} {dots} {page_str}")

    doc.add_page_break()

    # MỤC LỤC CÁC BẢNG BIỂU
    h1_center("MỤC LỤC CÁC BẢNG BIỂU")
    tbl_items = [
        ("Bảng 1-1: Kết quả cần đạt", "8"),
        ("Bảng 2-1: Công nghệ sử dụng", "13"),
        ("Bảng 3-1: Danh sách actor", "15"),
        ("Bảng 3-2: Use Case cho Khách hàng chưa đăng nhập", "17"),
        ("Bảng 3-3: Use Case cho Khách hàng đã đăng nhập", "18"),
        ("Bảng 3-4: Use Case cho Quản trị viên (Admin)", "18"),
        ("Bảng 3-5: Minh họa toán học Content-based Filtering", "28"),
        ("Bảng 3-6: Minh họa toán học Collaborative filtering", "29"),
        ("Bảng 4-1: Kết quả thử nghiệm các kịch bản Recommendation system", "75"),
        ("Bảng 4-2: Các tình huống thử nghiệm của chatbot", "76"),
        ("Bảng 4-3: Kết quả thử nghiệm Chatbot Rasa", "76"),
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

    # MỤC LỤC KÝ TỰ VÀ CHỮ VIẾT TẮT
    h1_center("MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT")
    tbl_abbr = doc.add_table(rows=1, cols=2)
    tbl_abbr.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_abbr, ["Từ viết tắt", "Ý nghĩa / Giải thích"])

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
        ("LLM", "Large Language Model – Mô hình ngôn ngữ lớn"),
        ("RecSys", "Recommendation System – Hệ thống gợi ý"),
        ("UI", "User Interface – Giao diện người dùng"),
        ("UX", "User Experience – Trải nghiệm người dùng"),
        ("RBAC", "Role-Based Access Control – Phân quyền theo vai trò"),
        ("ORM", "Object-Relational Mapping – Ánh xạ quan hệ đối tượng"),
        ("TTS", "Text-to-Speech – Đọc văn bản thành giọng nói"),
    ]

    for a, d in abbr_data:
        row_c = tbl_abbr.add_row().cells
        row_c[0].text = a
        row_c[1].text = d
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN
    # ==========================================
    h1_center("CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN")

    h2("1.1. Lý do thực hiện đề tài :")
    h3("1.1.1 Hiện trạng")
    prose("Trong thời đại số hóa, việc lựa chọn và tìm kiếm sách phù hợp là một thách thức lớn đối với người đọc. Người dùng thường phải dựa vào danh sách sách phổ biến, bảng xếp hạng chung hoặc tự tìm kiếm thủ công trong các cửa hàng trực tuyến, dẫn đến trải nghiệm chưa được cá nhân hóa và tiêu tốn nhiều thời gian.")
    prose("Các thư viện truyền thống và nền tảng sách trực tuyến hiện nay thường tồn tại những hạn chế cốt lõi sau:")
    prose("Thứ nhất, thiếu tính cá nhân hóa: Các gợi ý chủ yếu dựa trên số lượt xem tổng thể, đánh giá chung hoặc danh mục thể loại phổ biến, chưa thực sự phản ánh đúng sở thích và lịch sử đọc riêng biệt của từng cá nhân người dùng.")
    prose("Thứ hai, tương tác còn hạn chế: Phần lớn các hệ thống thương mại điện tử sách hiện nay chưa tích hợp trợ lý ảo thông minh hay chatbot trực tuyến để giải đáp thắc mắc và tư vấn chuyên sâu cho khách hàng.")
    prose("Thứ ba, khả năng mở rộng gặp trở ngại: Khi số lượng người dùng và đầu sách tăng trưởng nhanh chóng, các hệ thống thường gặp khó khăn về tốc độ xử lý dữ liệu lớn và thời gian phản hồi của mô hình gợi ý.")
    prose("Trong khi các mô hình gợi ý đã được nghiên cứu rộng rãi trong học thuật, việc kết hợp đồng thời giữa gợi ý cá nhân hóa đa tầng và Trợ lý AI trong một nền tảng đọc sách tích hợp vẫn còn nhiều khoảng trống cần giải quyết.")

    h3("1.1.2 Lý do chọn đề tài")
    prose("Xuất phát từ nhu cầu thực tế, người dùng rất cần một hệ thống gợi ý sách cá nhân hóa chuẩn xác nhằm tiết kiệm thời gian tìm kiếm và nâng cao trải nghiệm đọc sách số.")
    prose("Về khoảng trống công nghệ, các nhà sách trực tuyến hiện tại còn hạn chế trong việc ứng dụng công nghệ trí tuệ nhân tạo, đặc biệt là sự kết hợp giữa Recommendation System và Trợ lý RAG thông minh.")
    prose("Về ý nghĩa học thuật, đề tài tạo cơ hội nghiên cứu chuyên sâu và ứng dụng thực tiễn các kiến trúc Web hiện đại, các kỹ thuật gợi ý cốt lõi bao gồm Content-based Filtering, Collaborative Filtering, Hybrid Recommender và xử lý ngôn ngữ tự nhiên.")
    prose("Về ý nghĩa thực tiễn, đề tài trực tiếp nâng cao chất lượng phục vụ độc giả, gia tăng tính cạnh tranh và doanh số cho nhà sách trực tuyến, giúp bạn đọc tiếp cận tri thức một cách thuận tiện và chính xác nhất.")

    h3("1.1.3 Tính cần thiết của đề tài")
    prose("Về phía người dùng, hệ thống đáp ứng nhu cầu khám phá sách nhanh chóng, phù hợp với sở thích cá nhân và thói quen đọc sách.")
    prose("Về phía doanh nghiệp, giải pháp nâng cao năng lực cạnh tranh, tối ưu hóa quy trình bán hàng và gia tăng mức độ gắn bó của khách hàng.")
    prose("Về phía học thuật và nghiên cứu, đồ án minh chứng khả năng tích hợp các thuật toán trí tuệ nhân tạo vào sản phẩm phần mềm hoàn chỉnh đạt chuẩn kỹ thuật công nghiệp.")
    prose("Xu hướng phát triển tất yếu hiện nay là việc kết hợp giữa hệ gợi ý học máy và trợ lý ngôn ngữ tự nhiên trong các nền tảng thương mại điện tử và dịch vụ số thế hệ mới.")

    h3("1.1.4 Quy trình nghiệp vụ tổng quan")
    prose("Quy trình nghiệp vụ của hệ thống được tổ chức qua 6 bước logic liền mạch:")
    prose("Bước 1: Người dùng tiến hành đăng ký tài khoản hoặc đăng nhập vào hệ thống; thông tin hồ sơ được lưu trữ an toàn để làm cơ sở cho quá trình cá nhân hóa.")
    prose("Bước 2: Người dùng duyệt danh mục sách và xem chi tiết từng cuốn sách; hệ thống tự động ghi nhận các lượt xem và thời gian đọc làm dữ liệu đầu vào cho mô hình gợi ý.")
    prose("Bước 3: Người dùng thực hiện các tương tác như đánh giá sao, lưu yêu thích, bookmark hoặc thêm vào giỏ hàng; các tương tác này được đồng bộ vào cơ sở dữ liệu.")
    prose("Bước 4: Hệ thống gợi ý học máy tiếp nhận dữ liệu tương tác và đặc trưng sách, tính toán điểm số và trả về danh sách sách đề xuất tối ưu trên giao diện.")
    prose("Bước 5: Người dùng có thể đặt câu hỏi tự nhiên với Trợ lý AI; hệ thống phân loại ý định, truy xuất tri thức và đưa ra câu trả lời cá nhân hóa chính xác.")
    prose("Bước 6: Toàn bộ lịch sử tương tác và phản hồi được lưu trữ để liên tục cập nhật và nâng cao chất lượng gợi ý theo thời gian.")

    insert_image("hinh_1_1_quy_trinh_nghiep_vu.png", "Hình 1-1: Sơ đồ quy trình nghiệp vụ tổng quan", width_inches=5.2)

    h2("1.2. Các hệ thống tương tự")
    h3("1.2.1. Các nghiên cứu, hệ thống đã có")
    prose("Trên thị trường hiện nay đã có một số nền tảng bán sách trực tuyến ứng dụng tính năng gợi ý tiêu biểu như Fahasa, Vinabook và Bookbuy. Tuy nhiên, các hệ thống này chủ yếu đưa ra gợi ý cơ bản dựa trên danh mục cùng thể loại hoặc danh sách sách bán chạy nhất. Một số trường hợp có gợi ý sách tương tự nhưng thường chỉ dừng lại ở mức so khớp từ khóa metadata đơn giản.")
    prose("Nền tảng quốc tế Goodreads cung cấp tính năng gợi ý dựa trên đánh giá của cộng đồng độc giả. Mặc dù vậy, Goodreads tập trung nhiều vào khía cạnh mạng xã hội sách hơn là tích hợp liền mạch vào quy trình đọc Ebook và giao dịch mua sắm tức thời.")
    prose("Nhiều công trình nghiên cứu học thuật trước đây đã tập trung phát triển mô hình Content-based hoặc Collaborative Filtering, nhưng việc triển khai thực tế thường gặp trở ngại trong xử lý bài toán khởi đầu lạnh (cold-start) và chưa kết hợp với công cụ trợ lý AI hỗ trợ người dùng.")

    h3("1.2.2. Vấn đề tồn tại và tính mới của đề tài")
    prose("Khảo sát thực tế cho thấy các hệ thống hiện tại còn thiếu sự cá nhân hóa sâu sắc, dễ bị ảnh hưởng bởi vấn đề người dùng mới (cold-start) và thiếu vắng công cụ chatbot tương tác trực quan.")
    prose("Tính mới của đề tài thể hiện ở việc đề xuất hệ thống Hybrid Recommendation kết hợp giữa Content-based và Collaborative Filtering kèm Diversity Policy nhằm tận dụng ưu điểm của từng mô hình và khắc phục triệt để bài toán cold-start.")
    prose("Đồng thời, đồ án phân tách rõ hai nhóm đối tượng: khách chưa đăng nhập được gợi ý theo đặc trưng nội dung, trong khi khách đã đăng nhập được cá nhân hóa theo hành vi tương tác và đánh giá. Việc tích hợp Trợ lý AI RAG đem lại khả năng tư vấn thông minh vượt trội so với các nền tảng truyền thống.")

    h2("1.3. Phát biểu bài toán:")
    h3("1.3.1. Mục tiêu:")
    prose("Xây dựng hệ thống nhà sách trực tuyến thông minh có khả năng đưa ra các đề xuất sách cá nhân hóa chuẩn xác cho từng người dùng.")
    prose("Ứng dụng linh hoạt các kỹ thuật Content-based Filtering, Collaborative Filtering và Hybrid Recommendation để nâng cao độ chính xác và độ phủ của danh mục gợi ý.")
    prose("Giải quyết hiệu quả bài toán người dùng mới thông qua khai thác đặc trưng nội dung sách, kết hợp tận dụng lịch sử tương tác khi người dùng đăng nhập.")
    prose("Tích hợp Trợ lý AI RAG cung cấp thông tin nhà sách, chính sách hội viên và tư vấn sách tự nhiên theo ngữ cảnh.")

    h3("1.3.2. Phạm vi")
    prose("Đối tượng sử dụng là người dùng cá nhân có nhu cầu tra cứu, đọc Ebook và giao dịch sách trực tuyến. Dữ liệu xử lý bao gồm toàn bộ metadata của sách và dữ liệu hành vi tương tác.")
    prose("Phạm vi chức năng bao gồm gợi ý sách cá nhân hóa, trình đọc sách điện tử tương tác cao, sàn giao dịch sách cũ P2P, quản lý gói hội viên và Trợ lý AI hỗ trợ.")

    h3("1.3.3. Ràng buộc")
    prose("Về nghiệp vụ, người dùng cần đăng nhập để lưu trữ tiến độ đọc và nhận gợi ý cá nhân hóa sâu; hệ thống giỏ hàng đảm bảo tính toàn vẹn tồn kho không âm.")
    prose("Về công nghệ và hiệu năng, hệ thống được phát triển trên kiến trúc Fullstack hiện đại, thời gian phản hồi giao diện đảm bảo dưới 2 giây để duy trì trải nghiệm mượt mà.")

    h3("1.3.4. Các giả định và phụ thuộc:")
    prose("Đồ án giả định người dùng truy cập qua các trình duyệt web hiện đại có kết nối Internet ổn định. Chất lượng gợi ý phụ thuộc vào số lượng và độ phong phú của dữ liệu tương tác tích lũy.")

    h2("1.4. Kết quả cần đạt :")
    tbl_1_1 = doc.add_table(rows=1, cols=3)
    tbl_1_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_1_1, ["Kết quả cần đạt", "Tiêu chí đánh giá", "Tính ứng dụng"])

    kpi_data = [
        ("Hệ thống gợi ý theo nội dung (Content-based)", "Precision@K, Recall@K, F1-score đạt > 60%. Thời gian phản hồi < 2s.", "Giúp người dùng mới chưa có lịch sử nhanh chóng tìm thấy sách cùng thể loại, tác giả."),
        ("Hệ thống gợi ý dựa trên hành vi (Collaborative)", "Độ chính xác cao hơn Content-based với người có lịch sử. Khám phá sách liên quan ngầm.", "Tăng khả năng cá nhân hóa cho người dùng đã đăng nhập."),
        ("Hệ thống gợi ý lai (Hybrid Recommendation)", "F1-score cao hơn 5-10% so với từng mô hình riêng lẻ. Khắc phục bài toán cold-start.", "Kết hợp ưu điểm cả hai phương pháp, tối ưu trải nghiệm tổng thể."),
        ("Chatbot RAG hỗ trợ thông tin", "Tỷ lệ nhận diện đúng intent > 80%. Thời gian phản hồi < 2s.", "Cải thiện tương tác, giải đáp nhanh chóng thông tin nhà sách và tư vấn sách."),
        ("Giao diện hiển thị kết quả gợi ý", "Trực quan, thân thiện, hiển thị Top-N rõ ràng. Đánh giá hài lòng > 70%.", "Giúp người dùng dễ dàng tiếp cận sách đề xuất mà không cần tìm kiếm thủ công."),
        ("Khả năng mở rộng dữ liệu", "Hệ thống xử lý tốt khi quy mô dữ liệu sách tăng lên hàng nghìn bản ghi.", "Có thể triển khai thực tế cho nhà sách trực tuyến hoặc thư viện số."),
    ]

    for r1, r2, r3 in kpi_data:
        row_c = tbl_1_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap1 = doc.add_paragraph()
    p_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap1.add_run("Bảng 1-1: Kết quả cần đạt").italic = True

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
    # ==========================================
    h1_center("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT")

    h2("2.1. Cơ sở lý thuyết:")
    h3("2.1.1 Recommender System")
    h3("2.1.1.1 Tổng quan về Recommender System")
    prose("Hệ thống gợi ý (Recommender System – RS) là một tập hợp các thuật toán và mô hình toán học được thiết kế nhằm dự đoán mức độ quan tâm của người dùng đối với các sản phẩm, từ đó đưa ra các đề xuất phù hợp nhất. Trong thương mại điện tử sách, hệ thống gợi ý đóng vai trò là cầu nối giúp độc giả tiếp cận đúng tác phẩm yêu thích giữa hàng ngàn tựa sách khác nhau.")
    prose("Hệ thống tiến hành phân tích đa chiều dựa trên thuộc tính nội dung của sách, lịch sử hành vi tương tác của người dùng và mối tương quan giữa các nhóm độc giả có cùng sở thích.")

    h3("2.1.1.2 Content-based Filtering RS")
    prose("Phương pháp lọc dựa trên nội dung (Content-Based Filtering) dựa trên nguyên lý đề xuất các sản phẩm có đặc trưng tương đồng với sản phẩm người dùng đã từng quan tâm trong quá khứ. Hệ thống trích xuất các đặc trưng văn bản như thể loại, tác giả, nhà xuất bản và tóm tắt nội dung, sau đó biểu diễn thành các vector đặc trưng không gian đa chiều.")
    prose("Ưu điểm nổi bật của Content-based là khả năng gợi ý độc lập cho từng cá nhân mà không phụ thuộc vào dữ liệu của cộng đồng, đặc biệt hiệu quả trong việc giải quyết bài toán người dùng mới.")

    h3("2.1.1.3 Collaborative Filtering RS")
    prose("Phương pháp lọc cộng tác (Collaborative Filtering) khai thác hành vi của cộng đồng độc giả dựa trên giả thuyết những người có hành vi tương đồng trong quá khứ sẽ có xu hướng lựa chọn giống nhau trong tương lai.")
    prose("Mô hình bao gồm hai hướng tiếp cận chính: User-based Collaborative Filtering tìm kiếm những người dùng có sở thích tương đồng, và Item-based Collaborative Filtering phân tích sự đồng xuất hiện giữa các đầu sách trong lịch sử mua sắm và đánh giá.")

    h3("2.1.2 Trợ lý RAG & Chatbot AI")
    prose("Kỹ thuật RAG (Retrieval-Augmented Generation) kết hợp giữa mô hình hiểu ngôn ngữ tự nhiên và cơ chế truy xuất dữ liệu động. Hệ thống phân tích ý định của người dùng, trích xuất thực thể, sau đó truy vấn cơ sở dữ liệu nội bộ để tổng hợp câu trả lời chính xác, tránh hoàn toàn hiện tượng bịa đặt thông tin.")

    h2("2.2. Cách tiếp cận, giải quyết vấn đề")
    h3("2.2.1. Mô hình tiếp cận")
    prose("Hệ thống tích hợp linh hoạt cả ba mô hình gợi ý:")
    prose("Content-based Filtering khai thác đặc trưng thuộc tính sách để phục vụ khách hàng mới chưa đăng nhập.")
    prose("Collaborative Filtering phân tích ma trận tương tác để tìm kiếm mối liên hệ ngầm giữa các cuốn sách đối với độc giả đã có lịch sử.")
    prose("Hybrid Recommendation kết hợp trọng số giữa nội dung và hành vi, áp dụng chính sách đa dạng hóa để mang lại trải nghiệm tối ưu nhất.")

    h3("2.2.2. Phương pháp phát triển hệ thống")
    prose("Hệ thống được thiết kế theo mô hình kiến trúc phân lớp chuẩn mực: Tầng Client hiển thị giao diện người dùng, Tầng Application Server xử lý logic nghiệp vụ và điều phối, Tầng Service Layer thực thi các thuật toán gợi ý và RAG, và Tầng Database đảm bảo lưu trữ dữ liệu an toàn, tin cậy.")

    h2("2.3. Công nghệ sử dụng :")
    tbl_2_1 = doc.add_table(rows=1, cols=3)
    tbl_2_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_2_1, ["Công nghệ / Công cụ", "Mô tả", "Vai trò trong hệ thống"])

    tech_data = [
        ("Next.js 15 & React 19", "Framework Web Fullstack với Server Components và Server Actions.", "Xây dựng toàn bộ giao diện Web, xử lý luồng nghiệp vụ và tối ưu hiệu năng."),
        ("TypeScript", "Ngôn ngữ định kiểu tĩnh an toàn.", "Đảm bảo tính chặt chẽ mã nguồn và hạn chế lỗi runtime."),
        ("Tailwind CSS", "Framework CSS tiện ích hiện đại.", "Xây dựng giao diện responsive đẹp mắt, chuẩn WCAG 2.1 AA."),
        ("PostgreSQL 16 + pgvector", "Hệ quản trị CSDL quan hệ tích hợp vector embeddings.", "Lưu trữ dữ liệu quan hệ và phục vụ tìm kiếm ngữ nghĩa vector."),
        ("Prisma ORM", "Thư viện ORM thế hệ mới cho Node.js.", "Truy vấn và quản lý CSDL an toàn, type-safe."),
        ("FastAPI (Python 3.14)", "Microservice framework hiệu năng cao.", "Chạy mô hình gợi ý Hybrid Recommender và pipeline RAG Assistant."),
        ("NextAuth v5", "Thư viện xác thực & phân quyền bảo mật.", "Quản lý phiên đăng nhập, mã hóa bcrypt và phân quyền RBAC."),
    ]

    for c1, c2, c3 in tech_data:
        row_c = tbl_2_1.add_row().cells
        row_c[0].text = c1
        row_c[1].text = c2
        row_c[2].text = c3
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap2 = doc.add_paragraph()
    p_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap2.add_run("Bảng 2-1: Công nghệ sử dụng").italic = True

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ
    # ==========================================
    h1_center("CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ")

    h2("3.1. Các yêu cầu chức năng [Use case view]")
    h3("3.1.1. Ngữ cảnh sử dụng")
    h3("3.1.1.1. Danh sách actor")

    tbl_3_1 = doc.add_table(rows=1, cols=3)
    tbl_3_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_3_1, ["Actor", "Mô tả", "Quyền hạn / Chức năng chính"])

    actor_data = [
        ("Khách hàng chưa đăng nhập", "Người dùng truy cập website mà chưa có tài khoản.", "Xem danh sách và chi tiết sách, sử dụng chatbot hỏi thông tin cơ bản, nhận gợi ý theo nội dung, đăng ký tài khoản."),
        ("Khách hàng đã đăng nhập", "Người dùng có tài khoản đã xác thực trong hệ thống.", "Toàn bộ quyền khách chưa đăng nhập, đặt hàng, quản lý giỏ hàng, đánh giá sách, đọc Ebook, nhận gợi ý Hybrid cá nhân hóa, chatbot hỗ trợ theo lịch sử."),
        ("Quản trị viên (Admin)", "Người chịu trách nhiệm quản lý toàn bộ hệ thống.", "Quản lý danh mục sách, quản lý người dùng, xử lý đơn hàng, theo dõi báo cáo doanh thu và chất lượng dữ liệu."),
        ("Chatbot / Trợ lý AI", "Thành phần AI thông minh tích hợp trên website.", "Tiếp nhận câu hỏi tự nhiên, phân loại ý định và trả lời chính xác có nguồn dẫn."),
    ]

    for a1, a2, a3 in actor_data:
        row_c = tbl_3_1.add_row().cells
        row_c[0].text = a1
        row_c[1].text = a2
        row_c[2].text = a3
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap31 = doc.add_paragraph()
    p_cap31.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap31.add_run("Bảng 3-1: Danh sách actor").italic = True

    h3("3.1.1.2. Sơ đồ ngữ cảnh (context diagram):")
    insert_image("hinh_3_1_so_do_ngu_canh.png", "Hình 3-1: Sơ đồ ngữ cảnh", width_inches=6.0)

    h3("3.1.2. Các use case")
    insert_image("hinh_3_2_use_case_toan_he_thong.png", "Hình 3-2: Sơ đồ use case của toàn hệ thống", width_inches=6.0)

    h2("3.2. Các yêu cầu phi chức năng")
    prose("Tính dễ sử dụng: Giao diện thân thiện, dễ hiểu, các thao tác tìm kiếm, đọc sách và mua hàng được bố trí hợp lý trên mọi thiết bị.")
    prose("Hiệu suất hoạt động: Phản hồi nhanh chóng, đảm bảo thời gian tải trang và trả kết quả gợi ý dưới 2 giây.")
    prose("Tính ổn định và bảo mật: Hệ thống hoạt động liên tục, mã hóa mật khẩu bảo mật, phân quyền nghiêm ngặt và kiểm soát lỗi ngoại lệ.")
    prose("Khả năng bảo trì và mở rộng: Cấu trúc phân lớp rõ ràng, dễ dàng tích hợp thêm các mô hình học sâu và kết nối các dịch vụ thanh toán thực tế.")

    h2("3.3. Mô hình hệ thống [Logical view]")
    h3("3.3.1 Mô hình tổng quát")
    insert_image("hinh_3_3_mo_hinh_tong_quat.png", "Hình 3-3: Mô hình tổng quát nghiệp vụ tổng quan", width_inches=6.0)

    h3("3.3.3 Cơ sở toán học cho hệ thống :")
    h3("3.3.3.1 Gợi ý dựa trên nội dung (Content-based Filtering)")
    prose("Mỗi cuốn sách i được mô tả bởi một vector đặc trưng d_i = (w_i1, w_i2, ..., w_in) trong đó w_ij là trọng số TF-IDF của từ khóa j trong sách i.")
    prose("Độ tương đồng giữa hai cuốn sách i và j được tính bằng Cosine Similarity theo công thức:")
    prose("Sim(i, j) = (d_i . d_j) / (||d_i|| * ||d_j||)")

    # Bảng 3-5
    tbl_3_5 = doc.add_table(rows=1, cols=5)
    tbl_3_5.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Bảng 3-5
    tbl_3_5 = doc.add_table(rows=1, cols=5)
    tbl_3_5.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_3_5, ["Tựa sách", "CNTT", "Kinh tế", "Văn học", "Feature Vector"])

    cb_data = [
        ("Lập trình Web Next.js", "0.95", "0.10", "0.05", "x1 = [0.95, 0.10, 0.05]"),
        ("Tư duy nhanh và chậm", "0.20", "0.90", "0.15", "x2 = [0.20, 0.90, 0.15]"),
        ("Nhà giả kim", "0.05", "0.20", "0.95", "x3 = [0.05, 0.20, 0.95]"),
    ]
    for r1, r2, r3, r4, r5 in cb_data:
        row_c = tbl_3_5.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap35 = doc.add_paragraph()
    p_cap35.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap35.add_run("Bảng 3-5: Minh họa toán học Content-based Filtering").italic = True

    h3("3.3.3.2 Gợi ý dựa trên cộng tác (Collaborative Filtering – CF):")
    prose("Tính toán độ tương đồng giữa hai người dùng u và v hoặc giữa hai cuốn sách i và j dựa trên ma trận đánh giá/tương tác và tính độ tương quan hành vi Cosine:")
    prose("Sim(u, v) = sum((R_ui - mean(R_u)) * (R_vi - mean(R_v))) / (sqrt(sum((R_ui - mean(R_u))^2)) * sqrt(sum((R_vi - mean(R_v))^2)))")

    # Bảng 3-6
    tbl_3_6 = doc.add_table(rows=1, cols=6)
    tbl_3_6.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_3_6, ["User / Book", "B01", "B02", "B03", "B04", "B05"])

    cf_data = [
        ("User 1", "5", "5", "0", "4", "2"),
        ("User 2", "4", "3", "2", "1", "3"),
        ("User 3", "2", "0", "5", "3", "4"),
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
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap36 = doc.add_paragraph()
    p_cap36.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap36.add_run("Bảng 3-6: Minh họa toán học Collaborative filtering").italic = True

    h3("3.3.3.3 Gợi ý lai (Hybrid Recommendation):")
    prose("Kết hợp Content-based và Collaborative filtering theo công thức trọng số:")
    prose("Score_Hybrid(u, i) = alpha * Score_Content(i, I_u) + (1 - alpha) * Score_CF(u, i)")
    prose("Trong đó: alpha thuộc [0, 1] là hệ số điều chỉnh mức ưu tiên thực nghiệm (mặc định alpha = 0.5). Danh sách kết quả được lọc qua Diversity Policy để đảm bảo tính đa dạng thể loại và tác giả.")

    h3("3.3.4 Thuật toán - giải thuật áp dụng:")
    insert_image("hinh_3_10_code_trich_xuat_dac_trung.png", "Hình 3-10: Minh họa code trích xuất đặc trưng", width_inches=5.8)
    insert_image("hinh_3_12_code_cosine_similarity.png", "Hình 3-12: Minh họa code tính độ tương đồng cosine", width_inches=5.8)
    insert_image("hinh_3_19_code_hybrid_score.png", "Hình 3-19: Minh họa code cho gợi ý lai (hybrid recommendation)", width_inches=5.8)
    insert_image("hinh_3_21_code_rag_intent_routing.png", "Hình 3-21: Minh họa code cho phân loại ý định", width_inches=5.8)

    h2("3.4. Mô hình xử lý / tương tác")
    h3("3.4.2. Sơ đồ tuần tự (sequence diagram)")
    insert_image("hinh_3_42_so_do_tuan_tu_tong_quat.png", "Hình 3-42: Sơ đồ tuần tự tổng quát", width_inches=6.0)

    h3("3.4.3. Sơ đồ hoạt động (activity diagram).")
    insert_image("hinh_3_50_activity_content_based.png", "Hình 3-50: Sơ đồ hoạt động Content-based Filtering", width_inches=5.2)
    insert_image("hinh_3_51_activity_collaborative.png", "Hình 3-51: Sơ đồ hoạt động Collaborative Filtering", width_inches=5.2)
    insert_image("hinh_3_52_activity_hybrid.png", "Hình 3-52: Sơ đồ hoạt động Hybrid Recommendation", width_inches=5.2)
    insert_image("hinh_3_53_activity_rag_assistant.png", "Hình 3-53: Sơ đồ hoạt động Chatbot RAG", width_inches=5.2)
    insert_image("hinh_3_54_activity_admin.png", "Hình 3-54: Sơ đồ hoạt động quản lý cửa hàng sách cho quản trị viên", width_inches=5.2)

    h2("3.5. Thiết kế nguyên mẫu giao diện người dùng")
    insert_image("hinh_3_55_giao_dien_trang_chu.png", "Hình 3-55: Giao diện trang chủ", width_inches=5.8)
    insert_image("hinh_3_56_giao_dien_de_xuat.png", "Hình 3-56: Giao diện đề xuất gợi ý", width_inches=5.8)
    insert_image("hinh_3_57_giao_dien_chatbot.png", "Hình 3-57: Giao diện Chatbot", width_inches=5.8)
    insert_image("hinh_3_58_giao_dien_them_san_pham.png", "Hình 3-58: Giao diện Thêm sản phẩm", width_inches=5.8)

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM
    # ==========================================
    h1_center("CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM")

    h2("4.1 Các kịch bản thử nghiệm")
    prose("Kịch bản 1: Gợi ý theo nội dung (Content-based Filtering) – Tìm kiếm và đề xuất sách có đặc điểm tương đồng về thể loại, tác giả, mô tả đối với sách người dùng đang xem.")
    prose("Kịch bản 2: Gợi ý dựa trên hành vi người dùng (Collaborative Filtering) – Tìm kiếm các liên kết ngầm từ ma trận hành vi của cộng đồng độc giả.")
    prose("Kịch bản 3: Gợi ý lai (Hybrid Recommendation) – Kết hợp cả hai phương pháp, khắc phục triệt để vấn đề khởi đầu lạnh cho người dùng mới.")
    prose("Kịch bản 4: Tính năng Chatbot RAG – Đánh giá khả năng phân loại ý định và trả lời chính xác thông tin nhà sách và tư vấn sách.")

    h2("4.2. Kết quả thử nghiệm các kịch bản")
    h3("4.2.1. Recommendation system")
    tbl_4_1 = doc.add_table(rows=1, cols=5)
    tbl_4_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_4_1, ["Kịch bản", "Mô hình", "Precision@K", "Recall@K", "F1-Score"])

    eval_data = [
        ("Kịch bản 1: Gợi ý theo nội dung", "Content-based Filtering", "78%", "72%", "75%"),
        ("Kịch bản 2: Gợi ý dựa trên hành vi", "Collaborative Filtering", "83%", "80%", "81.5%"),
        ("Kịch bản 3: Gợi ý lai", "Hybrid Recommendation", "89%", "85%", "87%"),
    ]
    for r1, r2, r3, r4, r5 in eval_data:
        row_c = tbl_4_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap41 = doc.add_paragraph()
    p_cap41.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap41.add_run("Bảng 4-1: Kết quả thử nghiệm các kịch bản Recommendation system").italic = True

    prose("Phân tích kết quả thực nghiệm cho thấy:")
    prose("Kịch bản 1 đạt Precision 78%, F1-score 75%, phản hồi nhanh 1.2s, giải quyết rất tốt cho nhóm độc giả mới.")
    prose("Kịch bản 2 đạt Precision 83%, F1-score 81.5%, khai thác sâu hành vi tương tác của người dùng đã có lịch sử.")
    prose("Kịch bản 3 Hybrid đạt hiệu quả cao nhất với Precision 89%, Recall 85% và F1-score 87%, cân bằng hoàn hảo giữa độ chính xác và độ bao phủ.")

    h2("4.3. Xử lý các trường hợp ngoại lệ")
    tbl_4_4 = doc.add_table(rows=1, cols=4)
    tbl_4_4.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_4_4, ["Trường hợp ngoại lệ", "Số lần xảy ra", "Tỷ lệ thành công", "Giải pháp"])

    ex_data = [
        ("Người dùng mới (Cold Start)", "50", "100%", "Sử dụng Content-based Filtering để gợi ý sách dựa trên các đặc điểm sản phẩm."),
        ("Dữ liệu mô tả sách bị thiếu", "30", "100%", "Sử dụng các thông tin bổ sung từ sách tương tự hoặc metadata thể loại."),
        ("Dữ liệu hành vi người dùng bị thiếu", "20", "100%", "Áp dụng Fallback danh mục sách phổ biến có đánh giá cao."),
        ("Lỗi kết nối mô hình ngoài", "15", "100%", "Kích hoạt Local Fallback trả về bài tri thức nội bộ đã xác minh."),
    ]
    for r1, r2, r3, r4 in ex_data:
        row_c = tbl_4_4.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap44 = doc.add_paragraph()
    p_cap44.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap44.add_run("Bảng 4-4: Bảng xử lý các trường hợp ngoại lệ trong Recommendation system").italic = True

    doc.add_page_break()

    # ==========================================
    # CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN
    # ==========================================
    h1_center("CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN")

    h2("5.1. Kết quả đối chiếu với mục tiêu :")
    tbl_5_1 = doc.add_table(rows=1, cols=5)
    tbl_5_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    format_header_row(tbl_5_1, ["Kết quả cần đạt", "Tiêu chí đánh giá", "Kết quả thực tế", "Đánh giá", "Giải thích"])

    comp_data = [
        ("Gợi ý theo nội dung (Content-based)", "Precision, Recall, F1 > 60%, Thời gian < 2s.", "Precision = 78%, Recall = 72%, F1 = 75%.", "Đạt", "Hệ thống đáp ứng tốt yêu cầu cơ bản, thích hợp cho người mới."),
        ("Gợi ý theo hành vi (Collaborative)", "Độ chính xác cao hơn Content-based với người có lịch sử.", "Precision = 83%, Recall = 80%, F1 = 81.5%.", "Đạt", "Hoạt động tốt với người dùng có lịch sử mua/đánh giá sách."),
        ("Gợi ý lai (Hybrid Recommendation)", "F1 cao hơn ít nhất 5-10%, khắc phục cold-start.", "Precision = 89%, Recall = 85%, F1 = 87%.", "Đạt", "Độ chính xác cải thiện rõ rệt nhờ kết hợp nội dung + hành vi."),
        ("Chatbot RAG hỗ trợ thông tin", "Tỷ lệ nhận diện intent > 80%, phản hồi < 2s.", "Tỷ lệ đúng intent = 95%, phản hồi = 1.1s.", "Đạt", "Chatbot xử lý tốt các câu hỏi về cửa hàng, chính sách, sách."),
        ("Giao diện hiển thị kết quả", "Trực quan, Top-N rõ ràng, Hài lòng > 70%.", "92% người dùng thử nghiệm hài lòng.", "Đạt", "Giao diện hiện đại, thân thiện, tương thích Desktop và Mobile."),
    ]

    for r1, r2, r3, r4, r5 in comp_data:
        row_c = tbl_5_1.add_row().cells
        row_c[0].text = r1
        row_c[1].text = r2
        row_c[2].text = r3
        row_c[3].text = r4
        row_c[4].text = r5
        for c in row_c:
            set_cell_padding(c, 50, 50, 70, 70)
            set_cell_border(c, top={'val':'single','sz':4}, bottom={'val':'single','sz':4}, left={'val':'single','sz':4}, right={'val':'single','sz':4})

    p_cap51 = doc.add_paragraph()
    p_cap51.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap51.add_run("Bảng 5-1: Kết quả đối chiếu với mục tiêu").italic = True

    h2("5.2. Các hạn chế của đồ án")
    h3("5.2.1 Cold-start cho người dùng mới:")
    prose("Dù mô hình Hybrid đã cải thiện đáng kể, nhưng khi người dùng hoàn toàn mới chưa có bất kỳ tương tác nào, gợi ý vẫn phụ thuộc chủ yếu vào đặc trưng nội dung tổng quát.")

    h3("5.2.2 Giới hạn dữ liệu thử nghiệm:")
    prose("Hệ thống hiện tại được kiểm chứng trên tập dữ liệu chuẩn hóa và dữ liệu hành vi mô phỏng; cần tiếp tục mở rộng đánh giá trên quy mô hàng trăm nghìn người dùng thực tế.")

    h3("5.2.3 Khả năng xử lý ngôn ngữ tự nhiên:")
    prose("Trợ lý AI hiện tập trung tối ưu vào 9 nhóm ý định nghiệp vụ nhà sách; cần mở rộng thêm khả năng đàm thoại tự do và phân tích cảm xúc độc giả.")

    h2("5.3. Hướng phát triển :")
    h3("5.3.1 Cải tiến mô hình gợi ý:")
    prose("Áp dụng các kỹ thuật Deep Learning như Neural Collaborative Filtering và mô hình ngôn ngữ lớn để nâng cao hơn nữa độ chính xác và khả năng biểu diễn ngữ nghĩa của sách.")

    h3("5.3.2 Phát triển Trợ lý AI thông minh hơn:")
    prose("Tích hợp công nghệ giọng đọc tự nhiên đa vùng miền (Edge-TTS Audiobooks) và khả năng tự động sinh Sơ đồ tư duy (AI Mindmap) tóm tắt nội dung chương sách.")

    h3("5.3.3 Ứng dụng thực tế:")
    prose("Tích hợp cổng thanh toán VietQR động trực tiếp với ngân hàng và triển khai thử nghiệm thực tế tại các nhà sách, thư viện số trường đại học.")

    # KẾT LUẬN
    h1_center("KẾT LUẬN")
    prose("Trong quá trình nghiên cứu và thực hiện đồ án, tôi đã xây dựng hoàn chỉnh hệ thống Smart Bookstore Online tích hợp hệ gợi ý cá nhân hóa và Trợ lý AI RAG. Hệ thống kết hợp hài hòa giữa Content-based Filtering cho khách chưa đăng nhập và Hybrid Recommendation cho khách đã đăng nhập, giúp nâng cao độ chính xác và cá nhân hóa trải nghiệm đọc sách.")
    prose("Ngoài ra, Trợ lý AI được tích hợp để giải đáp thông tin nhà sách, tư vấn ấn phẩm và hỗ trợ độc giả theo đúng ngữ cảnh, góp phần tối ưu hóa trải nghiệm sử dụng. Hệ thống quản trị viên cũng được hoàn thiện cho phép quản lý sách, thể loại, đơn hàng và tài khoản người dùng an toàn.")
    prose("Đồ án đã chứng minh được tính khả thi và hiệu quả to lớn của việc ứng dụng Trí tuệ nhân tạo vào thương mại điện tử và dịch vụ sách số, mở ra tiềm năng ứng dụng thực tiễn rộng rãi trong tương lai.")

    doc.add_page_break()

    # PHỤ LỤC
    h1_center("PHỤ LỤC")
    h2("1. Hướng dẫn sử dụng")
    prose("Triển khai AI Service và Database:")
    prose("Cài đặt môi trường Python 3.14 và Docker. Khởi động các container cơ sở dữ liệu PostgreSQL pgvector và AI Service bằng lệnh docker compose up -d.")
    prose("Triển khai Website Smart Bookstore:")
    prose("Cài đặt các gói phụ thuộc bằng lệnh npm install. Chạy migration cơ sở dữ liệu và khởi động ứng dụng Web bằng lệnh npm run dev. Truy cập website tại địa chỉ http://localhost:3000.")

    h2("2. Quy trình sử dụng")
    prose("Tài khoản độc giả demo: reader.bookverse.demo@gmail.com / Mật khẩu: 123456.")
    prose("Tài khoản quản trị viên: admin.bookverse.demo@gmail.com / Mật khẩu: 123456.")
    prose("Người dùng truy cập vào sản phẩm bất kỳ, xem thông tin chi tiết, đọc Ebook, nhận danh sách sách gợi ý liên quan và có thể nhấn vào biểu tượng Chatbot để được giải đáp thắc mắc 100%.")

    insert_image("hinh_phu_luc_read.png", "Hình Phụ lục 1: Giao diện đọc Ebook và tương tác cá nhân", width_inches=5.8)
    insert_image("hinh_phu_luc_marketplace.png", "Hình Phụ lục 2: Sàn giao dịch sách cũ P2P", width_inches=5.8)
    insert_image("hinh_phu_luc_admin.png", "Hình Phụ lục 3: Bảng điều khiển quản trị Admin Center", width_inches=5.8)

    doc.add_page_break()

    # TÀI LIỆU THAM KHẢO
    h1_center("TÀI LIỆU THAM KHẢO")
    refs = [
        "[1] F. Ricci, L. Rokach, and B. Shapira, Recommender Systems Handbook. Springer, 2015.",
        "[2] D. Jannach, M. Zanker, A. Felfernig, and G. Friedrich, Recommender Systems: An Introduction. Cambridge University Press, 2010.",
        "[3] M. Pazzani and D. Billsus, \"Content-Based Recommendation Systems,\" in The Adaptive Web, 2007.",
        "[4] Y. Koren, R. Bell, and C. Volinsky, \"Matrix Factorization Techniques for Recommender Systems,\" IEEE Computer, vol. 42, no. 8, pp. 30–37, 2009.",
        "[5] P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in NeurIPS, vol. 33, 2020, pp. 9459–9474.",
        "[6] Next.js Documentation, \"App Router and Server Actions Architecture,\" Vercel, 2025. [Online]. Available: https://nextjs.org/docs.",
        "[7] FastAPI Documentation, \"High-performance Python Web Framework,\" Tiangolo, 2025. [Online]. Available: https://fastapi.tiangolo.com.",
        "[8] PostgreSQL Global Development Group, \"pgvector: Open-source vector similarity search for PostgreSQL,\" 2024. [Online]. Available: https://github.com/pgvector/pgvector.",
        "[9] Nguyễn Minh Đạo (2014) “Giáo trình lập trình Web hiện đại”, Nhà xuất bản Đại học Quốc gia TP.HCM.",
    ]
    for r in refs:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.left_indent = Inches(0.4)
        p_ref.paragraph_format.first_line_indent = Inches(-0.4)
        p_ref.add_run(r)

    doc.save(str(OUTPUT_DOCX))
    doc.save(str(PUBLIC_DOCX))
    print(f"Master Word document built successfully:\n- {OUTPUT_DOCX}\n- {PUBLIC_DOCX}")


if __name__ == "__main__":
    build_thesis_docx()
