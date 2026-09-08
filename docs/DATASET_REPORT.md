# BookVerse AI Dataset Report

> **Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.** Xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md) trước khi dùng bất kỳ kết luận nào.

> **HISTORICAL SNAPSHOT:** báo cáo này mô tả dataset/analyzer tại ngày tạo. Trạng thái triển khai hiện hành xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md). Dataset ultra-2200 là `SYNTHETIC_DATA`, không phải dữ liệu người dùng thật.

## Bổ sung hiện hành — Real Curated Catalog G2

| Dataset | Nhãn | Trạng thái | Số liệu đã xác minh |
|---|---|---|---|
| Ultra-2200 | `SYNTHETIC_DATA` | VERIFIED như snapshot kỹ thuật | 2.200 Book; giữ riêng cho test/evaluation |
| Open Library curated | bibliographic metadata tuyển chọn | PARTIAL | 3.046 record = 3.044 work + 2 edition-only; 2.343 ISBN; 259 ấn bản tiếng Việt; 34 thiếu language |
| Giá catalog curated | `SYNTHETIC_DEMO_PRICE` | VERIFIED | 3.046/3.046 record |
| Cover catalog curated | `RIGHTS_NOT_VERIFIED` | VERIFIED về nhãn, NOT_VERIFIED về quyền | 3.046 cover ID/URL, không tải hàng loạt khi import |
| Hành vi người dùng catalog curated | `REAL_USER_DATA` | NOT_AVAILABLE | 0 dữ liệu import kèm theo |

Hai dataset chỉ cùng tồn tại trên `bookverse_ai_test`; `BookSourceMetadata` phân biệt nguồn. Không trộn catalog curated vào temporal evaluation cũ. Database demo vẫn có 1.200 Book và chưa có bảng metadata G2. Xem [`REAL_CATALOG_REPORT.md`](REAL_CATALOG_REPORT.md).

Ngày tạo: 2026-07-12T12:05:19.571Z

Nguồn: **data/json/bookverse_ultra_seed_2200.json**

SHA-256: **e1e7b7d29f659fa9ea9272ce5ab1ca28095e289b0cc170d8f93e43221acf0047**

## Tổng quan

| Chỉ số | Giá trị |
|---|---:|
| Tổng sách | 2200 |
| ID thiếu | 0 |
| ID trùng | 0 |
| Title trùng | 0 |
| Description trùng | 2199 |
| Author duy nhất | 2200 |
| Category duy nhất | 2200 |
| Tag duy nhất | 2200 |
| Category chỉ có một sách | 770 |
| Author chỉ có một sách | 652 |
| Rating không hợp lệ | 0 |
| Năm xuất bản không hợp lệ | 0 |
| Parent category lỗi | 0 |
| Timestamp tương lai | 0 |
| Timestamp sai thứ tự | 168 |

## Runtime validation

| Trạng thái | Số lượng |
|---|---:|
| VALID | 0 |
| VALID_WITH_WARNINGS | 2200 |
| INVALID | 0 |
| SKIPPED_DUPLICATE | 0 |
| FAILED_RELATION | 0 |

## Field thiếu

| Field | Số record |
|---|---:|
| id | 0 |
| title | 0 |
| description | 0 |
| language | 0 |
| category_id | 0 |
| cover_url | 0 |
| created_at | 0 |
| published_year | 0 |
| rating_avg | 0 |

## Kết luận

- Dataset gốc chỉ được đọc; script không sửa hoặc ghi đè dataset.
- Mô tả trùng cao và timestamp synthetic làm dataset chưa phù hợp để công bố metric temporal AI.
- Category hierarchy đã hoàn tất rehearsal Lượt 1B trên `bookverse_ai_test`: 43 root, 2.157 child, orphan/cycle/self-parent bằng 0.
- Mapping dẫn xuất có 27 canonical group, 2.200/2.200 category đã map và SHA-256 `dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527`.
- Import dry-run, non-replace và replace-existing đều chạy thành công trên database test; sau replace, backfill dry-run báo `changed = 0`.
- Database demo `bookverse_ai` vẫn có 1.200 Book và 24 Category. **Cập nhật read-only 16/07/2026:** 12 migration đã hoàn tất; Category query trả 24 root và 24/24 canonical mapping, nên nhận xét cũ “chưa có migration Category” không còn đúng.
- AI metric offline hiện thấp (Behavior HitRate@10 `0,021008`, Hybrid production HitRate@10 `0,008403`); CTR thật `NOT_AVAILABLE` vì chưa có telemetry người dùng thật đủ điều kiện.

## Giới hạn dữ liệu Category

- 2.157 tên category con có dấu hiệu synthetic; canonical mapping chỉ dùng root đã review, không dùng fuzzy matching hoặc AI để đoán nghĩa.
- 844 category không có sách và 770 category chỉ có một sách vẫn được giữ nguyên để bảo toàn dữ liệu gốc.
- Canonical category là feature kỹ thuật cho recommendation, không thay thế ID category gốc trong `Book.categoryId`.
