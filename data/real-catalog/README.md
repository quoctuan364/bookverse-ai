# BookVerse Real Catalog 3000+

> **CURRENT SOURCE STATUS (G2.1):** Đây là catalog bibliographic tuyển chọn, không phải dữ liệu người dùng. Artifact cũ trong thư mục này có thể ghi `PASS` theo contract cũ; runtime validator hiện tại là nguồn quyết định.

Catalog bibliographic tuyển chọn được thu thập theo batch từ Open Library, sau đó khử trùng theo source identity và lọc fail-closed các tiêu đề tiếng Việt có dấu hiệu lỗi OCR/chuyển mã.

## Kết quả cuối

- 3.046 source record: **3.044 WORK + 2 EDITION_ONLY** (`RB00583`, `RB00822`). Không được gọi toàn bộ là Open Library work.
- 3.046 Book ID, source record key, cover ID và cover URL duy nhất.
- 259 ấn bản tiếng Việt có metadata đạt bộ lọc trình diễn.
- 39 nhóm catalog, bao phủ văn học, thiếu nhi, lịch sử, khoa học, công nghệ, AI, dữ liệu, kinh doanh, tài chính, sức khỏe, nghệ thuật và các nhóm khác.
- 2.343 ISBN duy nhất.
- 3.001 sách có số trang; 3.044 có năm; 2.996 có nhà xuất bản; 2.630 có rating nguồn.
- 414 bản ghi tiếng Việt có dấu hiệu lỗi OCR/chuyển mã đã bị loại và lưu riêng để audit.

## File chính

- `bookverse_real_catalog.json`: catalog sạch dạng normalized JSON.
- `books.csv`: bảng sách dành cho xem nhanh/import mapping.
- `cover_sources.json`: cover URL, cover ID, source page và trạng thái quyền.
- `quality_report.json`, `final_validation.json`: report thu thập ban đầu/historical; trường `uniqueWorks=3046` của report cũ không thay thế runtime identity audit 3.044 WORK + 2 EDITION_ONLY.
- `contact_sheet_sample.jpg`: kiểm tra trực quan một mẫu cover phân tầng.
- `audit/`: chỉ dùng nếu artifact audit tương ứng tồn tại; không suy đoán thư mục/cache đã được bàn giao nếu không thấy file.
- `scripts/`: script thu thập và script lọc có cache/reproducibility.

## Nhãn bắt buộc

- Metadata: `CURATED_REAL_BIBLIOGRAPHIC_METADATA`.
- Giá: `SYNTHETIC_DEMO_PRICE`, không phải giá bán thật.
- Quyền bìa: `NOT_VERIFIED`.
- Quốc tịch tác giả: `NOT_VERIFIED`.
- Interaction/order/review: `NOT_INCLUDED`.

## Chính sách ảnh

Bìa dùng URL Open Library Covers API dựa trên cover ID thật. URL và trang nguồn có thể truy vết nhưng không đồng nghĩa nhà xuất bản đã cấp phép tái phân phối. Ứng dụng phải giữ fallback nếu ảnh timeout/404 và chỉ tải ảnh của card đang hiển thị; không bulk-download toàn bộ mỗi lần chạy.

Audit HTTP G2.1 kiểm tra toàn bộ 3.046 URL với concurrency tối đa 2, delay tối thiểu 250 ms, timeout/retry/resume; kết quả phải đọc từ report mới nhất trong `outputs/real-catalog-cover-audit/`. `HTTP_VERIFIED` chỉ có nghĩa response và kích thước/tỷ lệ ảnh đạt policy, không phải bằng chứng bản quyền.

## Tích hợp an toàn

Không ghi đè dataset ultra. Import catalog này như một profile riêng, chạy dry-run và database test trước. Khi demo có thể ưu tiên profile thật trên Home/Catalog/Detail; dataset synthetic tiếp tục phục vụ evaluation nhưng phải được gắn nhãn riêng.
