# Báo cáo kiểm thử Checkpoint A.1

Ngày chạy: 14/07/2026.

## 1. Kết luận

**Checkpoint A đã hoàn thành về mã nguồn, migration, backfill, concurrency test và deployment rehearsal. Database demo chưa được thay đổi và chỉ được triển khai sau khi có phê duyệt riêng.**

Deployment verifier cuối trả `status=PASS`, không còn blocker Category. Configuration drift pgvector/migration history của môi trường local được ghi riêng tại mục 16 và không bị che giấu.

## 2. Git branch/commit

- Branch: `checkpoint-a-legacy-category`.
- Baseline: `df4602f4c21e54b453b2a505c0cea76069ed0533`.
- Chỉ tạo commit local; repository không có remote và không push.
- Dump, secret, `.env`, dataset lớn và runtime report không được stage.

## 3. Phân tích 24 Category legacy

Query read-only trên `bookverse_ai` xác nhận 24 Category, mỗi Category có 50 Book và 50 Listing. Demo chưa có `parentId`, `level`, `canonicalKey`, `canonicalName`. ID `C001–C024` trùng taxonomy ultra nhưng name/slug và ý nghĩa khác nên không thể map theo ID.

## 4. Bảng mapping và lý do

Mapping đầy đủ nằm trong `docs/CATEGORY_LEGACY_COMPATIBILITY.md`: 21 mục HIGH, 3 mục MEDIUM. Tất cả canonical đích thuộc 27 nhóm đã duyệt; không tạo group mới và không sửa ID/name/slug legacy.

## 5. Profile/fingerprint/checksum

- Legacy profile: `legacy-demo-24@1.0.0`.
- Legacy fingerprint: `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`.
- Legacy mapping SHA-256: `fb547a5e5cda329aeaf0046e24aeef94f650c7108255320f50d5a8de1aa760e9`.
- Ultra mapping SHA-256 giữ nguyên: `dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527`.
- Analyzer demo read-only và analyzer clone rehearsal cho cùng profile/fingerprint.

## 6. File đã sửa/tạo

- Tạo `lib/category-profiles.ts` và mapping JSON legacy riêng.
- Cập nhật analyzer, Category backfill và deployment verifier.
- Tạo unit test profile và integration script database tạm.
- Thêm npm script analyzer profile và legacy integration.
- Cập nhật README, Category report, deployment runbook và implementation plan.

## 7. Dry-run

Legacy integration database tạm và clone rehearsal đều PASS. Dry-run nhận diện đúng profile, dự kiến 24 row cần metadata nhưng `changedRows=0`; Category hierarchy checksum và Book–Category checksum không đổi.

Stock dry-run trên clone: 1.200/1.200 Listing match nguồn, dự kiến 1.193 thay đổi và ghi 0 row.

## 8. Execute và idempotency

- Category execute đầu: 24 row; execute lần hai: 0 row.
- Stock execute đầu: 1.193 row; execute lần hai: 0 row.
- Clone cuối: 24 root, 0 child, 24 mapped, 0 unmapped.
- Stock min/max: 1/120; không có stock âm hoặc Listing APPROVED với stock bằng 0.

## 9. Fail-closed tests

Unit test bao phủ unknown profile, count đúng/name sai, ID trùng/name khác, duplicate normalized name/slug, canonical key ngoài 27 nhóm và mapping thiếu/thừa. Integration đổi tên `C001` trả exit code 1 trước write; canonical hierarchy checksum không đổi và không partial update. Guard hard-code tiếp tục từ chối execute trên `bookverse_ai`.

## 10. Ultra-2200 regression

`npm run data:analyze-categories` PASS: 2.200 Category, 43 root, 2.157 child, 27 canonical group, orphan/cycle/self-parent/unmapped bằng 0 và mapping checksum cũ giữ nguyên. `test:category-integration` PASS 2.200 Book–Category và recommendation fallback.

## 11. Stock/checkout regression

PostgreSQL integration trên `bookverse_ai_test` và clone đều PASS 11/11: constraint stock, marketplace visibility, hai buyer tranh stock 1, idempotency đồng thời, quantity > 1, multi-item rollback, self-purchase, listing không khả dụng, account locked/ownership, cancel lần hai và cancel đồng thời.

## 12. Deployment rehearsal

- Dump: `bookverse-ai-checkpoint-a1-20260714-003701.dump` — 1.526.606 byte.
- SHA-256: `aa9ee6c2963ceb170c50079c007a251bb423059843f41688a6a3a7321762ea33`.
- Clone ban đầu: 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem; 0 cột Checkpoint A và 0 record hai migration mới.
- Category và stock migration được chạy từ đúng file SQL theo thứ tự, backfill và verifier PASS.
- Clone cuối có count giống demo; Category identity checksum khớp; Book–Category SHA-256 hai phía cùng là `f051090fb24abf12888453c87498030839ade45f3c6901721c1cbc6f75327ebc`.
- Sau khi report, count và checksum đã được lưu, clone được drop; `pg_database` xác nhận số database cùng tên bằng 0.

## 13. Smoke test

- Catalog: 1.200 Book ACTIVE có Category.
- Filter `C001`: 50 Book.
- Canonical recommendation SQL: 1.200 row, ưu tiên canonical đúng.
- FastAPI thật trong container: đọc 1.200 Book và trả 10 recommendation.
- Marketplace: 1.037 Listing APPROVED có stock > 0.
- Checkout/self-purchase/out-of-stock/cancel/idempotency: PASS qua integration 11/11.

## 14. Bảng command/exit code

Chỉ dòng exit code 0 mới được ghi PASS.

| Command | Exit code | Trạng thái | Ghi chú |
|---|---:|---|---|
| `npx prisma validate` | 0 | PASS | Prisma schema hợp lệ |
| `npx prisma generate` | 0 | PASS | Prisma Client 6.19.3 |
| `npm run typecheck` | 0 | PASS | TypeScript không lỗi |
| `npm run test:unit` | 0 | PASS | 45/45 |
| `npm run data:analyze-categories` | 0 | PASS | Ultra 2.200, checksum giữ nguyên |
| `npm run test:category-integration` | 0 | PASS | Ultra + schema demo legacy read-only |
| `npm run test:stock-integration` trên test | 0 | PASS | 11/11 |
| `npm run test:category-legacy` | 0 | PASS | DB tạm; tamper subcommand exit 1 đúng kỳ vọng |
| `python -m compileall -q ai_service` | 0 | PASS | Python compile |
| `npm run build` | 0 | PASS | Next.js production build |
| `docker compose config --quiet` | 0 | PASS | Compose hợp lệ |
| `pg_dump -Fc bookverse_ai` + SHA-256 | 0 | PASS | Demo chỉ đọc |
| Restore `bookverse_ai_deploy_rehearsal` | 0 | PASS | Count ban đầu khớp |
| `npx prisma migrate deploy` lần đầu trên clone | 1 | BLOCKED | Dừng ở pgvector cũ do container thiếu extension; chưa chạy Category/stock |
| `prisma db execute` Category + `migrate resolve` | 0 | PASS | Exact migration SQL trên clone |
| `prisma db execute` stock + `migrate resolve` | 0 | PASS | Chạy sau Category |
| Category dry/execute/execute | 0/0/0 | PASS | 0 write / 24 / 0 |
| Stock dry/execute/execute | 0/0/0 | PASS | 0 write / 1.193 / 0 |
| Stock smoke clone lần đầu | 1 | BLOCKED | Phát hiện thiếu migration cũ `shipping_addresses`; không tạo fixture |
| Apply ba migration additive cũ trên clone | 0 | PASS | Password reset/admin/profile shipping |
| Stock smoke clone chạy lại | 0 | PASS | 11/11, cleanup fixture |
| FastAPI recommendation trên clone | 0 | PASS | 1.200 Book, 10 kết quả |
| `npm run test:stock-deployment` | 0 | PASS | `status=PASS`, blockers rỗng |
| Drop + xác minh rehearsal database | 0 | PASS | Trước 1, sau 0 |

## 15. Trạng thái database demo

Sau toàn bộ test, `bookverse_ai` vẫn giữ 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem; không có bốn cột Category mới, stock/soldAt/checkoutKey hoặc record hai migration Checkpoint A. Không có command write nào nhắm demo.

## 16. Hạn chế còn lại

1. Container `bookverse-db` đang chạy không có extension `vector` dù Compose khai báo image pgvector; migration history demo chỉ ghi 5 migration đầu. Phải sửa drift và chạy full migration rehearsal trước triển khai thật.
2. Ba mapping MEDIUM là quyết định taxonomy có giải thích, chưa phải phân loại theo nội dung từng Book.
3. Chưa apply migration/backfill lên demo; đây là chủ ý an toàn, không phải việc còn thiếu của mã nguồn.

## 17. Đề xuất tiếp theo

Không bắt đầu Checkpoint D trong lượt này. Bước tiếp theo hợp lý là người dùng review bảng mapping và report, sửa configuration drift pgvector trên một clone mới, chạy `prisma migrate deploy` trọn vẹn, rồi cấp phê duyệt riêng nếu muốn triển khai demo. Nếu chưa triển khai demo, có thể duyệt Checkpoint D bằng một yêu cầu độc lập.
