# Báo cáo kiểm thử Checkpoint A

Ngày chạy: 13/07/2026

## 1. Kết luận hiện tại

**Checkpoint A chưa hoàn thành.** Toàn bộ schema, backfill stock, checkout, concurrency, idempotency, cancellation và smoke stock trên clone đều PASS. Deployment rehearsal bị BLOCKED ở Category backfill: demo có 24 Category legacy, còn mapping đã duyệt thuộc taxonomy 2.200 Category; ID trùng nhưng tên/nghĩa không trùng. Script đã dừng trước khi ghi.

## 2. Kết quả stock trên database test

- Backup trước migration: `bookverse_ai_test_pre_stock_20260713_230304.dump`, 2.017.604 byte.
- SHA-256: `2EAA74E4A0EE9D752B0C204DE7C955B59EE73382FC8CCD3CAADC19534A98C5F6`.
- `pg_restore -l` đọc được custom archive PostgreSQL 16.
- Migration stock/order safety apply thành công trên `bookverse_ai_test`.
- Backfill: 2.204 listing; 2.200 match dataset; 4 fixture Phase 3 dùng default 1 và có danh sách review.
- Pass nguồn ban đầu đổi 2.192 row; policy legacy sau đó đổi thêm 1 row có 6 quantity order chưa hủy thành `stock=0/SOLD` và report đây là anomaly. Execute cuối: `changed=0`, `unchanged=2204`.
- Stock sau backfill: min 0, max 120, 1 listing SOLD, không âm.

## 3. Kết quả integration

- Unit test sau bổ sung: stock policy, soldAt, backfill decision, key, state machine và seller ownership.
- PostgreSQL integration PASS các case marketplace visibility, stock=1 concurrency, idempotency đồng thời, quantity > 1, multi-item rollback, self-purchase, listing không khả dụng, locked user/ownership, cancel lần hai và cancel đồng thời.
- Fixture được cleanup; không dùng dữ liệu demo làm fixture.

## 4. Deployment rehearsal

- Demo dump read-only: `bookverse_ai_demo_readonly_20260713_231810.dump`, 1.526.606 byte.
- SHA-256: `F665701F33C16B6F2222E30E86ACAE25AED7E15D8013A41AD037C2D88DDE4AA4`.
- Clone ban đầu và sau cleanup giống demo: 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem.
- Category và stock migration đều apply. Stock backfill match 1.200/1.200, execute lần hai `changed=0`.
- Check constraint, index stock, unique checkout, FK, marketplace và checkout concurrency trên clone đều PASS.
- Category backfill dry-run FAIL an toàn trước write vì mapping có 2.176 category không tồn tại và 24 category legacy không cùng ngữ nghĩa.
- Verifier report: `status=BLOCKED`, `categoryBackfilled=0/24`; các kiểm tra stock/schema/FK/count khác PASS.
- Database `bookverse_ai_deploy_rehearsal` đã drop; query `pg_database` trả 0.

## 5. Trạng thái command

Quy tắc: chỉ ghi PASS khi exit code bằng 0.

| Command | Exit code | Trạng thái | Ghi chú |
| --- | ---: | --- | --- |
| `pg_dump -Fc bookverse_ai_test` | 0 | PASS | Backup trước stock, SHA-256 đã lưu |
| `pg_restore -l <test-dump>` | 0 | PASS | Custom archive đọc được |
| `npx prisma migrate deploy` trên test | 0 | PASS | 11 migration, schema up to date |
| `npm run data:backfill-stock -- --dry-run` | 0 | PASS | Report không ghi đè, không write |
| `npm run data:backfill-stock -- --execute` | 0 | PASS | Dataset + legacy reservation policy |
| Execute backfill lần cuối | 0 | PASS | `changed=0`, `unchanged=2204` |
| `npx prisma validate` | 0 | PASS | Schema hợp lệ |
| `npx prisma generate` | 0 | PASS | Prisma Client 6.19.3 |
| `npm run typecheck` | 0 | PASS | TypeScript strict |
| `npm run test:unit` | 0 | PASS | 34/34 |
| `npm run data:analyze-categories` | 0 | PASS | 2.200 category, không orphan/cycle |
| `npm run test:category-integration` | 0 | PASS | Test hierarchy + legacy fallback |
| `npm run test:stock-integration` trên test | 0 | PASS | 11/11 PostgreSQL test |
| `python -m compileall -q ai_service` | 0 | PASS | FastAPI compile |
| `npm run build` | 0 | PASS | Next.js production build |
| `docker compose config --quiet` | 0 | PASS | Compose hợp lệ |
| `pg_dump -Fc bookverse_ai` | 0 | PASS | Chỉ đọc demo; checksum đã lưu |
| Restore clone + `npx prisma migrate deploy` | 0 | PASS | Clone count ban đầu giống demo; Category rồi stock migration |
| Category backfill dry-run trên clone | 1 | BLOCKED | Fail-closed vì mapping 2.200 không tương thích 24 legacy |
| Stock backfill dry/execute/execute trên clone | 0 | PASS | 1.200/1.200 match; lần hai `changed=0` |
| Stock integration smoke trên clone | 0 | PASS | 10/10, fixture đã cleanup |
| `npm run test:stock-deployment` | 1 | BLOCKED | Count/schema/stock/FK PASS; `categoryBackfilled=0/24` |
| Drop + xác minh database rehearsal | 0 | PASS | `pg_database` trả 0 |

## 6. Blocker và hướng xử lý

Không được dùng mapping 2.200 Category theo ID cho 24 Category demo vì sẽ gắn sai nghĩa. Cần một checkpoint riêng để duyệt mapping legacy theo tên hiện hữu hoặc quyết định giữ 24 category ở chế độ fallback. Yêu cầu Checkpoint A cấm sửa Category mapping nên lượt này dừng đúng ranh giới an toàn, không ghi database demo.
