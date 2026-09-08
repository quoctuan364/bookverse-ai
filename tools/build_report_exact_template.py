"""Tạo báo cáo BookVerse theo đúng khung trình bày của file Word mẫu.

File mẫu luôn chỉ được đọc; file kết quả được tạo tại thư mục outputs.
"""

from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

from build_academic_report import add_figure, build_diagrams, set_font


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(r"C:\Users\LilTuan\Downloads\22050040_NguyenHoangAn_Baocao.docx")
SOURCE = ROOT / "docs" / "ACADEMIC_REPORT_DRAFT.md"
OUTPUT = ROOT / "outputs" / "Bao_cao_do_an_Luong_Nguyen_Quoc_Tuan_22050098_theo_mau.docx"

STUDENT = "Lương Nguyễn Quốc Tuấn"
STUDENT_UPPER = STUDENT.upper()
MSSV = "22050098"
CLASS = "25TH01"
TOPIC = "PHÁT TRIỂN NỀN TẢNG BOOKVERSE AI TÍCH HỢP HỆ GỢI Ý SÁCH VÀ TRỢ LÝ RAG KIỂM SOÁT NGUỒN"


def set_paragraph_text(paragraph, text: str) -> None:
    """Thay chữ nhưng giữ lại style, căn lề và định dạng của đoạn trong mẫu."""
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(text)


def replace_text_everywhere(doc: Document) -> None:
    replacements = {
        "Nguyễn Hoàng An": STUDENT,
        "NGUYỄN HOÀNG AN": STUDENT_UPPER,
        "22050040": MSSV,
        "PHÁT TRIỂN NỀN TẢNG SMART SHOPPING ASSISTANT TÍCH HỢP PHÂN TÍCH CẢM XÚC VÀ DỰ BÁO XU HƯỚNG GIÁ SẢN PHẨM": TOPIC,
    }
    containers = list(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                containers.extend(cell.paragraphs)
    for section in doc.sections:
        containers.extend(section.header.paragraphs)
        containers.extend(section.footer.paragraphs)
    for paragraph in containers:
        for old, new in replacements.items():
            if old in paragraph.text:
                # Giữ nguyên font của run đầu tiên để không phá giao diện mẫu.
                set_paragraph_text(paragraph, paragraph.text.replace(old, new))


def remove_automatic_heading_numbers(doc: Document) -> None:
    """Nguồn nội dung đã có số chương/mục; tắt số tự sinh của mẫu để không bị lặp."""
    for style_name in ("Heading 1", "Heading 2", "Heading 3"):
        p_pr = doc.styles[style_name]._element.pPr
        if p_pr is None:
            continue
        for node in list(p_pr):
            if node.tag == qn("w:numPr"):
                p_pr.remove(node)


def remove_from_acknowledgements(doc: Document) -> None:
    """Xóa phần nội dung cũ sau trang nhận xét, không đụng vào trang bìa mẫu."""
    anchor = next(i for i, p in enumerate(doc.paragraphs) if p.text.strip() == "LỜI CẢM ƠN")
    body = doc._element.body
    remove_elements = [p._element for p in doc.paragraphs[anchor:]]
    # Table sau phần lời cảm ơn cũng là nội dung cũ, cần bỏ để tránh sót đề tài cũ.
    remove_elements.extend(t._element for t in doc.tables)
    for element in remove_elements:
        parent = element.getparent()
        if parent is not None:
            parent.remove(element)


def add_field(paragraph, instruction: str, placeholder: str = "") -> None:
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run = paragraph.add_run()._r
    run.extend([begin, instr, separate, text, end])


def page_break(doc: Document) -> None:
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def add_acknowledgements(doc: Document) -> None:
    heading = doc.add_paragraph("LỜI CẢM ƠN", style="Title")
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for text in [
        "Trong quá trình học tập và thực hiện đồ án tốt nghiệp, em đã nhận được sự quan tâm, hướng dẫn và động viên từ quý thầy cô, gia đình và bạn bè.",
        "Em xin trân trọng cảm ơn Ban Giám hiệu Trường Đại học Bình Dương, Viện Trí tuệ nhân tạo và Chuyển đổi số cùng quý thầy cô Khoa Công nghệ Thông tin, Robot và Trí tuệ nhân tạo đã trang bị cho em nền tảng kiến thức và tạo điều kiện để em hoàn thành đồ án.",
        "Em cũng xin cảm ơn các bạn đã góp ý trong quá trình kiểm thử và hoàn thiện sản phẩm. Do thời gian và kinh nghiệm thực tế còn hạn chế, báo cáo có thể vẫn còn thiếu sót; em mong nhận được ý kiến đóng góp để tiếp tục cải thiện trong thời gian tới.",
        "Em xin chân thành cảm ơn!",
    ]:
        p = doc.add_paragraph(text, style="Normal")
        p.paragraph_format.first_line_indent = Inches(0.3)
    signature = doc.add_paragraph()
    signature.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    signature.paragraph_format.space_before = Pt(16)
    set_font(signature.add_run(f"SINH VIÊN THỰC HIỆN\n{STUDENT}"), name="Times New Roman", size=12, bold=True)
    page_break(doc)


def add_toc(doc: Document) -> None:
    heading = doc.add_paragraph("MỤC LỤC", style="Title")
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    toc = doc.add_paragraph()
    add_field(toc, r'TOC \\o "1-3" \\h \\z \\u', "Cập nhật mục lục trong Word bằng Ctrl+A, F9")
    page_break(doc)


def add_paragraph(doc: Document, text: str, style: str = "Normal") -> None:
    p = doc.add_paragraph(style=style)
    p.paragraph_format.widow_control = True
    p.add_run(text)


def add_table(doc: Document, rows: list[list[str]]) -> None:
    table = doc.add_table(rows=len(rows), cols=max(len(r) for r in rows))
    table.style = "Table Grid"
    header_props = table.rows[0]._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    header_props.append(header)
    for r, values in enumerate(rows):
        for c, value in enumerate(values):
            cell = table.cell(r, c)
            cell.text = value
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(10)
                    if r == 0:
                        run.bold = True
    doc.add_paragraph()


def parse_source(doc: Document, diagrams: dict[str, Path]) -> None:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line == "## Tóm tắt")
    i = start
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer
        if buffer:
            add_paragraph(doc, " ".join(x.strip() for x in buffer))
            buffer = []

    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            flush(); i += 1; continue
        if line == "<!-- PAGE_BREAK -->":
            flush(); page_break(doc); i += 1; continue
        if line.startswith("|"):
            flush(); raw = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|[\s:|-]+\|$", lines[i]):
                    raw.append([x.strip() for x in lines[i].strip("|").split("|")])
                i += 1
            if raw:
                add_table(doc, raw)
            continue
        if line.startswith("#"):
            flush()
            level = len(line) - len(line.lstrip("#"))
            title = line[level:].strip()
            if level == 1:
                p = doc.add_paragraph(title.upper(), style="Heading 1")
                p.paragraph_format.page_break_before = True
            elif level == 2:
                doc.add_paragraph(title, style="Heading 2")
            else:
                doc.add_paragraph(title, style="Heading 3")
            if title.startswith("4.1 Kiến trúc"):
                add_figure(doc, diagrams["architecture"], "Hình 4.1: Sơ đồ kiến trúc tổng quan BookVerse AI")
            if title.startswith("4.3 Luồng quyền đọc"):
                add_figure(doc, diagrams["entitlement"], "Hình 4.2: Sơ đồ kiểm soát quyền truy cập nội dung đọc")
            i += 1; continue
        if line.startswith("- "):
            flush(); add_paragraph(doc, line[2:].strip(), style="List Paragraph"); i += 1; continue
        if re.match(r"^\d+\.\s+", line):
            flush(); add_paragraph(doc, re.sub(r"^\d+\.\s+", "", line), style="List Paragraph"); i += 1; continue
        buffer.append(line)
        i += 1
    flush()


def main() -> None:
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Không tìm thấy file mẫu: {TEMPLATE}")
    doc = Document(TEMPLATE)
    replace_text_everywhere(doc)
    remove_automatic_heading_numbers(doc)
    remove_from_acknowledgements(doc)

    # Chỉ thay hai dòng thông tin cá nhân ở bìa; không tự ghi tên GVHD khi chưa có dữ liệu.
    for paragraph in doc.paragraphs:
        if "SVTH:" in paragraph.text:
            set_paragraph_text(paragraph, f"GVHD: [Bổ sung tên giảng viên hướng dẫn]\nSVTH: {STUDENT} – {MSSV} – {CLASS}")

    add_acknowledgements(doc)
    add_toc(doc)
    parse_source(doc, build_diagrams())

    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")
    doc.core_properties.title = "Báo cáo đồ án BookVerse AI"
    doc.core_properties.author = f"{STUDENT} - {MSSV}"
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
