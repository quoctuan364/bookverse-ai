# Báo cáo kiểm thử Checkpoint A.2 — Deployment Readiness

Ngày chạy: 14/07/2026.

## 1. Kết luận

**BookVerse AI đã sẵn sàng về kỹ thuật để triển khai Category và stock migration lên database demo. Database demo chưa được thay đổi; việc triển khai thật cần một phê duyệt riêng.**

Kết luận dựa trên fresh migration, full clone, pgvector, migration reconciliation, Category/stock idempotency, smoke, rollback và toàn bộ cổng kiểm tra đều có exit code 0. Checkpoint D không được bắt đầu.

## 2. Git branch/commit

- Branch local: `checkpoint-a-deployment-readiness`.
- Baseline: `ae7f4b801744034860ba2eca7da36f308628811d`.
- Commit triển khai A.2: `e10ebf0` — `feat: hoàn thiện deployment readiness checkpoint A.2`.
- Commit tài liệu báo cáo cuối được tạo local sau file này; xác minh bằng `git log -2 --oneline`.
- Không có push/remote; dump, `.env`, secret, volume và runtime output không được commit.
- Không sửa bất kỳ migration cũ nào.

## 3. Review ba mapping MEDIUM

Query read-only lấy 15 Book đầu theo ID cho từng Category, tổng 45 mẫu. Reviewer đọc title, mô tả ngắn, author và toàn bộ tag; ID chỉ dùng truy vết, không dùng làm căn cứ ngữ nghĩa. Bảng bằng chứng đầy đủ nằm trong `docs/CATEGORY_LEGACY_COMPATIBILITY.md`.

| Category | Mẫu | Kết quả nội dung | Kết luận |
|---|---:|---|---|
| C013 — Khoa học phổ thông | 15 | 15/15 title/mô tả là khoa học nhập môn, vật lý, sinh học hoặc thiên văn | Giữ `education`, MEDIUM vì taxonomy không có `science` |
| C023 — Truyện tranh & Light Novel | 15 | 15/15 là title kể chuyện/giả tưởng; 6 mẫu có tag văn học trực tiếp | Giữ `literature`, MEDIUM vì không có group manga/light novel và tag bị nhiễu |
| C024 — Đời sống & Du lịch | 15 | 13 mẫu nghiêng du lịch/văn hóa điểm đến; 2 mẫu nghiêng đời sống | Giữ `travel`, MEDIUM vì không có `lifestyle` |

Mô tả và tag có tính synthetic, nhiều tag không liên quan. Không mapping nào được chứng minh sai, nên profile vẫn `legacy-demo-24@1.0.0`, fingerprint `23b01b3e...acea3` và mapping checksum `fb547a5e...60e9`; không sửa mapping/version/checksum.

## 4. PostgreSQL/pgvector

- Demo runtime: PostgreSQL `16.14`, image thực tế `postgres:16-alpine`, chỉ có extension `plpgsql`.
- Rehearsal: PostgreSQL `16.14 (Debian)`, image pin `pgvector/pgvector:0.8.5-pg16`.
- Image digest: `sha256:1d533553fefe4f12e5d80c7b80622ba0c382abb5758856f52983d8789179f0fb`.
- Compose rehearsal dùng project/volume riêng, port `127.0.0.1:55432`; demo không restart/recreate.
- Preflight xác minh binary version 0.8.5, superuser/quyền CREATE, `CREATE EXTENSION IF NOT EXISTS vector`, `pg_extension`, cast và operator `<->`, `<=>`, `<#>`.
- Migration vector phải chạy sau khi binary đã có; bootstrap được dùng để fail sớm trước Prisma, không sửa migration cũ.
- Cột hiện là `vector` không khóa dimension; query dùng cosine `<=>`; chưa có HNSW/IVFFlat/operator class, chỉ B-tree theo `bookId`.

## 5. Migration history audit

Audit script mặc định read-only thu thập checksum 11 migration file, toàn bộ history metadata, `prisma migrate status`, schema-only dump và catalog table/column/type/null/default/enum/index/FK/constraint/extension. Unit test bao phủ đủ bảy trạng thái phân loại.

Full clone trước reconcile:

| Phân loại | Số lượng | Migration |
|---|---:|---|
| APPLIED_VALID | 5 | init đến AI API tables |
| APPLIED_HISTORY_MISSING | 2 | password reset; admin operations foundation |
| PENDING | 4 | pgvector; profile/shipping; Category; stock |
| APPLIED_SCHEMA_INCOMPLETE | 0 | Không có |
| FAILED | 0 | Không có |
| CHECKSUM_MISMATCH | 0 | Không có |
| UNKNOWN | 0 | Không có |

Audit cuối trên fresh và full clone đều có 11/11 `APPLIED_VALID`, Prisma status up-to-date, schema catalog checksum `65d7b754c3f0f8ed8f90fb53a7e1459fab54bd5b91ed52dca7333826a646c04e`.

## 6. Reconciliation

Hai migration history-missing có 13/13 và 118/118 expected object hợp lệ, bao gồm table, column, enum, index, FK và constraint. Chỉ hai migration này được resolve trên clone bằng `prisma migrate resolve --applied` qua audit script; không có SQL update trực tiếp `_prisma_migrations`.

Bốn migration pending được chạy bằng `prisma migrate deploy` sau pgvector bootstrap. Không có partial schema cần forward repair. Kết quả deterministic: audit cuối 11 valid, 0 pending/failed/mismatch/unknown. Audit execute có hard guard từ chối `bookverse_ai`.

## 7. Fresh database rehearsal

Database `bookverse_ai_fresh_migration_test` được tạo rỗng trên rehearsal server:

- pgvector preflight/bootstrap PASS.
- 11 migration chạy từ đầu PASS; failed/pending bằng 0.
- Deploy lần hai: `No pending migrations to apply`.
- Vector extension/cột/index, 4 cột Category/3 index/self-FK, stock constraint/index và checkout unique đều tồn tại.
- Prisma smoke tạo User/Category/Book/Listing/embedding, query vector/stock rồi rollback chủ động; fixture count cuối 0.
- Audit 11/11 valid; schema SHA-256 được lưu.
- Report được lưu rồi database được drop; số database còn lại bằng 0.

## 8. Full clone rehearsal

- Backup pre-deployment: `backups/database/20260714-020032-bookverse-ai-predeploy.dump` — không commit.
- SHA-256: `a49a764157a88e141a3ca525a817bad0d7af7beed479ca70daeac1d30cb52094`.
- `pg_restore -l` exit 0; restore vào `bookverse_ai_full_deploy_rehearsal` exit 0.
- Count trước migration: 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem.
- Audit/reconcile, pgvector bootstrap và full migrate deploy PASS.
- Deploy lần cuối sau toàn bộ smoke báo không còn pending; audit 11/11 valid.
- Post-deploy schema SHA-256 đã lưu; clone chỉ bị drop sau khi report đầy đủ được ghi.

## 9. Category/stock backfill

| Backfill | Dry-run | Execute lần 1 | Execute lần 2 | Kết quả |
|---|---:|---:|---:|---|
| Category legacy | 0 write; dự kiến 24 | 24 | 0 | 24/24 mapped; checksum identity/Book–Category giữ nguyên |
| Stock | 0 write; dự kiến 1.193 | 1.193 | 0 | 1.200/1.200 match; min/max 1/120; không unmatched |

Category cuối có 24 root, 0 child, 17 canonical group trên legacy, 0 unmapped/orphan/cycle/self-parent/level mismatch. Stock không âm và không có APPROVED listing với stock bằng 0.

## 10. Smoke test

- Catalog: 1.200 Book.
- Category `C001`: 50 Book; 24/24 Category có canonical mapping.
- FastAPI container: health OK, đọc 1.200 Book, trả 10 recommendation cho `U001`, tất cả Book ID tồn tại.
- Vector transaction: insert `[1,2,3]`, cosine distance bằng 0, rollback và fixture count bằng 0.
- Marketplace: 1.037 APPROVED listing có stock > 0.
- Checkout PostgreSQL integration: 11/11 PASS, gồm tranh stock, atomic multi-item, self-purchase, unavailable/out-of-stock, idempotency, account/ownership và cancel/restock đúng một lần.
- Deployment verifier trước và sau integration đều `status=PASS`, blockers rỗng.
- Count cuối giữ nguyên 300/24/1.200/1.200/1.500/2.570; Book/OrderItem orphan bằng 0.

## 11. Rollback rehearsal

Backup pre-deployment được restore vào `bookverse_ai_rollback_rehearsal`; không dùng down migration và không restore đè demo.

- `pg_restore --exit-on-error`: exit 0, thời gian 1.931 ms.
- Semantic schema SHA-256 nguồn và rollback cùng `691938be419c8de63abe3271644fd1d4561322a3746d41c76a4bc65f725293d6`.
- Count khớp 300/24/1.200/1.200/1.500/2.570.
- History trở về 5 migration, 0 cột Category/stock/checkout mới, 0 extension vector.
- Legacy catalog 1.200, filter C001 50, recommendation fallback 1.200 row, orphan 0.
- Report được lưu rồi rollback database được drop.

## 12. File đã sửa/tạo

Tạo mới:

- `docker-compose.rehearsal.yml`.
- `lib/migration-audit.ts`.
- `scripts/audit_migration_history.ts`.
- `scripts/preflight_pgvector.ts`.
- `scripts/verify_fresh_migration.ts`.
- `scripts/verify_rollback_rehearsal.ts`.
- `tests/migration-audit.test.ts`.

Cập nhật:

- `.env.example`, `docker-compose.yml`, `package.json`.
- Allowlist rehearsal trong Category/stock backfill, stock deployment verifier và integration test.
- `README.md`, `docs/CATEGORY_LEGACY_COMPATIBILITY.md`, `docs/DEPLOYMENT.md`, `docs/IMPLEMENTATION_PLAN_V2.md`, `docs/TEST_REPORT.md`.

Không sửa dataset gốc, migration cũ, marketplace, checkout, chatbot, recommendation weight, Seller AI, Reader, Community hoặc UI.

## 13. Bảng command/exit code

Chỉ command exit code 0 mới được ghi PASS.

| Command/nhóm lệnh | Exit code | Trạng thái | Bằng chứng chính |
|---|---:|---|---|
| `npx prisma validate` | 0 | PASS | Schema hợp lệ |
| `npx prisma generate` | 0 | PASS | Prisma Client 6.19.3 |
| `npm run typecheck` | 0 | PASS | Không lỗi TypeScript |
| `npm run test:unit` | 0 | PASS | 49/49; gồm migration audit test |
| `npx tsx --test tests/migration-audit.test.ts` | 0 | PASS | 4/4 audit parser/classification độc lập |
| `npm run data:analyze-categories` | 0 | PASS | 2.200 Category, 27 canonical, checksum giữ nguyên |
| `npm run test:category-integration` | 0 | PASS | Ultra hierarchy + legacy schema read-only |
| `npm run test:category-legacy` | 0 | PASS | Dry/execute/idempotency/tamper/cleanup |
| `npm run test:stock-integration` trên full clone | 0 | PASS | 11/11 |
| `npm run test:stock-integration` trên test DB | 0 | PASS | 11/11 regression cuối |
| `npm run deployment:pgvector -- --check/--bootstrap` | 0/0 | PASS | Version/quyền/cast/distance |
| Fresh `prisma migrate deploy` lần 1/lần 2 | 0/0 | PASS | 11 applied; lần hai không pending |
| Fresh audit + verifier | 0/0 | PASS | 11 valid; schema/Prisma smoke |
| Demo `pg_dump -Fc`, SHA-256, `pg_restore -l` | 0/0/0 | PASS | Backup read-only hợp lệ |
| Restore full clone | 0 | PASS | Count ban đầu khớp |
| Clone audit read-only | 0 | PASS | 5 valid, 2 history-missing, 4 pending; không resolve lúc audit |
| Clone audit `--execute` | 0 | PASS | Chỉ resolve 2 migration đã chứng minh đầy đủ |
| Clone `prisma migrate deploy` | 0 | PASS | 4 migration pending được apply |
| Category dry/execute/execute | 0/0/0 | PASS | 0 write/24/0 |
| Stock dry/execute/execute | 0/0/0 | PASS | 0 write/1.193/0 |
| `npm run test:stock-deployment` | 0 | PASS | Hai lần, blockers rỗng |
| FastAPI canonical smoke | 0 | PASS | 1.200 Book, 10 kết quả |
| Vector transaction query | 0 | PASS | Cosine 0, rollback sạch |
| Clone migrate lần cuối + audit | 0/0 | PASS | No pending; 11 valid |
| Restore rollback + verifier | 0/0 | PASS | 1.931 ms; schema/count/legacy query khớp |
| `python -m compileall -q ai_service` | 0 | PASS | Python compile |
| `npm run build` | 0 | PASS | Next.js production build |
| `docker compose config --quiet` | 0 | PASS | Compose chính hợp lệ |
| Rehearsal Compose `config --quiet` | 0 | PASS | Override riêng hợp lệ |
| Drop fresh/full/rollback DB | 0/0/0 | PASS | Còn lại 0 database rehearsal |

Trong khi viết parser có hai lượt dev test exit 1 do regex dùng flag ngoài target ES và whitespace trước `);`; hai lỗi đã được sửa. Các lượt đó không được tính PASS. Cổng cuối nêu trên đều exit 0.

## 14. Trạng thái database demo

Container `bookverse-db` trước và sau A.2 cùng ID `f2a6bf046280...`, cùng `StartedAt=2026-07-13T14:52:59.4780605Z`, image runtime `postgres:16-alpine`; không restart/recreate. Demo vẫn có:

- 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem.
- 5 migration history row.
- 0 cột `parentId/level/canonicalKey/canonicalName`, `stock/soldAt/checkoutKey`.
- 0 extension vector.

Chỉ có query và `pg_dump` read-only nhắm `bookverse_ai`; không có migration/backfill/write.

## 15. Rủi ro còn lại

1. Runtime demo vẫn dùng image không có vector; triển khai thật phải thay container trong maintenance window theo runbook và có rollback container/database.
2. Vector chưa khóa dimension và chưa có ANN index/operator class; chưa ảnh hưởng dữ liệu hiện tại nhưng sẽ ảnh hưởng consistency/performance khi tăng embedding.
3. Audit parser được kiểm chứng cho 11 migration hiện có; migration SQL phức tạp mới vẫn cần human review, không tự resolve chỉ theo output tool.
4. Metadata/tag synthetic giới hạn độ chắc chắn của ba mapping, nên giữ MEDIUM là đúng hơn nâng HIGH.
5. Prisma báo cấu hình `package.json#prisma` sẽ deprecated ở Prisma 7; không phải blocker ở Prisma Client 6.19.3.
6. Guard hiện cố ý cấm execute trên demo. Phê duyệt triển khai thật phải đi kèm thay đổi guard nhỏ, review riêng và chỉ mở đúng target/thời gian; không xóa fail-closed protection.

## 16. Kế hoạch triển khai chính xác

Thực hiện đúng 15 bước trong `docs/DEPLOYMENT.md`: maintenance; xác minh commit; backup/checksum; restore list; PostgreSQL major; thay runtime bằng pgvector 0.8.5-pg16; extension preflight/bootstrap; migration audit; resolve từng migration có đầy đủ bằng chứng; migrate deploy; Category dry/execute/execute; stock dry/execute/execute; full smoke; mở lại ứng dụng; post-deploy audit. Rollback bằng restore backup vào database mới, không dùng down migration và không restore đè.

Mỗi bước phải lưu command, exit code, report và người phê duyệt. Bất kỳ exit code khác 0, drift chưa giải thích, count/checksum lệch, orphan hoặc smoke lỗi đều dừng và rollback. Không sao chép mù quyết định resolve từ rehearsal nếu schema demo tại thời điểm triển khai đã thay đổi.

## 17. Đề xuất phê duyệt hoặc blocker

Không còn blocker kỹ thuật trong phạm vi Checkpoint A.2. Đề xuất người dùng/giảng viên review commit A.2, bảng 45 metadata và runbook; nếu đồng ý triển khai demo, cấp một phê duyệt riêng nêu rõ maintenance window, commit, backup path/checksum, hai migration được phép resolve sau audit lại và quyền mở guard đúng `bookverse_ai`.

Chưa có phê duyệt đó nên không tự triển khai demo và không bắt đầu Checkpoint D.
