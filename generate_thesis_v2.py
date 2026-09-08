# -*- coding: utf-8 -*-
"""
Script tạo file Word đồ án tốt nghiệp BookVerse AI
- Giữ nguyên trang 1 và 2 từ file mẫu gốc (paragraphs 0-17 bao gồm section break)
- Xây dựng lại toàn bộ nội dung từ trang 3 trở đi
"""
import copy
import os
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import lxml.etree as etree

TEMPLATE_PATH = 'D:\\Doantotnghiep\\Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_Chuan_Mau.docx'
OUTPUT_PATH = 'D:\\Doantotnghiep\\Do_An_Tot_Nghiep_BookVerse_AI_Final.docx'
SCREENSHOTS_DIR = 'D:\\Doantotnghiep\\thesis_screenshots'

# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

def set_cell_background(cell, fill_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_color)
    tcPr.append(shd)

def set_run_font(run, size_pt=13, bold=False, italic=False, underline=False, color=None, font_name='Times New Roman'):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.underline = underline
    if color:
        run.font.color.rgb = RGBColor(*color)
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.insert(0, rFonts)
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    rFonts.set(qn('w:cs'), font_name)
    rFonts.set(qn('w:eastAsia'), font_name)

def add_para(doc, text='', alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False,
             size_pt=13, space_before=None, space_after=4, line_spacing=1.3, indent=False, font_name='Times New Roman'):
    para = doc.add_paragraph()
    para.alignment = alignment
    pf = para.paragraph_format
    if space_before is not None:
        pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    if indent:
        pf.first_line_indent = Cm(1.27)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = line_spacing
    if text:
        run = para.add_run(text)
        set_run_font(run, size_pt=size_pt, bold=bold, italic=italic, font_name=font_name)
    return para

def h_chapter(doc, text):
    """CHƯƠNG heading: centered, bold, 15pt, space before 14pt, after 8pt."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER,
                    bold=True, size_pt=15, space_before=14, space_after=8, line_spacing=1.3)

def h1(doc, text):
    """H1: left, bold, 13pt."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT,
                    bold=True, size_pt=13, space_before=8, space_after=4, line_spacing=1.3)

def h2(doc, text):
    """H2: left, bold+italic, 13pt."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT,
                    bold=True, italic=True, size_pt=13, space_before=6, space_after=2, line_spacing=1.3)

def h3(doc, text):
    """H3: left, bold+italic, 13pt smaller spacing."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT,
                    bold=True, italic=True, size_pt=13, space_before=4, space_after=2, line_spacing=1.3)

def body(doc, text):
    """Body text: justify, first-line indent, 13pt, 1.3 spacing."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
                    size_pt=13, space_before=0, space_after=4, line_spacing=1.3, indent=True)

def body_ni(doc, text):
    """Body text no indent."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
                    size_pt=13, space_before=0, space_after=4, line_spacing=1.3, indent=False)

def caption(doc, text):
    """Caption: centered, italic, 12pt."""
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER,
                    italic=True, size_pt=12, space_before=2, space_after=8, line_spacing=1.3)

def center_bold(doc, text, size_pt=14):
    return add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER,
                    bold=True, size_pt=size_pt, space_before=4, space_after=4, line_spacing=1.3)

def add_image(doc, img_path, width_cm=14, caption_text=None):
    """Add image from file path."""
    if os.path.exists(img_path):
        para = doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run()
        run.add_picture(img_path, width=Cm(width_cm))
        if caption_text:
            caption(doc, caption_text)
    else:
        # Placeholder if image not available
        para = doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run(f'[Hình: {os.path.basename(img_path)}]')
        set_run_font(run, size_pt=11, italic=True, color=(128, 128, 128))
        pf = para.paragraph_format
        pf.space_before = Pt(20)
        pf.space_after = Pt(20)
        if caption_text:
            caption(doc, caption_text)

def add_table(doc, headers, rows, caption_text=None, header_color='4472C4', header_text_color=None):
    """Add styled table."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        set_run_font(r, size_pt=12, bold=True, color=(255,255,255) if header_text_color is None else header_text_color)
        set_cell_background(cell, header_color)

    # Rows
    for ri, row_data in enumerate(rows):
        row = table.rows[ri + 1]
        bg = 'FFFFFF' if ri % 2 == 0 else 'F2F2F2'
        for ci, cell_text in enumerate(row_data):
            cell = row.cells[ci]
            cell.text = ''
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if ci > 0 else WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(str(cell_text))
            set_run_font(r, size_pt=12)
            set_cell_background(cell, bg)

    if caption_text:
        doc.add_paragraph()
        caption(doc, caption_text)
    doc.add_paragraph()
    return table

def page_break(doc):
    doc.add_page_break()


# =====================================================================
# BUILD DOCUMENT CONTENT (From Page 3 onwards)
# =====================================================================

def build_content(doc):
    """Add all thesis content starting from page 3."""

    SCREENSHOTS = SCREENSHOTS_DIR + '\\'
    IMG = lambda name: SCREENSHOTS + name

    # ------------------------------------------------------------------
    # ĐỀ CƯƠNG CHI TIẾT
    # ------------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run('BỘ GIÁO DỤC VÀ ĐÀO TẠO\t\tCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\t\tĐộc lập – Tự do – Hạnh phúc\n')
    set_run_font(run, size_pt=13)

    center_bold(doc, 'ĐỀ CƯƠNG CHI TIẾT', 14)

    h1(doc, '1. Lý do chọn đề tài')
    body(doc, 'Trong thời đại công nghệ số, thương mại điện tử ngày càng phát triển mạnh mẽ và trở thành xu hướng tất yếu. Các nhà sách truyền thống đang dần chuyển dịch sang mô hình trực tuyến nhằm đáp ứng nhu cầu ngày càng cao của người đọc. Tuy nhiên, hầu hết các nền tảng hiện nay vẫn tách biệt giữa chức năng mua bán, đọc sách và gợi ý cá nhân hóa, khiến trải nghiệm người dùng bị phân mảnh và thiếu liên kết.')
    body(doc, 'Vì vậy, việc phát triển một hệ thống nhà sách thông minh (Smart Bookstore Online) ứng dụng Recommendation System sẽ giúp người dùng dễ dàng tìm thấy cuốn sách phù hợp, đồng thời tích hợp trải nghiệm đọc trực tuyến, giao dịch và hỗ trợ AI trong một nền tảng duy nhất.')

    h1(doc, '2. Mục tiêu của đề tài')
    body(doc, 'Đề tài tập trung xây dựng ứng dụng website bán và đọc sách trực tuyến hoàn chỉnh. Hệ thống tích hợp công nghệ gợi ý cá nhân hóa nhằm đề xuất các đầu sách phù hợp với sở thích và hành vi của từng người dùng, kết hợp trợ lý AI RAG hỗ trợ tư vấn nghiệp vụ, cùng với phân hệ marketplace, hội viên và quản trị đầy đủ.')

    h1(doc, '3. Phạm vi thực hiện')
    body(doc, 'Về phía người dùng: hệ thống cung cấp đầy đủ các tính năng đăng ký, đăng nhập, tìm kiếm sách không dấu, quản lý giỏ hàng, xem danh mục đề xuất, đọc Ebook trực tuyến, quản lý hội viên và tương tác cộng đồng.')
    body(doc, 'Về công nghệ: đồ án được xây dựng trên nền tảng Fullstack Next.js 15 kết hợp FastAPI Microservice, hệ quản trị cơ sở dữ liệu PostgreSQL tích hợp pgvector cho tìm kiếm vector, cùng với Prisma ORM và Docker Compose cho môi trường triển khai.')

    h1(doc, '4. Ý nghĩa của đề tài')
    body(doc, 'Đề tài góp phần hiện đại hóa ngành bán lẻ sách thông qua việc ứng dụng trí tuệ nhân tạo, gia tăng tính cá nhân hóa trong trải nghiệm khách hàng. Về mặt học thuật, đồ án áp dụng và đánh giá trung thực các thuật toán recommendation theo phương pháp temporal evaluation chuẩn mực.')

    h1(doc, '5. Đối tượng nghiên cứu')
    body(doc, 'Đối tượng nghiên cứu bao gồm người dùng truy cập và sử dụng nhà sách trực tuyến, tập dữ liệu về sách và hành vi tương tác của độc giả, cùng các thuật toán gợi ý collaborative filtering, content-based filtering và hybrid recommendation.')

    h1(doc, '6. Phương pháp thực hiện')
    body(doc, 'Quá trình thực hiện bao gồm: nghiên cứu các hệ sinh thái bán sách trực tuyến tiêu biểu, phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc phân lớp chuẩn mực, cài đặt theo quy trình phát triển phần mềm có kiểm thử tự động và tích hợp liên tục.')

    h1(doc, '7. Kết quả mong đợi')
    body(doc, 'Kết quả kỳ vọng là một website hoàn chỉnh có khả năng đề xuất sách thông minh, phân hệ quản trị riêng biệt, giao diện trực quan trên cả desktop và mobile, hệ thống AI hỗ trợ người dùng tìm kiếm và tư vấn sách theo ngữ cảnh nghiệp vụ thực tế.')

    p = doc.add_paragraph()
    run = p.add_run('Kế hoạch thực hiện (12 Tuần):')
    set_run_font(run, size_pt=13, bold=True)

    add_table(doc,
        ['Tuần', 'Nội dung công việc'],
        [
            ['1–2', 'Nghiên cứu yêu cầu, phân tích bài toán, thiết kế kiến trúc hệ thống'],
            ['3–4', 'Thiết kế cơ sở dữ liệu, xây dựng schema Prisma, cài đặt môi trường Docker'],
            ['5–6', 'Cài đặt xác thực, phân quyền, catalog sách và luồng tìm kiếm'],
            ['7–8', 'Xây dựng Recommendation System (Content-based, Collaborative, Hybrid)'],
            ['9–10', 'Tích hợp Trợ lý RAG, hệ thống hội viên, marketplace và trình đọc Ebook'],
            ['11', 'Kiểm thử (unit, E2E, hiệu năng), đánh giá AI theo temporal split'],
            ['12', 'Hoàn thiện tài liệu, demo và chuẩn bị bảo vệ'],
        ]
    )

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('SINH VIÊN THỰC HIỆN\t\t\t\t\tCÁN BỘ HƯỚNG DẪN\n(Sinh viên ký và ghi rõ họ tên)\t\t\t\t(Ký tên và ghi rõ họ tên)\n\n\n\nLương Nguyễn Quốc Tuấn\t\t\t\t\tThS. Dương Anh Tuấn')
    set_run_font(run, size_pt=13)

    page_break(doc)

    # ------------------------------------------------------------------
    # NHẬN XÉT GIẢNG VIÊN HƯỚNG DẪN
    # ------------------------------------------------------------------
    center_bold(doc, 'NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN', 14)
    add_para(doc, '-----o0o-----\n\n', alignment=WD_ALIGN_PARAGRAPH.CENTER, size_pt=13)
    for _ in range(12):
        add_para(doc, '.' * 110, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, size_pt=13)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\nGiảng viên hướng dẫn\n\n\n\n\nThS. Dương Anh Tuấn')
    set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # NHẬN XÉT GIẢNG VIÊN PHẢN BIỆN
    # ------------------------------------------------------------------
    center_bold(doc, 'NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN', 14)
    add_para(doc, '-----o0o-----\n\n', alignment=WD_ALIGN_PARAGRAPH.CENTER, size_pt=13)
    for _ in range(12):
        add_para(doc, '.' * 110, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, size_pt=13)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('Thành phố Hồ Chí Minh, ngày… tháng … năm 2026\nGiảng viên phản biện\n\n\n\n\n')
    set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # LỜI CẢM ƠN
    # ------------------------------------------------------------------
    center_bold(doc, 'LỜI CẢM ƠN', 14)
    doc.add_paragraph()
    body(doc, 'Trước tiên, em xin gửi lời cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng toàn thể quý thầy cô Trường Đại học Bình Dương đã tạo điều kiện thuận lợi, trang bị kiến thức nền tảng vững chắc và môi trường học tập tích cực trong suốt bốn năm học vừa qua.')
    body(doc, 'Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến ThS. Dương Anh Tuấn – người đã trực tiếp hướng dẫn, chỉ bảo tận tình, giúp em định hướng nghiên cứu, giải quyết các vấn đề kỹ thuật và hoàn thiện đồ án này. Sự tận tâm và những góp ý quý báu của Thầy là nguồn động lực lớn nhất để em vượt qua những khó khăn trong quá trình thực hiện.')
    body(doc, 'Bên cạnh đó, em cũng xin cảm ơn gia đình và bạn bè đã luôn động viên, khích lệ và hỗ trợ em trong suốt thời gian học tập và thực hiện đồ án.')
    body(doc, 'Mặc dù đã nỗ lực hết sức, nhưng do kiến thức và kinh nghiệm còn hạn chế, đồ án không thể tránh khỏi những thiếu sót. Em rất mong nhận được sự góp ý chân thành từ quý thầy cô và hội đồng phản biện để đồ án được hoàn thiện hơn.')
    body(doc, 'Em xin chân thành cảm ơn!')
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('SINH VIÊN THỰC HIỆN\n\n\nLương Nguyễn Quốc Tuấn')
    set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # MỤC LỤC
    # ------------------------------------------------------------------
    center_bold(doc, 'MỤC LỤC', 14)
    toc = [
        ('LỜI CẢM ƠN', 'I'),
        ('MỤC LỤC', 'II'),
        ('MỤC LỤC CÁC HÌNH VẼ', 'III'),
        ('MỤC LỤC CÁC BẢNG BIỂU', 'IV'),
        ('MỤC LỤC KÍ TỰ VÀ CHỮ VIẾT TẮT', 'V'),
        ('TÓM TẮT', 'VI'),
        ('CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN', '1'),
        ('1.1. Lý do thực hiện đề tài', '1'),
        ('    1.1.1 Hiện trạng', '1'),
        ('    1.1.2 Lý do chọn đề tài', '2'),
        ('    1.1.3 Tính cần thiết của đề tài', '3'),
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
        ('2.1. Cơ sở lý thuyết', '9'),
        ('    2.1.1 Recommender System', '9'),
        ('    2.1.2 Collaborative Filtering', '10'),
        ('    2.1.3 Content-based Filtering', '11'),
        ('    2.1.4 Hybrid Recommendation', '12'),
        ('    2.1.5 Đánh giá hệ gợi ý (Temporal Evaluation)', '13'),
        ('    2.1.6 Retrieval-Augmented Generation (RAG)', '14'),
        ('    2.1.7 System Usability Scale (SUS)', '15'),
        ('2.2. Công nghệ sử dụng', '16'),
        ('CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ', '17'),
        ('3.1. Các yêu cầu chức năng [Use case view]', '17'),
        ('    3.1.1 Ngữ cảnh sử dụng', '17'),
        ('    3.1.2 Các use case', '19'),
        ('3.2. Các yêu cầu phi chức năng', '21'),
        ('3.3. Mô hình hệ thống [Logical view]', '22'),
        ('    3.3.1 Kiến trúc tổng thể', '22'),
        ('    3.3.2 Mô hình dữ liệu (ERD)', '24'),
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
    for item, pg in toc:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        pf = p.paragraph_format
        pf.space_after = Pt(1)
        dots = '.' * max(5, 80 - len(item) - len(pg))
        run = p.add_run(f'{item} {dots} {pg}')
        set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # MỤC LỤC HÌNH VẼ
    # ------------------------------------------------------------------
    center_bold(doc, 'MỤC LỤC CÁC HÌNH VẼ', 14)
    figs = [
        ('Hình 1-1: Quy trình nghiệp vụ tổng quan BookVerse AI', '3'),
        ('Hình 3-1: Sơ đồ ngữ cảnh hệ thống (Context Diagram)', '17'),
        ('Hình 3-2: Sơ đồ use case toàn hệ thống', '19'),
        ('Hình 3-3: Kiến trúc phân tầng tổng thể hệ thống BookVerse AI', '22'),
        ('Hình 3-4: Sơ đồ quan hệ thực thể cơ sở dữ liệu (ERD)', '24'),
        ('Hình 3-5: Sơ đồ tuần tự đăng nhập và phân quyền', '59'),
        ('Hình 3-6: Sơ đồ tuần tự Chatbot RAG', '60'),
        ('Hình 3-7: Giao diện trang chủ BookVerse AI', '65'),
        ('Hình 3-8: Giao diện catalog và tìm kiếm sách', '66'),
        ('Hình 3-9: Giao diện chi tiết sách và đọc thử', '67'),
        ('Hình 3-10: Giao diện đề xuất gợi ý sách (AI Discovery)', '68'),
        ('Hình 3-11: Giao diện đăng nhập và phân quyền', '69'),
        ('Hình 3-12: Giao diện quản lý gói hội viên', '70'),
        ('Hình 3-13: Giao diện trình đọc sách trực tuyến (Reader)', '71'),
        ('Hình 3-14: Giao diện thống kê đọc sách (Reading Insights)', '72'),
        ('Hình 3-15: Giao diện Trợ lý AI Nova (RAG Assistant)', '73'),
        ('Hình 3-16: Giao diện chợ sách cũ (Marketplace)', '74'),
        ('Hình 3-17: Giao diện Admin Center và Analytics', '75'),
        ('Hình 4-1: Biểu đồ so sánh metric Recommendation System theo phương pháp', '76'),
        ('Hình 4-2: Minh họa câu trả lời của Trợ lý AI có trích dẫn nguồn', '77'),
        ('Hình 4-3: Giao diện Admin Analytics – giám sát hệ thống', '78'),
    ]
    for fig, pg in figs:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_after = Pt(1)
        dots = '.' * max(5, 78 - len(fig) - len(pg))
        run = p.add_run(f'{fig} {dots} {pg}')
        set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # MỤC LỤC BẢNG BIỂU
    # ------------------------------------------------------------------
    center_bold(doc, 'MỤC LỤC CÁC BẢNG BIỂU', 14)
    tables_toc = [
        ('Bảng 1-1: Kết quả cần đạt', '7'),
        ('Bảng 2-1: Công nghệ sử dụng', '16'),
        ('Bảng 3-1: Danh sách actor', '17'),
        ('Bảng 3-2: Use Case cho Khách chưa đăng nhập', '17'),
        ('Bảng 3-3: Use Case cho Độc giả đã đăng nhập', '18'),
        ('Bảng 3-4: Use Case cho Người bán (Seller)', '18'),
        ('Bảng 3-5: Use Case cho Quản trị viên (Admin)', '18'),
        ('Bảng 3-6: Yêu cầu chức năng trọng tâm', '20'),
        ('Bảng 3-7: Yêu cầu phi chức năng', '21'),
        ('Bảng 3-8: Minh họa toán học Content-based Filtering', '29'),
        ('Bảng 3-9: Minh họa toán học Collaborative Filtering', '30'),
        ('Bảng 3-10: Ma trận phân quyền theo vai trò', '40'),
        ('Bảng 4-1: Kết quả metric đánh giá Recommendation System', '72'),
        ('Bảng 4-2: Kết quả thử nghiệm Trợ lý AI RAG', '74'),
        ('Bảng 4-3: Xử lý trường hợp ngoại lệ', '75'),
        ('Bảng 4-4: Kết quả kiểm thử E2E', '76'),
        ('Bảng 4-5: Kết quả hiệu năng smoke load test', '77'),
        ('Bảng 5-1: Kết quả đối chiếu với mục tiêu', '78'),
    ]
    for t, pg in tables_toc:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_after = Pt(1)
        dots = '.' * max(5, 78 - len(t) - len(pg))
        run = p.add_run(f'{t} {dots} {pg}')
        set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # MỤC LỤC KÍ TỰ
    # ------------------------------------------------------------------
    center_bold(doc, 'MỤC LỤC CÁC KÍ TỰ VÀ CHỮ VIẾT TẮT', 14)
    doc.add_paragraph()
    add_table(doc,
        ['Từ viết tắt', 'Giải thích đầy đủ'],
        [
            ['AI', 'Artificial Intelligence – Trí tuệ nhân tạo'],
            ['API', 'Application Programming Interface – Giao diện lập trình ứng dụng'],
            ['CF', 'Collaborative Filtering – Lọc cộng tác'],
            ['CB', 'Content-Based Filtering – Lọc dựa trên nội dung'],
            ['CTR', 'Click-Through Rate – Tỉ lệ nhấp chuột'],
            ['DB', 'Database – Cơ sở dữ liệu'],
            ['E2E', 'End-to-End – Kiểm thử đầu cuối'],
            ['ERD', 'Entity Relationship Diagram – Sơ đồ quan hệ thực thể'],
            ['JWT', 'JSON Web Token – Token xác thực JSON'],
            ['LLM', 'Large Language Model – Mô hình ngôn ngữ lớn'],
            ['NDCG', 'Normalized Discounted Cumulative Gain – Độ lợi tích lũy giảm dần chuẩn hóa'],
            ['MRR', 'Mean Reciprocal Rank – Thứ hạng nghịch đảo trung bình'],
            ['ORM', 'Object-Relational Mapping – Ánh xạ đối tượng quan hệ'],
            ['RAG', 'Retrieval-Augmented Generation – Sinh văn bản tăng cường truy xuất'],
            ['REST', 'Representational State Transfer – Kiến trúc dịch vụ web'],
            ['SSR', 'Server-Side Rendering – Kết xuất phía máy chủ'],
            ['SUS', 'System Usability Scale – Thang đo khả dụng hệ thống'],
            ['TF-IDF', 'Term Frequency-Inverse Document Frequency'],
            ['UAT', 'User Acceptance Testing – Kiểm thử chấp nhận người dùng'],
            ['UI/UX', 'User Interface / User Experience – Giao diện / Trải nghiệm người dùng'],
        ],
        header_color='4472C4'
    )
    page_break(doc)

    # ------------------------------------------------------------------
    # TÓM TẮT
    # ------------------------------------------------------------------
    center_bold(doc, 'TÓM TẮT', 14)
    doc.add_paragraph()
    body(doc, 'BookVerse AI là một nền tảng đọc và giao dịch sách tích hợp hệ gợi ý có giải thích và trợ lý RAG kiểm soát nguồn. Hệ thống giải quyết tình trạng trải nghiệm sách bị phân mảnh giữa tìm kiếm, mua bán, đọc trực tuyến, quản lý tiến độ và hỗ trợ người dùng. Kiến trúc gồm Next.js 15 App Router, PostgreSQL 16 với pgvector, Prisma ORM và Python FastAPI cho AI Microservice.')
    body(doc, 'Ngoài các luồng nghiệp vụ đầy đủ (catalog, marketplace, đặt hàng, hội viên, trình đọc Ebook, cộng đồng, quản trị), đồ án triển khai hệ gợi ý hybrid kết hợp tín hiệu nội dung, hành vi, mua hàng và độ phổ biến; kết quả được gắn evidence và kiểm soát provenance trước khi hiển thị. Trợ lý RAG truy xuất tri thức nghiệp vụ và dữ liệu tài khoản thuộc đúng người dùng, có local fallback minh bạch.')
    body(doc, 'Đánh giá hệ gợi ý sử dụng temporal split, candidate filtering, cohort cold/sparse/warm và các metric Precision, Recall, Hit Rate, NDCG, MRR, Coverage. Kết quả snapshot cho thấy Behavior có Hit Rate@10 cao nhất (0,021), trong khi Hybrid production chưa vượt baseline. Đồ án báo cáo trung thực kết quả và phân tích nguyên nhân. Hệ thống đạt 226 unit test TypeScript, 44 Python test và 46 E2E test đều PASS.')
    body(doc, 'Từ khóa: hệ gợi ý, RAG, sách điện tử, temporal evaluation, explainability, provenance, Next.js, FastAPI, PostgreSQL.')
    page_break(doc)

    # ------------------------------------------------------------------
    # CHƯƠNG 1
    # ------------------------------------------------------------------
    h_chapter(doc, 'CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN')

    h1(doc, '1.1. Lý do thực hiện đề tài :')
    h2(doc, '1.1.1 Hiện trạng')
    body(doc, 'Trong thời đại số hóa, việc lựa chọn và tìm kiếm sách phù hợp là một thách thức lớn đối với người đọc. Thị trường sách điện tử toàn cầu đang tăng trưởng mạnh mẽ, song trải nghiệm người dùng tại hầu hết các nền tảng vẫn còn phân mảnh và thiếu tính cá nhân hóa. Người dùng phải truy cập nhiều ứng dụng khác nhau để tìm kiếm sách, mua bán, đọc trực tuyến và nhận hỗ trợ tư vấn.')
    body(doc, 'Các thư viện truyền thống và nền tảng sách trực tuyến hiện nay tồn tại những hạn chế cốt lõi: gợi ý chủ yếu dựa trên số lượt xem tổng thể chứ không cá nhân hóa theo hành vi đọc; thiếu tích hợp giữa mua bán và đọc trực tuyến; thiếu AI hỗ trợ khám phá sách theo ngữ cảnh nghiệp vụ.')

    h2(doc, '1.1.2 Lý do chọn đề tài')
    body(doc, 'Thứ nhất, thiếu tính cá nhân hóa: các gợi ý chủ yếu dựa trên bestseller hoặc đánh giá trung bình, không phản ánh sở thích riêng của từng người dùng dựa trên hành vi đọc thực tế.')
    body(doc, 'Thứ hai, tương tác còn hạn chế: phần lớn các hệ thống chưa tích hợp trợ lý AI có khả năng tư vấn nghiệp vụ, giải đáp thắc mắc và đề xuất sách dựa trên ngữ cảnh cuộc trò chuyện.')
    body(doc, 'Thứ ba, tách biệt giữa mua sách và đọc sách: người dùng phải chuyển đổi nhiều ứng dụng, gây gián đoạn hành trình đọc sách và mất đi dữ liệu hành vi có thể cải thiện gợi ý.')

    h2(doc, '1.1.3 Tính cần thiết của đề tài')
    body(doc, 'Việc xây dựng một nền tảng sách thông minh tích hợp đầy đủ tạo ra vòng lặp dữ liệu hành vi cần thiết cho AI, trong khi giữ tính minh bạch về nguồn gốc dữ liệu. BookVerse AI đặt ra mục tiêu giải quyết vấn đề này bằng cách kết hợp công nghệ web hiện đại với AI microservice có kiểm soát provenance.')

    h2(doc, '1.1.4 Quy trình nghiệp vụ tổng quan')
    body(doc, 'Bước 1: Người dùng truy cập và đăng ký/đăng nhập. Hệ thống xác thực và phân quyền theo vai trò (Khách, Độc giả, Người bán, Kiểm duyệt, Quản trị).')
    body(doc, 'Bước 2: Tìm kiếm và khám phá sách qua catalog, bộ lọc, tìm kiếm ngôn ngữ tự nhiên hoặc gợi ý AI.')
    body(doc, 'Bước 3: Tương tác (đánh giá, yêu thích, bookmark, giỏ hàng). Tín hiệu được ghi theo taxonomy có version.')
    body(doc, 'Bước 4: Mua sách qua marketplace hoặc đăng ký hội viên. Thanh toán Sandbox an toàn.')
    body(doc, 'Bước 5: Đọc sách qua trình đọc trực tuyến. Tiến độ, bookmark và highlight lưu tự động.')
    body(doc, 'Bước 6: Trợ lý AI hỗ trợ câu hỏi nghiệp vụ, gợi ý sách và quản lý lịch sử cuộc trò chuyện.')

    # Hình quy trình nghiệp vụ
    add_image(doc, IMG('01_homepage.png'), 13, 'Hình 1-1: Quy trình nghiệp vụ tổng quan BookVerse AI')

    h1(doc, '1.2. Các hệ thống tương tự :')
    h2(doc, '1.2.1 Các nghiên cứu, hệ thống đã có')
    body(doc, 'Amazon Books là nền tảng bán sách lớn nhất thế giới với hệ gợi ý mạnh mẽ dựa trên collaborative filtering và behavior signals. Tuy nhiên, nền tảng này không tích hợp trình đọc trực tuyến cho sách vật lý và chatbot hỗ trợ nghiệp vụ nhà sách còn hạn chế.')
    body(doc, 'Goodreads là mạng xã hội đọc sách lớn nhất với cộng đồng đánh giá và gợi ý phong phú. Điểm yếu: không có trình đọc tích hợp, không có marketplace và hệ gợi ý chủ yếu dựa trên review thủ công.')
    body(doc, 'Kindle Unlimited cung cấp kho sách điện tử lớn với mô hình hội viên. Tuy nhiên hệ thống gợi ý ít minh bạch về evidence và không cho phép người bán tham gia marketplace.')
    body(doc, 'Fahasa.com là nền tảng bán sách lớn tại Việt Nam nhưng không có trình đọc trực tuyến, không có hệ gợi ý có giải thích và không tích hợp AI assistant.')

    h2(doc, '1.2.2 Vấn đề tồn tại và tính mới của đề tài')
    body(doc, 'Tính mới của BookVerse AI ở ba khía cạnh: (1) Tích hợp hoàn chỉnh catalog, marketplace, trình đọc, hội viên và cộng đồng trong một hệ thống duy nhất; (2) Hệ gợi ý hybrid có evidence rõ ràng, kiểm soát provenance và temporal split trung thực; (3) Trợ lý RAG với tri thức nghiệp vụ nội bộ, bảo vệ ownership và fallback minh bạch.')

    h1(doc, '1.3. Phát biểu bài toán :')
    h2(doc, '1.3.1 Mục tiêu')
    body(doc, 'Ba câu hỏi nghiên cứu: (1) Làm thế nào xây dựng nền tảng sách đủ nghiệp vụ để tạo ngữ cảnh cho AI? (2) Làm thế nào gợi ý sách có evidence, phân biệt dữ liệu thật với demo/synthetic? (3) Làm thế nào trợ lý trả lời nghiệp vụ và dữ liệu tài khoản mà hạn chế bịa đặt?')

    h2(doc, '1.3.2 Phạm vi')
    body(doc, 'Thanh toán chỉ là Sandbox, không kết nối tiền thật. Nội dung đọc gắn nhãn demo, không phải nguyên tác. Dữ liệu benchmark chủ yếu synthetic nên không dùng để tuyên bố hiệu quả production. UAT không được suy diễn trước khi thu phản hồi thật.')

    h2(doc, '1.3.3 Ràng buộc')
    body(doc, 'Hệ thống phải chạy được trên Docker Compose với một lệnh bootstrap duy nhất. Mọi pipeline ghi dữ liệu phải có confirmation. Script đánh giá AI chỉ được đọc database test, không ghi vào database demo.')

    h1(doc, '1.4. Kết quả cần đạt :')
    add_table(doc,
        ['STT', 'Kết quả cần đạt', 'Tiêu chí chấp nhận', 'Đạt'],
        [
            ['1', 'Nền tảng web đầy đủ luồng', 'Catalog, marketplace, order, membership, reader, community, admin', 'Có'],
            ['2', 'Hệ gợi ý Hybrid', 'Content + Behavior + Popularity + evidence + diversity', 'Có'],
            ['3', 'Trợ lý RAG', 'Intent class + ownership check + fallback + session', 'Có'],
            ['4', 'Đánh giá AI trung thực', 'Temporal split, cohort, nhiều metric, báo cáo thất bại', 'Có'],
            ['5', 'Kiểm thử tự động', '226 TS + 44 Python + 46 E2E test đều PASS', 'Có'],
            ['6', 'Bootstrap demo', 'Một lệnh tái lập môi trường demo hoàn chỉnh', 'Có'],
            ['7', 'Responsive UI', '375px–1440px, keyboard focus, WCAG 2 A/AA', 'Có'],
        ],
        'Bảng 1-1: Kết quả cần đạt'
    )
    page_break(doc)

    # ------------------------------------------------------------------
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
    # ------------------------------------------------------------------
    h_chapter(doc, 'CHƯƠNG 2: CƠ SỞ LÝ THUYẾT')

    h1(doc, '2.1. Cơ sở lý thuyết :')
    h2(doc, '2.1.1 Recommender System (Hệ gợi ý)')
    h3(doc, '2.1.1.1 Tổng quan về Recommender System')
    body(doc, 'Hệ gợi ý (Recommender System) là một lĩnh vực của hệ thống lọc thông tin, nhằm dự đoán "xếp hạng" hoặc "sở thích" mà người dùng sẽ dành cho một mục (item). GroupLens là một trong các hệ thống sớm minh họa gợi ý dựa trên đánh giá cộng đồng [1]. Trong BookVerse AI, hệ gợi ý đóng vai trò trung tâm giúp người dùng khám phá sách phù hợp từ kho catalog lớn.')

    h3(doc, '2.1.1.2 Collaborative Filtering (Lọc cộng tác)')
    body(doc, 'Collaborative Filtering (CF) khai thác sự tương đồng hành vi giữa người dùng hoặc item. Nguyên lý: người dùng A và B có hành vi tương tự → A sẽ thích những gì B thích. Không cần biết nội dung item, chỉ cần ma trận user-item tương tác.')
    body(doc, 'Trong BookVerse AI, CF được triển khai dựa trên co-occurrence của hành vi (reading, bookmark, purchase, favorite). Tín hiệu thu thập theo taxonomy có version để đảm bảo tính nhất quán khi đánh giá.')

    h3(doc, '2.1.1.3 Content-based Filtering (Lọc dựa trên nội dung)')
    body(doc, 'Content-based sử dụng thuộc tính item và hồ sơ sở thích. Mỗi sách được mô tả bởi vector đặc trưng gồm thể loại, tác giả, từ khóa, mô tả. Độ tương đồng Cosine: Sim(i, j) = (d_i · d_j) / (‖d_i‖ × ‖d_j‖). Ưu điểm: không cần dữ liệu người dùng khác và giải thích được lý do gợi ý.')
    add_table(doc,
        ['Sách', 'Thể loại', 'Tác giả', 'Giang hồ', 'Công nghệ', 'Sim với "Dune"'],
        [
            ['Dune', 'SciFi', 'Frank Herbert', '0.8', '0.2', '1.000'],
            ['Foundation', 'SciFi', 'Isaac Asimov', '0.7', '0.3', '0.947'],
            ['Harry Potter', 'Fantasy', 'J.K. Rowling', '0.9', '0.0', '0.782'],
            ['Clean Code', 'Tech', 'Robert Martin', '0.0', '1.0', '0.089'],
        ],
        'Bảng 3-8: Minh họa toán học Content-based Filtering'
    )

    h3(doc, '2.1.1.4 Hybrid Recommendation (Gợi ý lai)')
    body(doc, 'Hybrid kết hợp nhiều nguồn nhằm giảm hạn chế của từng phương pháp. BookVerse AI dùng tổng trọng số: Score_Hybrid(u,i) = w1×Category + w2×Author + w3×Purchase + w4×Popularity + w5×Behavior.')
    body(doc, 'Kết quả thực nghiệm cho thấy Hybrid production hiện chưa vượt baseline Behavior. Điều này không có nghĩa Hybrid tệ hơn về nguyên lý – trọng số hiện tại chưa được dữ liệu synthetic ủng hộ. Đồ án báo cáo trung thực kết quả này.')

    h2(doc, '2.1.2 Đánh giá hệ gợi ý theo thời gian (Temporal Evaluation)')
    body(doc, 'Precision@K: tỷ lệ item liên quan trong K kết quả. Recall@K: phần ground truth được thu hồi. Hit Rate@K: tỷ lệ user có ít nhất một hit. NDCG: ưu tiên hit ở vị trí cao. MRR: nghịch đảo vị trí hit đầu tiên. Coverage: phần catalog xuất hiện trong gợi ý [3].')
    body(doc, 'Temporal split được dùng thay random split để tránh leakage. Train trước ngày T1, validation từ T1 đến T2, final-test sau T2. Cohort cold, sparse và warm được báo riêng để không che lấp thất bại cold-start.')

    h2(doc, '2.1.3 Retrieval-Augmented Generation (RAG)')
    body(doc, 'RAG kết hợp mô hình sinh (generative model) với bộ nhớ ngoài được truy xuất [4]. BookVerse AI dùng RAG để truy xuất tri thức nghiệp vụ từ knowledge base nội bộ, metadata catalog và dữ liệu tài khoản đã kiểm tra ownership. Câu trả lời không có nguồn hợp lệ phải chuyển sang fallback hoặc từ chối claim.')

    h2(doc, '2.1.4 System Usability Scale (SUS)')
    body(doc, 'SUS gồm 10 câu thang 1–5, điểm tổng hợp 0–100 [5]. Câu lẻ trừ 1, câu chẵn lấy 5 trừ điểm, nhân tổng × 2,5. Điểm ≥ 70 "khá tốt", ≥ 85 "xuất sắc". SUS đo cảm nhận khả dụng, không đo hiệu quả recommendation hay chatbot. Kết quả UAT hiện NOT_AVAILABLE.')

    h1(doc, '2.2. Công nghệ sử dụng :')
    add_table(doc,
        ['Công nghệ', 'Phiên bản', 'Vai trò'],
        [
            ['Next.js', '15 App Router', 'Framework web fullstack, SSR/SSG, Server Actions, Route Handlers'],
            ['React', '19', 'Library UI, Client/Server Components'],
            ['TypeScript', 'Strict', 'Ngôn ngữ có kiểu tĩnh toàn bộ frontend'],
            ['Prisma', '6', 'ORM PostgreSQL, migration, schema'],
            ['PostgreSQL', '16 + pgvector', 'RDBMS chính, vector search embedding'],
            ['Auth.js', 'v5 (NextAuth)', 'Xác thực, Credentials Provider, JWT'],
            ['FastAPI', 'Python 3.11', 'AI Microservice cho recommendation engine'],
            ['Pandas + Scikit-learn', 'Python', 'Xử lý dữ liệu, thuật toán ML'],
            ['Tailwind CSS', '4', 'Utility-first CSS, responsive design'],
            ['Docker Compose', 'v2', 'Orchestration môi trường local và production'],
            ['Playwright', 'Latest', 'E2E testing desktop và mobile'],
            ['OpenAI / Gemini', 'Optional', 'LLM provider, có local fallback'],
        ],
        'Bảng 2-1: Công nghệ sử dụng'
    )
    page_break(doc)

    # ------------------------------------------------------------------
    # CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ
    # ------------------------------------------------------------------
    h_chapter(doc, 'CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ')

    h1(doc, '3.1. Các yêu cầu chức năng [Use case view]')
    h2(doc, '3.1.1. Ngữ cảnh sử dụng')
    h3(doc, '3.1.1.1. Danh sách actor')
    add_table(doc,
        ['STT', 'Actor', 'Mô tả'],
        [
            ['1', 'Khách (Guest)', 'Xem catalog, tìm kiếm và đọc thử tối đa 10%'],
            ['2', 'Độc giả (Reader)', 'Mua, đọc toàn bộ (khi có quyền), bookmark, highlight, dùng trợ lý'],
            ['3', 'Người bán (Seller)', 'Tạo listing sách cũ, xử lý đơn thuộc gian hàng'],
            ['4', 'Kiểm duyệt (Moderator)', 'Duyệt/từ chối listing và báo cáo cộng đồng'],
            ['5', 'Quản trị (Admin)', 'Toàn quyền quản lý hệ thống, phân quyền, analytics, audit'],
            ['6', 'AI Service (FastAPI)', 'Xếp hạng recommendation từ dữ liệu được phép'],
            ['7', 'LLM Provider (Tùy chọn)', 'OpenAI/Gemini sinh câu trả lời; có local grounded fallback'],
        ],
        'Bảng 3-1: Danh sách actor'
    )

    h3(doc, '3.1.1.2. Sơ đồ ngữ cảnh (Context Diagram):')
    body(doc, 'Sơ đồ ngữ cảnh mô tả các tác nhân bên ngoài và luồng thông tin vào/ra hệ thống BookVerse AI. Trình duyệt người dùng giao tiếp với Next.js Web Application. Web kết nối PostgreSQL, FastAPI AI Service, LLM Provider tùy chọn và email webhook.')
    add_image(doc, IMG('fig_01_context_diagram.png'), 15, 'Hình 3-1: Sơ đồ ngữ cảnh hệ thống (Context Diagram)')

    h2(doc, '3.1.2. Các use case')
    add_table(doc,
        ['Mã UC', 'Use Case', 'Mô tả'],
        [
            ['UC-01', 'Xem catalog sách', 'Xem danh sách, lọc thể loại, tìm kiếm'],
            ['UC-02', 'Đọc thử Ebook', 'Xem tối đa 10% nội dung không cần đăng nhập'],
            ['UC-03', 'Xem chính sách', '/help, /privacy, /terms, /refund-policy'],
        ],
        'Bảng 3-2: Use Case cho Khách chưa đăng nhập'
    )
    add_table(doc,
        ['Mã UC', 'Use Case', 'Mô tả'],
        [
            ['UC-04', 'Mua sách / Giỏ hàng', 'Thêm vào giỏ, chọn địa chỉ, thanh toán'],
            ['UC-05', 'Đăng ký hội viên', 'Chọn gói, thanh toán Sandbox, đọc toàn kho'],
            ['UC-06', 'Đọc Ebook toàn bộ', 'Khi có entitlement mua riêng hoặc subscription'],
            ['UC-07', 'Bookmark / Highlight', 'Lưu vị trí và đánh dấu đoạn văn theo blockId'],
            ['UC-08', 'Dùng Trợ lý AI', 'Hỏi chatbot, xem lịch sử session'],
            ['UC-09', 'Thống kê đọc sách', 'Insights, calendar heatmap, goals, challenges'],
            ['UC-10', 'Tham gia cộng đồng', 'Viết review, đăng bài diễn đàn, bình luận'],
            ['UC-11', 'Bán sách cũ', 'Đăng ký Seller, tạo listing, xử lý đơn'],
        ],
        'Bảng 3-3: Use Case cho Độc giả đã đăng nhập'
    )
    add_table(doc,
        ['Mã UC', 'Use Case', 'Mô tả'],
        [
            ['UC-12', 'Quản lý người dùng', 'Xem, khóa/mở tài khoản, đổi role'],
            ['UC-13', 'Quản lý sách và listing', 'Duyệt/từ chối, quản lý catalog'],
            ['UC-14', 'Quản lý hội viên', 'Tạo/sửa gói, xem subscription, hoàn tiền Sandbox'],
            ['UC-15', 'Analytics và audit', 'Xem doanh thu, tỉ lệ chatbot, audit log'],
            ['UC-16', 'Kiểm tra tích hợp', 'Test LLM, email, AI service từ /admin/integrations'],
        ],
        'Bảng 3-4: Use Case cho Quản trị viên (Admin)'
    )

    # Use case diagram
    add_image(doc, IMG('fig_02_usecase_diagram.png'), 15, 'Hình 3-2: Sơ đồ use case toàn hệ thống')

    h1(doc, '3.2. Các yêu cầu phi chức năng')
    add_table(doc,
        ['Mã', 'Yêu cầu', 'Tiêu chí'],
        [
            ['NFR-01', 'Bảo mật', 'Bcrypt hash; secret không lộ UI; rate limit; SQL injection prevention qua Prisma'],
            ['NFR-02', 'Nhất quán', 'Transaction + unique constraint cho payment/checkout; idempotency key'],
            ['NFR-03', 'Khả dụng', 'Responsive 375px–1440px; keyboard focus; WCAG 2 A/AA'],
            ['NFR-04', 'Hiệu năng', 'p95 < 3s cho mọi endpoint (smoke load test)'],
            ['NFR-05', 'Tái lập', 'Migration deterministic; seed idempotent; bootstrap một lệnh'],
            ['NFR-06', 'Minh bạch', 'Dữ liệu demo gắn nhãn; AI degraded hiển thị rõ'],
            ['NFR-07', 'An toàn dữ liệu', 'Không ghi đè dataset gốc; script ghi cần confirmation'],
        ],
        'Bảng 3-5: Yêu cầu phi chức năng'
    )

    h1(doc, '3.3. Mô hình hệ thống [Logical view]')
    h2(doc, '3.3.1 Kiến trúc tổng thể')
    body(doc, 'BookVerse AI theo kiến trúc web hiện đại với hai service độc lập: Next.js Web Application và FastAPI AI Microservice. Trình duyệt gọi Next.js App Router. Server Component, Route Handler và Server Action xử lý session, validation và nghiệp vụ. Prisma truy cập PostgreSQL. FastAPI xếp hạng gợi ý từ snapshot dữ liệu. Provider LLM là thành phần tùy chọn.')
    add_image(doc, IMG('fig_03_architecture.png'), 15, 'Hình 3-3: Kiến trúc phân tầng tổng thể hệ thống BookVerse AI')

    h2(doc, '3.3.2 Mô hình dữ liệu (ERD)')
    body(doc, 'Schema tách đầu sách (Book), phiên bản (BookEdition), tài sản số (DigitalAsset) và quyền đọc (ReadingEntitlement). Order lưu snapshot giá và edition. Recommendation có request, item, evidence và telemetry. Chatbot có session/message/feedback. Reading có progress, session, bookmark và highlight.')
    body(doc, 'Các entity và mối quan hệ chính:')
    body(doc, '• USER – ORDER: Người dùng tạo nhiều đơn. Order lưu snapshot địa chỉ và thanh toán.')
    body(doc, '• USER – SUBSCRIPTION – MEMBERSHIP_PLAN: Đăng ký gói hội viên. MembershipPayment theo dõi giao dịch Sandbox.')
    body(doc, '• BOOK – BOOK_EDITION – DIGITAL_ASSET: Đầu sách có nhiều phiên bản (PAPER_NEW, PAPER_USED, EBOOK). Ebook liên kết DigitalAsset chứa đường dẫn file và samplePages.')
    body(doc, '• USER – READING_ENTITLEMENT – BOOK: Quyền đọc toàn bộ theo cặp user-book, cấp sau mua Ebook hoặc subscription ACTIVE.')
    body(doc, '• CHATBOT_SESSION – MESSAGE – FEEDBACK: Lịch sử trò chuyện với feedback hữu ích/không hữu ích.')
    add_image(doc, IMG('fig_04_erd.png'), 15, 'Hình 3-4: Sơ đồ quan hệ thực thể cơ sở dữ liệu (ERD)')

    h2(doc, '3.3.3 Cơ sở toán học :')
    h3(doc, '3.3.3.1 Content-based Filtering')
    body(doc, 'Mỗi sách i được mô tả bởi vector đặc trưng d_i = (w_i1, w_i2, ..., w_in). Trọng số TF-IDF phản ánh tầm quan trọng thuộc tính trong kho catalog.')
    body_ni(doc, 'Cosine Similarity: Sim(i, j) = (d_i · d_j) / (‖d_i‖ × ‖d_j‖)')

    h3(doc, '3.3.3.2 Collaborative Filtering')
    body(doc, 'Pearson Correlation Coefficient giữa user u và v:')
    body_ni(doc, 'Sim(u,v) = Σ[(R_ui − R̄_u)(R_vi − R̄_v)] / √[Σ(R_ui − R̄_u)² × Σ(R_vi − R̄_v)²]')
    body(doc, 'Dự đoán điểm user u cho sách i:')
    body_ni(doc, 'P(u,i) = R̄_u + Σ[Sim(u,v) × (R_vi − R̄_v)] / Σ|Sim(u,v)|')
    add_table(doc,
        ['', 'Harry Potter', 'Dune', 'Foundation', 'Clean Code'],
        [
            ['User A', '5', '4', '?', '1'],
            ['User B', '4', '5', '4', '2'],
            ['User C', '2', '1', '?', '5'],
            ['Dự đoán A', '-', '-', '3.8', '-'],
        ],
        'Bảng 3-6: Minh họa toán học Collaborative Filtering'
    )

    h3(doc, '3.3.3.3 Hybrid Recommendation')
    body(doc, 'Tổng trọng số:')
    body_ni(doc, 'Score_Hybrid(u,i) = w1×Category(u,i) + w2×Author(u,i) + w3×Purchase(u,i) + w4×Popularity(i) + w5×Behavior(u,i)')
    body(doc, 'Sau khi xếp hạng, áp dụng diversity policy: tối đa 2 sách cùng thể loại, 1 sách cùng tác giả trong top kết quả. Evidence được gắn kèm để giải thích lý do gợi ý.')

    h2(doc, '3.3.4 Thuật toán - giải thuật áp dụng:')
    body(doc, 'FastAPI Recommendation Service triển khai bốn phương pháp:')
    body(doc, '(1) Popularity: Xếp hạng theo điểm phổ biến tổng hợp từ view_count, purchase_count, rating và interaction_count. Baseline và cold-start fallback.')
    body(doc, '(2) Content-based: Xây preference vector từ category/author. Tính cosine similarity với catalog. Lọc sách đã xem. Trả evidence kèm match.')
    body(doc, '(3) Behavior: Co-occurrence hành vi (reading, purchase, bookmark, favorite). Score theo frequency và recency.')
    body(doc, '(4) Hybrid: Tổng hợp điểm từ bốn nguồn, loại đã xem, diversity policy, gắn evidence tổng hợp.')

    h1(doc, '3.4. Mô hình xử lý / tương tác')
    h2(doc, '3.4.1. Sơ đồ tuần tự (Sequence Diagram)')
    body(doc, 'Sequence đăng nhập: User nhập email/password → Auth.js tìm user → bcrypt.compare → Hợp lệ: JWT id+role → Middleware kiểm tra → Server Action tái-verify role từ DB.')
    add_image(doc, IMG('fig_06_seq_auth.png'), 15, 'Hình 3-5: Sơ đồ tuần tự đăng nhập và phân quyền')

    body(doc, 'Sequence Chatbot RAG: Gửi câu hỏi → Xác minh session + phân loại intent → Lấy dữ liệu tài khoản đúng owner → Truy xuất knowledge → Provider sẵn: LLM → Lỗi: local grounded fallback → Lưu session → Trả answer + source + validatedBooks.')
    add_image(doc, IMG('fig_08_seq_rag.png'), 15, 'Hình 3-6: Sơ đồ tuần tự Chatbot RAG')

    h1(doc, '3.5. Thiết kế nguyên mẫu giao diện người dùng')
    body(doc, 'BookVerse AI thiết kế responsive hỗ trợ desktop (1280px+) và mobile (375px+). Giao diện tối ưu hóa cho trải nghiệm đọc và giao dịch sách trực tuyến:')

    add_image(doc, IMG('01_homepage.png'), 14, 'Hình 3-7: Giao diện trang chủ BookVerse AI')
    add_image(doc, IMG('02_catalog.png'), 14, 'Hình 3-8: Giao diện catalog và tìm kiếm sách')
    add_image(doc, IMG('08_book_detail.png'), 14, 'Hình 3-9: Giao diện chi tiết sách và đọc thử')
    add_image(doc, IMG('06_recommendations.png'), 14, 'Hình 3-10: Giao diện đề xuất gợi ý sách (AI Discovery)')
    add_image(doc, IMG('04_login.png'), 14, 'Hình 3-11: Giao diện đăng nhập và phân quyền')
    add_image(doc, IMG('09_membership.png'), 14, 'Hình 3-12: Giao diện quản lý gói hội viên')
    add_image(doc, IMG('10_reader.png'), 14, 'Hình 3-13: Giao diện trình đọc sách trực tuyến (Reader)')
    add_image(doc, IMG('12b_reading_insights.png'), 14, 'Hình 3-14: Giao diện thống kê đọc sách (Reading Insights)')
    add_image(doc, IMG('11_assistant.png'), 14, 'Hình 3-15: Giao diện Trợ lý AI Nova (RAG Assistant)')
    add_image(doc, IMG('05_marketplace.png'), 14, 'Hình 3-16: Giao diện chợ sách cũ (Marketplace)')
    add_image(doc, IMG('13_admin.png'), 14, 'Hình 3-17: Giao diện Admin Center và Analytics')

    body(doc, 'Ma trận phân quyền theo vai trò:')
    add_table(doc,
        ['Chức năng', 'Khách', 'Độc giả', 'Seller', 'Moderator', 'Admin'],
        [
            ['Xem catalog/hội viên', 'Có', 'Có', 'Có', 'Có', 'Có'],
            ['Đọc thử (10%)', 'Không', 'Có', 'Có', 'Có', 'Có'],
            ['Đọc toàn bộ Ebook', 'Không', 'Khi có quyền', 'Khi có quyền', 'Khi có quyền', 'Có'],
            ['Xem dữ liệu cá nhân', 'Không', 'Chính mình', 'Chính mình', 'Chính mình', 'Chính mình'],
            ['Quản lý tin bán', 'Không', 'Không', 'Tin của mình', 'Kiểm duyệt', 'Toàn quyền'],
            ['Dùng Trợ lý AI', 'Giới hạn', 'Có', 'Có', 'Có', 'Có'],
            ['Admin Center', 'Không', 'Không', 'Không', 'Có giới hạn', 'Có'],
            ['Đổi role / Khóa user', 'Không', 'Không', 'Không', 'Không', 'Có'],
            ['Hoàn payment Sandbox', 'Không', 'Không', 'Không', 'Không', 'Có'],
        ],
        'Bảng 3-10: Ma trận phân quyền theo vai trò'
    )
    page_break(doc)

    # ------------------------------------------------------------------
    # CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM
    # ------------------------------------------------------------------
    h_chapter(doc, 'CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM')

    h1(doc, '4.1 Các kịch bản thử nghiệm')
    body(doc, 'Kịch bản 1: Gợi ý Content-based – Đánh giá khả năng gợi ý sách cùng thể loại và tác giả dựa trên lịch sử đọc.')
    body(doc, 'Kịch bản 2: Gợi ý Collaborative – Khai thác co-occurrence hành vi giữa người dùng có sở thích tương đồng.')
    body(doc, 'Kịch bản 3: Gợi ý Hybrid – Kết hợp đa nguồn với diversity policy, đánh giá toàn diện theo temporal split.')
    body(doc, 'Kịch bản 4: Trợ lý RAG – Đánh giá phân loại intent, retrieval tri thức và sinh câu trả lời có nguồn hợp lệ.')
    body(doc, 'Kịch bản 5: Kiểm thử E2E – Playwright trên Chrome desktop 1280×720 và Pixel 5 375×812.')
    body(doc, 'Kịch bản 6: Smoke load test – 30 request/endpoint, concurrency 5, gate p95 < 3s và error < 2%.')

    h1(doc, '4.2. Kết quả thử nghiệm các kịch bản')
    h2(doc, '4.2.1. Recommendation System')
    body(doc, 'Train trước 01/06/2026, test từ 01/06/2026. Ground truth: purchase hợp lệ, reading đủ ngưỡng, bookmark, favorite, review ≥ 4 sao. Loại cancelled/refunded. 952 user đủ điều kiện, 2.000 candidate, K=5 và K=10.')
    add_table(doc,
        ['Phương pháp', 'Precision@10', 'Recall@10', 'Hit Rate@10', 'NDCG@10', 'MRR@10', 'Coverage@10'],
        [
            ['Popularity', '0,001366', '0,006197', '0,013655', '0,003516', '0,004230', '0,0065'],
            ['Content', '0,002416', '0,010812', '0,019958', '0,006419', '0,006625', '0,2065'],
            ['Behavior', '0,002521', '0,010530', '0,021008', '0,005374', '0,005089', '0,9665'],
            ['Hybrid production', '0,000840', '0,002451', '0,008403', '0,001496', '0,002188', '0,1995'],
            ['Random seeded', '0,001050', '0,005252', '0,010504', '0,002367', '0,002683', '0,9900'],
        ],
        'Bảng 4-1: Kết quả metric đánh giá Recommendation System (snapshot 14/07/2026)'
    )
    body(doc, 'Phân tích: Behavior có Hit Rate@10 và Coverage cao nhất, Content có Recall/NDCG/MRR cao nhất. Hybrid production thua baseline Popularity – trọng số hiện tại chưa được synthetic data ủng hộ. Rolling temporal backtest xác nhận NO_PROMOTION. Kết quả không được dùng quảng cáo AI vượt trội.')
    add_image(doc, IMG('fig_10_evaluation_chart.png'), 15, 'Hình 4-1: Biểu đồ so sánh metric Recommendation System theo phương pháp')

    h2(doc, '4.2.2. Trợ lý AI RAG')
    body(doc, 'Kiểm thử với 9 nhóm ý định nghiệp vụ: hội viên, đọc sách, đơn hàng, chợ sách, tài khoản, AI, chính sách, catalog và tìm sách.')
    add_table(doc,
        ['Nhóm ý định', 'Test', 'Phân loại đúng', 'Trả lời có nguồn', 'Từ chối khi không có'],
        [
            ['Hội viên', '15', '15/15 (100%)', '14/15 (93%)', '1/1 (100%)'],
            ['Đọc sách', '12', '12/12 (100%)', '11/12 (92%)', '1/1 (100%)'],
            ['Đơn hàng', '10', '10/10 (100%)', '9/10 (90%)', '1/1 (100%)'],
            ['Tìm sách', '20', '19/20 (95%)', '18/20 (90%)', '2/2 (100%)'],
            ['Chính sách', '8', '8/8 (100%)', '8/8 (100%)', 'N/A'],
            ['Tổng', '65', '64/65 (98%)', '60/65 (92%)', '5/5 (100%)'],
        ],
        'Bảng 4-2: Kết quả thử nghiệm Trợ lý AI RAG'
    )
    add_image(doc, IMG('11_assistant.png'), 14, 'Hình 4-2: Minh họa câu trả lời của Trợ lý AI có trích dẫn nguồn')

    h1(doc, '4.3. Xử lý các trường hợp ngoại lệ')
    add_table(doc,
        ['Trường hợp ngoại lệ', 'Hành vi hệ thống', 'Kết quả'],
        [
            ['LLM provider timeout', 'Local grounded fallback, degraded=true', 'PASS < 2s'],
            ['pgvector không có embedding', 'Fallback keyword search, source=keyword', 'PASS đúng kết quả'],
            ['AI FastAPI không phản hồi', 'Popularity fallback, evidence=fallback', 'PASS không crash'],
            ['Double-submit checkout', 'Idempotency key chặn, trả order cũ', 'PASS không trùng đơn'],
            ['Stock về 0 khi checkout', 'Conditional update, trả lỗi hết hàng', 'PASS không oversell'],
            ['User bị khóa giữa session', 'Request kế tiếp chặn, redirect login', 'PASS phát hiện ngay'],
            ['Payment callback duplicate', 'transactionRef unique, bỏ qua trùng', 'PASS không double-credit'],
        ],
        'Bảng 4-3: Bảng xử lý các trường hợp ngoại lệ'
    )

    h1(doc, '4.4. Kiểm thử E2E và hiệu năng')
    add_table(doc,
        ['Bộ test', 'Số test', 'Desktop', 'Mobile', 'Kết quả'],
        [
            ['Smoke E2E', '14', '7', '7', '14/14 PASS'],
            ['Telemetry E2E', '14', '7', '7', '14/14 PASS'],
            ['Accessibility (Axe WCAG 2)', '18', '9', '9', '18/18 PASS'],
            ['Tổng cộng', '46', '23', '23', '46/46 PASS'],
        ],
        'Bảng 4-4: Kết quả kiểm thử E2E'
    )
    add_table(doc,
        ['Endpoint', 'Request', 'p50 (ms)', 'p95 (ms)', 'Lỗi', 'Gate'],
        [
            ['/ (Trang chủ)', '30', '125', '344', '0%', 'PASS (< 3s)'],
            ['/catalog', '30', '45', '95', '0%', 'PASS (< 3s)'],
            ['/api/marketplace', '30', '12', '31', '0%', 'PASS (< 3s)'],
            ['Tổng', '90', '-', '-', '0%', 'PASS (error < 2%)'],
        ],
        'Bảng 4-5: Kết quả hiệu năng smoke load test'
    )
    add_image(doc, IMG('13_admin.png'), 14, 'Hình 4-3: Giao diện Admin Analytics – giám sát hệ thống')
    page_break(doc)

    # ------------------------------------------------------------------
    # CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN
    # ------------------------------------------------------------------
    h_chapter(doc, 'CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN')

    h1(doc, '5.1. Kết quả đối chiếu với mục tiêu :')
    add_table(doc,
        ['STT', 'Mục tiêu', 'Kết quả đạt được', 'Đánh giá'],
        [
            ['1', 'Nền tảng web đầy đủ', 'Catalog, marketplace, order, membership, reader, community, admin', 'Đạt'],
            ['2', 'Hệ gợi ý hybrid', 'Triển khai 4 phương pháp, evidence, diversity, temporal evaluation', 'Đạt (metric thấp, báo trung thực)'],
            ['3', 'Trợ lý RAG', 'Intent classifier, retrieval, ownership, fallback, session', 'Đạt'],
            ['4', 'Đánh giá AI', 'Temporal split, cohort, ablation, rolling backtest, NO_PROMOTION gate', 'Đạt'],
            ['5', 'Kiểm thử tự động', '226 unit TS + 44 Python + 46 E2E = 316 test PASS', 'Đạt'],
            ['6', 'Bootstrap demo', 'npm run demo:bootstrap, idempotent', 'Đạt'],
            ['7', 'Responsive UI', 'Desktop và mobile, WCAG 2 A/AA, 18 accessibility test PASS', 'Đạt'],
            ['8', 'UAT/SUS thật', 'Kế hoạch sẵn, kết quả NOT_AVAILABLE', 'Chưa đạt'],
            ['9', 'CTR production', 'Taxonomy sẵn, NOT_AVAILABLE do chưa có data thật', 'Chưa đạt'],
        ],
        'Bảng 5-1: Kết quả đối chiếu với mục tiêu'
    )

    h1(doc, '5.2. Các hạn chế của đồ án')
    h2(doc, '5.2.1 Chất lượng dữ liệu benchmark:')
    body(doc, 'Tất cả 18.002 interaction event hiện tại là synthetic. Không có user production thật, không có CTR thật. Dữ liệu synthetic có thể tạo pattern nhân tạo làm metric không phản ánh hiệu quả production. Đây là lý do đồ án không tuyên bố AI vượt trội.')

    h2(doc, '5.2.2 Hybrid production chưa vượt baseline:')
    body(doc, 'Hybrid production có metric thấp hơn cả Behavior và Content đơn lẻ. Công thức hiện tại thiếu item-item co-occurrence behavior. Rolling backtest xác nhận NO_PROMOTION và REJECT_CANDIDATE. Giữ cấu hình hiện tại không có nghĩa Hybrid tốt hơn Behavior.')

    h2(doc, '5.2.3 UAT/SUS chưa có dữ liệu thật:')
    body(doc, 'Kế hoạch UAT đầy đủ (6 task, 10 câu SUS, script analyze_uat.py), nhưng chưa thu được phản hồi người dùng thật. Kết quả NOT_AVAILABLE. Cần tổ chức UAT thăm dò 10–20 người trước khi tuyên bố khả dụng.')

    h2(doc, '5.2.4 Nội dung Ebook là dữ liệu demo:')
    body(doc, 'Toàn bộ nội dung đọc sinh deterministic từ metadata và luôn gắn nhãn NỘI_DUNG_DEMO_BOOKVERSE. Không phải bản dịch hay nguyên tác. Production cần ingest nội dung có bản quyền rõ ràng.')

    h1(doc, '5.3. Hướng phát triển :')
    h2(doc, '5.3.1 Cải tiến mô hình gợi ý:')
    body(doc, 'Thu interaction thật có đồng thuận từ pilot user (provenance PILOT_CONSENTED). Thử đưa behavior item-item co-occurrence vào Hybrid. Khi > 500 user thật, thử Neural Collaborative Filtering hoặc matrix factorization. Đánh giá online có impression/click thật.')

    h2(doc, '5.3.2 Hoàn thành UAT:')
    body(doc, 'Tổ chức UAT thăm dò với 10–20 người theo protocol đã thiết kế. Thu phản hồi SUS. Triển khai impression/click tracking thật để có CTR production đáng tin cậy.')

    h2(doc, '5.3.3 Phát triển Trợ lý AI:')
    body(doc, 'Tích hợp pgvector embedding cho toàn bộ knowledge base. Mở rộng intent classifier. Multi-turn conversation với context window đầy đủ. Fine-tuning nhỏ trên dữ liệu nghiệp vụ khi có đủ feedback.')

    h2(doc, '5.3.4 Tối ưu trải nghiệm:')
    body(doc, 'Cải thiện Reader Ebook: bookmark sync cross-device, text-to-speech, annotation sharing. Service Worker offline. Notification push. Mở rộng catalog thật với cover rights xác minh.')

    page_break(doc)

    # ------------------------------------------------------------------
    # KẾT LUẬN
    # ------------------------------------------------------------------
    center_bold(doc, 'KẾT LUẬN', 14)
    doc.add_paragraph()
    body(doc, 'Đồ án BookVerse AI đã xây dựng thành công một nền tảng sách điện tử tích hợp đầy đủ với catalog, marketplace, trình đọc, hội viên, cộng đồng và quản trị trong một hệ thống duy nhất. Nền tảng tạo vòng lặp dữ liệu hành vi cần thiết cho AI, giữ tính minh bạch về nguồn gốc dữ liệu và phạm vi demo.')
    body(doc, 'Hệ gợi ý hybrid kết hợp content, behavior, purchase và popularity signals, với evidence và diversity policy. Kết quả thực nghiệm trung thực: Hybrid production chưa vượt baseline – công bố kết quả âm giúp định hướng phát triển đúng hơn giả mạo metric. Pipeline có temporal split, ablation, rolling backtest và cổng NO_PROMOTION.')
    body(doc, 'Trợ lý RAG: intent classification deterministic, retrieval nội bộ, ownership check dữ liệu cá nhân và local fallback minh bạch. Không tự tạo thông tin giả về catalog, giá, đơn hàng hay quyền hội viên.')
    body(doc, 'Về kiểm thử: 226 unit test TypeScript + 44 Python test + 46 E2E test (18 accessibility WCAG 2 A/AA) đều PASS. Smoke load test p95 < 3s, 0% lỗi. Bootstrap demo tái lập bằng một lệnh.')
    body(doc, 'Hướng phát triển: thu interaction thật có đồng thuận, hoàn thành UAT, đưa behavior item-item vào Hybrid, matrix factorization khi đủ dữ liệu, tối ưu trải nghiệm đọc đa thiết bị. Đồ án đặt nền móng kỹ thuật vững chắc và quy trình đánh giá trung thực cho phát triển tiếp theo.')
    page_break(doc)

    # ------------------------------------------------------------------
    # TÀI LIỆU THAM KHẢO
    # ------------------------------------------------------------------
    center_bold(doc, 'TÀI LIỆU THAM KHẢO', 14)
    doc.add_paragraph()
    refs = [
        '[1] P. Resnick, N. Iacovou, M. Suchak, P. Bergstrom, J. Riedl, "GroupLens: An Open Architecture for Collaborative Filtering of Netnews," CSCW, 1994, pp. 175–186. https://doi.org/10.1145/192844.192905',
        '[2] Y. Koren, R. Bell, C. Volinsky, "Matrix Factorization Techniques for Recommender Systems," Computer, vol. 42, no. 8, pp. 30–37, 2009. https://doi.org/10.1109/MC.2009.263',
        '[3] Y.-M. Tamm, R. Damdinov, A. Vasilev, "Quality Metrics in Recommender Systems: Do We Calculate Metrics Consistently?", 2022. https://arxiv.org/abs/2206.12858',
        '[4] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS, 2020. https://arxiv.org/abs/2005.11401',
        '[5] J. Brooke, "SUS: A Quick and Dirty Usability Scale," in Usability Evaluation in Industry, Taylor & Francis, 1996, pp. 189–194.',
        '[6] F. M. Harper, J. A. Konstan, "The MovieLens Datasets: History and Context," ACM TiiS, vol. 5, no. 4, 2015. https://doi.org/10.1145/2827872',
        '[7] X. He, L. Liao, H. Zhang, L. Nie, X. Hu, T.-S. Chua, "Neural Collaborative Filtering," WWW 2017. https://doi.org/10.1145/3038912.3052569',
        '[8] Next.js Documentation, Vercel, 2024. https://nextjs.org/docs',
        '[9] Prisma ORM Documentation, 2024. https://www.prisma.io/docs',
        '[10] FastAPI Documentation, Sebastián Ramírez, 2024. https://fastapi.tiangolo.com',
        '[11] pgvector – Open-source vector similarity search for Postgres. https://github.com/pgvector/pgvector',
        '[12] Auth.js (NextAuth.js) Documentation. https://authjs.dev',
        '[13] Docker Documentation, 2024. https://docs.docker.com',
        '[14] Playwright Testing Documentation, Microsoft, 2024. https://playwright.dev',
        '[15] Tailwind CSS Documentation. https://tailwindcss.com/docs',
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pf = p.paragraph_format
        pf.space_after = Pt(4)
        pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        pf.line_spacing = 1.3
        run = p.add_run(ref)
        set_run_font(run, size_pt=13)
    page_break(doc)

    # ------------------------------------------------------------------
    # PHỤ LỤC
    # ------------------------------------------------------------------
    center_bold(doc, 'PHỤ LỤC', 14)
    doc.add_paragraph()
    h1(doc, 'A. Hướng dẫn cài đặt và chạy hệ thống')
    body(doc, 'Yêu cầu: Docker Desktop đang chạy, Node.js 20+, Python 3.11+, PowerShell 7.')
    body(doc, 'Bootstrap demo một lệnh (khuyến nghị):')
    p = doc.add_paragraph()
    run = p.add_run('npm run demo:bootstrap\nnpm run demo:start\n# Mở http://127.0.0.1:3000')
    set_run_font(run, size_pt=11, font_name='Courier New')

    h1(doc, 'B. Tài khoản demo sau khi seed')
    add_table(doc,
        ['Vai trò', 'Email', 'Mật khẩu'],
        [
            ['Độc giả', 'reader.bookverse.demo@gmail.com', '123456'],
            ['Người bán', 'seller.bookverse.demo@gmail.com', '123456'],
            ['Quản trị viên', 'admin.bookverse.demo@gmail.com', '123456'],
            ['Kiểm duyệt', 'moderator.bookverse.demo@gmail.com', '123456'],
        ]
    )

    h1(doc, 'C. Kịch bản demo đề xuất (8–10 phút)')
    for step in [
        '1. Trang chủ → giới thiệu catalog và AI Discovery hero.',
        '2. Đăng nhập Độc giả → /read → đọc thử (10%).',
        '3. /membership → chọn gói → Sandbox thành công → đọc toàn bộ.',
        '4. Tạo bookmark và highlight → /library kiểm tra.',
        '5. /reading/insights, /reading/calendar và /reading/goals.',
        '6. /assistant → hỏi chatbot về sách và hội viên.',
        '7. Đăng nhập Admin → /admin/analytics, /admin/subscriptions.',
        '8. /discover → nhận gợi ý AI có evidence.',
    ]:
        body(doc, step)


# =====================================================================
# MAIN
# =====================================================================

def main():
    print("Loading template file...")
    doc = Document(TEMPLATE_PATH)

    body_el = doc.element.body
    children = list(body_el)

    # Paragraph 17 (child index 17) contains embedded sectPr = section break
    # between page 2 and page 3. We keep children[0..17] (inclusive).
    # Children 18..N-1 will be removed.
    KEEP_UNTIL = 18  # keep children[0] through children[17]

    print(f"Total body children: {len(children)}")
    print(f"Keeping first {KEEP_UNTIL} children (pages 1 and 2)")

    # Remove all children after index 17 (except the final sectPr at end of body)
    # We need to keep the final sectPr (body's section properties)
    final_sectPr = None
    if children[-1].tag.endswith('}sectPr'):
        final_sectPr = children[-1]

    # Remove children from index KEEP_UNTIL to len-1 (if final_sectPr exists, we handle it)
    to_remove = children[KEEP_UNTIL:]
    for child in to_remove:
        if child != final_sectPr:
            body_el.remove(child)

    print(f"After cleanup: {len(list(body_el))} children")

    # Now add content starting from page 3
    print("Building thesis content...")
    build_content(doc)

    # Save
    print(f"Saving to {OUTPUT_PATH}...")
    doc.save(OUTPUT_PATH)
    print(f"SUCCESS: {OUTPUT_PATH}")
    print(f"Total paragraphs: {len(doc.paragraphs)}")


if __name__ == '__main__':
    main()
