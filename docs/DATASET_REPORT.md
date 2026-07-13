# BookVerse AI Dataset Report

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
- Category hierarchy chỉ được phân tích trong Lượt 1A, chưa canonicalize và chưa thay đổi Prisma schema.
