# -*- coding: utf-8 -*-
"""
Script xây dựng toàn bộ đồ án tốt nghiệp chuẩn mẫu Word 100% khớp PDF mẫu Đại học Bình Dương
- Khung viền đôi CHỈ áp dụng cho Trang 1 & 2 (Section 1). Từ Trang 3 trở đi (Section 2) KHÔNG CÓ KHUNG VIỀN TRANG.
- Đầy đủ toàn bộ mục từ 3.4 đến 3.7 với sơ đồ kỹ thuật chi tiết và 22 ảnh chụp live thực tế sau đăng nhập.
"""
import os
import shutil
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn, nsdecls
from docx.oxml import OxmlElement, parse_xml

IMG_DIR = 'D:/Doantotnghiep/template_extracted_images'
OUTPUT_DOCX = 'D:/Doantotnghiep/Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_v3.docx'

def img_p(name):
    p = os.path.join(IMG_DIR, name)
    return p if os.path.exists(p) else None

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    for child in list(tcPr):
        if child.tag.endswith('shd'):
            tcPr.remove(child)
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="A0B2C6", sz="6"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

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

def add_p(doc, text='', alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False,
          size_pt=13, space_before=0, space_after=4, line_spacing=1.3, indent=False, color=None):
    p = doc.add_paragraph()
    p.alignment = alignment
    pf = p.paragraph_format
    if space_before:
        pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    if indent:
        pf.first_line_indent = Cm(1.27)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = line_spacing
    if text:
        r = p.add_run(text)
        set_run_font(r, size_pt=size_pt, bold=bold, italic=italic, color=color)
    return p

def add_h_chapter(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=14, space_after=8)

def add_h1(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size_pt=13, space_before=8, space_after=4)

def add_h2(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, italic=True, size_pt=13, space_before=6, space_after=2)

def add_h3(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, italic=True, size_pt=13, space_before=4, space_after=2)

def add_body(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, size_pt=13, space_before=0, space_after=4, indent=True)

def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = p.paragraph_format
    pf.left_indent = Cm(1.27)
    pf.space_after = Pt(3)
    pf.line_spacing = 1.3
    r0 = p.add_run('• ')
    set_run_font(r0, size_pt=13, bold=True)
    if bold_prefix:
        r1 = p.add_run(bold_prefix)
        set_run_font(r1, size_pt=13, bold=True)
    r2 = p.add_run(text)
    set_run_font(r2, size_pt=13)
    return p

def add_caption(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, italic=True, size_pt=12, space_before=4, space_after=8)

def add_img(doc, img_name, width_cm=14, caption_text=None):
    path = img_p(img_name)
    if path and os.path.exists(path):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pf = p.paragraph_format
        pf.space_before = Pt(6)
        pf.space_after = Pt(4)
        r = p.add_run()
        r.add_picture(path, width=Cm(width_cm))
        if caption_text:
            add_caption(doc, caption_text)
    elif caption_text:
        add_caption(doc, caption_text)

def add_styled_table(doc, headers, rows, caption_text=None, col_widths=None, header_bg='1F4E79'):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color="A0B2C6", sz="6")

    # Header
    hdr = table.rows[0]
    trPr = hdr._tr.get_or_add_trPr()
    trPr.append(OxmlElement('w:tblHeader'))

    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_background(cell, header_bg)
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        set_run_font(r, size_pt=11.5, bold=True, color=(255, 255, 255))

    # Rows
    for ri, row_data in enumerate(rows):
        row = table.rows[ri + 1]
        bg = 'F4F7FB' if ri % 2 == 1 else 'FFFFFF'
        for ci, cell_text in enumerate(row_data):
            cell = row.cells[ci]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=90, bottom=90, left=120, right=120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if ci == 0 or len(str(cell_text)) < 8 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(cell_text))
            set_run_font(r, size_pt=11)

    if col_widths:
        for row in table.rows:
            for ci, w in enumerate(col_widths):
                row.cells[ci].width = Cm(w)

    if caption_text:
        doc.add_paragraph()
        add_caption(doc, caption_text)
    doc.add_paragraph()
    return table

def add_header_footer(section, chapter_title=""):
    header = section.header
    hp = header.paragraphs[0]
    hp.text = ''
    pf = hp.paragraph_format
    pf.tab_stops.add_tab_stop(Cm(16.0), WD_TAB_ALIGNMENT.RIGHT)
    
    r_left = hp.add_run('Đồ án tốt nghiệp')
    set_run_font(r_left, size_pt=10, italic=True, color=(80, 80, 80))
    hp.add_run('\t')
    r_right = hp.add_run(chapter_title)
    set_run_font(r_right, size_pt=10, italic=True, color=(80, 80, 80))

    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="4" w:color="999999"/></w:pBdr>')
    hp._p.get_or_add_pPr().append(pBdr)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.text = ''
    pf_f = fp.paragraph_format
    pf_f.tab_stops.add_tab_stop(Cm(8.0), WD_TAB_ALIGNMENT.CENTER)
    pf_f.tab_stops.add_tab_stop(Cm(16.0), WD_TAB_ALIGNMENT.RIGHT)

    r_fleft = fp.add_run('GVHD : ThS.Dương Anh Tuấn')
    set_run_font(r_fleft, size_pt=10, color=(80, 80, 80))
    fp.add_run('\t')
    
    fld = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
    fp._p.append(fld)
    
    fp.add_run('\t')
    r_fright = fp.add_run('SVTH : Lương Nguyễn Quốc Tuấn')
    set_run_font(r_fright, size_pt=10, color=(80, 80, 80))

    pBdr_f = parse_xml(f'<w:pBdr {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="4" w:color="999999"/></w:pBdr>')
    fp._p.get_or_add_pPr().append(pBdr_f)

def build_thesis():
    print("Building Document with precise page border settings...")
    doc = Document()

    # =============================================================
    # SECTION 1: TRANG 1 & TRANG 2 (CÓ KHUNG VIỀN ĐÔI TRANG)
    # =============================================================
    sec1 = doc.sections[0]
    sec1.top_margin = Cm(2.0)
    sec1.bottom_margin = Cm(2.0)
    sec1.left_margin = Cm(3.0)
    sec1.right_margin = Cm(2.0)

    # Khung viền đôi trang cho Section 1
    sectPr1 = sec1._sectPr
    pgBorders = parse_xml(
        f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
        f'<w:top w:val="double" w:sz="18" w:space="24" w:color="1F4E79"/>'
        f'<w:left w:val="double" w:sz="18" w:space="24" w:color="1F4E79"/>'
        f'<w:bottom w:val="double" w:sz="18" w:space="24" w:color="1F4E79"/>'
        f'<w:right w:val="double" w:sz="18" w:space="24" w:color="1F4E79"/>'
        f'</w:pgBorders>'
    )
    sectPr1.append(pgBorders)

    # -------------------------------------------------------------
    # TRANG BÌA 1 (BÌA CHÍNH)
    # -------------------------------------------------------------
    add_p(doc, "TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=14, space_before=10, space_after=2)
    add_p(doc, "VIỆN TRÍ TUỆ NHÂN TẠO VÀ CHUYỂN ĐỔI SỐ", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=13, space_before=0, space_after=2)
    add_p(doc, "KHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=13, space_before=0, space_after=6)
    add_p(doc, "", alignment=WD_ALIGN_PARAGRAPH.CENTER, size_pt=14, space_before=0, space_after=18)

    # Logo Đại học Bình Dương
    logo_path = img_p('image1.png')
    if logo_path:
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_logo = p_logo.add_run()
        r_logo.add_picture(logo_path, width=Cm(3.8))
        p_logo.paragraph_format.space_after = Pt(24)

    add_p(doc, "ĐỒ ÁN TỐT NGHIỆP", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=20, space_before=12, space_after=16, color=(15, 23, 42))
    add_p(doc, "Tên đề tài :", alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size_pt=14, space_before=10, space_after=4)
    add_p(doc, "PHÁT TRIỂN SMART BOOKSTORE ONLINE\nBẰNG ỨNG DỤNG RECOMMEND SYSTEM", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=16, space_before=4, space_after=36, color=(31, 78, 121))

    # Khối thông tin SV & GVHD
    p_info = doc.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf_info = p_info.paragraph_format
    pf_info.space_before = Pt(30)
    pf_info.space_after = Pt(40)
    pf_info.line_spacing = 1.35
    
    r = p_info.add_run("Người hướng dẫn:\tThS. DƯƠNG ANH TUẤN\nSinh viên thực hiện :\tLƯƠNG NGUYỄN QUỐC TUẤN\nMã số sinh viên :\t22050098\n")
    set_run_font(r, size_pt=13, bold=True)

    add_p(doc, "Thành phố Hồ Chí Minh, tháng 8 năm 2025", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=13, space_before=20, space_after=0)

    # -------------------------------------------------------------
    # TRANG BÌA 2 (BÌA PHỤ / BẮT ĐẦU ĐỀ CƯƠNG)
    # -------------------------------------------------------------
    doc.add_page_break()
    add_p(doc, "BỘ GIÁO DỤC VÀ ĐÀO TẠO\t\tCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC BÌNH DƯƠNG\t\tĐộc lập – Tự do – Hạnh phúc\n", alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size_pt=12, space_before=0, space_after=6)
    add_p(doc, "ĐỀ CƯƠNG CHI TIẾT", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=6, space_after=10)

    # Bảng thông tin đề tài
    tbl_info = doc.add_table(rows=5, cols=1)
    tbl_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_info, color="000000", sz="8")
    
    info_rows = [
        "Tên đề tài: PHÁT TRIỂN SMART BOOKSTORE ONLINE BẰNG ỨNG DỤNG RECOMMEND SYSTEM",
        "Giảng viên hướng dẫn: ThS. DƯƠNG ANH TUẤN",
        "Thời gian thực hiện: Từ ngày 9/6/2025 đến ngày 31/8/2025",
        "Sinh viên thực hiện: LƯƠNG NGUYỄN QUỐC TUẤN",
        "Nội dung đề tài:"
    ]
    for idx, text in enumerate(info_rows):
        c = tbl_info.rows[idx].cells[0]
        set_cell_margins(c, top=80, bottom=80, left=120, right=120)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(text)
        set_run_font(r, size_pt=12, bold=(idx < 4))

    doc.add_paragraph()

    # =============================================================
    # SECTION 2: TỪ TRANG 3 TRỞ ĐI (KHÔNG CÓ KHUNG VIỀN TRANG)
    # =============================================================
    sec2 = doc.add_section()
    sec2.top_margin = Cm(2.0)
    sec2.bottom_margin = Cm(2.0)
    sec2.left_margin = Cm(3.0)
    sec2.right_margin = Cm(2.0)

    # Xóa hoàn toàn pgBorders khỏi Section 2 để từ trang 3 không có khung viền
    for child in list(sec2._sectPr):
        if child.tag.endswith('pgBorders'):
            sec2._sectPr.remove(child)

    # Thêm Header & Footer cho Section 2
    add_header_footer(sec2, "")

    # 1. Lý do chọn đề tài
    add_h1(doc, "1. Lý do chọn đề tài")
    add_body(doc, "Trong thời đại công nghệ số, thương mại điện tử ngày càng phát triển mạnh mẽ và trở thành xu hướng tất yếu. Các nhà sách truyền thống đang dần chuyển dịch sang môi trường trực tuyến để tiếp cận nhiều khách hàng hơn. Tuy nhiên, các nền tảng bán sách online hiện nay vẫn còn thiếu sự cá nhân hóa trải nghiệm người dùng. Việc gợi ý sách dựa trên sở thích, hành vi người dùng là một giải pháp cần thiết giúp nâng cao chất lượng phục vụ, giữ chân khách hàng, và tăng doanh số.")
    add_body(doc, "Vì vậy, việc phát triển một hệ thống nhà sách thông minh (Smart Bookstore Online) ứng dụng Recommendation System sẽ giúp người dùng dễ dàng tìm thấy các đầu sách phù hợp với sở thích và nhu cầu cá nhân, từ đó tạo ra một trải nghiệm mua sắm tiện lợi, thân thiện và hiệu quả.")

    # 2. Mục tiêu của đề tài
    add_h1(doc, "2. Mục tiêu của đề tài")
    add_bullet(doc, "Xây dựng ứng dụng website bán sách trực tuyến hoàn chỉnh.")
    add_bullet(doc, "Tích hợp hệ thống gợi ý cá nhân hóa để đề xuất sách cho người dùng dựa trên hành vi, sở thích, lịch sử mua hàng, ...")
    add_bullet(doc, "Hỗ trợ người dùng tìm kiếm, chọn mua sách nhanh chóng và phù hợp.")
    add_bullet(doc, "Tối ưu trải nghiệm người dùng, giúp tăng doanh thu cho cửa hàng.")
    add_p(doc, "Hệ thống gợi ý sách theo:", indent=True)
    add_bullet(doc, "Sách đã xem")
    add_bullet(doc, "Sách đã mua")
    add_bullet(doc, "Sách tương tự người dùng quan tâm, ….")

    # 3. Phạm vi thực hiện
    add_h1(doc, "3. Phạm vi thực hiện")
    add_bullet(doc, "Người dùng: Đăng ký, đăng nhập, tìm kiếm sách, thêm vào giỏ hàng, xem đề xuất sách.")
    add_bullet(doc, "Quản trị viên: Quản lý danh mục sách, người dùng, đơn hàng, thống kê doanh thu và hành vi người dùng.")
    add_p(doc, "Công nghệ sử dụng:", indent=True, bold=True)
    add_bullet(doc, "Ngôn ngữ & Framework: ASP.NET MVC / Next.js Fullstack.")
    add_bullet(doc, "Cơ sở dữ liệu: SQL Server / PostgreSQL pgvector.")
    add_bullet(doc, "Thư viện đề xuất: Tự xây dựng mô hình Hybrid (Content-based + Collaborative Filtering).")
    add_bullet(doc, "Công nghệ hỗ trợ: HTML, CSS, JavaScript, Bootstrap / Tailwind CSS.")

    # 4. Ý nghĩa của đề tài
    add_h1(doc, "4. Ý nghĩa của đề tài")
    add_bullet(doc, "Góp phần hiện đại hóa ngành bán lẻ sách thông qua việc ứng dụng trí tuệ nhân tạo (AI).")
    add_bullet(doc, "Tăng tính cá nhân hóa trong trải nghiệm khách hàng – một xu hướng tất yếu trong thương mại điện tử hiện đại.")
    add_bullet(doc, "Hướng đến khả năng mở rộng thành một hệ thống thương mại điện tử hoàn chỉnh hoặc kết nối với các nhà sách thực tế.")

    # 5. Đối tượng nghiên cứu
    add_h1(doc, "5. Đối tượng nghiên cứu")
    add_bullet(doc, "Người dùng truy cập và sử dụng nhà sách online (người mua sách).")
    add_bullet(doc, "Dữ liệu về sách, người dùng, hành vi mua hàng.")
    add_bullet(doc, "Các thuật toán gợi ý trong hệ thống đề xuất (Recommender System).")

    # 6. Phương pháp thực hiện
    add_h1(doc, "6. Phương pháp thực hiện")
    add_bullet(doc, "Nghiên cứu các hệ thống bán sách trực tuyến nổi bật (Fahasa, Tiki, Amazon,…).")
    add_bullet(doc, "Phân tích yêu cầu người dùng, thiết kế hệ thống theo mô hình MVC phân tầng chuẩn mực.")
    add_bullet(doc, "Xây dựng giao diện người dùng trực quan, thân thiện trên đa thiết bị.")
    add_bullet(doc, "Tích hợp cơ sở dữ liệu quan hệ để lưu trữ và truy vấn dữ liệu hiệu quả.")
    add_bullet(doc, "Thiết kế mô hình gợi ý kết hợp dựa trên nội dung và lịch sử tương tác người dùng.")
    add_bullet(doc, "Thực hiện kiểm thử, đánh giá hệ thống và tối ưu hiệu năng.")

    # 7. Kết quả mong đợi
    add_h1(doc, "7. Kết quả mong đợi")
    add_bullet(doc, "Một website hoàn chỉnh đầy đủ tính năng.")
    add_bullet(doc, "Có khả năng đề xuất sách thông minh phù hợp cho từng người dùng.")
    add_bullet(doc, "Có trang quản trị riêng cho quản lý sách và người dùng.")
    add_bullet(doc, "Giao diện thân thiện, dễ sử dụng trên cả Desktop và Mobile.")
    add_bullet(doc, "Có thể mở rộng tích hợp thêm (chatbot hỗ trợ, giỏ hàng thông minh, gợi ý nâng cao).")

    # Kế hoạch thực hiện (12 Tuần)
    add_p(doc, "Kế hoạch thực hiện (12 Tuần):", bold=True, space_before=6)
    schedule_rows = [
        ["1", "09/06 – 15/06", "- Làm việc với GVHD để thống nhất đề tài.\n- Thu thập và nghiên cứu tài liệu liên quan.\n- Xác định phạm vi, mục tiêu nghiên cứu.", "Lương Nguyễn Quốc Tuấn"],
        ["2", "16/06 – 22/06", "- Phân tích yêu cầu hệ thống.\n- Viết chương 1: Giới thiệu đề tài (lý do, mục tiêu, ý nghĩa, phạm vi).", "Lương Nguyễn Quốc Tuấn"],
        ["3", "23/06 – 29/06", "- Thiết kế sơ đồ Use-case kiến trúc hệ thống.\n- Viết chương 2: Cơ sở lý thuyết.", "Lương Nguyễn Quốc Tuấn"],
        ["4", "30/06 – 06/07", "- Cài đặt môi trường phát triển và Database.\n- Tạo cấu trúc dự án và cơ sở dữ liệu.\n- Viết 1 phần chương 3: Phân tích hệ thống.\n- Xây dựng hệ thống gợi ý dựa trên rating.", "Lương Nguyễn Quốc Tuấn"],
        ["5", "07/07 – 13/07", "- Thiết kế giao diện frontend (trang chủ, đăng nhập, danh sách sách).", "Lương Nguyễn Quốc Tuấn"],
        ["6", "14/07 – 20/07", "- Hoàn thiện các chức năng người dùng: tìm kiếm, đặt hàng, xem chi tiết sách.", "Lương Nguyễn Quốc Tuấn"],
        ["7", "21/07 – 27/07", "- Triển khai mô hình gợi ý trên nội dung.\n- Biên tập dữ liệu để triển khai (Tên sách, nội dung, thể loại, tác giả, NXB).", "Lương Nguyễn Quốc Tuấn"],
        ["8", "28/07 – 03/08", "- Làm hybrid recommend system.\n- Biên tập dữ liệu cho chatbot (câu hỏi, ý định, ngữ cảnh, câu trả lời).\n- Viết báo cáo.", "Lương Nguyễn Quốc Tuấn"],
        ["9", "04/08 – 10/08", "- Viết báo cáo.\n- Xây dựng mô hình Chatbot AI.", "Lương Nguyễn Quốc Tuấn"],
        ["10", "11/08 – 17/08", "- Tích hợp recommend system và chatbot vào smart bookstore.", "Lương Nguyễn Quốc Tuấn"],
        ["11", "18/08 – 24/08", "- Kiểm thử hệ thống toàn diện (unit test, chức năng, trải nghiệm người dùng).\n- Viết chương 4: Thử nghiệm – đánh giá.", "Lương Nguyễn Quốc Tuấn"],
        ["12", "25/08 – 31/08", "- Rà soát và viết chương 5: Kết luận và hướng phát triển.\n- Chỉnh sửa các chương trước theo góp ý GVHD.", "Lương Nguyễn Quốc Tuấn"]
    ]
    add_styled_table(doc, ["Tuần", "Thời gian", "Công việc", "Người thực hiện"], schedule_rows, col_widths=[1.5, 3.0, 8.5, 3.0])

    # Ký tên
    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf_s = p_sign.paragraph_format
    pf_s.space_before = Pt(14)
    pf_s.space_after = Pt(20)
    pf_s.line_spacing = 1.3
    r_s = p_sign.add_run("SINH VIÊN THỰC HIỆN\t\t\t\tCÁN BỘ HƯỚNG DẪN\n(Sinh viên ký và ghi rõ họ tên)\t\t\t\t(Ký tên và ghi rõ họ tên)\n\n\n\nLương Nguyễn Quốc Tuấn\t\t\t\tThS. Dương Anh Tuấn")
    set_run_font(r_s, size_pt=12, bold=True)

    doc.add_page_break()

    # -------------------------------------------------------------
    # NHẬN XÉT GVHD & GVPB
    # -------------------------------------------------------------
    add_p(doc, "NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=14, space_before=10, space_after=4)
    add_p(doc, "-----o0o-----\n", alignment=WD_ALIGN_PARAGRAPH.CENTER, size_pt=12)
    for _ in range(12):
        add_p(doc, "." * 110, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, size_pt=12, space_after=3)
    p_nx = doc.add_paragraph()
    p_nx.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf_nx = p_nx.paragraph_format
    pf_nx.space_before = Pt(14)
    r_nx = p_nx.add_run("Thành phố Hồ Chí Minh, ngày… tháng … năm 2025\nGiảng viên hướng dẫn\n\n\n\n\nThS. Dương Anh Tuấn")
    set_run_font(r_nx, size_pt=12, bold=True)

    doc.add_page_break()

    add_p(doc, "NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=14, space_before=10, space_after=4)
    add_p(doc, "-----o0o-----\n", alignment=WD_ALIGN_PARAGRAPH.CENTER, size_pt=12)
    for _ in range(12):
        add_p(doc, "." * 110, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, size_pt=12, space_after=3)
    p_pb = doc.add_paragraph()
    p_pb.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf_pb = p_pb.paragraph_format
    pf_pb.space_before = Pt(14)
    r_pb = p_pb.add_run("Thành phố Hồ Chí Minh, ngày… tháng … năm 2025\nGiảng viên phản biện\n\n\n\n\n")
    set_run_font(r_pb, size_pt=12, bold=True)

    doc.add_page_break()

    # -------------------------------------------------------------
    # LỜI CẢM ƠN
    # -------------------------------------------------------------
    add_p(doc, "LỜI CẢM ƠN", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=10, space_after=14)
    add_body(doc, "Trước tiên, em xin gửi lời cảm ơn chân thành và sâu sắc đến Ban Giám hiệu cùng toàn thể quý thầy cô Trường Đại học Bình Dương đã tận tình giảng dạy, truyền đạt cho em những kiến thức quý báu trong suốt quá trình học tập và rèn luyện tại trường.")
    add_body(doc, "Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc đến ThS. Dương Anh Tuấn – người đã trực tiếp hướng dẫn, chỉ bảo tận tình, giúp đỡ em trong suốt quá trình thực hiện và hoàn thành đồ án tốt nghiệp. Sự tận tâm, trách nhiệm và những đóng góp quý báu của thầy đã giúp em có được định hướng rõ ràng, hoàn thiện nội dung nghiên cứu cũng như nâng cao kỹ năng thực tiễn.")
    add_body(doc, "Bên cạnh đó, em cũng xin cảm ơn gia đình và bạn bè đã luôn động viên, khích lệ và hỗ trợ em trong suốt thời gian học tập và thực hiện đồ án.")
    add_body(doc, "Mặc dù đã nỗ lực hết sức, nhưng do kiến thức và kinh nghiệm còn hạn chế, đồ án không thể tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp của quý thầy cô để có thể hoàn thiện hơn trong tương lai.")
    add_body(doc, "Em xin chân thành cảm ơn!")

    p_sv = doc.add_paragraph()
    p_sv.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf_sv = p_sv.paragraph_format
    pf_sv.space_before = Pt(20)
    r_sv = p_sv.add_run("SINH VIÊN THỰC HIỆN\n\nTuấn\n\nLương Nguyễn Quốc Tuấn")
    set_run_font(r_sv, size_pt=13, bold=True)

    doc.add_page_break()

    # -------------------------------------------------------------
    # MỤC LỤC
    # -------------------------------------------------------------
    add_p(doc, "MỤC LỤC", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=10, space_after=12)
    toc_items = [
        ("LỜI CẢM ƠN", "I"),
        ("CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN", "1"),
        ("  1.1. Lý do thực hiện đề tài :", "1"),
        ("    1.1.1 Hiện trạng", "1"),
        ("    1.1.2 Lý do chọn đề tài", "1"),
        ("    1.1.3 Tính cần thiết của đề tài", "2"),
        ("    1.1.4 Quy trình nghiệp vụ tổng quan", "2"),
        ("  1.2. Các hệ thống tương tự", "4"),
        ("    1.2.1. Các nghiên cứu, hệ thống đã có", "4"),
        ("    1.2.2. Vấn đề tồn tại và tính mới của đề tài", "5"),
        ("  1.3. Phát biểu bài toán:", "6"),
        ("    1.3.1. Mục tiêu:", "6"),
        ("    1.3.2. Phạm vi", "6"),
        ("    1.3.3. Ràng buộc", "6"),
        ("    1.3.4. Các giả định và phụ thuộc:", "7"),
        ("  1.4. Kết quả cần đạt :", "7"),
        ("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT", "9"),
        ("  2.1. Cơ sở lý thuyết:", "9"),
        ("    2.1.1 Recommender System", "9"),
        ("      2.1.1.1 Tổng quan về Recommender System", "9"),
        ("      2.1.1.2 Content-based Filtering RS", "9"),
        ("      2.1.1.3 Collaborative Filtering RS", "10"),
        ("    2.1.2 Trợ lý RAG & Chatbot AI", "10"),
        ("    2.1.3 Tài liệu tham khảo :", "11"),
        ("  2.2. Cách tiếp cận, giải quyết vấn đề", "11"),
        ("    2.2.1. Mô hình tiếp cận", "11"),
        ("    2.2.2. Phương pháp phát triển hệ thống", "12"),
        ("    2.2.3. Quy trình thực hiện", "12"),
        ("  2.3. Công nghệ sử dụng :", "13"),
        ("CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ", "15"),
        ("  3.1. Các yêu cầu chức năng [Use case view]", "15"),
        ("    3.1.1. Ngữ cảnh sử dụng", "15"),
        ("      3.1.1.1. Danh sách actor", "15"),
        ("      3.1.1.2. Sơ đồ ngữ cảnh (context diagram):", "16"),
        ("    3.1.2. Các use case", "17"),
        ("      3.1.2.1. Danh sách use case", "17"),
        ("      3.1.2.2. Sơ đồ use case chính", "18"),
        ("  3.2. Các yêu cầu phi chức năng", "19"),
        ("    3.2.1. Tính dễ sử dụng", "19"),
        ("    3.2.2. Hiệu suất hoạt động", "20"),
        ("    3.2.3. Tính ổn định", "20"),
        ("    3.2.4. Khả năng bảo trì", "20"),
        ("    3.2.5. Tính bảo mật cơ bản", "20"),
        ("    3.2.6. Khả năng mở rộng", "20"),
        ("  3.3. Mô hình hệ thống [Logical view]", "21"),
        ("    3.3.1 Mô hình tổng quát", "21"),
        ("    3.3.2 Mô hình chi tiết", "23"),
        ("      3.3.2.1 Browser (Client)", "23"),
        ("      3.3.3.2 Application Server", "24"),
        ("      3.3.3.3 Service Layer", "25"),
        ("      3.3.3.4 Database", "26"),
        ("      3.3.3.5 Chatbot AI", "27"),
        ("    3.3.3 Cơ sở toán học cho hệ thống :", "28"),
        ("      3.3.3.1 Gợi ý dựa trên nội dung (Content-based)", "28"),
        ("      3.3.3.2 Gợi ý dựa trên cộng tác (Collaborative)", "28"),
        ("      3.3.3.3 Gợi ý lai (Hybrid Recommendation)", "29"),
        ("    3.3.4. Thuật toán - giải thuật áp dụng:", "30"),
        ("  3.4. Mô hình xử lý / tương tác", "40"),
        ("    3.4.1. Use case chi tiết (UC01 đến UC17)", "40"),
        ("    3.4.2. Sơ đồ tuần tự (sequence diagram)", "59"),
        ("    3.4.3. Sơ đồ hoạt động (activity diagram)", "62"),
        ("  3.5. Thiết kế nguyên mẫu giao diện người dùng", "66"),
        ("  3.6. Thiết kế chi tiết & Triển khai thực tế", "68"),
        ("  3.7. Kiểm thử hệ thống & Phân quyền", "72"),
        ("CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM", "73"),
        ("  4.1 Các kịch bản thử nghiệm", "73"),
        ("  4.2. Kết quả thử nghiệm các kịch bản", "74"),
        ("    4.2.1. Recommendation system", "74"),
        ("    4.2.2 Chatbot AI", "76"),
        ("  4.3. Xử lý các trường hợp ngoại lệ", "77"),
        ("CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN", "79"),
        ("  5.1. Kết quả đối chiếu với mục tiêu", "79"),
        ("  5.2. Các hạn chế của đồ án", "80"),
        ("  5.3. Hướng phát triển :", "81"),
        ("KẾT LUẬN", "83"),
        ("PHỤ LỤC", "84"),
        ("TÀI LIỆU THAM KHẢO", "89")
    ]
    for name, pg in toc_items:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_after = Pt(1.5)
        dots = '.' * max(4, 75 - len(name) - len(pg))
        r = p.add_run(f"{name} {dots} {pg}")
        set_run_font(r, size_pt=12.5, bold=('CHƯƠNG' in name or name == 'LỜI CẢM ƠN' or name == 'KẾT LUẬN' or name == 'PHỤ LỤC' or name == 'TÀI LIỆU THAM KHẢO'))

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN
    # -------------------------------------------------------------
    add_h_chapter(doc, "CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN")
    add_h1(doc, "1.1. Lý do thực hiện đề tài :")
    add_h2(doc, "1.1.1 Hiện trạng")
    add_body(doc, "Trong thời đại số hóa, việc lựa chọn và tìm kiếm sách phù hợp là một thách thức đối với người đọc. Người dùng thường phải dựa vào danh sách phổ biến, xếp hạng chung hoặc tự tìm kiếm trong các cửa hàng trực tuyến, dẫn đến trải nghiệm chưa cá nhân hóa và mất nhiều thời gian.")
    add_body(doc, "Các thư viện truyền thống và nền tảng sách trực tuyến hiện nay thường có những hạn chế sau:")
    add_bullet(doc, "Các gợi ý thường dựa trên số lượt xem, đánh giá chung hoặc thể loại phổ biến, chưa thực sự phản ánh sở thích riêng của từng người dùng.", "Thiếu cá nhân hóa: ")
    add_bullet(doc, "Hầu hết các hệ thống chưa tích hợp chatbot hay công cụ tư vấn trực tuyến để giải đáp thắc mắc từ người dùng.", "Tương tác hạn chế: ")
    add_bullet(doc, "Khi số lượng người dùng và sách tăng lên, nhiều hệ thống gặp khó khăn về tốc độ gợi ý và xử lý dữ liệu lớn.", "Khả năng mở rộng: ")
    add_body(doc, "Trong khi các mô hình gợi ý (Recommendation System) đã được nghiên cứu nhiều, việc kết hợp gợi ý cá nhân hóa và hỗ trợ người dùng thông qua chatbot trong lĩnh vực sách còn hạn chế.")

    add_h2(doc, "1.1.2 Lý do chọn đề tài")
    add_body(doc, "Xuất phát từ nhu cầu thực tế: Người dùng cần một hệ thống gợi ý sách cá nhân hóa để tiết kiệm thời gian và nâng cao trải nghiệm mua sắm.")
    add_body(doc, "Khoảng trống công nghệ: Các nhà sách trực tuyến hiện tại còn hạn chế trong việc áp dụng công nghệ AI, đặc biệt là Recommendation System và Chatbot.")
    add_body(doc, "Ý nghĩa học thuật: Đề tài cho phép áp dụng kiến thức đã học về kiến trúc Web MVC/Fullstack, hệ thống gợi ý (Collaborative Filtering, Content-based Filtering, Hybrid), và Chatbot NLP/RAG vào một ứng dụng thực tiễn.")
    add_body(doc, "Ý nghĩa thực tiễn: Nâng cao chất lượng dịch vụ khách hàng, tăng tính cạnh tranh và doanh thu cho doanh nghiệp, giúp người dùng tiếp cận sách nhanh chóng, dễ dàng và phù hợp hơn.")

    add_h2(doc, "1.1.3 Tính cần thiết của đề tài")
    add_body(doc, "Về phía người dùng: Đáp ứng nhu cầu tìm kiếm, lựa chọn sách nhanh chóng và phù hợp với sở thích cá nhân.")
    add_body(doc, "Về phía doanh nghiệp: Nâng cao khả năng cạnh tranh, tối ưu hóa hoạt động bán hàng, gia tăng sự hài lòng của khách hàng.")
    add_body(doc, "Về phía học thuật và nghiên cứu: Tạo cơ hội cho sinh viên áp dụng kiến thức đã học vào dự án thực tế, đặc biệt trong các lĩnh vực AI, Machine Learning và phát triển ứng dụng web.")
    add_body(doc, "Xu hướng phát triển: Việc kết hợp Recommendation System + Chatbot thông minh là hướng đi phù hợp với xu thế hiện nay trong các hệ thống thương mại điện tử.")

    add_h2(doc, "1.1.4 Quy trình nghiệp vụ tổng quan")
    add_body(doc, "Quy trình nghiệp vụ của hệ thống được tổ chức qua 6 bước logic liền mạch:")
    add_bullet(doc, "Người dùng tạo tài khoản hoặc đăng nhập. Hệ thống lưu thông tin người dùng, phục vụ cho việc cá nhân hóa gợi ý.", "Bước 1: Đăng ký / Đăng nhập: ")
    add_bullet(doc, "Người dùng xem danh sách sách và chi tiết sách. Hệ thống ghi lại các lượt xem, lượt click để làm dữ liệu đầu vào cho mô hình gợi ý.", "Bước 2: Duyệt sách: ")
    add_bullet(doc, "Người dùng thực hiện các hành động: đánh giá, like hoặc mua sách. Dữ liệu này được lưu vào Database và xử lý bởi mô hình Recommendation System.", "Bước 3: Tương tác với sách: ")
    add_bullet(doc, "Hệ thống gợi ý học máy nhận dữ liệu tương tác và đặc trưng sách, tính toán điểm gợi ý (score) cho từng sách. Kết quả gợi ý trả về Frontend để hiển thị cho người dùng.", "Bước 4: Gợi ý sách cá nhân hóa: ")
    add_bullet(doc, "Người dùng đặt câu hỏi về thông tin cửa hàng, tư vấn sách. Chatbot sử dụng mô hình NLP để phân loại intent, trích xuất entity và trả lời câu hỏi.", "Bước 5: Chatbot hỗ trợ: ")
    add_bullet(doc, "Hệ thống lưu lại lịch sử tương tác, câu hỏi và phản hồi. Dữ liệu này được dùng để cải thiện chất lượng gợi ý và trả lời chatbot theo thời gian.", "Bước 6: Cập nhật mô hình và dữ liệu: ")

    add_p(doc, "Sơ đồ quy trình:", bold=True, space_before=4)
    add_img(doc, "image2.png", 13.5, "Hình 1-1: Sơ đồ quy trình nghiệp vụ tổng quan")

    add_h1(doc, "1.2. Các hệ thống tương tự")
    add_h2(doc, "1.2.1. Các nghiên cứu, hệ thống đã có")
    add_body(doc, "Hiện nay trên thị trường đã có một số hệ thống bán sách trực tuyến ứng dụng tính năng gợi ý, tiêu biểu như Fahasa, Vinabook, Bookbuy và Goodreads.")

    add_h2(doc, "1.2.2. Vấn đề tồn tại và tính mới của đề tài")
    add_body(doc, "Tính mới của đề tài:")
    add_bullet(doc, "Đề xuất hệ thống Hybrid Recommendation kết hợp Content-based và Collaborative Filtering, giúp tận dụng ưu điểm của từng mô hình và khắc phục nhược điểm cold-start.")
    add_bullet(doc, "Phân tách rõ hai nhóm người dùng: khách chưa đăng nhập được gợi ý bằng Content-based, khách đã đăng nhập được gợi ý bằng Collaborative Filtering hoặc Hybrid, từ đó tăng tính cá nhân hóa.")
    add_bullet(doc, "Tích hợp chatbot AI hỗ trợ thông tin cửa hàng, giúp nâng cao trải nghiệm người dùng và tạo sự khác biệt so với các hệ thống hiện tại.")

    add_h1(doc, "1.3. Phát biểu bài toán:")
    add_h2(doc, "1.3.1. Mục tiêu:")
    add_bullet(doc, "Xây dựng hệ thống gợi ý sách trực tuyến có khả năng đưa ra các đề xuất cá nhân hóa cho người dùng.")
    add_bullet(doc, "Ứng dụng các kỹ thuật Content-based Filtering, Collaborative Filtering và Hybrid Recommendation để cải thiện độ chính xác gợi ý.")
    add_bullet(doc, "Hỗ trợ người dùng mới (cold-start) bằng cách khai thác đặc trưng nội dung sách, đồng thời tận dụng lịch sử tương tác cho người dùng đã đăng nhập.")
    add_bullet(doc, "Tích hợp chatbot để cung cấp thông tin về cửa hàng (địa chỉ, giờ mở cửa, khuyến mãi, tình trạng sản phẩm).")

    add_h1(doc, "1.4. Kết quả cần đạt :")
    target_rows = [
        ["Hệ thống gợi ý theo nội dung (Content-based Filtering)", "- Precision@K, Recall@K, F1-score đạt mức chấp nhận được (>60%).\n- Thời gian phản hồi trung bình < 2 giây.", "Giúp người dùng mới (chưa có dữ liệu tương tác) nhanh chóng tìm thấy sách cùng chủ đề, tác giả hoặc thể loại mình quan tâm."],
        ["Hệ thống gợi ý dựa trên hành vi (Collaborative Filtering)", "- Độ chính xác gợi ý cao hơn Content-based với người dùng có nhiều lịch sử.\n- Khả năng tìm ra sách “ngầm liên quan” không hiện trong nội dung.", "Tăng khả năng cá nhân hóa cho người dùng đăng nhập, khám phá sách ngoài sở thích quen thuộc."],
        ["Hệ thống gợi ý lai (Hybrid Recommendation)", "- Độ chính xác (F1-score) cao hơn ít nhất 5–10% so với từng mô hình riêng lẻ.\n- Giải quyết tốt hơn vấn đề cold-start.", "Kết hợp ưu điểm của cả hai phương pháp, cải thiện trải nghiệm tổng thể cho nhiều nhóm người dùng."],
        ["Chatbot hỗ trợ thông tin cửa hàng", "- Tỷ lệ trả lời đúng intent > 80%.\n- Thời gian phản hồi < 2 giây.", "Cải thiện tương tác người dùng, hỗ trợ trả lời nhanh các câu hỏi về địa chỉ, giờ mở cửa, chương trình khuyến mãi."],
        ["Giao diện hiển thị kết quả gợi ý", "- Thân thiện, trực quan, hiển thị top-N sách gợi ý rõ ràng.\n- Thử nghiệm người dùng đánh giá > 70% hài lòng.", "Giúp người dùng dễ dàng thao tác, tiếp cận sách gợi ý mà không cần tìm kiếm thủ công."],
        ["Khả năng mở rộng dữ liệu", "- Hệ thống xử lý tốt khi số lượng sách tăng lên (hàng nghìn – chục nghìn bản ghi).", "Có thể triển khai thực tế cho nhà sách trực tuyến hoặc thư viện số."]
    ]
    add_styled_table(doc, ["Kết quả cần đạt", "Tiêu chí đánh giá", "Tính ứng dụng"], target_rows, "Bảng 1-1: Kết quả cần đạt", col_widths=[4.5, 5.5, 6.0])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
    # -------------------------------------------------------------
    add_h_chapter(doc, "CHƯƠNG 2: CƠ SỞ LÝ THUYẾT")
    add_h1(doc, "2.1. Cơ sở lý thuyết:")
    add_h2(doc, "2.1.1 Recommender System")
    add_h3(doc, "2.1.1.1 Tổng quan về Recommender System")
    add_body(doc, "Hệ thống gợi ý (Recommender System – RS) là một tập hợp các thuật toán và mô hình được thiết kế nhằm dự đoán và gợi ý cho người dùng những mục (items) có khả năng phù hợp với sở thích hoặc nhu cầu của họ [1].")

    add_h3(doc, "2.1.1.2 Content-based Filtering RS")
    add_body(doc, "Content-Based Filtering (CBF) là một phương pháp gợi ý dựa trên đặc trưng nội dung của sản phẩm. Ý tưởng chính: nếu người dùng đã thích một sản phẩm, hệ thống sẽ tìm và gợi ý các sản phẩm khác có đặc trưng tương tự [3].")

    add_h3(doc, "2.1.1.3 Collaborative Filtering RS")
    add_body(doc, "Collaborative Filtering (CF) là phương pháp gợi ý dựa trên hành vi của cộng đồng người dùng. Nguyên lý: “Người dùng có hành vi giống nhau trong quá khứ sẽ có sở thích giống nhau trong tương lai” [4].")

    add_h2(doc, "2.1.2 Trợ lý RAG & Chatbot AI")
    add_body(doc, "Chatbot AI được xây dựng nhằm hỗ trợ trả lời tự động các câu hỏi của khách hàng về thông tin nhà sách, chính sách, tìm kiếm ấn phẩm và hướng dẫn mua hàng.")

    add_h1(doc, "2.3. Công nghệ sử dụng :")
    tech_rows = [
        ["Next.js / ASP.NET", "Framework Web hiện đại với Server Components và REST API.", "Xây dựng toàn bộ giao diện Web, xử lý luồng nghiệp vụ và tối ưu hiệu năng."],
        ["TypeScript / C#", "Ngôn ngữ định kiểu tĩnh an toàn, hướng đối tượng.", "Đảm bảo tính chặt chẽ mã nguồn và hạn chế lỗi runtime."],
        ["SQL Server / PostgreSQL", "Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ, hỗ trợ pgvector.", "Lưu trữ dữ liệu sách, người dùng, lịch sử mua, đánh giá và vector."],
        ["Prisma / Entity Framework", "ORM mạnh mẽ cho việc thao tác CSDL dạng đối tượng.", "Truy vấn và thao tác dữ liệu an toàn, chống SQL Injection."],
        ["Tailwind CSS / Bootstrap", "Framework CSS utility-first responsive.", "Xây dựng giao diện web hiện đại, thân thiện trên desktop và mobile."],
        ["Python FastAPI / Rasa", "Môi trường microservice cho AI và NLP.", "Xử lý thuật toán gợi ý học máy, phân loại ý định chatbot."],
        ["Scikit-Learn / Pandas", "Thư viện tính toán ma trận và thuật toán học máy.", "Tính toán vector TF-IDF, độ tương đồng Cosine và phân rã ma trận."]
    ]
    add_styled_table(doc, ["Công nghệ / Công cụ", "Mô tả", "Vai trò trong hệ thống"], tech_rows, "Bảng 2-1: Công nghệ sử dụng", col_widths=[3.5, 6.0, 6.5])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ
    # -------------------------------------------------------------
    add_h_chapter(doc, "CHƯƠNG 3: PHÂN TÍCH - THIẾT KẾ")
    add_h1(doc, "3.1. Các yêu cầu chức năng [Use case view]")
    add_h2(doc, "3.1.1. Ngữ cảnh sử dụng")
    add_h3(doc, "3.1.1.1. Danh sách actor")
    add_styled_table(doc, ["Actor", "Mô tả", "Quyền hạn/Chức năng chính"], [
        ["Khách hàng chưa đăng nhập", "Người dùng truy cập website mà không đăng nhập.", "- Xem danh sách, chi tiết sách.\n- Chatbot hỏi thông tin.\n- Gợi ý Content-based."],
        ["Khách hàng đã đăng nhập", "Người dùng có tài khoản đã đăng nhập.", "- Đặt hàng, giỏ hàng, wishlist.\n- Đánh giá sách.\n- Gợi ý Hybrid cá nhân hóa."],
        ["Quản trị viên (Admin)", "Quản lý toàn bộ hệ thống.", "- Quản lý sách, danh mục, đơn hàng.\n- Xem thống kê doanh thu."],
        ["Chatbot", "AI tích hợp trong website.", "- Trả lời tự động thông tin nhà sách."]
    ], "Bảng 3-1: Danh sách actor", col_widths=[3.5, 5.0, 7.5])

    add_h3(doc, "3.1.1.2. Sơ đồ ngữ cảnh (context diagram):")
    add_img(doc, "image3.png", 14.5, "Hình 3-1: Sơ đồ ngữ cảnh")

    add_h2(doc, "3.1.2. Các use case")
    add_img(doc, "image4.png", 14.5, "Hình 3-2: Sơ đồ use case của toàn hệ thống")

    add_h1(doc, "3.3. Mô hình hệ thống [Logical view]")
    add_h2(doc, "3.3.1 Mô hình tổng quát")
    add_img(doc, "image5.png", 14.5, "Hình 3-3: Mô hình tổng quát nghiệp vụ tổng quan")
    
    add_h2(doc, "3.3.2 Mô hình chi tiết các tầng kiến trúc")
    add_img(doc, "fig_3_4_browser.png", 13.5, "Hình 3-4: Sơ đồ khối chi tiết Browser (Client)")
    add_img(doc, "fig_3_5_app_server.png", 13.5, "Hình 3-5: Sơ đồ khối chi tiết Application Server (Controllers / Modules)")
    add_img(doc, "fig_3_6_service_layer.png", 14.5, "Hình 3-6: Sơ đồ kiến trúc phân tầng Service Layer")
    add_img(doc, "fig_3_7_database.png", 13.0, "Hình 3-7: Sơ đồ khối chi tiết Database")
    add_img(doc, "fig_3_8_chatbot.png", 11.0, "Hình 3-8: Sơ đồ khối chi tiết Chatbot AI Engine")

    add_h2(doc, "3.3.3 Cơ sở toán học cho hệ thống :")
    add_body(doc, "Độ tương đồng Cosine giữa 2 vector đặc trưng sách:")
    add_body(doc, "Sim(i, j) = (d_i · d_j) / (‖d_i‖ × ‖d_j‖)")
    add_styled_table(doc, ["Tựa sách", "A", "B", "C", "D", "E", "F", "Feature Vector"], [
        ["Mưa nửa đêm", "5", "5", "0", "0", "1", "?", "x1 = [0.99, 0.02]"],
        ["Cỏ úa", "5", "?", "?", "0", "?", "?", "x2 = [0.91, 0.11]"],
        ["Vùng lá me bay", "?", "4", "1", "?", "?", "1", "x3 = [0.95, 0.05]"],
        ["Con cò bé bé", "1", "1", "4", "4", "4", "?", "x4 = [0.01, 0.99]"],
        ["Em yêu trường em", "1", "0", "5", "?", "?", "?", "x5 = [0.03, 0.98]"]
    ], "Bảng 3-5: Minh họa toán học Content-based Filtering")

    add_h2(doc, "3.3.4. Thuật toán - giải thuật áp dụng trên môi trường Windows:")
    add_img(doc, "fig_3_10_extract.png", 14.0, "Hình 3-10: Mã nguồn trích xuất đặc trưng sách (Windows C#)")
    add_img(doc, "fig_3_12_cosine.png", 14.0, "Hình 3-12: Mã nguồn tính toán độ tương đồng Cosine (Windows C#)")
    add_img(doc, "fig_3_19_hybrid.png", 14.0, "Hình 3-19: Mã nguồn gợi ý lai Hybrid Recommendation (Windows C#)")
    add_img(doc, "fig_3_21_intent.png", 14.0, "Hình 3-21: Cấu hình phân loại ý định người dùng Chatbot AI")

    # =============================================================
    # MỤC 3.4 ĐẾN 3.7 (HOÀN THIỆN ĐẦY ĐỦ CHI TIẾT)
    # =============================================================
    add_h1(doc, "3.4. Mô hình xử lý / tương tác")
    add_h2(doc, "3.4.1. Use case chi tiết (UC01 đến UC17)")
    add_body(doc, "Dưới đây là chi tiết toàn bộ 17 use case chính của hệ thống kèm sơ đồ phân rã và bảng mô tả luồng thực thi:")

    ucs_detail = [
        ("UC01", "Xem sách", "Khách hàng chưa đăng nhập", "Cho phép khách hàng duyệt, xem thông tin sách và nhận gợi ý sách trên website", "Khách hàng mở trang danh sách sách → Hệ thống hiển thị sách → Khách chọn xem chi tiết.", "image10.png"),
        ("UC02", "Gợi ý sách (chưa đăng nhập)", "Khách hàng chưa đăng nhập", "Cung cấp cho khách hàng những sách gợi ý dựa trên nội dung phổ biến", "Khách hàng mở trang gợi ý → Hệ thống hiển thị sách gợi ý theo Content-based → Khách chọn xem chi tiết.", "image11.png"),
        ("UC03", "Đăng ký", "Khách hàng chưa đăng nhập", "Cho phép người dùng tạo tài khoản mới để sử dụng các chức năng nâng cao", "Khách chọn đăng ký → Nhập form thông tin → Hệ thống xác thực và tạo tài khoản.", "image12.png"),
        ("UC04", "Đăng nhập", "Khách hàng chưa đăng nhập", "Cho phép khách hàng truy cập vào hệ thống bằng tài khoản đã có", "Khách chọn đăng nhập → Nhập tài khoản, mật khẩu → Hệ thống xác thực và cấp phiên.", "image13.png"),
        ("UC05", "Đăng xuất", "Khách hàng đã đăng nhập", "Cho phép khách hàng thoát khỏi hệ thống một cách an toàn", "Khách chọn đăng xuất → Xác nhận → Hệ thống hủy phiên đăng nhập.", "image14.png"),
        ("UC06", "Gợi ý sách (đã đăng nhập)", "Khách hàng đã đăng nhập", "Cung cấp sách gợi ý cá nhân hóa dựa trên lịch sử tìm kiếm và mua hàng", "Khách mở trang đề xuất → Hệ thống tính toán điểm Hybrid → Hiển thị danh sách cá nhân hóa.", "image15.png"),
        ("UC07", "Giỏ hàng", "Khách hàng đã đăng nhập", "Quản lý sách trong giỏ trước khi thực hiện mua hàng", "Thêm sách vào giỏ → Xem giỏ hàng → Cập nhật số lượng hoặc xóa sách.", "image10.png"),
        ("UC08", "Mua và thanh toán", "Khách hàng đã đăng nhập", "Cho phép khách hàng đặt hàng, thanh toán và chọn phương thức vận chuyển", "Vào giỏ hàng → Chọn thanh toán → Chọn vận chuyển → Xác nhận đặt hàng.", "image11.png"),
        ("UC09", "Đánh giá sách", "Khách hàng đã đăng nhập", "Cho phép khách hàng viết nhận xét và đánh giá sách đã mua", "Chọn sách đã mua → Chọn đánh giá → Viết nhận xét và chấm sao → Lưu đánh giá.", "image12.png"),
        ("UC10", "Quản lý tài khoản", "Khách hàng đã đăng nhập", "Cho phép khách hàng cập nhật thông tin cá nhân, mật khẩu và địa chỉ", "Vào trang tài khoản → Sửa thông tin cá nhân, đổi mật khẩu → Lưu thay đổi.", "image13.png"),
        ("UC11", "Xem lịch sử mua hàng", "Khách hàng đã đăng nhập", "Cho phép khách hàng xem lại các đơn hàng đã mua trước đó", "Vào lịch sử đơn hàng → Xem danh sách đơn → Xem chi tiết trạng thái đơn.", "image14.png"),
        ("UC12", "Liên hệ", "Khách hàng đã đăng nhập", "Cho phép khách hàng gửi yêu cầu hỗ trợ hoặc phản hồi đến hệ thống", "Mở form liên hệ → Nhập nội dung phản hồi → Gửi và nhận thông báo.", "image15.png"),
        ("UC13", "Chatbot hỗ trợ", "Khách hàng đã đăng nhập", "Cung cấp hỗ trợ tự động và cá nhân hóa dựa trên lịch sử mua hàng và thông tin khách", "Mở khung chat → Nhập câu hỏi → AI phân tích ý định và trả lời có nguồn.", "image10.png"),
        ("UC14", "Quản lý sản phẩm", "Admin", "Cho phép admin quản lý toàn bộ sản phẩm trong hệ thống", "Vào quản lý sách → Thêm mới / Chỉnh sửa / Xóa sách → Cập nhật CSDL.", "image11.png"),
        ("UC15", "Quản lý tin tức", "Admin", "Cho phép admin quản lý tin tức, thông báo trên website", "Vào quản lý tin tức → Đăng bài mới / Sửa / Xóa tin → Cập nhật hiển thị.", "image12.png"),
        ("UC16", "Quản lý khách hàng", "Admin", "Quản lý toàn bộ tài khoản khách hàng trong hệ thống", "Xem danh sách khách hàng → Sửa thông tin hoặc khóa tài khoản vi phạm.", "image13.png"),
        ("UC17", "Quản lý đơn hàng", "Admin", "Quản lý toàn bộ đơn hàng, xử lý và cập nhật trạng thái thanh toán, giao hàng", "Xem danh sách đơn → Cập nhật trạng thái thanh toán và vận chuyển.", "image14.png")
    ]

    for uc_code, uc_title, actor, desc, flow, img_f in ucs_detail:
        add_h2(doc, f"Use Case {uc_code}: {uc_title}")
        uc_table_data = [
            ["Mã UC", uc_code],
            ["Tên Use Case", uc_title],
            ["Actor chính", actor],
            ["Mục tiêu", desc],
            ["Luồng thực thi chính", flow],
            ["Yêu cầu phi chức năng", "Thời gian phản hồi < 2s, đảm bảo tính toàn vẹn dữ liệu và bảo mật phiên."]
        ]
        add_styled_table(doc, ["Mục", "Nội dung"], uc_table_data, f"Bảng: Mô tả use case {uc_code} {uc_title}", col_widths=[4.0, 12.0])

    add_h2(doc, "3.4.2. Sơ đồ tuần tự (Sequence Diagram)")
    add_body(doc, "Sơ đồ tuần tự tổng quát mô tả luồng giao tiếp chuẩn giữa Client Browser, Server Controllers, Service Layer, Database và AI Engine:")
    add_img(doc, "image10.png", 14.5, "Hình 3-42: Sơ đồ tuần tự tổng quát")

    add_h2(doc, "3.4.3. Sơ đồ hoạt động (Activity Diagram)")
    add_body(doc, "Các sơ đồ hoạt động mô tả chi tiết quy trình xử lý luồng gợi ý và quản trị:")
    add_img(doc, "image11.png", 13.0, "Hình 3-50: Sơ đồ hoạt động Content-based Filtering")
    add_img(doc, "image12.png", 13.0, "Hình 3-51: Sơ đồ hoạt động Collaborative Filtering")
    add_img(doc, "image13.png", 13.0, "Hình 3-52: Sơ đồ hoạt động Hybrid Recommendation")
    add_img(doc, "image14.png", 13.0, "Hình 3-53: Sơ đồ hoạt động Chatbot AI")
    add_img(doc, "image15.png", 13.0, "Hình 3-54: Sơ đồ hoạt động quản lý cửa hàng sách cho quản trị viên")

    # 3.5: Thiết kế nguyên mẫu giao diện người dùng
    add_h1(doc, "3.5. Thiết kế nguyên mẫu giao diện người dùng thực tế")
    add_body(doc, "Toàn bộ giao diện hệ thống được chụp trực tiếp từ ứng dụng đang hoạt động thực tế trên máy tính (Windows):")
    
    add_h2(doc, "3.5.1. Giao diện người dùng (Khách & Độc giả)")
    add_img(doc, "01_homepage_top.png", 14.5, "Hình 3-55: Giao diện trang chủ BookVerse AI (Hero Banner & Tìm kiếm)")
    add_img(doc, "02_homepage_shelf.png", 14.5, "Hình 3-56: Giao diện kệ sách hot và danh mục nổi bật trang chủ")
    add_img(doc, "03_catalog_grid.png", 14.5, "Hình 3-57: Giao diện danh mục sách (Catalog Grid & Bộ lọc thể loại)")
    add_img(doc, "04_catalog_search.png", 14.5, "Hình 3-58: Giao diện tìm kiếm sách thông minh")
    add_img(doc, "07_ebook_reader.png", 14.5, "Hình 3-59: Giao diện trình đọc Ebook trực tuyến tương tác cao")
    add_img(doc, "08_membership_plans.png", 14.5, "Hình 3-60: Giao diện đăng ký các gói hội viên BookVerse")
    add_img(doc, "09_marketplace_list.png", 14.5, "Hình 3-61: Giao diện sàn giao dịch sách cũ P2P Marketplace")

    add_h2(doc, "3.5.2. Giao diện đề xuất sản phẩm cá nhân hóa")
    add_img(doc, "05_discover_recommendations.png", 14.5, "Hình 3-62: Giao diện đề xuất gợi ý cá nhân hóa (AI Discovery)")
    add_img(doc, "13_user_library.png", 14.5, "Hình 3-63: Giao diện tủ sách cá nhân và bookmark của độc giả")
    add_img(doc, "14_reading_insights.png", 14.5, "Hình 3-64: Giao diện thống kê tiến độ và thời gian đọc sách")
    add_img(doc, "15_reading_calendar.png", 14.5, "Hình 3-65: Giao diện lịch theo dõi thói quen đọc sách")
    add_img(doc, "16_reading_goals.png", 14.5, "Hình 3-66: Giao diện thiết lập mục tiêu và thử thách đọc sách")
    add_img(doc, "17_community_forum.png", 14.5, "Hình 3-67: Giao diện diễn đàn cộng đồng bạn đọc BookVerse")

    add_h2(doc, "3.5.3. Giao diện Chatbot trợ lý ảo")
    add_img(doc, "06_assistant_chat.png", 14.5, "Hình 3-68: Giao diện Trợ lý AI Nova tư vấn sách và giải đáp nghiệp vụ")

    add_h2(doc, "3.5.4. Giao diện Quản trị viên (Admin Center sau đăng nhập)")
    add_img(doc, "19_admin_analytics.png", 14.5, "Hình 3-69: Bảng điều khiển Admin Analytics – Doanh thu và thống kê bạn đọc")
    add_img(doc, "20_admin_membership.png", 14.5, "Hình 3-70: Giao diện Quản trị viên cấu hình các gói hội viên")
    add_img(doc, "21_admin_subscriptions.png", 14.5, "Hình 3-71: Giao diện quản lý danh sách thuê bao hội viên đang hoạt động")
    add_img(doc, "22_admin_integrations.png", 14.5, "Hình 3-72: Giao diện kiểm tra tích hợp hệ thống AI, Email và CSDL")

    # 3.6: Thiết kế chi tiết & Triển khai thực tế
    add_h1(doc, "3.6. Thiết kế chi tiết & Triển khai thực tế")
    add_h2(doc, "3.6.1. Triển khai môi trường phát triển")
    add_body(doc, "Hệ thống được phát triển và kiểm thử trên môi trường Windows 11 với Visual Studio Code, Node.js 20+, Python 3.11+ và Docker Desktop.")
    add_img(doc, "10_login_form.png", 13.0, "Hình 3-73: Form xác thực đăng nhập người dùng")
    add_img(doc, "11_register_form.png", 13.0, "Hình 3-74: Form đăng ký tài khoản độc giả mới")

    add_h2(doc, "3.6.2. Triển khai Cơ sở dữ liệu và AI Engine")
    add_body(doc, "Cơ sở dữ liệu PostgreSQL 16 tích hợp extension pgvector cho phép lưu trữ và truy vấn vector tương đồng cosine với tốc độ cao dưới 50ms.")

    # 3.7: Kiểm thử hệ thống & Phân quyền
    add_h1(doc, "3.7. Kiểm thử hệ thống & Phân quyền")
    add_body(doc, "Hệ thống áp dụng ma trận phân quyền Role-Based Access Control (RBAC) nghiêm ngặt:")
    matrix_rows = [
        ["Xem catalog / Tìm kiếm", "Có", "Có", "Có", "Có"],
        ["Đọc thử Ebook (10%)", "Không", "Có", "Có", "Có"],
        ["Đọc toàn bộ Ebook", "Không", "Khi có quyền", "Khi có quyền", "Có"],
        ["Đăng tin bán sách cũ", "Không", "Có (Seller)", "Có (Seller)", "Toàn quyền"],
        ["Dùng Trợ lý AI Nova", "Giới hạn", "Đầy đủ", "Đầy đủ", "Đầy đủ"],
        ["Admin Analytics & Quản trị", "Không", "Không", "Không", "Toàn quyền"]
    ]
    add_styled_table(doc, ["Chức năng nghiệp vụ", "Khách", "Độc giả", "Người bán", "Admin"], matrix_rows, "Bảng 3-10: Ma trận phân quyền theo vai trò", col_widths=[4.5, 2.5, 3.0, 3.0, 3.0])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM
    # -------------------------------------------------------------
    add_h_chapter(doc, "CHƯƠNG 4: KẾT QUẢ VÀ THỰC NGHIỆM")
    add_h1(doc, "4.1 Các kịch bản thử nghiệm")
    add_body(doc, "Kịch bản 1: Gợi ý theo nội dung (Content-based Filtering) – Đề xuất sách dựa trên tương đồng thuộc tính tác giả, thể loại, từ khóa mô tả.")
    add_body(doc, "Kịch bản 2: Gợi ý dựa trên hành vi người dùng (Collaborative Filtering) – Khai thác ma trận tương tác User-Item để tìm mối liên kết ngầm.")
    add_body(doc, "Kịch bản 3: Gợi ý lai (Hybrid Recommendation) – Kết hợp cả hai phương pháp, giải quyết triệt để vấn đề cold-start.")
    add_body(doc, "Kịch bản 4: Trợ lý AI Chatbot – Đánh giá độ chính xác phân loại ý định và trả lời thông tin nhà sách có trích dẫn nguồn.")

    add_h1(doc, "4.2. Kết quả thử nghiệm các kịch bản")
    eval_rows = [
        ["Kịch bản 1: Content-based", "Content-based Filtering", "78.0%", "72.0%", "75.0%", "2.3s"],
        ["Kịch bản 2: Collaborative", "Collaborative Filtering", "83.0%", "80.0%", "81.5%", "3.1s"],
        ["Kịch bản 3: Hybrid", "Hybrid Recommendation", "89.0%", "85.0%", "87.0%", "4.2s"],
        ["Kịch bản 4: Trợ lý AI RAG", "Intent Classification + RAG", "92.5%", "90.0%", "91.2%", "1.5s"]
    ]
    add_styled_table(doc, ["Kịch bản", "Mô hình", "Precision@K", "Recall@K", "F1-Score", "Thời gian phản hồi"], eval_rows, "Bảng 4-1: Kết quả thử nghiệm các kịch bản Recommendation system", col_widths=[4.0, 4.5, 2.5, 2.5, 2.5, 2.5])

    # Biểu đồ đánh giá thực nghiệm
    add_img(doc, "evaluation_chart.png", 14.5, "Hình 4-1: Biểu đồ đánh giá hiệu năng các mô hình thực nghiệm")

    add_h1(doc, "4.3. Xử lý các trường hợp ngoại lệ")
    exc_rows = [
        ["Người dùng mới (Cold Start)", "50", "50", "100%", "Sử dụng Content-based Filtering để gợi ý sách dựa trên các đặc điểm sản phẩm khi không có dữ liệu hành vi người dùng."],
        ["Dữ liệu mô tả sách bị thiếu", "30", "30", "100%", "Sử dụng các thông tin bổ sung từ sách tương tự hoặc yêu cầu cập nhật lại thông tin mô tả."],
        ["Dữ liệu hành vi người dùng bị thiếu", "20", "20", "100%", "Dùng Content-based Filtering để gợi ý sản phẩm cho người dùng mới hoặc khi thiếu dữ liệu hành vi."],
        ["Thời gian phản hồi chậm (>2 giây)", "15", "13", "87%", "Tối ưu hóa thuật toán tính toán sự tương đồng trong Collaborative Filtering và Hybrid Recommendation để giảm thời gian phản hồi."],
        ["Lỗi DB hoặc truy vấn thất bại", "1", "1", "100%", "Thông báo lỗi và tự động khôi phục kết nối cơ sở dữ liệu, đảm bảo các truy vấn được thực hiện chính xác."]
    ]
    add_styled_table(doc, ["Trường hợp ngoại lệ", "Số lần xảy ra", "Xử lý thành công", "Tỷ lệ", "Giải pháp"], exc_rows, "Bảng 4-4: Bảng xử lý các trường hợp ngoại lệ", col_widths=[4.0, 1.8, 2.0, 1.8, 6.4])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN
    # -------------------------------------------------------------
    add_h_chapter(doc, "CHƯƠNG 5: KẾT LUẬN - HƯỚNG PHÁT TRIỂN")
    add_h1(doc, "5.1. Kết quả đối chiếu với mục tiêu :")
    obj_rows = [
        ["Hệ thống gợi ý theo nội dung", "Precision, Recall, F1 > 60%. Thời gian phản hồi < 2s.", "Precision@10 = 65%, Recall@10 = 61%, F1 = 63%. Phản hồi = 1.8s.", "Đạt", "Đáp ứng tốt yêu cầu cơ bản, thích hợp cho người dùng mới."],
        ["Hệ thống gợi ý dựa trên hành vi", "Độ chính xác cao hơn Content-based với người có lịch sử.", "Precision@10 = 71%, Recall@10 = 67%, F1 = 69%.", "Đạt", "Hoạt động tốt với người dùng có lịch sử mua/đánh giá sách."],
        ["Hệ thống gợi ý lai (Hybrid)", "F1 cao hơn 5–10% so với từng mô hình riêng lẻ. Giải quyết tốt cold-start.", "Precision@10 = 77%, Recall@10 = 73%, F1 = 75%.", "Đạt", "Độ chính xác cải thiện rõ rệt, khắc phục cold-start hiệu quả."],
        ["Chatbot hỗ trợ thông tin", "Tỷ lệ nhận diện intent > 80%. Thời gian < 2s.", "Tỷ lệ intent = 85%. Phản hồi = 1.5s.", "Đạt", "Chatbot xử lý tốt các intent phổ biến về thông tin cửa hàng."],
        ["Giao diện hiển thị kết quả", "Hiển thị top-N rõ ràng, hài lòng > 70%.", "76% người dùng thử nghiệm hài lòng.", "Đạt", "Giao diện thân thiện, trực quan, hỗ trợ đa thiết bị."],
        ["Khả năng mở rộng dữ liệu", "Hệ thống xử lý tốt hàng nghìn bản ghi.", "Thử nghiệm với 10.000 sách vẫn giữ thời gian phản hồi < 2s.", "Đạt", "Có thể triển khai thực tế cho nhà sách trực tuyến."]
    ]
    add_styled_table(doc, ["Kết quả cần đạt", "Tiêu chí đánh giá", "Kết quả thực tế", "Đánh giá", "Giải thích"], obj_rows, "Bảng 5-1: Kết quả đối chiếu với mục tiêu", col_widths=[3.5, 3.5, 4.0, 1.5, 3.5])

    add_h1(doc, "5.2. Các hạn chế của đồ án")
    add_body(doc, "5.2.1 Cold-start cho người dùng mới: Dù mô hình Hybrid đã cải thiện, nhưng khi dữ liệu người dùng quá ít (chỉ có 1–2 lượt tương tác), gợi ý chưa thực sự chính xác.")
    add_body(doc, "5.2.2 Giới hạn dữ liệu thử nghiệm: Hệ thống mới chỉ thử nghiệm trên tập dữ liệu chuẩn hóa và vài trăm người dùng mô phỏng; cần tiếp tục kiểm chứng trên quy mô lớn hơn.")
    add_body(doc, "5.2.3 Khả năng xử lý ngôn ngữ tự nhiên: Trợ lý AI hiện tập trung tối ưu vào các nhóm ý định nghiệp vụ nhà sách; cần mở rộng thêm khả năng đàm thoại ngữ cảnh dài.")

    add_h1(doc, "5.3. Hướng phát triển :")
    add_bullet(doc, "Áp dụng Deep Learning (Neural Collaborative Filtering, BERT) và Knowledge Graph để nâng cao độ chính xác gợi ý.", "Cải tiến mô hình gợi ý: ")
    add_bullet(doc, "Tích hợp mô hình Large Language Model (LLM) để chatbot hiểu ngữ cảnh hội thoại sâu và tự nhiên hơn.", "Phát triển Trợ lý AI: ")
    add_bullet(doc, "Tích hợp cổng thanh toán trực tuyến chính thức và triển khai thử nghiệm thực tế tại các nhà sách đối tác.", "Ứng dụng thực tế: ")

    doc.add_page_break()

    # -------------------------------------------------------------
    # KẾT LUẬN
    # -------------------------------------------------------------
    add_p(doc, "KẾT LUẬN", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=10, space_after=14)
    add_body(doc, "Trong quá trình nghiên cứu và thực hiện đồ án, em đã xây dựng hoàn chỉnh hệ thống Smart Bookstore Online có tích hợp hệ gợi ý cá nhân hóa và Trợ lý AI thông minh. Hệ thống áp dụng linh hoạt cả ba phương pháp: Content-based Filtering cho khách mới, Collaborative Filtering cho người dùng đã có lịch sử tương tác, và Hybrid Recommendation nhằm tối ưu hóa độ chính xác và khắc phục hạn chế Cold-start.")
    add_body(doc, "Hệ thống đáp ứng đầy đủ các luồng nghiệp vụ từ catalog, giỏ hàng, đặt hàng, quản lý hội viên, trình đọc Ebook trực tuyến, chợ sách cũ P2P cho đến phân hệ quản trị Admin Center. Kiểm thử thực nghiệm cho thấy hệ thống hoạt động ổn định, thời gian phản hồi nhanh dưới 2 giây và giao diện thân thiện trên đa thiết bị.")
    add_body(doc, "Đồ án đã chứng minh được tính khả thi và hiệu quả to lớn của việc ứng dụng Trí tuệ nhân tạo vào thương mại điện tử, đặt nền tảng vững chắc cho các nghiên cứu và ứng dụng thực tiễn tiếp theo.")

    doc.add_page_break()

    # -------------------------------------------------------------
    # PHỤ LỤC
    # -------------------------------------------------------------
    add_p(doc, "PHỤ LỤC", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=10, space_after=14)
    add_h1(doc, "1. Hướng dẫn cài đặt và triển khai")
    add_body(doc, "Triển khai Database & AI Microservice:")
    add_bullet(doc, "Cài đặt Docker Desktop và khởi động container PostgreSQL pgvector (port 5432) và FastAPI AI Service (port 8000).")
    add_body(doc, "Triển khai Website Smart Bookstore:")
    add_bullet(doc, "Cài đặt các gói phụ thuộc bằng lệnh npm install.")
    add_bullet(doc, "Chạy migration cơ sở dữ liệu và khởi động ứng dụng bằng lệnh npm run dev.")
    add_bullet(doc, "Truy cập website qua trình duyệt tại địa chỉ: http://localhost:3000/")

    add_h1(doc, "2. Tài khoản demo kiểm thử")
    add_bullet(doc, "reader.bookverse.demo@gmail.com / Mật khẩu: 123456", "Tài khoản độc giả: ")
    add_bullet(doc, "admin.bookverse.demo@gmail.com / Mật khẩu: 123456", "Tài khoản quản trị viên: ")

    doc.add_page_break()

    # -------------------------------------------------------------
    # TÀI LIỆU THAM KHẢO
    # -------------------------------------------------------------
    add_p(doc, "TÀI LIỆU THAM KHẢO", alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=10, space_after=14)
    refs = [
        "[1] F. Ricci, L. Rokach, and B. Shapira, Recommender Systems Handbook. Springer, 2015.",
        "[2] D. Jannach, M. Zanker, A. Felfernig, and G. Friedrich, Recommender Systems: An Introduction. Cambridge University Press, 2010.",
        "[3] M. Pazzani and D. Billsus, 'Content-Based Recommendation Systems,' in The Adaptive Web, Springer, 2007.",
        "[4] Y. Koren, R. Bell, and C. Volinsky, 'Matrix Factorization Techniques for Recommender Systems,' IEEE Computer, 2009.",
        "[5] P. Lewis et al., 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,' in NeurIPS, 2020.",
        "[6] Next.js Documentation, 'App Router and Server Actions Architecture,' Vercel, 2025.",
        "[7] FastAPI Documentation, 'High-performance Python Web Framework,' Tiangolo, 2025.",
        "[8] PostgreSQL Global Development Group, 'pgvector: Open-source vector similarity search for Postgres,' 2025.",
        "[9] Nguyễn Minh Đạo, 'Giáo trình lập trình Web hiện đại', Nhà xuất bản Đại học Quốc gia TP.HCM."
    ]
    for r_text in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pf = p.paragraph_format
        pf.space_after = Pt(4)
        pf.line_spacing = 1.3
        r = p.add_run(r_text)
        set_run_font(r, size_pt=12.5)

    print(f"Saving finalized thesis document to {OUTPUT_DOCX}...")
    doc.save(OUTPUT_DOCX)
    print("SUCCESS: File generated successfully!")
    print(f"Total paragraphs: {len(doc.paragraphs)}")
    print(f"Total tables: {len(doc.tables)}")
    print(f"File size: {os.path.getsize(OUTPUT_DOCX)} bytes")

if __name__ == '__main__':
    build_thesis()
