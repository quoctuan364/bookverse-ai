# BookVerse AI Category Report

Ngày tạo: 2026-07-13T17:45:50.935Z

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

<!-- CATEGORY_REHEARSAL_RESULTS -->
## 6. Migration

Migration `20260712153000_add_category_hierarchy_and_canonical_fields` chỉ thêm field/FK/index nullable, không xóa column, không đổi primary key và không sửa `Book.categoryId`.

Kết quả trên `bookverse_ai_test`:

- Bốn cột nullable: `parentId`, `level`, `canonicalKey`, `canonicalName`.
- Ba index: `Category_parentId_idx`, `Category_level_idx`, `Category_canonicalKey_idx`.
- Self foreign key `Category_parentId_fkey`: `ON DELETE SET NULL`, `ON UPDATE CASCADE`.
- Count trước và sau migration giữ nguyên: 2.200 Category, 2.200 Book, 2.200 quan hệ Book–Category.

## 7. Backfill

Backfill đọc `data/derived/category-canonical-map.json`, kiểm tra checksum nguồn, orphan/cycle/self-parent/level trước transaction và có dry-run/execute riêng.

| Lần chạy | Kết quả | Changed | Unchanged | Category checksum |
|---|---|---:|---:|---|
| Dry-run trước backfill | PASS, không ghi DB | 2.200 dự kiến | 0 | `e8996448...5705` giữ nguyên |
| Execute lần một | PASS | 2.200 | 0 | `7f946dd2...f836` |
| Execute lần hai | PASS, idempotent | 0 | 2.200 | `7f946dd2...f836` giữ nguyên |
| Dry-run sau replace import | PASS | 0 | 2.200 | `7f946dd2...f836` giữ nguyên |

Report được tạo riêng trong `outputs/categories`, không ghi đè file cũ.

## 8. Import regression

| Chế độ | Kết quả | Bằng chứng chính |
|---|---|---|
| `--dry-run` | PASS | 2.200 record warning hợp lệ; create 0, update dự kiến 2.200; count không đổi |
| `--execute` | PASS | updated 2.200; hierarchy được nối lại 2.200/2.200 |
| `--execute --replace-existing` | PASS | inserted 2.200; hierarchy 2.200/2.200; orphan/unmapped bằng 0 |

Dataset JSON gốc không bị sửa. Mapping checksum trong import là `dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527`.

## 9. Recommendation integration

FastAPI dùng feature category theo thứ tự:

1. `canonicalKey` nếu có và khác `unmapped`.
2. `parentId` nếu canonical chưa có.
3. `Book.categoryId` gốc.

Tên hiển thị dùng `canonicalName` → tên parent → tên category gốc. Query dùng `to_jsonb(c)` để key chưa tồn tại trả `NULL`, do đó cùng source chạy được với schema demo cũ chưa có bốn cột mới.

Kiểm tra trực tiếp bằng source hiện tại:

- Schema test: 2.200 Book, 27 feature category; các query session/bookmark/event/purchase đều thực thi thành công.
- Schema demo cũ: 1.200 Book, fallback về 24 category gốc; không lỗi `column does not exist`.

Không thay đổi bốn trọng số recommendation trong lượt này.

## 10. Test

- Unit test bao phủ mapping, unmapped, orphan, self-parent, cycle, depth và deterministic output.
- Analyzer chạy hai lần cho cùng mapping SHA-256 `dd075996...09527`; output mapping không đổi.
- Integration verifier PASS các kiểm tra catalog/Book–Category, hierarchy, canonical priority, parent fallback, category gốc fallback, Book ID tồn tại và legacy schema compatibility.
- Fixture fallback parent: `C044 → C001`.
- Fixture fallback category gốc: `C001 → C001`.

## 11. Backup và restore rehearsal

- File: `backups/database/bookverse_ai_test_pre_category_20260712.dump` (không nằm trong Git).
- Kích thước: 2.001.126 byte.
- SHA-256: `2A62AEA4AF470610F497F591A9AAEB6C57929F03BF7C2B7FCB1186B84A2BF9B6` — PASS.
- Restore sang `bookverse_ai_restore_test`: 2.200 Book, 2.200 Category, 2.200 quan hệ, 9 migration đã apply.
- Backup phản ánh schema trước Lượt 1B: 0 cột Category mới và 0 migration Category.
- Database tạm đã được drop sau khi mọi query kiểm tra PASS; `pg_database` xác nhận còn 0 database cùng tên.

## 12. Limitations

- 2.157 tên child là synthetic; canonical signal chỉ dựa trên root đã review.
- Canonical group là taxonomy phục vụ kỹ thuật, không thay thế category gốc.
- Không công bố metric recommendation mới trong lượt này.

## 13. Rollback

Rollback ứng dụng trước; các field mới nullable nên code cũ vẫn hoạt động. Chỉ drop field/index/FK bằng migration riêng sau khi xác minh. Backup test DB phải restore được trước khi xem xét database demo.

## 14. Demo database status

Query read-only xác nhận database `bookverse_ai` vẫn có 1.200 Book, 24 Category, 0 cột Category mới và 0 migration Category. Không migration, backfill hoặc import nào được chạy lên database demo trong Lượt 1B.

Source SHA-256: e1e7b7d29f659fa9ea9272ce5ab1ca28095e289b0cc170d8f93e43221acf0047

Mapping SHA-256: dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527

## 15. Profile tương thích 24 Category legacy

Checkpoint A.1 bổ sung profile `legacy-demo-24@1.0.0` trong file riêng `data/mappings/category_canonical_legacy_24.json`; mapping ultra-2200 phía trên không bị sửa. Matching không dựa vào ID đơn lẻ mà dùng toàn bộ count + normalized name/slug + fingerprint, sau đó mới kiểm tra expected ID.

- Legacy fingerprint: `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`.
- Legacy mapping SHA-256: `fb547a5e5cda329aeaf0046e24aeef94f650c7108255320f50d5a8de1aa760e9`.
- Analyzer chạy trên demo read-only và clone đều chọn `legacy-demo-24` với cùng fingerprint.
- 21 mapping confidence HIGH; 3 mapping MEDIUM do taxonomy đích rộng/hẹp không hoàn toàn tương đương.
- Danh sách 24 mapping và lý do nằm trong `docs/CATEGORY_LEGACY_COMPATIBILITY.md`.

## 16. Legacy backfill và fail-closed test

Trên database integration tạm: dry-run ghi 0 row; execute đầu ghi 24 row; execute lần hai `changedRows=0`. Tamper tên `C001` trả exit code 1 trước write và canonical checksum không đổi. ID `C001` legacy được map `artificial-intelligence`, không bị dùng rule `technology` của ultra-2200.

Trên deployment rehearsal clone demo:

| Chỉ số | Kết quả |
|---|---:|
| Category | 24 |
| Root / child | 24 / 0 |
| Mapped / unmapped | 24 / 0 |
| Canonical group được dùng | 17 |
| Orphan / cycle / self-parent | 0 / 0 / 0 |
| Book / Book–Category | 1.200 / 1.200 |
| Identity checksum khớp demo | Có |
| Book–Category SHA-256 | `f051090fb24abf12888453c87498030839ade45f3c6901721c1cbc6f75327ebc` |
| Execute lần hai | `changedRows=0` |

Deployment verifier trả `status=PASS`; catalog 1.200 Book, filter `C001` 50 Book và recommendation query 1.200 row đều dùng canonical đúng. Database demo vẫn chưa có bốn cột hierarchy và chưa được backfill.
