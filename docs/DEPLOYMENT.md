# Runbook triển khai Checkpoint A.2

Ngày xác minh: 14/07/2026. Runbook này mô tả quy trình triển khai thật trong tương lai; **không phải quyền chạy migration/backfill lên `bookverse_ai`**. Lượt A.2 chỉ chạy write trên database fresh, full clone và rollback riêng rồi đã drop cả ba.

## 1. Trạng thái readiness đã chứng minh

- PostgreSQL demo đang chạy `16.14`, container thực tế `postgres:16-alpine` và chưa có extension `vector`.
- Compose nguồn đã pin `pgvector/pgvector:0.8.5-pg16`; image đã pull có digest `sha256:1d533553fefe4f12e5d80c7b80622ba0c382abb5758856f52983d8789179f0fb`.
- Rehearsal riêng dùng `docker-compose.rehearsal.yml`, project `bookverse-a2`, port loopback `55432`; demo không bị restart/recreate.
- Fresh database chạy đủ 11 migration, lần deploy hai không còn pending.
- Full clone từ demo đã audit, reconcile deterministic, deploy, backfill, smoke và deploy idempotency PASS.
- Rollback từ backup pre-deployment có exit code 0 trong 1.931 ms; count và semantic schema checksum khớp nguồn.
- Database demo vẫn có 5 migration history row và schema cũ; chưa có cột Category/stock mới, chưa có extension vector.

## 2. PostgreSQL và pgvector

Migration `20260706133000_add_pgvector_rag_and_highlight_offsets` tự chạy `CREATE EXTENSION IF NOT EXISTS vector` rồi tạo `book_embeddings.embedding vector NOT NULL`. Extension binary phải có trong image trước khi Prisma chạy migration này. Bootstrap an toàn được thực hiện trước migration để fail sớm:

```powershell
$env:DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<TARGET>?schema=public"
$env:EXPECTED_POSTGRES_MAJOR="16"
npm run deployment:pgvector -- --check
npm run deployment:pgvector -- --bootstrap
```

`--bootstrap` chỉ được code hiện tại cho phép trên fresh/full rehearsal, không cho `bookverse_ai`. Khi có phê duyệt triển khai thật, phải review một thay đổi guard riêng cho đúng target; không gỡ toàn bộ guard.

Thiết kế vector hiện tại có giới hạn đã biết:

- Cột dùng `vector` không khóa dimension. OpenAI `text-embedding-3-small` thường tạo 1.536 chiều, còn Gemini `text-embedding-004` thường tạo 768 chiều; schema hiện có thể chứa vector khác dimension.
- RAG dùng cosine distance operator `<=>`.
- Chỉ có B-tree unique/index trên `bookId`; chưa có HNSW/IVFFlat và chưa có vector operator class.
- Đây chưa là blocker cho dữ liệu hiện tại/smoke, nhưng phải khóa provider/dimension và thiết kế ANN index trước khi tăng lớn số embedding.

## 3. Audit và reconciliation migration

Audit mặc định chỉ đọc:

```powershell
npm run deployment:audit-migrations
npm run deployment:audit-migrations -- --require-clean
```

Script kiểm tra checksum 11 file migration, `_prisma_migrations`, `prisma migrate status`, table, column/type/null/default, enum/value, index, FK, constraint và extension. Mỗi migration chỉ nhận một trạng thái: `APPLIED_VALID`, `APPLIED_HISTORY_MISSING`, `APPLIED_SCHEMA_INCOMPLETE`, `PENDING`, `FAILED`, `CHECKSUM_MISMATCH` hoặc `UNKNOWN`.

Clone demo ban đầu có:

- 5 `APPLIED_VALID`.
- 2 `APPLIED_HISTORY_MISSING`: password reset và admin foundation. Toàn bộ object kỳ vọng của hai migration đều khớp, nên clone dùng `prisma migrate resolve --applied` qua audit script.
- 4 `PENDING`: pgvector, profile/shipping, Category hierarchy và stock/checkout.

Không có migration `APPLIED_SCHEMA_INCOMPLETE`, `FAILED`, `CHECKSUM_MISMATCH` hoặc `UNKNOWN`. Script không update trực tiếp `_prisma_migrations`, không resolve theo tên table và luôn từ chối execute trên `bookverse_ai`. Nếu audit thật khác kết quả rehearsal, dừng triển khai và lập bằng chứng lại; không copy mù quyết định resolve của clone.

## 4. Runbook triển khai thật — 15 bước

### 1. Bật maintenance mode

Dừng toàn bộ write từ web, worker và AI job. Ghi giờ bắt đầu, người phê duyệt và cửa sổ rollback. Chỉ tiếp tục khi query giám sát không còn transaction write dài.

### 2. Xác minh commit

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Yêu cầu worktree sạch, đúng commit A.2 đã duyệt và không dùng file migration đã bị sửa sau commit.

### 3. Tạo backup và checksum

```powershell
pg_dump -Fc --no-owner --no-privileges --dbname="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/bookverse_ai" --file="<BACKUP_PATH>"
Get-FileHash -Algorithm SHA256 "<BACKUP_PATH>"
```

Backup nằm ngoài Git, storage đủ dung lượng và checksum được ghi vào biên bản.

### 4. Kiểm tra restore list

```powershell
pg_restore -l "<BACKUP_PATH>" | Out-File "<RESTORE_LIST_PATH>"
```

Exit code phải bằng 0; restore list phải có schema, data, indexes, constraints và `_prisma_migrations`.

### 5. Kiểm tra PostgreSQL major

```sql
SHOW server_version;
SHOW server_version_num;
```

Major phải là 16. Không nâng major trong cùng change này.

### 6. Chuẩn bị pgvector

Đổi database runtime sang image đã pin `pgvector/pgvector:0.8.5-pg16` theo quy trình thay container có maintenance/backup, không dùng `latest`. Sau khi service healthy, chạy preflight quyền, binary, `CREATE EXTENSION IF NOT EXISTS vector`, `pg_extension`, vector cast và ba distance operator. Nếu không PASS, rollback container/application và không chạy Prisma.

### 7. Chạy migration history audit

Chạy read-only audit, lưu JSON và schema-only dump. Đối chiếu từng migration với kết quả clone; mọi `FAILED`, `CHECKSUM_MISMATCH`, `UNKNOWN` hoặc `APPLIED_SCHEMA_INCOMPLETE` đều là điều kiện dừng.

### 8. Resolve migration đã được chứng minh applied

Chỉ sau review độc lập toàn bộ object/checksum mới chạy:

```powershell
npx prisma migrate resolve --applied "<MIGRATION_NAME>"
```

Không chạy SQL trực tiếp vào `_prisma_migrations`. Phê duyệt triển khai thật phải nêu rõ từng migration được resolve; không dùng wildcard.

### 9. Prisma migrate deploy

```powershell
npx prisma migrate deploy
npm run deployment:audit-migrations -- --require-clean
```

Phải có 11/11 `APPLIED_VALID`, không pending/failed/checksum mismatch.

### 10. Category backfill

Sau khi guard target được phê duyệt riêng:

```powershell
npm run data:analyze-category-profile
npm run data:backfill-categories -- --dry-run
npm run data:backfill-categories -- --execute
npm run data:backfill-categories -- --execute
```

Yêu cầu profile `legacy-demo-24@1.0.0`, fingerprint `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`, lần hai `changedRows=0`, 24 mapped và checksum Book–Category không đổi.

### 11. Stock backfill

```powershell
npm run data:backfill-stock -- --dry-run
npm run data:backfill-stock -- --execute
npm run data:backfill-stock -- --execute
```

Yêu cầu match 1.200/1.200 Listing, không unmatched/oversubscribed, lần hai `changedRows=0`, stock không âm.

### 12. Smoke test

Chạy deployment verifier, Category filter, canonical FastAPI, vector query, marketplace, checkout atomic/concurrency, self-purchase, out-of-stock, idempotency và cancel/restock. Đối chiếu count 300/24/1.200/1.200/1.500/2.570, orphan bằng 0.

### 13. Mở lại ứng dụng

Chỉ tắt maintenance khi tất cả smoke exit code 0. Mở web theo từng instance, giữ worker/batch tắt cho đến khi health/readiness ổn định.

### 14. Post-deployment verification

Chạy lại `prisma migrate deploy` để xác nhận không pending, audit `--require-clean`, deployment verifier và theo dõi error/latency/checkout trong cửa sổ quan sát. Lưu report, commit, checksum backup và thời điểm kết thúc.

### 15. Điều kiện và command rollback

Rollback nếu migrate/backfill/verifier lỗi, count/checksum lệch, có orphan, API không đọc được schema hoặc checkout sai. Không dùng down migration destructive. Dừng write, rollback application trước, rồi restore backup vào database **mới**:

```powershell
createdb --host=<HOST> --port=<PORT> --username=<ADMIN_USER> bookverse_ai_rollback_<TIMESTAMP>
pg_restore --exit-on-error --no-owner --no-privileges --dbname="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/bookverse_ai_rollback_<TIMESTAMP>" "<BACKUP_PATH>"
```

Đối chiếu checksum/schema/count và legacy smoke trên database mới. Chỉ chuyển connection string sau khi PASS; giữ database lỗi và backup để điều tra. Không restore đè database đang chạy và không drop database cũ trong cửa sổ rollback.

## 5. Điều kiện dừng bắt buộc

- Sai commit hoặc worktree bẩn.
- Backup/checksum/restore list lỗi.
- PostgreSQL không phải major 16 hoặc vector binary/quyền/operator không PASS.
- Audit có trạng thái ngoài `APPLIED_VALID`, `APPLIED_HISTORY_MISSING` đã chứng minh và `PENDING` hợp lệ.
- `migrate deploy`, backfill hoặc bất kỳ smoke test nào exit code khác 0.
- Count/checksum quan hệ thay đổi, stock âm, duplicate checkout hoặc orphan.
- Chưa có phê duyệt riêng cho write lên `bookverse_ai`.

## 6. Artifact rehearsal

Runtime artifact nằm trong `backups/` và `outputs/`, đều bị `.gitignore` loại khỏi commit. Backup A.2 có SHA-256 `a49a764157a88e141a3ca525a817bad0d7af7beed479ca70daeac1d30cb52094`. Fresh, full clone và rollback database đã được drop sau khi report/checksum được lưu.
