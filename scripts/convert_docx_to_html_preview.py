"""Chuyển đổi file Word .docx thành trang Web HTML xem trước trực tiếp (A4 Preview)."""

from __future__ import annotations

import base64
import os
from pathlib import Path
import mammoth


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCX_FILE = PROJECT_ROOT / "Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_Chuan_Mau.docx"
PUBLIC_HTML = PROJECT_ROOT / "public" / "bao_cao_tot_nghiep_preview.html"
OUTPUT_HTML = PROJECT_ROOT / "outputs" / "bao_cao_tot_nghiep_preview.html"


def convert_image(image):
    with image.open() as image_bytes:
        encoded_src = base64.b64encode(image_bytes.read()).decode("ascii")
        return {
            "src": f"data:{image.content_type};base64,{encoded_src}",
            "style": "max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);"
        }


def convert_docx():
    if not DOCX_FILE.exists():
        raise FileNotFoundError(f"Không tìm thấy: {DOCX_FILE}")

    with open(DOCX_FILE, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file, convert_image=mammoth.images.img_element(convert_image))
        html_body = result.value

    full_html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Đồ Án Tốt Nghiệp - BookVerse AI (Lương Nguyễn Quốc Tuấn)</title>
  <style>
    :root {{
      --primary: #0A4640;
      --accent: #A94432;
      --bg: #E8ECEF;
      --paper: #FFFFFF;
      --text: #111827;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: 'Times New Roman', Times, serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      font-size: 14pt;
    }}
    /* Top Action Bar */
    .top-bar {{
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(10, 70, 64, 0.96);
      color: #FFFFFF;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      backdrop-filter: blur(10px);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }}
    .top-bar h1 {{
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .top-bar .controls {{
      display: flex;
      gap: 12px;
    }}
    .top-bar button, .top-bar a {{
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #FFFFFF;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }}
    .top-bar button:hover, .top-bar a:hover {{
      background: #FFFFFF;
      color: var(--primary);
    }}
    /* A4 Document Container */
    .document-container {{
      max-width: 900px;
      margin: 30px auto;
      padding: 60px 80px;
      background: var(--paper);
      box-shadow: 0 10px 40px rgba(0,0,0,0.18);
      border-radius: 4px;
      min-height: 100vh;
    }}
    /* Typography matching Word */
    h1 {{
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      color: #0A4640;
      margin: 32px 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    h2 {{
      font-size: 15pt;
      font-weight: bold;
      color: #1B6E65;
      margin: 24px 0 10px 0;
    }}
    h3 {{
      font-size: 14pt;
      font-weight: bold;
      font-style: italic;
      color: #222222;
      margin: 16px 0 8px 0;
    }}
    p {{
      text-align: justify;
      margin-bottom: 10px;
      text-indent: 1.27cm;
    }}
    ul, ol {{
      margin: 8px 0 12px 30px;
    }}
    li {{
      margin-bottom: 6px;
      text-align: justify;
    }}
    /* Table Styling */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12pt;
    }}
    th, td {{
      border: 1px solid #333333;
      padding: 8px 12px;
      text-align: left;
    }}
    th {{
      background-color: #EAEAEA;
      font-weight: bold;
      text-align: center;
    }}
    /* Images */
    img {{
      max-width: 100%;
      height: auto;
      display: block;
      margin: 20px auto 8px auto;
      border: 1px solid #DDDDDD;
      border-radius: 4px;
    }}
    /* Print Optimization */
    @media print {{
      .top-bar {{ display: none; }}
      body {{ background: none; }}
      .document-container {{
        box-shadow: none;
        margin: 0;
        padding: 0;
        max-width: 100%;
      }}
    }}
  </style>
</head>
<body>
  <div class="top-bar">
    <h1>📖 BÁO CÁO ĐỒ ÁN TỐT NGHIỆP · BOOKVERSE AI</h1>
    <div class="controls">
      <button onclick="window.print()">🖨️ In / Xuất PDF</button>
      <a href="/Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_Chuan_Mau.docx" download>⬇️ Tải file Word (.docx)</a>
    </div>
  </div>

  <div class="document-container">
    {html_body}
  </div>
</body>
</html>
"""

    PUBLIC_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)

    with open(PUBLIC_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)

    print(f"Generated HTML preview at:\n- {PUBLIC_HTML}\n- {OUTPUT_HTML}")


if __name__ == "__main__":
    convert_docx()
