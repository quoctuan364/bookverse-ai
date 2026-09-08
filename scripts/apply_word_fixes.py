import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')

SRC_PATH = 'Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_HOAN_THIEN_CHUONG_5_KET_LUAN.docx'
TARGET_PATH = 'Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_HOAN_THIEN_CHINH_SUA_CHUAN.docx'

doc = docx.Document(SRC_PATH)

# 1. Update Table 33 (Table 5-1)
table51 = doc.tables[33]
row1 = table51.rows[1]

# Cell 1: Bằng chứng hiện tại
cell1 = row1.cells[1]
for p in cell1.paragraphs:
    for r in p.runs:
        r.text = ""
p1 = cell1.paragraphs[0]
r1 = p1.runs[0] if p1.runs else p1.add_run()
r1.text = "272/272 TypeScript unit; 82/82 Python; typecheck, lint và Next.js production build (34 routes) đạt 100%"
r1.font.name = "Times New Roman"
r1.font.size = docx.shared.Pt(8.5)

# Cell 2: Đánh giá
cell2 = row1.cells[2]
for p in cell2.paragraphs:
    for r in p.runs:
        r.text = ""
p2 = cell2.paragraphs[0]
r2 = p2.runs[0] if p2.runs else p2.add_run()
r2.text = "Đạt toàn diện phần kỹ thuật Web & Mobile"
r2.font.name = "Times New Roman"
r2.font.size = docx.shared.Pt(8.5)

# Cell 3: Kết luận học thuật
cell3 = row1.cells[3]
for p in cell3.paragraphs:
    for r in p.runs:
        r.text = ""
p3 = cell3.paragraphs[0]
r3 = p3.runs[0] if p3.runs else p3.add_run()
r3.text = "Đã hoàn thiện Web Next.js 15 và Mobile App Expo"
r3.font.name = "Times New Roman"
r3.font.size = docx.shared.Pt(8.5)

# Cell 4: Việc còn lại
cell4 = row1.cells[4]
for p in cell4.paragraphs:
    for r in p.runs:
        r.text = ""
p4 = cell4.paragraphs[0]
r4 = p4.runs[0] if p4.runs else p4.add_run()
r4.text = "Sẵn sàng trình diễn trực tiếp Web và Mobile trước Hội đồng"
r4.font.name = "Times New Roman"
r4.font.size = docx.shared.Pt(8.5)

# 2. Update Section 5.3 Paragraphs (521, 522, 523)
p521 = doc.paragraphs[521]
p521.text = ""
r521_bold = p521.add_run("1. Nâng cấp mô hình gợi ý với Đồ thị tri thức (Knowledge Graph & GNN): ")
r521_bold.bold = True
r521_bold.font.name = "Times New Roman"
r521_bold.font.size = docx.shared.Pt(13)

r521_norm = p521.add_run("Xây dựng mạng lưới liên kết sâu giữa tác giả, thể loại, phong cách sáng tác; nghiên cứu áp dụng các kiến trúc Graph Neural Networks (như LightGCN, KGAT) nhằm khai thác tri thức liên kết phi tuyến tính, nâng cao độ phong phú và khả năng giải thích của gợi ý.")
r521_norm.bold = False
r521_norm.font.name = "Times New Roman"
r521_norm.font.size = docx.shared.Pt(13)

p522 = doc.paragraphs[522]
p522.text = ""
r522_bold = p522.add_run("2. Tối ưu hóa Trợ lý AI với mô hình ngôn ngữ chuyên biệt: ")
r522_bold.bold = True
r522_bold.font.name = "Times New Roman"
r522_bold.font.size = docx.shared.Pt(13)

r522_norm = p522.add_run("Tận dụng dữ liệu tương tác ẩn danh có đồng thuận (Consent v1) để xây dựng tập ngữ liệu Q&A chuyên ngành xuất bản; nghiên cứu tinh chỉnh (Fine-tuning) mô hình ngôn ngữ mã nguồn mở tiếng Việt bằng LoRA/QLoRA kết hợp cơ chế RAG hiện tại để tăng độ tự nhiên và giảm phụ thuộc vào API thương mại.")
r522_norm.bold = False
r522_norm.font.name = "Times New Roman"
r522_norm.font.size = docx.shared.Pt(13)

p523 = doc.paragraphs[523]
p523.text = ""
r523_bold = p523.add_run("3. Phát triển hoàn thiện Ứng dụng Di động (Mobile App): ")
r523_bold.bold = True
r523_bold.font.name = "Times New Roman"
r523_bold.font.size = docx.shared.Pt(13)

r523_norm = p523.add_run("Tiếp tục phát triển mở rộng ứng dụng di động BookVerse AI Mobile (React Native / Expo SDK 52) đã khởi tạo, hỗ trợ tải sách đọc ngoại tuyến (Offline Reading) và đồng bộ thời gian thực.")
r523_norm.bold = False
r523_norm.font.name = "Times New Roman"
r523_norm.font.size = docx.shared.Pt(13)

doc.save(TARGET_PATH)
print("Updated DOCX successfully saved to:", TARGET_PATH)
