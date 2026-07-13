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

### Review lại ba mapping MEDIUM bằng metadata thật

Ngày 14/07/2026, database demo được query read-only. Mỗi Category lấy đúng 15 Book đầu theo `Book.id`; reviewer đọc `title`, mô tả ngắn, author và toàn bộ tag liên kết. ID chỉ dùng để truy vết row, không dùng làm căn cứ ngữ nghĩa. Mô tả của cả 45 mẫu đều nêu đúng nhóm legacy nhưng có cấu trúc synthetic lặp lại; tag trộn nhiều chủ đề không liên quan nên chỉ được coi là tín hiệu phụ.

#### C013 — Khoa học phổ thông → `education`

| Book | Title | Author | Tín hiệu mô tả/tag |
|---|---|---|---|
| B0013 | Vũ trụ trong tầm mắt | Phan Ngọc Chi | Mô tả khoa học phổ thông cho người mới; tag nhiễu |
| B0037 | Vũ trụ trong tầm mắt - Lộ trình 49 | Emma Chen | Mô tả khoa học phổ thông cho sinh viên; tag nhiễu |
| B0061 | Vật lý không khó - Lộ trình 50 | Đặng Hải An | Title/mô tả là vật lý phổ thông; tag nhiễu |
| B0085 | Khoa học đời sống cho độc giả trẻ - Chuyên đề 34 | Đặng Quốc Chi | Kiến thức khoa học cho người tự học; tag nhiễu |
| B0109 | Những câu hỏi lớn của khoa học | Nora Morgan | Title/mô tả khoa học đại cương; tag `academic` nhưng phần lớn nhiễu |
| B0133 | Vũ trụ trong tầm mắt - Chuyên đề 43 | Phạm Nhật My | Khoa học phổ thông, thiên văn; tag nhiễu |
| B0157 | Khoa học đời sống cho độc giả trẻ - Sổ tay 60 | Huỳnh Nhật Dũng | Khoa học đời sống nhập môn; tag nhiễu |
| B0181 | Vũ trụ trong tầm mắt - Chuyên đề 65 | Emma Kim | Khoa học phổ thông cho sinh viên; tag nhiễu |
| B0205 | Vật lý không khó - Sổ tay 14 | Nguyễn Phương Linh, Lý Nhật Sơn | Title/mô tả vật lý; có tag `physics` |
| B0229 | Vật lý không khó - Chuyên đề 68 | Phan Phúc Quân | Title/mô tả vật lý; có tag `astronomy`, `school` |
| B0253 | Sinh học quanh ta - Lộ trình 46 | Mina Wilson | Title/mô tả sinh học phổ thông; tag nhiễu |
| B0277 | Những câu hỏi lớn của khoa học - Bản mở rộng 67 | Ngô Phúc Phát | Khoa học đại cương; có tag `astronomy` |
| B0301 | Vật lý không khó - Phiên bản 90 | Ngô Thảo Huy | Title/mô tả vật lý; tag nhiễu |
| B0325 | Sinh học quanh ta - Lộ trình 36 | Ava King, Lý Nhật Sơn | Title/mô tả sinh học; có tag `exam` nhưng phần lớn nhiễu |
| B0349 | Vật lý không khó - Chuyên đề 41 | Tạ Nhật Yến | Title/mô tả vật lý; có tag `research` nhưng phần lớn nhiễu |

Kết luận: 15/15 title và mô tả nghiêng về kiến thức khoa học nhập môn/phổ thông. Taxonomy 27 nhóm chưa có canonical `science`; `education` là đích gần nhất nhưng làm mất sắc thái khoa học, vì vậy **giữ mapping và giữ confidence MEDIUM**.

#### C023 — Truyện tranh & Light Novel → `literature`

| Book | Title | Author | Tín hiệu mô tả/tag |
|---|---|---|---|
| B0023 | Thành phố mèo biết nói - Bản mở rộng 56 | Tạ Hải Linh | Title hư cấu, mô tả đúng light novel; tag creative-writing/poetry |
| B0047 | Thành phố mèo biết nói - Sổ tay 81 | Đặng Gia Thịnh | Title hư cấu; tag `novel`, `poetry` |
| B0071 | Quán cà phê ở rìa vũ trụ - Chuyên đề 8 | Alex Chen | Title/mô tả kể chuyện; tag `novel` |
| B0095 | Cô gái và thanh kiếm bạc | Hồ Ngọc Tâm | Title giả tưởng, mô tả đúng nhóm; tag phần lớn nhiễu |
| B0119 | Mùa hè của pháp sư tập sự - Phiên bản 14 | Trần Anh Sơn, Maya Martin | Title giả tưởng, mô tả đúng nhóm; tag nhiễu |
| B0143 | Cô gái và thanh kiếm bạc - Lộ trình 93 | Lucas Stone, Huỳnh Huyền Yến | Title giả tưởng, mô tả đúng nhóm; tag nhiễu |
| B0167 | Quán cà phê ở rìa vũ trụ | Phan Thanh Quân | Title kể chuyện, mô tả đúng nhóm; tag nhiễu |
| B0191 | Cô gái và thanh kiếm bạc - Lộ trình 40 | Đinh Gia Tú | Title giả tưởng; tag `creative-writing` |
| B0215 | Cô gái và thanh kiếm bạc - Bản mở rộng 87 | Ethan Martin | Title giả tưởng, mô tả đúng nhóm; tag nhiễu |
| B0239 | Quán cà phê ở rìa vũ trụ - Chuyên đề 18 | Lê Bảo Trang | Title kể chuyện, mô tả đúng nhóm; tag nhiễu |
| B0263 | Hiệp sĩ dưới ánh trăng - Chuyên đề 2 | Phạm Nhật Thịnh, Huỳnh Huyền Yến | Title giả tưởng, mô tả đúng nhóm; tag nhiễu |
| B0287 | Hiệp sĩ dưới ánh trăng - Tập 77 | Đặng Phương My, Phạm Hoài Linh | Dạng tập truyện, title giả tưởng; tag `poetry` nhưng nhiễu |
| B0311 | Thành phố mèo biết nói - Sổ tay 7 | Đinh Tuấn Nam | Title kể chuyện; tag `light-novel` |
| B0335 | Mùa hè của pháp sư tập sự - Phiên bản 5 | Phạm Phúc Thịnh | Title giả tưởng; tag `novel` |
| B0359 | Hiệp sĩ dưới ánh trăng | Lý Bảo Thịnh | Title giả tưởng; tag `novel` |

Kết luận: 15/15 title và mô tả là tác phẩm kể chuyện; 6 mẫu có tag văn học trực tiếp. Taxonomy không có canonical riêng cho manga/light novel, nên `literature` là nhóm bao quát đúng nhất. Tag còn nhiễu và metadata không cho biết tỷ lệ tranh so với chữ, vì vậy **giữ mapping và giữ confidence MEDIUM**.

#### C024 — Đời sống & Du lịch → `travel`

| Book | Title | Author | Tín hiệu mô tả/tag |
|---|---|---|---|
| B0024 | Cẩm nang du lịch tự túc - Lộ trình 56 | Hoàng Khánh Trang, Huỳnh Thảo Khoa | Du lịch trực tiếp; tag nhiễu |
| B0048 | Một năm trải nghiệm Việt Nam - Phiên bản 23 | Mai Thảo Yến | Trải nghiệm điểm đến; tag `lifestyle` |
| B0072 | Đi qua những miền nắng - Phiên bản 55 | Liam Brown | Travelogue; tag `lifestyle` |
| B0096 | Văn hóa trong từng chuyến đi - Phiên bản 70 | Tạ Phương Nam | Du lịch gắn văn hóa; tag nhiễu |
| B0120 | Sống chậm giữa thành phố nhanh | Trần Tuấn Thịnh | Nghiêng đời sống; có tag `travel` |
| B0144 | Một năm trải nghiệm Việt Nam - Sổ tay 84 | Nora Rivera, Huỳnh Thảo Khoa | Trải nghiệm Việt Nam; tag `lifestyle` |
| B0168 | Sống chậm giữa thành phố nhanh - Tập 74 | Hồ Mai Vy | Nghiêng đời sống; tag nhiễu |
| B0192 | Cẩm nang du lịch tự túc - Tập 54 | Huỳnh Huyền Yến | Du lịch trực tiếp; tag `lifestyle` |
| B0216 | Văn hóa trong từng chuyến đi | Noah Kim | Du lịch/văn hóa; tag nhiễu |
| B0240 | Văn hóa trong từng chuyến đi - Phiên bản 45 | Vũ Thảo Quân | Du lịch/văn hóa; tag nhiễu |
| B0264 | Văn hóa trong từng chuyến đi - Chuyên đề 38 | Tô Ngọc Khoa | Du lịch/văn hóa; tag `world-history` nhưng nhiễu |
| B0288 | Văn hóa trong từng chuyến đi - Sổ tay 38 | Clara Tanaka | Du lịch/văn hóa; tag lịch sử/tâm lý bị trộn |
| B0312 | Cẩm nang du lịch tự túc | Lê Thảo Tú | Du lịch trực tiếp; tag `travel` |
| B0336 | Một năm trải nghiệm Việt Nam - Sổ tay 68 | Nguyễn Thiên Quân | Trải nghiệm điểm đến; tag nhiễu |
| B0360 | Một năm trải nghiệm Việt Nam - Lộ trình 83 | Trần Khánh Nam | Trải nghiệm điểm đến; tag nhiễu |

Kết luận: 13/15 mẫu nghiêng rõ về chuyến đi, điểm đến hoặc văn hóa du lịch; 2/15 mẫu nghiêng đời sống. Taxonomy chưa có canonical `lifestyle`, nên `travel` vẫn đại diện tốt nhất nhưng không bao phủ trọn tên legacy. Vì giới hạn đó và tag synthetic, **giữ mapping và giữ confidence MEDIUM**.

Không mapping nào được chứng minh sai, vì vậy profile vẫn là `legacy-demo-24@1.0.0`; fingerprint và mapping SHA-256 không đổi. Không có file mapping nào bị sửa.

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

`bookverse_ai` chưa được apply migration hoặc backfill. Mọi write test chạy trên database tạm hoặc `bookverse_ai_full_deploy_rehearsal`. Triển khai demo cần phê duyệt riêng sau khi đọc `docs/DEPLOYMENT.md`.
