# BookVerse AI Category Report

Ngày tạo: 2026-07-12T14:28:47.907Z

## 1. Hiện trạng

- Category hiện có id/name/slug/description và quan hệ Book–Category một-nhiều.
- Dataset dùng parent_id trỏ trực tiếp tới Category.id dạng số; khi import được đổi sang ID Cxxx hiện hữu.
- Tên và slug hiện đã unique; migration không thay đổi hai constraint này.

## 2. Schema trước/sau

- Giữ nguyên id, name, slug, description, books, createdAt và updatedAt.
- Thêm nullable parentId/parent/children với onDelete SetNull.
- Thêm nullable level, canonicalKey và canonicalName.
- Thêm index parentId, canonicalKey và level. Không đổi Book.categoryId.

## 3. Mapping strategy

- 43 root được review bằng ID/tên chính xác và ánh xạ qua bảng manual rule.
- 2.157 child kế thừa canonical group của parent.
- Không fuzzy matching, không AI, không sửa tên category gốc.
- Root không có rule sẽ nhận canonicalKey=unmapped và confidence=UNMAPPED.

## 4. Canonical groups

| Canonical key | Category | Book |
|---|---:|---:|
| artificial-intelligence | 154 | 164 |
| arts | 102 | 112 |
| biography | 51 | 55 |
| business | 205 | 200 |
| children | 51 | 34 |
| culture | 51 | 61 |
| data-science | 103 | 94 |
| design | 102 | 97 |
| ebooks | 51 | 37 |
| education | 102 | 102 |
| engineering | 51 | 48 |
| environment | 51 | 62 |
| fantasy | 51 | 58 |
| health | 51 | 45 |
| history | 51 | 60 |
| law | 51 | 66 |
| literature | 102 | 99 |
| marketing | 52 | 43 |
| mathematics | 51 | 61 |
| mystery | 51 | 50 |
| personal-finance | 52 | 54 |
| philosophy | 51 | 53 |
| psychology | 51 | 50 |
| science-fiction | 51 | 48 |
| self-help | 51 | 51 |
| technology | 359 | 353 |
| travel | 51 | 43 |

## 5. Hierarchy statistics

| Chỉ số | Giá trị |
|---|---:|
| Tổng category | 2200 |
| Root | 43 |
| Parent | 43 |
| Leaf | 2157 |
| Orphan | 0 |
| Cycle | 0 |
| Self-parent | 0 |
| Độ sâu lớn nhất | 1 |
| Nhóm tên trùng | 0 |
| Tên có dấu hiệu synthetic | 2157 |
| Category một sách | 770 |
| Category không có sách | 844 |
| Chưa map canonical | 0 |

## 6. Migration

Migration chỉ thêm field/FK/index nullable, không xóa column, không đổi primary key và không sửa Book.categoryId.

## 7. Backfill

Backfill đọc data/derived/category-canonical-map.json, kiểm tra checksum nguồn, orphan/cycle/self-parent/level trước transaction và có dry-run/execute riêng.

## 8. Test

Unit test bao phủ mapping, unmapped, orphan, self-parent, cycle, depth và deterministic output. Integration test chạy trên bookverse_ai_test.

## 9. Limitations

- 2.157 tên child là synthetic; canonical signal chỉ dựa trên root đã review.
- Canonical group là taxonomy phục vụ kỹ thuật, không thay thế category gốc.
- Không công bố metric recommendation mới trong lượt này.

## 10. Rollback

Rollback ứng dụng trước; các field mới nullable nên code cũ vẫn hoạt động. Chỉ drop field/index/FK bằng migration riêng sau khi xác minh. Backup test DB phải restore được trước khi xem xét database demo.

## 11. Demo database status

Database bookverse_ai chưa được apply migration hoặc backfill trong Lượt 1B.

Source SHA-256: e1e7b7d29f659fa9ea9272ce5ab1ca28095e289b0cc170d8f93e43221acf0047

Mapping SHA-256: dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527
