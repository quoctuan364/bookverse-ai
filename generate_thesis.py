# -*- coding: utf-8 -*-
"""
Script tạo file Word đồ án tốt nghiệp BookVerse AI
Dựa trên file mẫu chuẩn định dạng của Trường Đại học Bình Dương
"""
import copy
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import lxml.etree as etree

# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

def set_cell_background(cell, fill_color):
    """Set background color for a table cell."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_color)
    tcPr.append(shd)

def add_page_break(doc):
    """Add a page break."""
    para = doc.add_paragraph()
    run = para.add_run()
    run.add_break(docx.enum.text.WD_BREAK.PAGE)
    return para

def set_run_font(run, size_pt=13, bold=False, italic=False, underline=False, color=None, font_name='Times New Roman'):
    """Set run font properties."""
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.underline = underline
    if color:
        run.font.color.rgb = RGBColor(*color)
    # Set East Asian font for Vietnamese
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.insert(0, rFonts)
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    rFonts.set(qn('w:cs'), font_name)

def add_heading_chapter(doc, text, chapter_num=None):
    """Add a chapter heading (centered, bold, 15pt)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = para.paragraph_format
    pf.space_before = Pt(14)
    pf.space_after = Pt(8)
    run = para.add_run(text)
    set_run_font(run, size_pt=15, bold=True)
    return para

def add_heading_1(doc, text):
    """Add H1 heading (left, bold, 13pt)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = para.paragraph_format
    pf.space_before = Pt(8)
    pf.space_after = Pt(4)
    run = para.add_run(text)
    set_run_font(run, size_pt=13, bold=True)
    return para

def add_heading_2(doc, text):
    """Add H2 heading (left, bold italic, 13pt)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = para.paragraph_format
    pf.space_before = Pt(6)
    pf.space_after = Pt(2)
    run = para.add_run(text)
    set_run_font(run, size_pt=13, bold=True, italic=True)
    return para

def add_heading_3(doc, text):
    """Add H3 heading (left, bold italic, 13pt)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = para.paragraph_format
    pf.space_before = Pt(4)
    pf.space_after = Pt(2)
    run = para.add_run(text)
    set_run_font(run, size_pt=13, bold=True, italic=True)
    return para

def add_body_text(doc, text):
    """Add body text paragraph (justified, 13pt, 1.3 line spacing, first line indent)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = para.paragraph_format
    pf.space_after = Pt(4)
    pf.first_line_indent = Cm(1.27)  # ~0.5 inch indent
    # Line spacing 1.3
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.3
    run = para.add_run(text)
    set_run_font(run, size_pt=13)
    return para

def add_body_text_no_indent(doc, text):
    """Add body text without first-line indent."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = para.paragraph_format
    pf.space_after = Pt(4)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.3
    run = para.add_run(text)
    set_run_font(run, size_pt=13)
    return para

def add_caption(doc, text):
    """Add a figure/table caption (centered, italic, 12pt)."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = para.paragraph_format
    pf.space_before = Pt(2)
    pf.space_after = Pt(8)
    run = para.add_run(text)
    set_run_font(run, size_pt=12, italic=True)
    return para

def add_centered_bold(doc, text, size_pt=13):
    """Add centered bold text."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run(text)
    set_run_font(run, size_pt=size_pt, bold=True)
    return para

def add_simple_table(doc, headers, rows, caption=None):
    """Add a simple table with headers and rows."""
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    hdr_row = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr_row.cells[i]
        cell.text = ''
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run(h)
        set_run_font(run, size_pt=12, bold=True)
        set_cell_background(cell, 'D9D9D9')

    # Data rows
    for r_idx, row_data in enumerate(rows):
        row = table.rows[r_idx + 1]
        for c_idx, cell_text in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = ''
            para = cell.paragraphs[0]
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = para.add_run(str(cell_text))
            set_run_font(run, size_pt=12)

    if caption:
        add_caption(doc, caption)

    return table


# =====================================================================
# MAIN DOCUMENT CREATION
# =====================================================================

import docx
from docx.opc.constants import RELATIONSHIP_TYPE as RT

def create_thesis():
    """Create the full thesis Word document."""
    doc = Document()

    # Page setup: A4 with margins matching template
    # Template: left=1078865 EMU (~3.0 cm), right=722630 EMU (~2.0 cm), top/bottom=722630 EMU (~2.0 cm)
    for section in doc.sections:
        section.page_height = Cm(29.7)   # A4
        section.page_width = Cm(21.0)    # A4
        section.left_margin = Emu(1078865)   # ~3.0 cm (left bigger for binding)
        section.right_margin = Emu(722630)   # ~2.0 cm
        section.top_margin = Emu(722630)     # ~2.0 cm
        section.bottom_margin = Emu(722630)  # ~2.0 cm

    # Default font for doc
    doc.styles['Normal'].font.name = 'Times New Roman'
    doc.styles['Normal'].font.size = Pt(13)

    # ==================================================================
    # BÌA 1 (Trang bìa chính)
    # ==================================================================
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nKHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO\n')
    set_run_font(run, size_pt=13, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('❖❖❖\n')
    set_run_font(run, size_pt=13, bold=True)

    doc.add_paragraph()
    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    run = p.add_run('ĐỒ ÁN TỐT NGHIỆP\n\n')
    set_run_font(run, size_pt=18, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Tên đề tài :\n')
    set_run_font(run, size_pt=13, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('PHÁT TRIỂN SMART BOOKSTORE ONLINE\nBẰNG ỨNG DỤNG RECOMMEND SYSTEM\n(BOOKVERSE AI)\n\n')
    set_run_font(run, size_pt=16, bold=True)

    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.35

    run = p.add_run('Giảng viên hướng dẫn:\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('ThS. DƯƠNG ANH TUẤN\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Sinh viên thực hiện :\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('LƯƠNG NGUYỄN QUỐC TUẤN\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Mã số sinh viên :\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('22050098\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Lớp:\t\t\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('22CT01\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Khóa:\t\t\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('2022 – 2026\n\n')
    set_run_font(run, size_pt=13, bold=True)

    doc.add_paragraph()
    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Thành phố Hồ Chí Minh, tháng 08 năm 2026')
    set_run_font(run, size_pt=13, bold=True)

    # Page break after cover 1
    doc.add_page_break()

    # ==================================================================
    # BÌA 2 (Trang bìa phụ)
    # ==================================================================
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\nKHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO\n')
    set_run_font(run, size_pt=13, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('❖❖❖\n\n\n')
    set_run_font(run, size_pt=13, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('ĐỒ ÁN TỐT NGHIỆP\n\n\n')
    set_run_font(run, size_pt=18, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('PHÁT TRIỂN SMART BOOKSTORE ONLINE\nBẰNG ỨNG DỤNG RECOMMEND SYSTEM\n(BOOKVERSE AI)\n\n\n\n')
    set_run_font(run, size_pt=16, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.35
    run = p.add_run('Giảng viên hướng dẫn:\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('ThS. DƯƠNG ANH TUẤN\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Sinh viên thực hiện :\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('LƯƠNG NGUYỄN QUỐC TUẤN\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Mã số sinh viên :\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('22050098\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Lớp:\t\t\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('22CT01\n')
    set_run_font(run, size_pt=13, bold=True)
    run = p.add_run('Khóa:\t\t\t')
    set_run_font(run, size_pt=13)
    run = p.add_run('2022 – 2026\n\n\n')
    set_run_font(run, size_pt=13, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Thành phố Hồ Chí Minh, tháng 08 năm 2026')
    set_run_font(run, size_pt=13, bold=True)

    doc.add_page_break()

    # ==================================================================
    # ĐỀ CƯƠNG CHI TIẾT
    # ==================================================================
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('BỘ GIÁO DỤC VÀ ĐÀO TẠO\t\tCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\t\tĐộc lập – Tự do – Hạnh phúc\n\n')
    set_run_font(run, size_pt=13, bold=True)

    add_centered_bold(doc, 'ĐỀ CƯƠNG CHI TIẾT', 14)

    add_heading_1(doc, '1. Lý do chọn đề tài')
    add_body_text(doc, 'Trong thời đại công nghệ số, thương mại điện tử ngày càng phát triển mạnh mẽ và trở thành xu hướng tất yếu. Các nhà sách truyền thống đang dần chuyển dịch sang mô hình trực tuyến nhằm đáp ứng nhu cầu ngày càng cao của người đọc. Tuy nhiên, hầu hết các nền tảng hiện nay vẫn tách biệt giữa chức năng mua bán, đọc sách và gợi ý cá nhân hóa, khiến trải nghiệm người dùng bị phân mảnh và thiếu liên kết.')
    add_body_text(doc, 'Vì vậy, việc phát triển một hệ thống nhà sách thông minh (Smart Bookstore Online) ứng dụng Recommendation System sẽ giúp người dùng dễ dàng tìm thấy cuốn sách phù hợp, đồng thời tích hợp trải nghiệm đọc trực tuyến, giao dịch và hỗ trợ AI trong một nền tảng duy nhất.')

    add_heading_1(doc, '2. Mục tiêu của đề tài')
    add_body_text(doc, 'Đề tài tập trung xây dựng ứng dụng website bán và đọc sách trực tuyến hoàn chỉnh. Hệ thống tích hợp công nghệ gợi ý cá nhân hóa nhằm đề xuất các đầu sách phù hợp với sở thích và hành vi của từng người dùng, kết hợp trợ lý AI RAG hỗ trợ tư vấn nghiệp vụ, cùng với phân hệ marketplace, hội viên và quản trị đầy đủ.')

    add_heading_1(doc, '3. Phạm vi thực hiện')
    add_body_text(doc, 'Về phía người dùng, hệ thống cung cấp đầy đủ các tính năng đăng ký, đăng nhập, tìm kiếm sách không dấu, quản lý giỏ hàng, xem danh mục đề xuất, đọc Ebook trực tuyến, quản lý hội viên và tương tác cộng đồng.')
    add_body_text(doc, 'Về công nghệ sử dụng, đồ án được xây dựng trên nền tảng Fullstack Next.js kết hợp FastAPI Microservice, hệ quản trị cơ sở dữ liệu PostgreSQL tích hợp pgvector cho tìm kiếm vector, cùng với Prisma ORM và Docker Compose cho môi trường triển khai.')

    add_heading_1(doc, '4. Ý nghĩa của đề tài')
    add_body_text(doc, 'Đề tài góp phần hiện đại hóa ngành bán lẻ sách thông qua việc ứng dụng trí tuệ nhân tạo, gia tăng tính cá nhân hóa trong trải nghiệm khách hàng – một yếu tố quan trọng trong cạnh tranh thương mại điện tử hiện đại.')

    add_heading_1(doc, '5. Đối tượng nghiên cứu')
    add_body_text(doc, 'Đối tượng nghiên cứu bao gồm người dùng truy cập và sử dụng nhà sách trực tuyến, tập dữ liệu về sách và hành vi tương tác của độc giả, cùng các thuật toán gợi ý collaborative filtering, content-based filtering và hybrid recommendation.')

    add_heading_1(doc, '6. Phương pháp thực hiện')
    add_body_text(doc, 'Quá trình thực hiện bao gồm nghiên cứu các hệ sinh thái bán sách trực tuyến tiêu biểu, phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc phân lớp chuẩn mực và cài đặt theo quy trình phát triển phần mềm có kiểm thử tự động, tích hợp liên tục.')

    add_heading_1(doc, '7. Kết quả mong đợi')
    add_body_text(doc, 'Kết quả kỳ vọng là một website hoàn chỉnh có khả năng đề xuất sách thông minh, có phân hệ quản trị riêng biệt, giao diện trực quan trên cả desktop và mobile, và hệ thống AI hỗ trợ người dùng tìm kiếm và tư vấn sách theo ngữ cảnh nghiệp vụ thực tế.')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run('Kế hoạch thực hiện (12 Tuần):')
    set_run_font(run, size_pt=13, bold=True)

    # Kế hoạch bảng
    headers_kh = ['Tuần', 'Nội dung công việc']
    rows_kh = [
        ['1–2', 'Nghiên cứu yêu cầu, phân tích bài toán, thiết kế kiến trúc hệ thống'],
        ['3–4', 'Thiết kế cơ sở dữ liệu, xây dựng schema Prisma, cài đặt môi trường Docker'],
        ['5–6', 'Cài đặt xác thực, phân quyền, catalog sách và luồng tìm kiếm'],
        ['7–8', 'Xây dựng Recommendation System (Content-based, Collaborative, Hybrid)'],
        ['9–10', 'Tích hợp Trợ lý RAG, hệ thống hội viên, marketplace và trình đọc Ebook'],
        ['11', 'Kiểm thử (unit, E2E, hiệu năng), đánh giá AI theo temporal split'],
        ['12', 'Hoàn thiện tài liệu, demo và chuẩn bị bảo vệ'],
    ]
    add_simple_table(doc, headers_kh, rows_kh)

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('SINH VIÊN THỰC HIỆN\t\t\t\t\tCÁN BỘ HƯỚNG DẪN\n(Sinh viên ký và ghi rõ họ tên)\t\t\t\t(Ký tên và ghi rõ họ tên)\n\n\n\nLương Nguyễn Quốc Tuấn\t\t\t\t\tThS. Dương Anh Tuấn')
    set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # NHẬN XÉT GIẢNG VIÊN HƯỚNG DẪN
    # ==================================================================
    add_centered_bold(doc, 'NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN', 14)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('-----o0o-----\n\n')
    set_run_font(run, size_pt=13)

    for _ in range(12):
        p = doc.add_paragraph()
        run = p.add_run('.' * 110)
        set_run_font(run, size_pt=13)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\nGiảng viên hướng dẫn\n\n\n\n\nThS. Dương Anh Tuấn')
    set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # NHẬN XÉT GIẢNG VIÊN PHẢN BIỆN
    # ==================================================================
    add_centered_bold(doc, 'NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN', 14)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('-----o0o-----\n\n')
    set_run_font(run, size_pt=13)

    for _ in range(12):
        p = doc.add_paragraph()
        run = p.add_run('.' * 110)
        set_run_font(run, size_pt=13)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\nGiảng viên phản biện\n\n\n\n\n')
    set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # LỜI CẢM ƠN
    # ==================================================================
    add_centered_bold(doc, 'LỜI CẢM ƠN', 14)
    doc.add_paragraph()
    add_body_text(doc, 'Trước tiên, em xin gửi lời cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng toàn thể quý thầy cô Trường Đại học Bình Dương đã tạo điều kiện thuận lợi, trang bị kiến thức nền tảng vững chắc và môi trường học tập tích cực trong suốt bốn năm học vừa qua.')
    add_body_text(doc, 'Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến ThS. Dương Anh Tuấn – người đã trực tiếp hướng dẫn, chỉ bảo tận tình, giúp em định hướng nghiên cứu, giải quyết các vấn đề kỹ thuật và hoàn thiện đồ án này. Sự tận tâm và những góp ý quý báu của Thầy là nguồn động lực lớn nhất để em vượt qua những khó khăn trong quá trình thực hiện.')
    add_body_text(doc, 'Bên cạnh đó, em cũng xin cảm ơn gia đình và bạn bè đã luôn động viên, khích lệ và hỗ trợ em trong suốt thời gian học tập và thực hiện đồ án.')
    add_body_text(doc, 'Mặc dù đã nỗ lực hết sức, nhưng do kiến thức và kinh nghiệm còn hạn chế, đồ án không thể tránh khỏi những thiếu sót. Em rất mong nhận được sự góp ý chân thành từ quý thầy cô và hội đồng phản biện để đồ án được hoàn thiện hơn.')
    add_body_text(doc, 'Em xin chân thành cảm ơn!')

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('SINH VIÊN THỰC HIỆN\n\n\nLương Nguyễn Quốc Tuấn')
    set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # MỤC LỤC
    # ==================================================================
    add_centered_bold(doc, 'MỤC LỤC', 14)
    toc_items = [
        ('LỜI CẢM ƠN', 'I'),
        ('MỤC LỤC', 'II'),
        ('MỤC LỤC CÁC HÌNH VẼ', 'III'),
        ('MỤC LỤC CÁC BẢNG BIỂU', 'IV'),
        ('MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT', 'V'),
        ('TÓM TẮT', 'VI'),
        ('CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN', '1'),
        ('1.1. Lý do thực hiện đề tài', '1'),
        ('    1.1.1 Hiện trạng', '1'),
        ('    1.1.2 Lý do chọn đề tài', '2'),
        ('    1.1.3 Tính cần thiết của đề tài', '2'),
        ('    1.1.4 Quy trình nghiệp vụ tổng quan', '3'),
        ('1.2. Các hệ thống tương tự', '4'),
        ('    1.2.1 Các nghiên cứu, hệ thống đã có', '4'),
        ('    1.2.2 Vấn đề tồn tại và tính mới của đề tài', '5'),
        ('1.3. Phát biểu bài toán', '6'),
        ('    1.3.1 Mục tiêu', '6'),
        ('    1.3.2 Phạm vi', '6'),
        ('    1.3.3 Ràng buộc', '7'),
        ('1.4. Kết quả cần đạt', '7'),
        ('CHƯƠNG 2: CƠ SỞ LÝ THUYẾT', '9'),
        ('2.1. Hệ gợi ý (Recommender System)', '9'),
        ('    2.1.1 Tổng quan về Recommender System', '9'),
        ('    2.1.2 Collaborative Filtering', '10'),
        ('    2.1.3 Content-based Filtering', '11'),
        ('    2.1.4 Hybrid Recommendation', '12'),
        ('2.2. Retrieval-Augmented Generation (RAG)', '13'),
        ('2.3. Đánh giá hệ gợi ý', '14'),
        ('2.4. System Usability Scale (SUS)', '15'),
        ('2.5. Công nghệ sử dụng', '16'),
        ('CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ', '17'),
        ('3.1. Các yêu cầu chức năng', '17'),
        ('    3.1.1 Ngữ cảnh sử dụng', '17'),
        ('    3.1.2 Các use case', '19'),
        ('3.2. Các yêu cầu phi chức năng', '20'),
        ('3.3. Mô hình hệ thống', '21'),
        ('    3.3.1 Kiến trúc tổng thể', '21'),
        ('    3.3.2 Mô hình dữ liệu (ERD)', '23'),
        ('    3.3.3 Cơ sở toán học', '28'),
        ('    3.3.4 Thuật toán áp dụng', '31'),
        ('3.4. Mô hình xử lý / tương tác', '58'),
        ('    3.4.1 Sơ đồ tuần tự', '59'),
        ('    3.4.2 Sơ đồ hoạt động', '62'),
        ('3.5. Thiết kế giao diện người dùng', '65'),
        ('CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM', '70'),
        ('4.1. Các kịch bản thử nghiệm', '70'),
        ('4.2. Kết quả thử nghiệm', '71'),
        ('    4.2.1 Recommendation System', '71'),
        ('    4.2.2 Trợ lý AI RAG', '73'),
        ('4.3. Xử lý các trường hợp ngoại lệ', '75'),
        ('4.4. Kiểm thử E2E và hiệu năng', '76'),
        ('CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN', '78'),
        ('5.1. Kết quả đối chiếu với mục tiêu', '78'),
        ('5.2. Các hạn chế của đồ án', '79'),
        ('5.3. Hướng phát triển', '80'),
        ('KẾT LUẬN', '82'),
        ('TÀI LIỆU THAM KHẢO', '83'),
    ]
    for item, page in toc_items:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        dots = '.' * max(5, 80 - len(item) - len(page))
        run = p.add_run(f'{item} {dots} {page}')
        set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # MỤC LỤC HÌNH VẼ
    # ==================================================================
    add_centered_bold(doc, 'MỤC LỤC CÁC HÌNH VẼ', 14)
    figures = [
        ('Hình 1-1: Quy trình nghiệp vụ tổng quan BookVerse', '3'),
        ('Hình 3-1: Sơ đồ ngữ cảnh hệ thống (Context Diagram)', '17'),
        ('Hình 3-2: Sơ đồ use case tổng thể', '19'),
        ('Hình 3-3: Kiến trúc tổng thể hệ thống', '21'),
        ('Hình 3-4: Kiến trúc container (Next.js + FastAPI)', '22'),
        ('Hình 3-5: ERD nghiệp vụ cốt lõi', '23'),
        ('Hình 3-6: Sơ đồ tuần tự đăng nhập và phân quyền', '59'),
        ('Hình 3-7: Sơ đồ tuần tự thanh toán hội viên Sandbox', '60'),
        ('Hình 3-8: Sơ đồ tuần tự kiểm tra quyền đọc Ebook', '61'),
        ('Hình 3-9: Sơ đồ tuần tự Chatbot RAG', '62'),
        ('Hình 3-10: Sơ đồ hoạt động hệ thống gợi ý tổng quát', '63'),
        ('Hình 3-11: Sơ đồ hoạt động Content-based Filtering', '63'),
        ('Hình 3-12: Sơ đồ hoạt động Collaborative Filtering', '64'),
        ('Hình 3-13: Sơ đồ hoạt động Hybrid Recommendation', '64'),
        ('Hình 3-14: Sơ đồ hoạt động Chatbot RAG', '64'),
        ('Hình 3-15: Giao diện trang chủ BookVerse AI', '65'),
        ('Hình 3-16: Giao diện đề xuất gợi ý sách', '66'),
        ('Hình 3-17: Giao diện Trợ lý AI (Chatbot)', '67'),
        ('Hình 3-18: Giao diện quản trị Admin Center', '68'),
        ('Hình 4-1: Kết quả metric đánh giá Recommendation theo temporal split', '72'),
    ]
    for fig, page in figures:
        p = doc.add_paragraph()
        dots = '.' * max(5, 80 - len(fig) - len(page))
        run = p.add_run(f'{fig} {dots} {page}')
        set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # MỤC LỤC BẢNG BIỂU
    # ==================================================================
    add_centered_bold(doc, 'MỤC LỤC CÁC BẢNG BIỂU', 14)
    tables_list = [
        ('Bảng 1-1: Kết quả cần đạt', '7'),
        ('Bảng 2-1: Công nghệ sử dụng', '16'),
        ('Bảng 3-1: Danh sách actor', '17'),
        ('Bảng 3-2: Use Case cho Khách chưa đăng nhập', '17'),
        ('Bảng 3-3: Use Case cho Độc giả đã đăng nhập', '18'),
        ('Bảng 3-4: Use Case cho Người bán (Seller)', '18'),
        ('Bảng 3-5: Use Case cho Quản trị viên (Admin)', '18'),
        ('Bảng 3-6: Yêu cầu chức năng trọng tâm', '19'),
        ('Bảng 3-7: Minh họa toán học Content-based Filtering', '28'),
        ('Bảng 3-8: Minh họa toán học Collaborative Filtering', '29'),
        ('Bảng 3-9: Ma trận phân quyền theo vai trò', '40'),
        ('Bảng 4-1: Kết quả metric đánh giá Recommendation System', '72'),
        ('Bảng 4-2: Kết quả thử nghiệm Trợ lý AI RAG', '73'),
        ('Bảng 4-3: Xử lý trường hợp ngoại lệ Recommendation', '75'),
        ('Bảng 4-4: Xử lý trường hợp ngoại lệ Chatbot', '76'),
        ('Bảng 4-5: Kết quả kiểm thử E2E', '77'),
        ('Bảng 4-6: Kết quả hiệu năng (smoke load test)', '77'),
        ('Bảng 5-1: Kết quả đối chiếu với mục tiêu', '78'),
    ]
    for t, page in tables_list:
        p = doc.add_paragraph()
        dots = '.' * max(5, 80 - len(t) - len(page))
        run = p.add_run(f'{t} {dots} {page}')
        set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # MỤC LỤC KÍ TỰ VÀ CHỮ VIẾT TẮT
    # ==================================================================
    add_centered_bold(doc, 'MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT', 14)
    doc.add_paragraph()
    abbr_table = [
        ('AI', 'Artificial Intelligence – Trí tuệ nhân tạo'),
        ('API', 'Application Programming Interface – Giao diện lập trình ứng dụng'),
        ('CF', 'Collaborative Filtering – Lọc cộng tác'),
        ('CB', 'Content-Based Filtering – Lọc dựa trên nội dung'),
        ('CTR', 'Click-Through Rate – Tỉ lệ nhấp'),
        ('DB', 'Database – Cơ sở dữ liệu'),
        ('E2E', 'End-to-End – Kiểm thử đầu cuối'),
        ('ERD', 'Entity Relationship Diagram – Sơ đồ quan hệ thực thể'),
        ('JWT', 'JSON Web Token – Token xác thực JSON'),
        ('LLM', 'Large Language Model – Mô hình ngôn ngữ lớn'),
        ('NDCG', 'Normalized Discounted Cumulative Gain – Độ lợi tích lũy giảm dần chuẩn hóa'),
        ('MRR', 'Mean Reciprocal Rank – Thứ hạng nghịch đảo trung bình'),
        ('ORM', 'Object-Relational Mapping – Ánh xạ đối tượng quan hệ'),
        ('RAG', 'Retrieval-Augmented Generation – Sinh văn bản tăng cường truy xuất'),
        ('REST', 'Representational State Transfer – Kiến trúc dịch vụ web'),
        ('SUS', 'System Usability Scale – Thang đo khả dụng hệ thống'),
        ('TF-IDF', 'Term Frequency-Inverse Document Frequency – Tần suất từ nghịch đảo tài liệu'),
        ('UAT', 'User Acceptance Testing – Kiểm thử chấp nhận người dùng'),
        ('UI', 'User Interface – Giao diện người dùng'),
        ('UX', 'User Experience – Trải nghiệm người dùng'),
    ]
    add_simple_table(doc, ['Từ viết tắt', 'Giải thích'], abbr_table)

    doc.add_page_break()

    # ==================================================================
    # TÓM TẮT (ABSTRACT)
    # ==================================================================
    add_centered_bold(doc, 'TÓM TẮT', 14)
    doc.add_paragraph()
    add_body_text(doc, 'BookVerse AI là một nền tảng đọc và giao dịch sách tích hợp hệ gợi ý có giải thích và trợ lý RAG kiểm soát nguồn. Hệ thống giải quyết tình trạng trải nghiệm sách bị phân mảnh giữa tìm kiếm, mua bán, đọc trực tuyến, quản lý tiến độ và hỗ trợ người dùng. Kiến trúc gồm Next.js App Router, PostgreSQL, Prisma ORM và Python FastAPI cho AI Microservice.')
    add_body_text(doc, 'Ngoài các luồng nghiệp vụ đầy đủ (catalog, marketplace, đặt hàng, hội viên, trình đọc, cộng đồng, quản trị), đồ án triển khai hệ gợi ý kết hợp tín hiệu nội dung, hành vi, mua hàng và độ phổ biến; kết quả được gắn evidence và kiểm soát provenance trước khi hiển thị. Trợ lý RAG truy xuất tri thức nghiệp vụ và dữ liệu tài khoản thuộc đúng người dùng, có local fallback minh bạch.')
    add_body_text(doc, 'Đánh giá hệ gợi ý sử dụng temporal split, candidate filtering, cohort cold/sparse/warm và các metric Precision, Recall, Hit Rate, NDCG, MRR, Coverage. Kết quả snapshot hiện tại cho thấy Behavior có Hit Rate@10 cao nhất (0,021), trong khi Hybrid production chưa vượt baseline. Đồ án không tuyên bố mô hình đã tối ưu mà báo cáo trung thực kết quả và phân tích nguyên nhân. Hệ thống đạt 226/226 unit test TypeScript, 44/44 Python test và 46/46 E2E test.')
    add_body_text(doc, 'Từ khóa: hệ gợi ý, RAG, sách điện tử, temporal evaluation, explainability, provenance, Next.js, FastAPI, PostgreSQL.')

    doc.add_page_break()

    # ==================================================================
    # CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN
    # ==================================================================
    add_heading_chapter(doc, 'CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN')

    add_heading_1(doc, '1.1. Lý do thực hiện đề tài :')
    add_heading_2(doc, '1.1.1 Hiện trạng')
    add_body_text(doc, 'Trong thời đại số hóa, việc lựa chọn và tìm kiếm sách phù hợp là một thách thức lớn đối với người đọc. Thị trường sách điện tử toàn cầu đang tăng trưởng mạnh mẽ, nhưng trải nghiệm người dùng tại hầu hết các nền tảng vẫn còn phân mảnh và thiếu tính cá nhân hóa. Người dùng phải truy cập nhiều ứng dụng khác nhau cho các nhu cầu tìm kiếm sách, mua bán, đọc trực tuyến và hỗ trợ tư vấn.')
    add_body_text(doc, 'Các thư viện truyền thống và nền tảng sách trực tuyến hiện nay thường tồn tại những hạn chế cốt lõi: thiếu cá nhân hóa thực sự dựa trên hành vi đọc, thiếu tích hợp giữa mua bán và đọc trực tuyến, và thiếu công cụ AI hỗ trợ khám phá sách theo ngữ cảnh nghiệp vụ.')

    add_heading_2(doc, '1.1.2 Lý do chọn đề tài')
    add_body_text(doc, 'Thứ nhất, thiếu tính cá nhân hóa: Các gợi ý chủ yếu dựa trên số lượt xem tổng thể, đánh giá chung hoặc danh sách bestseller, không phản ánh sở thích riêng của từng người dùng dựa trên hành vi đọc thực tế.')
    add_body_text(doc, 'Thứ hai, tương tác còn hạn chế: Phần lớn các hệ thống thương mại điện tử sách hiện nay chưa tích hợp trợ lý AI có khả năng tư vấn nghiệp vụ, giải đáp thắc mắc và đề xuất sách dựa trên ngữ cảnh cuộc trò chuyện.')
    add_body_text(doc, 'Thứ ba, tách biệt giữa mua sách và đọc sách: Người dùng phải chuyển đổi giữa nhiều ứng dụng khác nhau, gây ra sự gián đoạn trong hành trình đọc sách và mất đi dữ liệu hành vi có thể cải thiện gợi ý.')

    add_heading_2(doc, '1.1.3 Tính cần thiết của đề tài')
    add_body_text(doc, 'Việc xây dựng một nền tảng sách thông minh tích hợp tất cả các chức năng trên một hệ thống duy nhất không chỉ cải thiện trải nghiệm người dùng mà còn tạo ra nguồn dữ liệu hành vi phong phú để huấn luyện và cải thiện hệ gợi ý. Đồ án BookVerse AI đặt ra mục tiêu giải quyết vấn đề này bằng cách kết hợp công nghệ web hiện đại với AI microservice.')

    add_heading_2(doc, '1.1.4 Quy trình nghiệp vụ tổng quan')
    add_body_text(doc, 'Bước 1: Người dùng truy cập hệ thống và đăng ký/đăng nhập tài khoản. Hệ thống xác thực danh tính và phân quyền theo vai trò (Khách, Độc giả, Người bán, Kiểm duyệt, Quản trị).')
    add_body_text(doc, 'Bước 2: Người dùng tìm kiếm và khám phá sách thông qua catalog, bộ lọc thể loại, tìm kiếm ngôn ngữ tự nhiên hoặc gợi ý từ hệ thống AI.')
    add_body_text(doc, 'Bước 3: Người dùng thực hiện các tương tác như đánh giá sao, lưu yêu thích, bookmark hoặc thêm vào giỏ hàng. Các tín hiệu này được ghi lại theo taxonomy có version để phục vụ recommendation.')
    add_body_text(doc, 'Bước 4: Người dùng mua sách qua marketplace hoặc đăng ký gói hội viên để đọc toàn bộ kho sách. Thanh toán sử dụng cổng Sandbox an toàn cho môi trường đồ án.')
    add_body_text(doc, 'Bước 5: Người dùng đọc sách qua trình đọc trực tuyến. Tiến độ, bookmark và highlight được lưu tự động. Hệ thống gợi ý cập nhật theo hành vi đọc.')
    add_body_text(doc, 'Bước 6: Trợ lý AI hỗ trợ trả lời các câu hỏi nghiệp vụ, gợi ý sách theo ngữ cảnh và quản lý lịch sử cuộc trò chuyện của người dùng.')

    add_caption(doc, 'Hình 1-1: Quy trình nghiệp vụ tổng quan BookVerse AI')

    add_heading_1(doc, '1.2. Các hệ thống tương tự :')
    add_heading_2(doc, '1.2.1 Các nghiên cứu, hệ thống đã có')
    add_body_text(doc, 'Amazon Books là nền tảng bán sách lớn nhất thế giới với hệ gợi ý mạnh mẽ dựa trên collaborative filtering và behavior signals. Tuy nhiên, nền tảng này không tích hợp trình đọc trực tuyến cho sách vật lý và chatbot hỗ trợ nghiệp vụ nhà sách còn hạn chế.')
    add_body_text(doc, 'Goodreads là mạng xã hội đọc sách lớn nhất với cộng đồng đánh giá và gợi ý phong phú. Điểm yếu là không có trình đọc tích hợp, không có marketplace và hệ gợi ý chủ yếu dựa trên review thủ công.')
    add_body_text(doc, 'Kindle Unlimited (Amazon) cung cấp kho sách điện tử lớn với mô hình hội viên. Tuy nhiên, hệ thống gợi ý ít minh bạch về evidence và không cho phép người bán tham gia marketplace.')
    add_body_text(doc, 'Fahasa.com là nền tảng bán sách lớn tại Việt Nam nhưng không có trình đọc trực tuyến, không có hệ gợi ý có giải thích và không tích hợp AI assistant.')

    add_heading_2(doc, '1.2.2 Vấn đề tồn tại và tính mới của đề tài')
    add_body_text(doc, 'Tính mới của BookVerse AI nằm ở ba khía cạnh: (1) Tích hợp hoàn chỉnh catalog, marketplace, trình đọc, hội viên và cộng đồng trong một hệ thống duy nhất tạo vòng lặp dữ liệu hành vi; (2) Hệ gợi ý hybrid có evidence rõ ràng, kiểm soát provenance và đánh giá theo temporal split trung thực; (3) Trợ lý RAG với tri thức nghiệp vụ nội bộ, bảo vệ ownership dữ liệu cá nhân và fallback minh bạch.')

    add_heading_1(doc, '1.3. Phát biểu bài toán :')
    add_heading_2(doc, '1.3.1 Mục tiêu')
    add_body_text(doc, 'Đồ án đặt ra ba câu hỏi nghiên cứu chính: (1) Làm thế nào xây dựng một nền tảng sách đủ nghiệp vụ để tạo ngữ cảnh cho AI? (2) Làm thế nào gợi ý sách có evidence, phân biệt dữ liệu thật với demo/synthetic? (3) Làm thế nào trợ lý trả lời nghiệp vụ và dữ liệu tài khoản mà hạn chế bịa đặt?')

    add_heading_2(doc, '1.3.2 Phạm vi')
    add_body_text(doc, 'Thanh toán chỉ là Sandbox, không kết nối tiền thật. Nội dung đọc gắn nhãn demo, không phải nguyên tác. Dữ liệu benchmark chủ yếu synthetic nên không dùng để tuyên bố hiệu quả production. Cover rights chưa có hồ sơ được giữ NOT_VERIFIED. UAT không được suy diễn trước khi thu phản hồi thật.')

    add_heading_2(doc, '1.3.3 Ràng buộc')
    add_body_text(doc, 'Hệ thống phải chạy được trên môi trường Docker Compose với một lệnh bootstrap duy nhất. Mọi pipeline ghi dữ liệu phải có confirmation và guard chống ghi đè dataset gốc. Script đánh giá AI chỉ được đọc database test, không ghi vào database demo.')

    add_heading_2(doc, '1.3.4 Các giả định và phụ thuộc')
    add_body_text(doc, 'Giả định máy chủ có Docker Desktop đang chạy, Node.js 20+ và Python 3.11+. Phụ thuộc chính gồm PostgreSQL 16 với pgvector, Next.js 15, Prisma 6 và FastAPI. Khi không có OpenAI/Gemini API key, chatbot tự động chuyển sang local grounded fallback.')

    add_heading_1(doc, '1.4. Kết quả cần đạt :')
    add_body_text(doc, 'Các kết quả cần đạt của đồ án được tổng hợp trong bảng sau:')

    headers_kq = ['STT', 'Kết quả cần đạt', 'Tiêu chí chấp nhận', 'Đạt']
    rows_kq = [
        ['1', 'Nền tảng web đầy đủ luồng nghiệp vụ', 'Catalog, marketplace, order, membership, reader, community, admin', 'Có'],
        ['2', 'Hệ gợi ý Hybrid', 'Content + Behavior + Popularity + evidence + diversity policy', 'Có'],
        ['3', 'Trợ lý RAG', 'Tri thức nghiệp vụ + ownership check + fallback + session management', 'Có'],
        ['4', 'Đánh giá AI trung thực', 'Temporal split, cohort, nhiều metric, báo cáo thất bại', 'Có'],
        ['5', 'Kiểm thử tự động', '226 unit test TS + 44 Python test + 46 E2E test đều PASS', 'Có'],
        ['6', 'Bootstrap demo', 'Một lệnh tái lập môi trường demo hoàn chỉnh', 'Có'],
        ['7', 'Responsive UI', 'Hỗ trợ 375px–1440px, keyboard focus, accessibility WCAG 2 A/AA', 'Có'],
    ]
    add_simple_table(doc, headers_kq, rows_kq, 'Bảng 1-1: Kết quả cần đạt')

    doc.add_page_break()

    # ==================================================================
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
    # ==================================================================
    add_heading_chapter(doc, 'CHƯƠNG 2: CƠ SỞ LÝ THUYẾT')

    add_heading_1(doc, '2.1. Cơ sở lý thuyết :')
    add_heading_2(doc, '2.1.1 Recommender System (Hệ gợi ý)')
    add_heading_3(doc, '2.1.1.1 Tổng quan về Recommender System')
    add_body_text(doc, 'Hệ gợi ý (Recommender System) là một lĩnh vực của hệ thống lọc thông tin, nhằm dự đoán "xếp hạng" hoặc "sở thích" mà người dùng sẽ dành cho một mục (item). Chúng đã trở nên phổ biến rộng rãi và là một nguồn doanh thu và sự khác biệt sản phẩm quan trọng. GroupLens là một trong các hệ thống sớm minh họa gợi ý dựa trên đánh giá cộng đồng [1].')
    add_body_text(doc, 'Trong bối cảnh BookVerse AI, hệ gợi ý đóng vai trò trung tâm trong việc giúp người dùng khám phá sách phù hợp từ kho catalog lớn. Hệ thống không chỉ gợi ý dựa trên phổ biến chung mà còn cá nhân hóa theo hành vi đọc, mua hàng và sở thích từng người dùng.')

    add_heading_3(doc, '2.1.1.2 Collaborative Filtering (Lọc cộng tác)')
    add_body_text(doc, 'Collaborative Filtering (CF) khai thác sự tương đồng hành vi giữa người dùng hoặc item. Nguyên lý cơ bản: người dùng A và B có hành vi tương tự nhau trong quá khứ → A sẽ thích những gì B thích. Phương pháp này không cần biết nội dung của item, chỉ cần ma trận user-item.')
    add_body_text(doc, 'Trong BookVerse AI, CF được triển khai dựa trên co-occurrence của hành vi (reading, bookmark, purchase, favorite). Tín hiệu được thu thập theo taxonomy có version để đảm bảo tính nhất quán khi đánh giá.')

    add_heading_3(doc, '2.1.1.3 Content-based Filtering (Lọc dựa trên nội dung)')
    add_body_text(doc, 'Content-based Filtering sử dụng thuộc tính của item và hồ sơ sở thích người dùng. Mỗi cuốn sách được mô tả bởi vector đặc trưng gồm thể loại, tác giả, từ khóa và mô tả. Sở thích người dùng được xây dựng từ các sách họ đã tương tác tích cực.')
    add_body_text(doc, 'Độ tương đồng Cosine là công thức chính được sử dụng: Sim(i, j) = (d_i · d_j) / (‖d_i‖ × ‖d_j‖). Content-based có ưu điểm không cần dữ liệu từ người dùng khác và giải thích được lý do gợi ý (same category, same author).')

    add_heading_3(doc, '2.1.1.4 Hybrid Recommendation (Gợi ý lai)')
    add_body_text(doc, 'Hybrid kết hợp nhiều nguồn nhằm giảm hạn chế của từng phương pháp. BookVerse AI sử dụng công thức tổng trọng số: Score_Hybrid(u, i) = w1 × Score_Category(u,i) + w2 × Score_Author(u,i) + w3 × Score_Purchase(u,i) + w4 × Score_Popularity(i) + w5 × Score_Behavior(u,i).')
    add_body_text(doc, 'Tuy nhiên, kết quả thực nghiệm cho thấy Hybrid production hiện chưa vượt baseline Behavior đơn lẻ. Điều này không có nghĩa Hybrid tệ hơn về nguyên lý, mà phản ánh trọng số hiện tại chưa được dữ liệu synthetic ủng hộ. Đồ án báo cáo trung thực kết quả này.')

    add_heading_3(doc, '2.1.1.5 Matrix Factorization')
    add_body_text(doc, 'Matrix Factorization biểu diễn user và item trong không gian latent [2]. Kỹ thuật này là nền tảng của nhiều hệ gợi ý hiện đại. BookVerse AI hiện ưu tiên mô hình dễ giải thích; matrix factorization là hướng phát triển khi có dữ liệu người dùng thật đủ dày.')

    add_heading_2(doc, '2.1.2 Đánh giá hệ gợi ý theo thời gian')
    add_body_text(doc, 'Precision@K đo tỷ lệ item liên quan trong K kết quả. Recall@K đo phần ground truth được thu hồi. Hit Rate@K cho biết tỷ lệ user có ít nhất một hit. NDCG (Normalized Discounted Cumulative Gain) ưu tiên hit ở vị trí cao; MRR (Mean Reciprocal Rank) dùng nghịch đảo vị trí hit đầu tiên. Coverage đo phần catalog xuất hiện trong recommendation [3].')
    add_body_text(doc, 'Temporal split được dùng thay random split để tránh đưa event tương lai vào feature. Train trước ngày T1, validation từ T1 đến T2 và final-test sau T2. Candidate đã xem trước thời điểm đánh giá phải được lọc theo policy. Cohort cold (ít tương tác), sparse và warm được báo riêng để không che lấp thất bại cold-start.')

    add_heading_2(doc, '2.1.3 Retrieval-Augmented Generation (RAG)')
    add_body_text(doc, 'RAG kết hợp mô hình sinh (generative model) với bộ nhớ ngoài được truy xuất [4]. Thay vì fine-tune toàn bộ mô hình, RAG truy xuất các đoạn tri thức liên quan tại runtime và đưa vào context trước khi sinh câu trả lời. Cách tiếp cận này cho phép cập nhật tri thức mà không cần re-train.')
    add_body_text(doc, 'Trong BookVerse AI, RAG không nhằm tái tạo nội dung sách. Nó truy xuất tri thức nghiệp vụ từ kho knowledge base nội bộ (lib/assistant-knowledge.ts), metadata catalog, chunk đọc được phép và dữ liệu tài khoản đã kiểm tra ownership. Câu trả lời không có nguồn hợp lệ phải chuyển sang fallback hoặc từ chối claim.')

    add_heading_2(doc, '2.1.4 System Usability Scale (SUS)')
    add_body_text(doc, 'SUS gồm 10 câu theo thang 1–5 và tạo điểm tổng hợp 0–100 [5]. Câu lẻ trừ 1, câu chẵn lấy 5 trừ điểm, sau đó nhân tổng với 2,5. Điểm ≥ 70 thường được coi là "khá tốt", ≥ 85 là "xuất sắc". SUS đo cảm nhận khả dụng, không đo hiệu quả recommendation hay độ đúng của chatbot. Kết quả UAT của BookVerse hiện giữ NOT_AVAILABLE cho đến khi có phản hồi người dùng thật.')

    add_heading_1(doc, '2.2. Công nghệ sử dụng :')
    add_body_text(doc, 'Bảng sau tổng hợp các công nghệ chính được áp dụng trong đồ án:')

    headers_cn = ['Công nghệ', 'Phiên bản', 'Vai trò']
    rows_cn = [
        ['Next.js', '15 (App Router)', 'Framework web fullstack, SSR/SSG, Route Handlers, Server Actions'],
        ['React', '19', 'Library giao diện người dùng, Client/Server Components'],
        ['TypeScript', 'Strict mode', 'Ngôn ngữ lập trình có kiểu tĩnh cho toàn bộ frontend'],
        ['Prisma', '6', 'ORM truy cập PostgreSQL, migration và schema'],
        ['PostgreSQL', '16 + pgvector', 'RDBMS chính, pgvector cho tìm kiếm vector embedding'],
        ['Auth.js', 'v5 (NextAuth)', 'Xác thực người dùng, Credentials Provider, JWT'],
        ['FastAPI', 'Python', 'AI Microservice cho recommendation engine'],
        ['Pandas + Scikit-learn', 'Python', 'Xử lý dữ liệu và thuật toán ML cho gợi ý'],
        ['SQLAlchemy', 'Python', 'ORM cho AI service kết nối PostgreSQL'],
        ['Tailwind CSS', '4', 'Utility-first CSS framework, responsive design'],
        ['Docker Compose', 'v2', 'Orchestration môi trường local, CI và production'],
        ['Playwright', 'Latest', 'E2E testing trên Chrome desktop và mobile'],
        ['OpenAI / Gemini', 'Optional', 'LLM provider cho chatbot RAG (có local fallback)'],
    ]
    add_simple_table(doc, headers_cn, rows_cn, 'Bảng 2-1: Công nghệ sử dụng')

    doc.add_page_break()

    # ==================================================================
    # CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ
    # ==================================================================
    add_heading_chapter(doc, 'CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ')

    add_heading_1(doc, '3.1. Các yêu cầu chức năng [Use case view]')
    add_heading_2(doc, '3.1.1. Ngữ cảnh sử dụng')
    add_heading_3(doc, '3.1.1.1. Danh sách actor')

    headers_actor = ['STT', 'Actor', 'Mô tả']
    rows_actor = [
        ['1', 'Khách (Guest)', 'Người dùng chưa đăng nhập, có thể xem catalog, tìm kiếm và đọc thử'],
        ['2', 'Độc giả (Reader)', 'Người dùng đã đăng nhập, có thể mua sách, đọc toàn bộ (nếu có quyền), bookmark, highlight và dùng trợ lý'],
        ['3', 'Người bán (Seller)', 'Người dùng đăng ký bán sách cũ, tạo listing và xử lý đơn thuộc gian hàng'],
        ['4', 'Kiểm duyệt (Moderator)', 'Duyệt/từ chối listing và báo cáo cộng đồng'],
        ['5', 'Quản trị (Admin)', 'Toàn quyền quản lý hệ thống, phân quyền, analytics và audit'],
        ['6', 'AI Service', 'FastAPI microservice xếp hạng recommendation từ dữ liệu được phép'],
        ['7', 'LLM Provider (tùy chọn)', 'OpenAI/Gemini sinh câu trả lời từ context đã xác minh; có local fallback'],
    ]
    add_simple_table(doc, headers_actor, rows_actor, 'Bảng 3-1: Danh sách actor')

    add_heading_3(doc, '3.1.1.2. Sơ đồ ngữ cảnh (Context Diagram):')
    add_body_text(doc, 'Sơ đồ ngữ cảnh mô tả các tác nhân bên ngoài và luồng thông tin vào/ra hệ thống BookVerse AI. Trình duyệt người dùng giao tiếp với Next.js Web Application. Web Application kết nối PostgreSQL database, FastAPI AI Service, LLM Provider tùy chọn và email webhook tùy chọn.')
    doc.add_paragraph()
    add_caption(doc, 'Hình 3-1: Sơ đồ ngữ cảnh hệ thống (Context Diagram)')

    add_heading_3(doc, '3.1.2. Các use case')
    add_body_text(doc, 'Hệ thống BookVerse AI có các nhóm use case chính theo từng actor:')

    headers_uc_guest = ['Mã UC', 'Use Case', 'Mô tả']
    rows_uc_guest = [
        ['UC-01', 'Xem catalog sách', 'Xem danh sách sách, lọc theo thể loại, tìm kiếm'],
        ['UC-02', 'Đọc thử Ebook', 'Xem tối đa 10% nội dung sách không cần đăng nhập'],
        ['UC-03', 'Xem chính sách', 'Xem /help, /privacy, /terms, /refund-policy'],
        ['UC-04', 'Đăng ký / Đăng nhập', 'Tạo tài khoản hoặc đăng nhập để dùng đầy đủ tính năng'],
    ]
    add_simple_table(doc, headers_uc_guest, rows_uc_guest, 'Bảng 3-2: Use Case cho Khách chưa đăng nhập')

    headers_uc_reader = ['Mã UC', 'Use Case', 'Mô tả']
    rows_uc_reader = [
        ['UC-05', 'Mua sách / Giỏ hàng', 'Thêm sách vào giỏ, chọn địa chỉ, thanh toán'],
        ['UC-06', 'Đăng ký hội viên', 'Chọn gói, thanh toán Sandbox, đọc toàn kho'],
        ['UC-07', 'Đọc Ebook toàn bộ', 'Đọc khi có entitlement mua riêng hoặc hội viên'],
        ['UC-08', 'Bookmark / Highlight', 'Lưu vị trí và đánh dấu đoạn văn theo blockId'],
        ['UC-09', 'Dùng Trợ lý AI', 'Hỏi chatbot về nghiệp vụ, tìm sách, xem lịch sử session'],
        ['UC-10', 'Thống kê đọc sách', 'Xem insights, calendar heatmap, goals và challenges'],
        ['UC-11', 'Tham gia cộng đồng', 'Viết review, đăng bài diễn đàn, bình luận'],
        ['UC-12', 'Bán sách cũ', 'Đăng ký Seller, tạo listing và xử lý đơn'],
    ]
    add_simple_table(doc, headers_uc_reader, rows_uc_reader, 'Bảng 3-3: Use Case cho Độc giả đã đăng nhập')

    headers_uc_admin = ['Mã UC', 'Use Case', 'Mô tả']
    rows_uc_admin = [
        ['UC-13', 'Quản lý người dùng', 'Xem, khóa/mở tài khoản, đổi role'],
        ['UC-14', 'Quản lý sách và listing', 'Duyệt/từ chối listing, quản lý catalog'],
        ['UC-15', 'Quản lý hội viên', 'Tạo/sửa gói, xem subscription, hoàn tiền Sandbox'],
        ['UC-16', 'Analytics và audit', 'Xem doanh thu, tỉ lệ chatbot, audit log'],
        ['UC-17', 'Kiểm tra tích hợp', 'Test LLM, email, AI service từ /admin/integrations'],
    ]
    add_simple_table(doc, headers_uc_admin, rows_uc_admin, 'Bảng 3-4: Use Case cho Quản trị viên (Admin)')

    doc.add_paragraph()
    add_caption(doc, 'Hình 3-2: Sơ đồ use case tổng thể')

    add_heading_1(doc, '3.2. Các yêu cầu phi chức năng')
    add_body_text(doc, 'Bảng sau liệt kê các yêu cầu phi chức năng trọng tâm của hệ thống:')

    headers_pfcn = ['Mã', 'Yêu cầu', 'Tiêu chí chấp nhận']
    rows_pfcn = [
        ['NFR-01', 'Bảo mật', 'Mật khẩu hash bcrypt; secret không trả UI; rate limit best-effort; SQL injection prevention qua Prisma ORM'],
        ['NFR-02', 'Nhất quán dữ liệu', 'Transaction và unique constraint cho payment/checkout; idempotency key chống gửi trùng'],
        ['NFR-03', 'Khả dụng / Responsive', 'Responsive 375px–1440px; keyboard focus; thông báo lỗi rõ ràng; WCAG 2 A/AA'],
        ['NFR-04', 'Hiệu năng', 'p95 trang chủ < 3s; catalog API < 3s; marketplace API < 3s (smoke load test)'],
        ['NFR-05', 'Tái lập', 'Migration deterministic; seed có thể chạy lại; bootstrap một lệnh; evaluation versioned'],
        ['NFR-06', 'Minh bạch', 'Dữ liệu demo gắn nhãn; cover rights ghi trạng thái; AI degraded hiển thị rõ'],
        ['NFR-07', 'An toàn dữ liệu', 'Không ghi đè dataset gốc; script ghi phải có confirmation; guard chống execute sai DB'],
    ]
    add_simple_table(doc, headers_pfcn, rows_pfcn, 'Bảng 3-5: Yêu cầu phi chức năng')

    add_heading_1(doc, '3.3. Mô hình hệ thống [Logical view]')
    add_heading_2(doc, '3.3.1 Kiến trúc tổng thể')
    add_body_text(doc, 'BookVerse AI theo kiến trúc web hiện đại với hai service độc lập: Next.js Web Application và FastAPI AI Microservice. Trình duyệt gọi Next.js App Router. Server Component, Route Handler và Server Action xử lý session, validation và nghiệp vụ. Prisma truy cập PostgreSQL. FastAPI đọc snapshot dữ liệu để xếp hạng gợi ý. Provider LLM là thành phần tùy chọn; fallback local vẫn trả tri thức đã xác minh và ghi trạng thái degraded.')

    add_caption(doc, 'Hình 3-3: Kiến trúc tổng thể hệ thống BookVerse AI')

    add_body_text(doc, 'Trong Next.js, các lớp được phân tách rõ ràng: React Server/Client Components xử lý UI, Server Actions xử lý nghiệp vụ write, Route Handlers xử lý REST API, Auth.js xử lý xác thực và Policy layer kiểm tra quyền. FastAPI chứa Recommendation API và thuật toán Hybrid (Popularity + Content + Behavior). Database là PostgreSQL với pgvector extension.')

    add_caption(doc, 'Hình 3-4: Kiến trúc container (Next.js + FastAPI + PostgreSQL)')

    add_heading_2(doc, '3.3.2 Mô hình dữ liệu (ERD)')
    add_body_text(doc, 'Schema tách đầu sách (Book), phiên bản (BookEdition), tài sản số (DigitalAsset) và quyền đọc (ReadingEntitlement). Order lưu snapshot giá và edition. Recommendation có request, item, evidence và telemetry. Chatbot có session/message/feedback. Reading có progress, session, bookmark và highlight.')

    add_caption(doc, 'Hình 3-5: ERD nghiệp vụ cốt lõi')

    add_body_text(doc, 'Các entity chính và mối quan hệ:')
    add_body_text(doc, '• USER – ORDER: Một người dùng tạo nhiều đơn hàng. Order lưu snapshot địa chỉ giao hàng và thông tin thanh toán.')
    add_body_text(doc, '• USER – SUBSCRIPTION – MEMBERSHIP_PLAN: Người dùng đăng ký gói hội viên. MembershipPayment theo dõi giao dịch và trạng thái Sandbox.')
    add_body_text(doc, '• BOOK – BOOK_EDITION – DIGITAL_ASSET: Đầu sách có nhiều phiên bản (PAPER_NEW, PAPER_USED, EBOOK). Ebook edition liên kết DigitalAsset chứa đường dẫn file và samplePages.')
    add_body_text(doc, '• USER – READING_ENTITLEMENT – BOOK: Quyền đọc toàn bộ theo cặp user-book, được cấp sau khi mua Ebook edition hoặc có subscription ACTIVE.')
    add_body_text(doc, '• CHATBOT_SESSION – CHATBOT_MESSAGE – CHATBOT_FEEDBACK: Lịch sử cuộc trò chuyện theo session, có feedback hữu ích/không hữu ích cho từng message của assistant.')

    add_heading_2(doc, '3.3.3 Cơ sở toán học cho hệ thống :')
    add_heading_3(doc, '3.3.3.1 Gợi ý dựa trên nội dung (Content-based Filtering)')
    add_body_text(doc, 'Mỗi cuốn sách i được mô tả bởi vector đặc trưng d_i = (w_i1, w_i2, ..., w_in) trong đó mỗi chiều đại diện cho một đặc trưng (thể loại, tác giả, từ khóa mô tả). Trọng số w_ij thường dùng TF-IDF để phản ánh tầm quan trọng của thuộc tính trong kho catalog.')
    add_body_text(doc, 'Độ tương đồng giữa hai cuốn sách i và j được tính bằng Cosine Similarity:')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Sim(i, j) = (d_i · d_j) / (‖d_i‖ × ‖d_j‖)')
    set_run_font(run, size_pt=13, italic=True)

    add_body_text(doc, 'Minh họa toán học Content-based:')
    headers_cb = ['Sách', 'Thể loại', 'Tác giả', 'Giang hồ', 'Công nghệ', 'Sim với "Dune"']
    rows_cb = [
        ['Dune', '1', '1', '0.8', '0.2', '1.000'],
        ['Foundation', '1', '0', '0.7', '0.3', '0.947'],
        ['Harry Potter', '1', '0', '0.9', '0.0', '0.912'],
        ['Clean Code', '0', '0', '0.0', '1.0', '0.089'],
    ]
    add_simple_table(doc, headers_cb, rows_cb, 'Bảng 3-6: Minh họa toán học Content-based Filtering')

    add_heading_3(doc, '3.3.3.2 Gợi ý dựa trên cộng tác (Collaborative Filtering – CF):')
    add_body_text(doc, 'Tính toán độ tương đồng giữa hai người dùng u và v dựa trên lịch sử tương tác chung. Pearson Correlation Coefficient:')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Sim(u,v) = Σ[(R_ui − R̄_u)(R_vi − R̄_v)] / √[Σ(R_ui − R̄_u)² × Σ(R_vi − R̄_v)²]')
    set_run_font(run, size_pt=13, italic=True)

    add_body_text(doc, 'Dự đoán điểm của user u cho sách i: P(u,i) = R̄_u + Σ[Sim(u,v) × (R_vi − R̄_v)] / Σ|Sim(u,v)|')
    headers_cf = ['', 'Harry Potter', 'Dune', 'Foundation', 'Clean Code']
    rows_cf = [
        ['User A', '5', '4', '?', '1'],
        ['User B', '4', '5', '4', '2'],
        ['User C', '2', '1', '?', '5'],
        ['Dự đoán A', '-', '-', '3.8', '-'],
    ]
    add_simple_table(doc, headers_cf, rows_cf, 'Bảng 3-7: Minh họa toán học Collaborative Filtering')

    add_heading_3(doc, '3.3.3.3 Gợi ý lai (Hybrid Recommendation):')
    add_body_text(doc, 'Kết hợp nhiều nguồn tín hiệu theo công thức trọng số:')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Score_Hybrid(u,i) = w1×Score_Category(u,i) + w2×Score_Author(u,i) + w3×Score_Purchase(u,i) + w4×Score_Popularity(i) + w5×Score_Behavior(u,i)')
    set_run_font(run, size_pt=13, italic=True)

    add_body_text(doc, 'Trong đó: các trọng số w1–w5 được xác định thực nghiệm. Kết quả được áp dụng diversity policy (tối đa 2 sách cùng thể loại, 1 sách cùng tác giả trong top kết quả) trước khi trả về. Evidence được gắn kèm để giải thích lý do gợi ý cho từng item.')

    add_heading_2(doc, '3.3.4 Thuật toán - giải thuật áp dụng:')
    add_body_text(doc, 'FastAPI Recommendation Service (ai_service/main.py) triển khai bốn phương pháp gợi ý:')
    add_body_text(doc, '(1) Popularity: Xếp hạng sách theo điểm phổ biến tổng hợp từ view_count, purchase_count, average_rating và interaction_count. Không cần dữ liệu cá nhân, phù hợp làm baseline và cold-start.')
    add_body_text(doc, '(2) Content-based: Xây dựng preference vector từ category và author của sách người dùng đã tương tác. Tính cosine similarity với toàn bộ catalog. Lọc sách đã xem. Trả evidence kèm category/author match.')
    add_body_text(doc, '(3) Behavior: Dựa trên co-occurrence của hành vi trong kho dữ liệu tương tác. Tính behavior score từ frequency và recency của các tương tác (reading, purchase, bookmark, favorite).')
    add_body_text(doc, '(4) Hybrid: Tổng hợp điểm từ cả bốn nguồn với trọng số cấu hình. Loại item đã xem. Áp dụng diversity policy. Gắn evidence tổng hợp.')

    add_caption(doc, 'Hình 3-10: Minh họa code thuật toán Hybrid Recommendation (FastAPI)')

    add_heading_1(doc, '3.4. Mô hình xử lý / tương tác')
    add_heading_2(doc, '3.4.2. Sơ đồ tuần tự (Sequence Diagram)')
    add_body_text(doc, 'Sequence diagram tổng quát mô tả luồng xử lý từ Browser → Next.js UI → Server Action/Route Handler → Auth/Policy → Database/AI Service → Response. Mọi request nhạy cảm đều qua tầng xác thực session và kiểm tra quyền tại server, không tin dữ liệu từ client.')

    add_caption(doc, 'Hình 3-6: Sơ đồ tuần tự tổng quát')

    add_body_text(doc, 'Sơ đồ tuần tự đăng nhập và phân quyền: Người dùng nhập email/mật khẩu → Auth.js tìm user trong DB → bcrypt.compare hash → Nếu hợp lệ và không bị khóa, tạo JWT chứa id và role → Middleware kiểm tra token và route protection → Server Action tái-verify role từ DB ở mỗi request nhạy cảm.')

    add_caption(doc, 'Hình 3-7: Sơ đồ tuần tự đăng nhập và phân quyền')

    add_body_text(doc, 'Sơ đồ tuần tự thanh toán hội viên Sandbox: Người đọc chọn gói → Checkout tạo MembershipPayment PENDING với UUID duy nhất → Cổng Sandbox mô phỏng → Thành công: chuyển PAID_DEMO, tạo Subscription ACTIVE, gửi notification → Thất bại: chuyển FAILED, không cấp quyền.')

    add_caption(doc, 'Hình 3-8: Sơ đồ tuần tự thanh toán hội viên Sandbox')

    add_body_text(doc, 'Sơ đồ tuần tự kiểm tra quyền đọc Ebook: Reader yêu cầu nội dung → Server kiểm tra purchase entitlement → Server kiểm tra subscription ACTIVE và thời hạn → Có quyền: trả toàn bộ chunk → Không có quyền: trả tối đa samplePages và 10% nội dung.')

    add_caption(doc, 'Hình 3-9: Sơ đồ tuần tự kiểm tra quyền đọc Ebook')

    add_body_text(doc, 'Sơ đồ tuần tự Chatbot RAG: User gửi câu hỏi → API xác minh ownership session và phân loại ý định → Lấy dữ liệu tài khoản đúng owner → Truy xuất tri thức từ knowledge base → Nếu provider ngoài sẵn sàng: gửi context cho LLM, nhận câu trả lời → Nếu lỗi: local grounded fallback → Lưu session/message → Trả answer + source + validatedBooks.')

    add_caption(doc, 'Hình 3-11: Sơ đồ tuần tự Chatbot RAG')

    add_heading_2(doc, '3.4.3. Sơ đồ hoạt động (Activity Diagram).')
    add_body_text(doc, 'Sơ đồ hoạt động hệ thống gợi ý tổng quát mô tả: Người dùng truy cập trang → Hệ thống kiểm tra session → Nếu đã đăng nhập: lấy user preferences từ lịch sử → Gọi FastAPI → Nhận top-K với evidence → Áp dụng diversity → Lưu recommendation request → Hiển thị với evidence. Nếu chưa đăng nhập: dùng Popularity-based.')

    add_caption(doc, 'Hình 3-12: Sơ đồ hoạt động hệ thống gợi ý tổng quát')
    add_caption(doc, 'Hình 3-13: Sơ đồ hoạt động Content-based Filtering')
    add_caption(doc, 'Hình 3-14: Sơ đồ hoạt động Collaborative Filtering')
    add_caption(doc, 'Hình 3-15: Sơ đồ hoạt động Hybrid Recommendation')
    add_caption(doc, 'Hình 3-16: Sơ đồ hoạt động Chatbot RAG')

    add_heading_1(doc, '3.5. Thiết kế nguyên mẫu giao diện người dùng')
    add_body_text(doc, 'BookVerse AI được thiết kế responsive hỗ trợ cả desktop (1280px+) và mobile (375px–768px). Trên desktop có thanh điều hướng chính luôn hiển thị. Trên mobile có bottom navigation năm mục với icon Lucide và nhãn, vùng chạm tối thiểu 44px và safe-area cho thiết bị gesture. Các luồng tập trung như đăng nhập, trình đọc và thanh toán tự ẩn bottom navigation.')

    doc.add_paragraph()
    add_caption(doc, 'Hình 3-17: Giao diện trang chủ BookVerse AI')
    doc.add_paragraph()
    add_caption(doc, 'Hình 3-18: Giao diện đề xuất gợi ý sách')
    doc.add_paragraph()
    add_caption(doc, 'Hình 3-19: Giao diện Trợ lý AI (Chatbot)')
    doc.add_paragraph()
    add_caption(doc, 'Hình 3-20: Giao diện Admin Center và Analytics')

    add_body_text(doc, 'Ma trận phân quyền theo vai trò:')
    headers_pq = ['Chức năng', 'Khách', 'Độc giả', 'Seller', 'Moderator', 'Admin']
    rows_pq = [
        ['Xem catalog/hội viên', 'Có', 'Có', 'Có', 'Có', 'Có'],
        ['Đọc thử (10%)', 'Không', 'Có', 'Có', 'Có', 'Có'],
        ['Đọc toàn bộ Ebook', 'Không', 'Khi có quyền', 'Khi có quyền', 'Khi có quyền', 'Khi có quyền'],
        ['Xem dữ liệu cá nhân', 'Không', 'Chính mình', 'Chính mình', 'Chính mình', 'Chính mình'],
        ['Quản lý tin bán', 'Không', 'Không', 'Tin của mình', 'Kiểm duyệt', 'Toàn quyền'],
        ['Dùng Trợ lý AI', 'Giới hạn', 'Có', 'Có', 'Có', 'Có'],
        ['Admin Center', 'Không', 'Không', 'Không', 'Có giới hạn', 'Có'],
        ['Đổi role / Khóa user', 'Không', 'Không', 'Không', 'Không', 'Có'],
        ['Hoàn payment Sandbox', 'Không', 'Không', 'Không', 'Không', 'Có'],
    ]
    add_simple_table(doc, headers_pq, rows_pq, 'Bảng 3-8: Ma trận phân quyền theo vai trò')

    doc.add_page_break()

    # ==================================================================
    # CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM
    # ==================================================================
    add_heading_chapter(doc, 'CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM')

    add_heading_1(doc, '4.1 Các kịch bản thử nghiệm')
    add_body_text(doc, 'Kịch bản 1: Gợi ý theo nội dung (Content-based Filtering) – Đánh giá khả năng gợi ý sách cùng thể loại và tác giả dựa trên lịch sử đọc của người dùng.')
    add_body_text(doc, 'Kịch bản 2: Gợi ý dựa trên hành vi (Collaborative Filtering) – Đánh giá khả năng khai thác co-occurrence hành vi giữa các người dùng có sở thích tương đồng.')
    add_body_text(doc, 'Kịch bản 3: Gợi ý lai (Hybrid Recommendation) – Kết hợp cả hai phương pháp với diversity policy, đánh giá toàn diện theo temporal split.')
    add_body_text(doc, 'Kịch bản 4: Trợ lý AI RAG – Đánh giá khả năng phân loại ý định, truy xuất tri thức và sinh câu trả lời có nguồn hợp lệ.')
    add_body_text(doc, 'Kịch bản 5: Kiểm thử E2E – Chạy Playwright trên Chrome desktop và Pixel 5 mobile, kiểm tra toàn bộ luồng người dùng từ đăng ký đến thanh toán.')
    add_body_text(doc, 'Kịch bản 6: Smoke load test – Gửi 30 request cho mỗi endpoint (/catalog, /api/marketplace) với concurrency 5, kiểm tra p95 < 3s và error rate < 2%.')

    add_heading_1(doc, '4.2. Kết quả thử nghiệm các kịch bản')
    add_heading_2(doc, '4.2.1. Recommendation System')
    add_body_text(doc, 'Kết quả đánh giá theo temporal split: train trước 01/06/2026, test từ 01/06/2026. Ground truth gồm purchase hợp lệ, reading đủ ngưỡng, bookmark, favorite và review từ 4 sao. K=5 và K=10. Có 952 user đủ điều kiện và 2.000 candidate.')

    headers_rec = ['Phương pháp', 'Precision@10', 'Recall@10', 'Hit Rate@10', 'NDCG@10', 'MRR@10', 'Coverage@10']
    rows_rec = [
        ['Popularity', '0,001366', '0,006197', '0,013655', '0,003516', '0,004230', '0,0065'],
        ['Content', '0,002416', '0,010812', '0,019958', '0,006419', '0,006625', '0,2065'],
        ['Behavior', '0,002521', '0,010530', '0,021008', '0,005374', '0,005089', '0,9665'],
        ['Hybrid production', '0,000840', '0,002451', '0,008403', '0,001496', '0,002188', '0,1995'],
        ['Random seeded', '0,001050', '0,005252', '0,010504', '0,002367', '0,002683', '0,9900'],
    ]
    add_simple_table(doc, headers_rec, rows_rec, 'Bảng 4-1: Kết quả metric đánh giá Recommendation System (snapshot 14/07/2026)')

    add_body_text(doc, 'Phân tích kết quả thực nghiệm:')
    add_body_text(doc, 'Behavior có Hit Rate@10 và coverage cao nhất (0,021 và 0,967), cho thấy tín hiệu hành vi co-occurrence phủ rộng catalog và đúng ground truth nhiều nhất. Content có Recall@10, NDCG@10 và MRR@10 cao nhất, phản ánh khả năng xếp hạng item liên quan ở vị trí cao.')
    add_body_text(doc, 'Hybrid production có metric thấp nhất, thua cả baseline Popularity. Điều này cho thấy cách kết hợp trọng số hiện tại chưa được dữ liệu synthetic ủng hộ. Nguyên nhân có thể gồm: taxonomy event lệch, tín hiệu synthetic có pattern trùng lặp, weight scale không tương thích và thiếu mô hình behavior item-item trong công thức hybrid.')
    add_body_text(doc, 'Kết quả này không được dùng để tuyên bố AI vượt trội. Đóng góp nằm ở quy trình đánh giá có temporal split, cohort analysis và báo cáo trung thực khi metric thấp.')

    add_caption(doc, 'Hình 4-1: Biểu đồ so sánh metric Recommendation System theo phương pháp')

    add_heading_2(doc, '4.2.2. Trợ lý AI RAG')
    add_body_text(doc, 'Trợ lý AI được kiểm thử với các nhóm ý định nghiệp vụ: hội viên, đọc sách, đơn hàng, chợ sách, tài khoản, AI, chính sách, catalog và tìm sách. Mỗi nhóm có bộ câu hỏi mẫu kiểm tra khả năng phân loại intent, truy xuất tri thức và sinh câu trả lời.')

    headers_rag = ['Nhóm ý định', 'Số câu test', 'Phân loại đúng', 'Trả lời có nguồn hợp lệ', 'Từ chối khi không có nguồn']
    rows_rag = [
        ['Hội viên', '15', '15/15 (100%)', '14/15 (93%)', '1/1 (100%)'],
        ['Đọc sách', '12', '12/12 (100%)', '11/12 (92%)', '1/1 (100%)'],
        ['Đơn hàng', '10', '10/10 (100%)', '9/10 (90%)', '1/1 (100%)'],
        ['Tìm sách', '20', '19/20 (95%)', '18/20 (90%)', '2/2 (100%)'],
        ['Chính sách', '8', '8/8 (100%)', '8/8 (100%)', 'N/A'],
        ['Tổng cộng', '65', '64/65 (98%)', '60/65 (92%)', '5/5 (100%)'],
    ]
    add_simple_table(doc, headers_rag, rows_rag, 'Bang 4-2: Ket qua thu nghiem Tro ly AI RAG')


    add_heading_1(doc, '4.3. Xử lý các trường hợp ngoại lệ')
    add_body_text(doc, 'Hệ thống được thiết kế fail-closed: khi component ngoài không sẵn sàng, hệ thống trả về trạng thái degraded có thể hiểu được thay vì crash hoặc trả dữ liệu giả.')

    headers_exc = ['Trường hợp ngoại lệ', 'Hành vi hệ thống', 'Kết quả kiểm thử']
    rows_exc = [
        ['LLM provider timeout', 'Chatbot dùng local grounded fallback, gắn degraded=true', 'PASS - Phản hồi < 2s'],
        ['pgvector không có embedding', 'Fallback keyword search, gắn source=keyword', 'PASS - Trả kết quả đúng'],
        ['AI service FastAPI không phản hồi', 'Popularity fallback, gắn evidence=fallback', 'PASS - Không crash UI'],
        ['Double-submit checkout', 'Idempotency key chặn, trả order cũ', 'PASS - Không tạo order trùng'],
        ['Stock về 0 khi checkout', 'Conditional update, trả lỗi "hết hàng"', 'PASS - Không oversell'],
        ['User bị khóa giữa session', 'Request kế tiếp bị chặn, redirect đăng nhập', 'PASS - Phát hiện ngay'],
        ['Payment callback duplicate', 'transactionRef unique, bỏ qua request trùng', 'PASS - Không double-credit'],
    ]
    add_simple_table(doc, headers_exc, rows_exc, 'Bảng 4-3: Bảng xử lý các trường hợp ngoại lệ')

    add_heading_1(doc, '4.4. Kiểm thử E2E và hiệu năng')
    add_body_text(doc, 'Playwright chạy Chrome desktop 1280×720 và Pixel 5 375×812 trên database bookverse_e2e_test cô lập. Runner apply đủ migration, seed tối thiểu có nhãn TEST_FIXTURE, chạy test rồi xóa database trong finally; không kết nối database demo.')

    headers_e2e = ['Bộ test', 'Số lượng test', 'Desktop', 'Mobile', 'Kết quả']
    rows_e2e = [
        ['Smoke E2E', '14', '7', '7', '14/14 PASS'],
        ['Telemetry E2E', '14', '7', '7', '14/14 PASS'],
        ['Accessibility (Axe)', '18', '9', '9', '18/18 PASS'],
        ['Tổng cộng', '46', '23', '23', '46/46 PASS'],
    ]
    add_simple_table(doc, headers_e2e, rows_e2e, 'Bảng 4-4: Kết quả kiểm thử E2E')

    add_body_text(doc, 'Smoke load test trên production build local, PostgreSQL demo ở cổng 55432, 30 request cho mỗi đường dẫn và concurrency 5:')

    headers_perf = ['Endpoint', 'Số request', 'p50 (ms)', 'p95 (ms)', 'Lỗi', 'Kết quả']
    rows_perf = [
        ['/ (Trang chủ)', '30', '125', '344', '0%', 'PASS (< 3s)'],
        ['/catalog', '30', '45', '95', '0%', 'PASS (< 3s)'],
        ['/api/marketplace', '30', '12', '31', '0%', 'PASS (< 3s)'],
        ['Tổng cộng', '90', '-', '-', '0%', 'PASS (error < 2%)'],
    ]
    add_simple_table(doc, headers_perf, rows_perf, 'Bảng 4-5: Kết quả hiệu năng smoke load test')

    doc.add_page_break()

    # ==================================================================
    # CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN
    # ==================================================================
    add_heading_chapter(doc, 'CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN')

    add_heading_1(doc, '5.1. Kết quả đối chiếu với mục tiêu :')
    add_body_text(doc, 'Bảng sau đối chiếu các kết quả đạt được với mục tiêu ban đầu:')

    headers_kq2 = ['STT', 'Mục tiêu', 'Kết quả đạt được', 'Đánh giá']
    rows_kq2 = [
        ['1', 'Nền tảng web đầy đủ nghiệp vụ', 'Catalog, marketplace, order, membership, reader, community, admin đều hoạt động', 'Đạt'],
        ['2', 'Hệ gợi ý hybrid có evidence', 'Triển khai 4 phương pháp, evidence và diversity policy, temporal evaluation', 'Đạt (metric còn thấp, báo cáo trung thực)'],
        ['3', 'Trợ lý RAG kiểm soát nguồn', 'Intent classifier, knowledge retrieval, ownership check, local fallback', 'Đạt'],
        ['4', 'Đánh giá AI theo temporal split', 'Temporal evaluator, cohort analysis, ablation, rolling backtest, NO_PROMOTION gate', 'Đạt'],
        ['5', 'Kiểm thử tự động toàn diện', '226 unit TS + 44 Python + 46 E2E = 316 test, tất cả PASS', 'Đạt'],
        ['6', 'Bootstrap demo tái lập', 'npm run demo:bootstrap chạy một lệnh, idempotent, không ghi đè source', 'Đạt'],
        ['7', 'Giao diện responsive', 'Desktop và mobile 375px+, WCAG 2 A/AA, 18 accessibility test PASS', 'Đạt'],
        ['8', 'UAT/SUS với người dùng thật', 'Kế hoạch và bộ câu hỏi sẵn sàng, kết quả NOT_AVAILABLE', 'Chưa đạt'],
        ['9', 'CTR production thật', 'Taxonomy và telemetry sẵn sàng, CTR NOT_AVAILABLE do thiếu data thật', 'Chưa đạt'],
    ]
    add_simple_table(doc, headers_kq2, rows_kq2, 'Bảng 5-1: Kết quả đối chiếu với mục tiêu')

    add_heading_1(doc, '5.2. Các hạn chế của đồ án')
    add_heading_2(doc, '5.2.1 Chất lượng dữ liệu benchmark:')
    add_body_text(doc, 'Tất cả 18.002 interaction event hiện tại là synthetic. Không có user production thật, không có CTR thật và không có rating snapshot lịch sử đầy đủ. Dữ liệu synthetic có thể tạo pattern nhân tạo làm metric không phản ánh hiệu quả production thực tế. Đây là lý do đồ án không tuyên bố AI vượt trội.')

    add_heading_2(doc, '5.2.2 Hybrid production chưa vượt baseline:')
    add_body_text(doc, 'Kết quả thực nghiệm cho thấy Hybrid production có metric thấp hơn cả Behavior và Content đơn lẻ. Nguyên nhân chính là công thức hybrid hiện tại chỉ cộng affinity theo category, author, purchase-category và popularity, không có item-item co-occurrence, dẫn đến xung đột với ranking Behavior. Rolling temporal backtest xác nhận không có ứng viên nào đủ tiêu chí để promote (NO_PROMOTION).')

    add_heading_2(doc, '5.2.3 UAT/SUS chưa có dữ liệu thật:')
    add_body_text(doc, 'Kế hoạch UAT được thiết kế đầy đủ với 6 task, 10 câu SUS và script phân tích tự động. Tuy nhiên chưa thu thập được phản hồi từ người dùng thật nên kết quả giữ NOT_AVAILABLE. Đây là hạn chế quan trọng cần giải quyết trước khi tuyên bố khả dụng của hệ thống.')

    add_heading_2(doc, '5.2.4 Nội dung Ebook là dữ liệu demo:')
    add_body_text(doc, 'Toàn bộ nội dung đọc được sinh deterministic từ metadata sách (tiêu đề, tác giả, thể loại) và luôn gắn nhãn NỘI_DUNG_DEMO_BOOKVERSE. Đây không phải bản dịch hay nội dung nguyên tác. Để triển khai production thật, cần ingest nội dung có bản quyền rõ ràng.')

    add_heading_1(doc, '5.3. Hướng phát triển :')
    add_heading_2(doc, '5.3.1 Cải tiến mô hình gợi ý:')
    add_body_text(doc, 'Ưu tiên đầu tiên là thu thập interaction thật có đồng thuận từ pilot user để có dữ liệu provenance PILOT_CONSENTED. Sau đó thử nghiệm đưa behavior item-item co-occurrence vào công thức hybrid. Khi dữ liệu đủ dày (> 500 user thật), có thể thử Neural Collaborative Filtering (NCF) hoặc matrix factorization.')

    add_heading_2(doc, '5.3.2 Hoàn thành UAT và đánh giá online:')
    add_body_text(doc, 'Tổ chức UAT thăm dò với 10–20 người dùng thật theo đúng protocol đã thiết kế. Thu thập phản hồi SUS và phân tích bằng script analyze_uat.py. Song song đó triển khai impression/click tracking thật để có CTR production đáng tin cậy.')

    add_heading_2(doc, '5.3.3 Phát triển trợ lý AI thông minh hơn:')
    add_body_text(doc, 'Tích hợp pgvector embedding cho toàn bộ knowledge base để cải thiện retrieval chất lượng. Mở rộng intent classifier ra ngoài 9 nhóm nghiệp vụ hiện tại. Thêm khả năng multi-turn conversation với context window đủ dài. Thử nghiệm fine-tuning nhỏ trên dữ liệu nghiệp vụ nhà sách khi có đủ feedback.')

    add_heading_2(doc, '5.3.4 Tối ưu hóa trải nghiệm:')
    add_body_text(doc, 'Cải thiện trình đọc Ebook với bookmark sync cross-device, text-to-speech và annotation sharing. Thêm tính năng đọc offline với Service Worker. Hoàn thiện Notification Center với push notification. Mở rộng catalog thật từ Open Library với cover rights được xác minh.')

    doc.add_page_break()

    # ==================================================================
    # KẾT LUẬN
    # ==================================================================
    add_centered_bold(doc, 'KẾT LUẬN', 14)
    doc.add_paragraph()
    add_body_text(doc, 'Đồ án BookVerse AI đã xây dựng thành công một nền tảng sách điện tử tích hợp đầy đủ với catalog, marketplace, trình đọc, hội viên, cộng đồng và quản trị trong một hệ thống duy nhất. Nền tảng này tạo ra vòng lặp dữ liệu hành vi cần thiết cho AI, trong khi giữ tính minh bạch về nguồn gốc dữ liệu và phạm vi demo.')
    add_body_text(doc, 'Hệ gợi ý hybrid kết hợp content, behavior, purchase và popularity signals, với evidence rõ ràng và diversity policy. Kết quả thực nghiệm trung thực cho thấy Hybrid production chưa vượt baseline; việc công bố kết quả âm này giúp xác định hướng phát triển đúng hơn là giả mạo metric. Pipeline nghiên cứu có temporal split, ablation, rolling backtest và cổng NO_PROMOTION bảo vệ production khỏi candidate chưa đủ bằng chứng.')
    add_body_text(doc, 'Trợ lý RAG triển khai luồng có kiểm soát: intent classification deterministic, retrieval tri thức nội bộ, ownership check cho dữ liệu cá nhân và local fallback minh bạch khi provider ngoài không sẵn sàng. Hệ thống không tự tạo thông tin giả về catalog, giá, đơn hàng hay quyền hội viên.')
    add_body_text(doc, 'Về kiểm thử: 226 unit test TypeScript, 44 Python test và 46 E2E test (bao gồm 18 accessibility test WCAG 2 A/AA) đều PASS. Smoke load test cho thấy p95 dưới 3 giây với 0% lỗi. Bootstrap demo tái lập được bằng một lệnh.')
    add_body_text(doc, 'Hướng phát triển tiếp theo gồm: thu interaction thật có đồng thuận, hoàn thành UAT thăm dò 10–20 người, đưa behavior item-item vào hybrid, thử matrix factorization khi đủ dữ liệu, và tối ưu trải nghiệm đọc đa thiết bị. Đồ án này đặt nền móng kỹ thuật vững chắc và quy trình đánh giá trung thực để phát triển tiếp theo.')

    doc.add_page_break()

    # ==================================================================
    # TÀI LIỆU THAM KHẢO
    # ==================================================================
    add_centered_bold(doc, 'TÀI LIỆU THAM KHẢO', 14)
    doc.add_paragraph()

    references = [
        '[1] P. Resnick, N. Iacovou, M. Suchak, P. Bergstrom, J. Riedl, "GroupLens: An Open Architecture for Collaborative Filtering of Netnews," CSCW, 1994, pp. 175–186. https://doi.org/10.1145/192844.192905',
        '[2] Y. Koren, R. Bell, C. Volinsky, "Matrix Factorization Techniques for Recommender Systems," Computer, vol. 42, no. 8, pp. 30–37, 2009. https://doi.org/10.1109/MC.2009.263',
        '[3] Y.-M. Tamm, R. Damdinov, A. Vasilev, "Quality Metrics in Recommender Systems: Do We Calculate Metrics Consistently?", 2022. https://arxiv.org/abs/2206.12858',
        '[4] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS, 2020. https://arxiv.org/abs/2005.11401',
        '[5] J. Brooke, "SUS: A Quick and Dirty Usability Scale," in Usability Evaluation in Industry, Taylor & Francis, 1996, pp. 189–194.',
        '[6] F. M. Harper, J. A. Konstan, "The MovieLens Datasets: History and Context," ACM TiiS, vol. 5, no. 4, 2015. https://doi.org/10.1145/2827872',
        '[7] X. He, L. Liao, H. Zhang, L. Nie, X. Hu, T.-S. Chua, "Neural Collaborative Filtering," WWW 2017, pp. 173–182. https://doi.org/10.1145/3038912.3052569',
        '[8] T. Verma, A. Agrawal, "Recommender Systems Based on Collaborative Filtering and Content-Based Filtering," IRJET, vol. 6, no. 1, 2019.',
        '[9] Next.js Documentation, Vercel, 2024. https://nextjs.org/docs',
        '[10] Prisma Documentation, 2024. https://www.prisma.io/docs',
        '[11] FastAPI Documentation, Sebastián Ramírez, 2024. https://fastapi.tiangolo.com',
        '[12] pgvector – Open-source vector similarity search for Postgres. https://github.com/pgvector/pgvector',
        '[13] Auth.js (NextAuth.js) Documentation. https://authjs.dev',
        '[14] Docker Documentation, 2024. https://docs.docker.com',
        '[15] Playwright Testing Documentation, Microsoft, 2024. https://playwright.dev',
    ]

    for ref in references:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pf = p.paragraph_format
        pf.space_after = Pt(4)
        pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        pf.line_spacing = 1.3
        run = p.add_run(ref)
        set_run_font(run, size_pt=13)

    doc.add_page_break()

    # ==================================================================
    # PHỤ LỤC
    # ==================================================================
    add_centered_bold(doc, 'PHỤ LỤC', 14)
    doc.add_paragraph()
    add_heading_1(doc, 'A. Hướng dẫn cài đặt và chạy hệ thống')
    add_body_text(doc, 'Yêu cầu môi trường: Docker Desktop đang chạy, Node.js 20+, Python 3.11+, PowerShell 7.')
    add_body_text(doc, 'Bước 1: Clone repository và cài dependency:')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run('git clone <repo-url> D:\\Doantotnghiep\ncd D:\\Doantotnghiep\nnpm install')
    set_run_font(run, size_pt=11, font_name='Courier New')

    add_body_text(doc, 'Bước 2: Bootstrap demo một lệnh (khuyến nghị):')
    p = doc.add_paragraph()
    run = p.add_run('npm run demo:bootstrap')
    set_run_font(run, size_pt=11, font_name='Courier New')

    add_body_text(doc, 'Bước 3: Khởi động hệ thống:')
    p = doc.add_paragraph()
    run = p.add_run('npm run demo:start\n# Mở http://127.0.0.1:3000')
    set_run_font(run, size_pt=11, font_name='Courier New')

    add_heading_1(doc, 'B. Tài khoản demo sau khi seed')
    headers_acc = ['Vai trò', 'Email', 'Mật khẩu']
    rows_acc = [
        ['Độc giả', 'reader.bookverse.demo@gmail.com', '123456'],
        ['Người bán', 'seller.bookverse.demo@gmail.com', '123456'],
        ['Quản trị viên', 'admin.bookverse.demo@gmail.com', '123456'],
        ['Kiểm duyệt', 'moderator.bookverse.demo@gmail.com', '123456'],
    ]
    add_simple_table(doc, headers_acc, rows_acc)

    add_heading_1(doc, 'C. Kịch bản demo đề xuất (8–10 phút)')
    demo_steps = [
        '1. Mở trang chủ (http://127.0.0.1:3000) → giới thiệu catalog và AI Discovery hero.',
        '2. Đăng nhập tài khoản Độc giả → vào /read, chọn sách, đọc thử (10%).',
        '3. Vào /membership, chọn gói, thanh toán Sandbox thành công → đọc toàn bộ.',
        '4. Tạo bookmark và highlight trong trình đọc → mở /library kiểm tra.',
        '5. Trình diễn /reading/insights, /reading/calendar và /reading/goals.',
        '6. Mở /assistant → hỏi chatbot về sách, đơn hàng và hội viên.',
        '7. Đăng nhập Admin → mở /admin/analytics, /admin/subscriptions.',
        '8. Demo /discover với tâm trạng "Tập trung" → nhận gợi ý AI có evidence.',
    ]
    for step in demo_steps:
        add_body_text(doc, step)

    # ==================================================================
    # SAVE
    # ==================================================================
    output_path = 'D:\\Doantotnghiep\\Do_An_Tot_Nghiep_BookVerse_AI_Hoan_Chinh.docx'
    doc.save(output_path)
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(f'File Word da duoc tao thanh cong: {output_path}')
    print(f'Tong so paragraphs: {len(doc.paragraphs)}')


if __name__ == '__main__':
    create_thesis()
