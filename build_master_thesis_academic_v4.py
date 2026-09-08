# -*- coding: utf-8 -*-
"""
Script xây dựng Báo cáo Đồ án tốt nghiệp BookVerse AI chuẩn Academic
Tiếp thu và hoàn thiện toàn bộ 32 điểm góp ý của GVHD / Hội đồng:
1. Chuẩn hóa thuật ngữ khoa học (Recommendation System, RAG, Hybrid RecSys).
2. Khảo sát hệ thống tương tự có bảng so sánh đa chiều và trích dẫn.
3. Bổ sung chiều sâu lý thuyết RecSys (Explicit/Implicit feedback, User-Item Matrix, Sparsity, pgvector HNSW, Dynamic Hybrid α).
4. Tinh chỉnh kiến trúc 4 tầng, chuẩn hóa 4 Actor (Guest, Reader, Seller, Admin), phân định RBAC vs Entitlement.
5. Chi tiết 17 Use Case với đầy đủ Precondition, Postcondition, Main flow, Alternative flow.
6. Tái cấu trúc Chương 4 thành 9 mục học thuật chuẩn: Temporal Train/Test split, Ground Truth, Baseline, Ablation study, Cold-start analysis, RAG 5-metric evaluation, Web test cases, Latency percentiles.
7. Chương 5 đối chiếu trung thực với Chương 1, phân tích sâu sắc các hạn chế học thuật (Sparsity, Popularity Bias, Hallucination, A/B Testing).
8. Mục Data Privacy & Minimization, danh mục Tài liệu tham khảo chuẩn IEEE.
9. Định dạng Word chuẩn ĐH Bình Dương: Bìa đôi viền trang đôi Section 1, Section 2 lề 2-2-3-2cm, Header/Footer có line phân cách và số trang chuẩn.
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
OUTPUT_DOCX = 'D:/Doantotnghiep/Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_OFFICIAL_ACADEMIC.docx'

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

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
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
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size_pt=15, space_before=16, space_after=8)

def add_h1(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size_pt=13, space_before=10, space_after=4)

def add_h2(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, italic=True, size_pt=13, space_before=7, space_after=3)

def add_h3(doc, text):
    return add_p(doc, text, alignment=WD_ALIGN_PARAGRAPH.LEFT, bold=True, italic=True, size_pt=13, space_before=5, space_after=2)

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

def add_img(doc, img_name, width_cm=14.0, caption_text=None):
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
        set_cell_margins(cell, top=120, bottom=120, left=130, right=130)
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
            set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (ci == 0 and len(str(cell_text)) < 8) or (ci == 1 and len(str(cell_text)) < 8) else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(cell_text))
            set_run_font(r, size_pt=11)

    if col_widths:
        for row in table.rows:
            for ci, w in enumerate(col_widths):
                row.cells[ci].width = Cm(w)

    if caption_text:
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
