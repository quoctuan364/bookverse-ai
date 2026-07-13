# Triển khai Checkpoint A

## 1. Trạng thái hiện tại

Deployment rehearsal ngày 14/07/2026 trên clone `bookverse_ai_deploy_rehearsal` đã PASS Category legacy, stock, checkout/concurrency, catalog, filter, canonical query, FastAPI recommendation và deployment verifier. Database demo `bookverse_ai` chưa bị thay đổi.

Dump read-only mới:

- File local không commit: `backups/bookverse-ai-checkpoint-a1-20260714-003701.dump`.
- Kích thước: 1.526.606 byte.
- SHA-256: `aa9ee6c2963ceb170c50079c007a251bb423059843f41688a6a3a7321762ea33`.

Clone ban đầu được chứng minh có 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem, 0 cột hierarchy/stock mới và 0 record của hai migration Checkpoint A.

## 2. Lưu ý migration history và pgvector

`npx prisma migrate deploy` trên clone trả exit code 1 trước Checkpoint A vì demo chỉ ghi nhận 5 migration cũ và container `bookverse-db` thực tế thiếu extension `vector`. Migration lỗi là `20260706133000_add_pgvector_rag_and_highlight_offsets`; transaction dừng trước khi chạy Category/stock.

Trong rehearsal, migration pgvector lỗi được đánh dấu rolled-back trên clone. Các migration additive cũ cần cho checkout và hai migration Checkpoint A được chạy từ đúng file SQL bằng `prisma db execute`, sau đó ghi lịch sử bằng `prisma migrate resolve --applied`. Category được chạy trước stock. Không sửa file migration và không chạy lệnh này trên demo.

Trước triển khai thật nên sửa configuration drift bằng image `pgvector/pgvector:pg16`, xác minh extension `vector`, rồi rehearsal lại `npx prisma migrate deploy` trọn vẹn. Không được đánh dấu pgvector là applied nếu extension/table thực tế chưa tồn tại.

## 3. Quy trình triển khai thật sau khi được duyệt riêng

Các lệnh dưới đây là runbook, **không phải quyền cho phép chạy trên demo ở thời điểm hiện tại**.

1. Dừng write hoặc bật maintenance mode.
2. Tạo `pg_dump -Fc` mới từ `bookverse_ai`, lưu ngoài Git và xác minh SHA-256.
3. Restore dump sang một clone mới, đối chiếu count/checksum.
4. Xác minh PostgreSQL có extension `vector` và migration history không drift.
5. Chạy migration deploy trên clone; chỉ tiếp tục nếu exit code 0.
6. Chạy analyzer auto, Category dry-run/execute/execute lần hai.
7. Chạy stock dry-run/execute/execute lần hai.
8. Chạy integration, FastAPI smoke và deployment verifier.
9. Lưu toàn bộ report rồi mới đề xuất apply thật.

Ví dụ lệnh backfill sau khi target đã được duyệt và allowlist chính xác:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/TARGET?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="TARGET"
npm run data:analyze-category-profile
npm run data:backfill-categories -- --dry-run
npm run data:backfill-categories -- --execute
npm run data:backfill-categories -- --execute
npm run data:backfill-stock -- --dry-run
npm run data:backfill-stock -- --execute
npm run data:backfill-stock -- --execute
```

Backfill Category còn có hard guard từ chối `bookverse_ai` trong Checkpoint A.1. Khi triển khai thật, không được gỡ guard tùy tiện; cần một phê duyệt riêng và thay đổi có review.

## 4. Acceptance bắt buộc

- Analyzer chọn đúng `legacy-demo-24` với fingerprint `23b01b3e...acea3`.
- Category 24; root 24; child 0; mapped 24; unmapped/orphan/cycle/self-parent 0.
- ID/name/slug và Book–Category checksum không đổi.
- Stock không âm; constraint/index/checkout unique tồn tại.
- Execute lần hai của cả Category và stock đều `changed=0`.
- Catalog/filter/canonical/FastAPI/marketplace/checkout/cancel/idempotency PASS.
- Count cuối giống backup ban đầu.

## 5. Rollback và restore

Nếu migration/backfill/verifier lỗi: dừng ngay, không chạy lại mù. Rollback ứng dụng trước vì các field Checkpoint A là additive. Trên database clone/test có thể drop đúng target sau khi report đã lưu. Với triển khai thật, ưu tiên restore toàn database từ dump đã kiểm tra; không xóa riêng Category, Book hoặc Listing.

Quy trình restore an toàn:

1. Tạo database đích mới, không restore đè database đang chạy.
2. `pg_restore --no-owner --no-privileges` vào database mới.
3. Đối chiếu count, checksum Category identity, Book–Category, Listing/Order/OrderItem.
4. Chuyển kết nối ứng dụng chỉ sau khi smoke PASS.
5. Giữ dump cho đến khi hết cửa sổ rollback.

Không commit dump, `.env`, secret hoặc runtime report.
