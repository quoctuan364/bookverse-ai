# Tương thích 24 Category legacy

Ngày xác minh: 14/07/2026.

## 1. Kết luận kỹ thuật

Database demo dùng 24 Category có ID `C001` đến `C024`, trùng ID với 24 phần tử đầu của taxonomy ultra-2200 nhưng khác tên và khác nghĩa. Vì vậy, map theo ID sẽ gắn sai canonical group. Cơ chế mới chỉ chọn profile khi **count, toàn bộ normalized name/slug, fingerprint và ID kiểm tra phụ** cùng khớp chính xác.

Database `bookverse_ai` chỉ được query read-only. Kết quả: 24 Category, mỗi Category có 50 Book và 50 Listing; chưa có `parentId`, `level`, `canonicalKey`, `canonicalName`.

## 2. Profile và checksum

- Profile: `legacy-demo-24@1.0.0`.
- Mapping riêng: `data/mappings/category_canonical_legacy_24.json`.
- Expected count: 24.
- Fingerprint: `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`.
- Mapping SHA-256: `fb547a5e5cda329aeaf0046e24aeef94f650c7108255320f50d5a8de1aa760e9`.
- Mapping ultra-2200 không đổi: `dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527`.

Fingerprint dùng SHA-256 của từng JSON line `[id, normalizedName, normalizedSlug]`, sort theo ID. Chuỗi được Unicode NFC, trim, collapse khoảng trắng và lowercase theo locale Việt Nam; không xóa dấu và không fuzzy matching. Analyzer chạy trên demo và clone rehearsal đều cho cùng fingerprint.

## 3. Bảng mapping đã duyệt

| Legacy ID | Name | Slug | Book | Canonical đề xuất | Lý do | Confidence |
|---|---|---|---:|---|---|---|
| C001 | AI & Machine Learning | ai-machine-learning | 50 | artificial-intelligence | Tên/slug chỉ rõ AI và machine learning | HIGH |
| C002 | Lập trình Web | lap-trinh-web | 50 | technology | Phát triển phần mềm web thuộc Công nghệ | HIGH |
| C003 | Khoa học dữ liệu | khoa-hoc-du-lieu | 50 | data-science | Trùng trực tiếp nhóm chuẩn | HIGH |
| C004 | Kinh doanh & Khởi nghiệp | kinh-doanh-khoi-nghiep | 50 | business | Kinh doanh và khởi nghiệp thuộc quản trị | HIGH |
| C005 | Marketing số | marketing-so | 50 | marketing | Nhánh trực tiếp của Marketing | HIGH |
| C006 | Tài chính cá nhân | tai-chinh-ca-nhan | 50 | personal-finance | Trùng trực tiếp nhóm chuẩn | HIGH |
| C007 | Kỹ năng mềm | ky-nang-mem | 50 | self-help | Phù hợp kỹ năng và phát triển bản thân | HIGH |
| C008 | Tâm lý học | tam-ly-hoc | 50 | psychology | Trùng trực tiếp nhóm chuẩn | HIGH |
| C009 | Văn học Việt Nam | van-hoc-viet-nam | 50 | literature | Phân nhóm Văn học theo quốc gia | HIGH |
| C010 | Văn học nước ngoài | van-hoc-nuoc-ngoai | 50 | literature | Phân nhóm Văn học theo nguồn gốc | HIGH |
| C011 | Thiếu nhi | thieu-nhi | 50 | children | Trùng trực tiếp nhóm chuẩn | HIGH |
| C012 | Lịch sử | lich-su | 50 | history | Trùng trực tiếp nhóm chuẩn | HIGH |
| C013 | Khoa học phổ thông | khoa-hoc-pho-thong | 50 | education | Nội dung kiến thức phổ thông phục vụ học tập; chưa có nhóm Khoa học đại cương | MEDIUM |
| C014 | Y học & Sức khỏe | y-hoc-suc-khoe | 50 | health | Thuộc trực tiếp nhóm Sức khỏe | HIGH |
| C015 | Ngoại ngữ | ngoai-ngu | 50 | education | Nằm trong nhóm Giáo dục và ngoại ngữ | HIGH |
| C016 | Giáo trình đại học | giao-trinh-dai-hoc | 50 | education | Nội dung giáo dục chính quy | HIGH |
| C017 | Thiết kế & Sáng tạo | thiet-ke-sang-tao | 50 | design | Sát nhất với Thiết kế và UX/UI | HIGH |
| C018 | Triết học | triet-hoc | 50 | philosophy | Trùng trực tiếp nhóm chuẩn | HIGH |
| C019 | Kỹ thuật phần mềm | ky-thuat-phan-mem | 50 | engineering | Chuyên ngành kỹ thuật phần mềm | HIGH |
| C020 | An toàn thông tin | an-toan-thong-tin | 50 | technology | Lĩnh vực công nghệ và an ninh mạng | HIGH |
| C021 | Cơ sở dữ liệu | co-so-du-lieu | 50 | technology | Nền tảng hệ thống phần mềm | HIGH |
| C022 | Sách học tập | sach-hoc-tap | 50 | education | Mục đích chính là học tập | HIGH |
| C023 | Truyện tranh & Light Novel | truyen-tranh-light-novel | 50 | literature | Nội dung kể chuyện; Văn học là nhóm bao quát sát nhất | MEDIUM |
| C024 | Đời sống & Du lịch | doi-song-du-lich | 50 | travel | Tên nêu rõ Du lịch; chưa có nhóm Đời sống riêng | MEDIUM |

Tất cả canonical đích đều thuộc 27 nhóm đã duyệt. Không tạo nhóm mới để né quyết định. Ba mục MEDIUM được ghi rõ vì tên legacy rộng hơn taxonomy đích.

## 4. Profile detection fail-closed

Chế độ auto hỗ trợ độc lập `ultra-2200` và `legacy-demo-24`. Một profile chỉ được chọn khi:

1. Count khớp.
2. Name/slug normalized của toàn bộ tập khớp và unique.
3. Không thiếu hoặc thừa entry.
4. ID expected khớp sau khi identity name/slug đã khớp.
5. Fingerprint khớp.

Đổi tên/slug, thêm/xóa Category, duplicate normalized name/slug hoặc canonical key ngoài 27 nhóm đều trả exit code khác 0 trước write. Integration tamper test xác nhận không có partial update.

## 5. Backfill policy

Với legacy profile, backfill giữ nguyên 24 ID/name/slug, không thêm 2.176 Category, đặt `parentId=null`, `level=0` và chỉ bổ sung canonical metadata. Execute chạy trong transaction `Serializable`, nhận diện lại profile ngay trong transaction, kiểm tra checksum Category identity và Book–Category trước/sau, đồng thời tạo report mới không ghi đè.

Kết quả database tạm và deployment rehearsal:

- Dry-run: dự kiến 24 thay đổi, ghi 0 row.
- Execute lần một: `changedRows=24`.
- Execute lần hai: `changedRows=0`.
- 24 root, 0 child, 24 mapped, 0 unmapped.
- Orphan/cycle/self-parent/level mismatch đều bằng 0.
- Checksum Book–Category giữ nguyên.

## 6. Trạng thái database demo

`bookverse_ai` chưa được apply migration hoặc backfill. Mọi write test chạy trên database tạm hoặc `bookverse_ai_deploy_rehearsal`. Triển khai demo cần phê duyệt riêng sau khi đọc `docs/DEPLOYMENT.md`.
