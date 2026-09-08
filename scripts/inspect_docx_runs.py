import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document('Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_HOAN_THIEN_CHUONG_5_KET_LUAN.docx')

for idx in [520, 521, 522, 523]:
    p = doc.paragraphs[idx]
    print(f'P {idx} (style: {p.style.name}):')
    for r in p.runs:
        print(f'  run: "{r.text}" | bold: {r.bold}, italic: {r.italic}, font: {r.font.name}, size: {r.font.size}')
