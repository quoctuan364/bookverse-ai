# Báo cáo kiểm thử Checkpoint A.2 — Deployment Readiness

> **HISTORICAL SNAPSHOT ngày 14/07/2026:** đây không phải test report của source hiện tại. Trạng thái/test mới nhất xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md). Không dùng số PASS cũ thay cho command chạy trên HEAD hiện tại.

Ngày chạy: 14/07/2026.

## 1. Kết luận

**Kết luận lịch sử tại thời điểm A.2:** source khi đó đã qua rehearsal kỹ thuật cho Category/stock; database demo chưa được thay đổi trong checkpoint A.2. Baseline hiện tại đã khác và được ghi riêng trong `CURRENT_STATUS.md`.

Kết luận A.2 dựa trên fresh migration, full clone, pgvector, migration reconciliation, Category/stock idempotency, smoke và rollback ở thời điểm đó. Câu “Checkpoint D không được bắt đầu” đã hết hiệu lực; D/E/F1/F1.1 đã có các snapshot riêng nhưng vẫn phải chạy regression lại trên source hiện tại.

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

---

# Phụ lục báo cáo kiểm thử Checkpoint E — Temporal AI Evaluation

Ngày chạy: 14/07/2026.

## E.1. Kết luận

**Checkpoint E đã hoàn thành. Recommendation được đánh giá bằng temporal split không leakage, có baseline, metric và output tái lập. Không thay đổi production weight hoặc database demo.**

Nhận định chất lượng không được làm đẹp: Behavior có HitRate@10 cao nhất `0,021008`; Content có Recall@10 `0,010812`; Hybrid production có HitRate@10 `0,008403` và thấp hơn nhiều baseline. Dataset synthetic và metric thấp chưa cho phép kết luận model tốt.

## E.2. Evaluation thực tế

- Cutoff: `2026-06-01T00:00:00`.
- Positive train/test: 12.206/2.593.
- Train feature: 14.473.
- Candidate Book: 2.000.
- User trước eligibility/đủ điều kiện/bị loại: 986/952/34.
- Ground-truth user–Book: 2.349.
- Cohort: cold 12, sparse 1, warm 939.
- CTR: `NOT_AVAILABLE` vì không có impression/exposure log đáng tin cậy.

Leakage assertions: train trước test, event overlap 0, future feature 0, cancelled/refunded positive 0, held-out Book trong train của cùng user 0, future popularity 0, current rating không được dùng.

## E.3. Reproducibility

Hai run độc lập:

```text
outputs/evaluation/20260714T171642323910Z-ef61b3fc02a4
outputs/evaluation/20260714T171642335284Z-ef61b3fc02a4
```

Cùng dataset fingerprint:

```text
e96d9c4db04455bf88800c0b7035ae25ac19870a4775f3dc5b4d94a0a459e2b3
```

Cùng normalized checksum:

```text
ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e
```

Mỗi thư mục có `evaluation.json`, `metrics.csv`, `summary.md`; output runtime nằm trong `.gitignore` và không được commit.

## E.4. Production parity

Fixture ba user `U0792`, `U1734`, `U0864` được chụp từ baseline commit `eb881a7c01b3e5f59009a715a85f451981184f46`. Kết quả sau Checkpoint E: 30/30 row giữ nguyên Book ID và evidence, score tolerance `1e-6`, max delta `0`.

## E.5. Bảng command/exit code

Chỉ lượt command cuối có exit code 0 được ghi PASS.

| Command/nhóm lệnh | Exit code | Trạng thái | Bằng chứng |
|---|---:|---|---|
| `python -m compileall -q ai_service` | 0 | PASS | Toàn bộ Python compile |
| `python -m pytest ai_service/tests -q` với integration flag | 0 | PASS | 17/17 |
| Evaluation integration trên test DB | 0 | PASS | Read-only, parity và cancelled filter |
| Evaluation thật lượt 1/lượt 2 | 0/0 | PASS | Cùng checksum `ef61…568e` |
| `python ai_service/evaluate.py --parity-only` | 0 | PASS | 3 user, 30 row, delta 0 |
| `python ai_service/evaluate.py --no-write` | 0 | PASS | 952 user, 2.000 candidate |
| Uvicorn `/health` + `/recommend/U0792` | 0 | PASS | health ok, 10 recommendation |
| `npx prisma validate` | 0 | PASS | Schema hợp lệ |
| `npx prisma generate` | 0 | PASS | Prisma Client 6.19.3 |
| `npm run typecheck` | 0 | PASS | Không lỗi TypeScript |
| `npm test` | 0 | PASS | 63/63 |
| `npm run test:category-integration` | 0 | PASS | 2.200 Category, 27 canonical, legacy read-only |
| `npm run test:assistant-integration` | 0 | PASS | Contract d1, ownership; cleanup về 0 |
| `npm run test:stock-integration` | 0 | PASS | 11/11; cleanup fixture |
| `npm run build` | 0 | PASS | Next.js production build |
| `docker compose config --quiet` | 0 | PASS | Compose chính hợp lệ |
| Rehearsal Compose config với biến bắt buộc | 0 | PASS | Override hợp lệ |

Smoke bằng Starlette `TestClient` không được dùng làm cổng cuối vì môi trường hiện tại thiếu package test-harness `httpx2`. Cổng startup được thay bằng Uvicorn thật trên cổng tạm, gọi HTTP thành công rồi dừng tiến trình. Lần parse rehearsal Compose đầu thiếu hai biến bắt buộc và bị từ chối đúng thiết kế; chạy lại với `REHEARSAL_POSTGRES_USER/PASSWORD` đã PASS.

## E.6. Database trước/sau

`bookverse_ai_test` trước và sau integration cùng có 2.200 User, 2.200 Category, 2.200 Book, 18.000 InteractionEvent, 6.200 ReadingSession, 2.799 Bookmark, 48 Favorite, 3.600 Review, 4.714 OrderItem và 4.200 Recommendation. Chatbot session/message/feedback đều về 0.

Database demo `bookverse_ai` trước và sau cùng có 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order và 2.570 OrderItem. Không chạy migration, backfill hoặc evaluation write trên demo.

## E.7. Phạm vi thay đổi

Thêm module evaluator thuần, loader read-only, runner, pytest/fixture, dev requirements và tài liệu. Thêm wrapper npm và ignore output. Không sửa `ai_service/main.py`, Prisma schema/migration, chatbot contract, Category mapping, stock/checkout, dataset gốc hoặc production weight.

## E.8. Hạn chế và hành động tiếp theo

Dataset synthetic, taxonomy interaction chưa đồng nhất, thiếu lịch sử trạng thái catalog, thiếu impression log và cohort sparse quá nhỏ. Checkpoint tiếp theo cần chuẩn hóa event taxonomy, thu log exposure thật và tạo validation window riêng trước khi thử trọng số/model mới; không tune trên test Checkpoint E.

---

# Báo cáo kiểm thử Checkpoint F1 — Interaction Taxonomy và Recommendation Telemetry

Ngày chạy cuối: 15/07/2026.

## F1.1. Kết luận

Checkpoint F1 hoàn thành đủ cổng. Taxonomy được dùng chung giữa TypeScript/Python; request, impression, click và conversion có contract riêng; split ba cửa sổ không leakage. Không đổi production recommendation weight, không sửa dataset gốc và không migrate database demo.

## F1.2. Git

- Baseline xác minh: `3a22912c677d2ff393dad3180f04951f1351adc9`.
- Branch: `checkpoint-f1-recommendation-telemetry`.
- Không có remote, không push, không commit dump/output/runtime fixture.

## F1.3. Inventory interaction

| Event/nguồn cũ | Nơi lưu hoặc phát sinh | Field/thời gian chính | Vấn đề trước F1 | Canonical |
|---|---|---|---|---|
| VIEW/BOOK_VIEW | `InteractionEvent`, tracking action | user, Book, createdAt | Hai tên | `BOOK_VIEW` |
| SEARCH | `InteractionEvent` | user, query/target, createdAt | Query có thể nhạy cảm | `SEARCH` |
| READ/READING | `InteractionEvent`, `ReadingSession` | user, Book, progress/time | Tên và ngưỡng chưa thống nhất | `READING_START/PROGRESS/COMPLETE` |
| BOOKMARK | `Bookmark`, `InteractionEvent` | user, Book, page, createdAt | Add/remove chưa tách | `BOOKMARK_ADD/REMOVE` |
| FAVORITE | `FavoriteBook` | user, Book, createdAt | Add/remove chưa tách | `FAVORITE_ADD/REMOVE` |
| CART_ADD | Order/cart flow, `InteractionEvent` | user, Book/listing, time | Chưa phải purchase | `CART_ADD` |
| PURCHASE | `Order` + `OrderItem`, `InteractionEvent` | buyer, Book, status, createdAt | Legacy event thiếu orderId | `PURCHASE` sau xác minh order |
| REVIEW | `Review`, `InteractionEvent` | user, Book, rating, createdAt | Legacy event thiếu rating | `REVIEW_CREATE` |
| COMMENT | Community action | user, post/Book, createdAt | Tên chung | `COMMUNITY_COMMENT` |
| REACTION/LIKE | Community action, `InteractionEvent` | user, target, createdAt | Alias và legacy thiếu target | `REACTION` |
| Recommendation | `Recommendation`, `DailyRecommendation`, `RecommendationEvidence` | user, Book, score/evidence/time | Record không chứng minh exposure | `RECOMMENDATION_REQUEST` khi server snapshot |
| Assistant Book link | Assistant response/UI | session/user, validated Book | Không thuộc recommendation engine | Không ghi recommendation click |

## F1.4. Canonical taxonomy và legacy audit

Taxonomy có 22 canonical event, 38 alias, checksum `e3931aa11d58e19b5f125dfbf3c32afc2a9f28193b753f691df4b0cd367b7c47`. Audit read-only: 18.000/18.000 event map được; unknown 0; duplicate 0; thiếu user/Book/timestamp 0; toàn bộ là synthetic. Required field legacy còn thiếu ở 1.587 purchase, 1.587 reaction và 1.664 review; chỉ report, không rewrite.

## F1.5. Request, impression, click và conversion

- Request do server tạo và lưu owner/version/taxonomy/surface/profile cùng Book/rank/score/evidence.
- Impression chỉ ghi sau 50% viewport liên tục 1 giây, không ghi lúc API response/render.
- Click xác minh owner và Book membership, dùng server timestamp, gửi bất đồng bộ nên không chặn navigation.
- Conversion dùng last-click, fallback last-impression, mặc định 7 ngày; cùng user/Book, sau exposure; loại cancelled/refunded và chống đếm trùng nguồn.

## F1.6. Security và idempotency

Session cung cấp userId; server đọc lại user và `isLocked`, không hỗ trợ anonymous F1. Body tối đa 2.048 byte, rate limit 120/phút/user, payload chỉ nhận requestId/Book/event type. Unique constraint bảo vệ request–Book, request–position và deduplication key; lỗi telemetry không làm hỏng UI.

## F1.7. Migration rehearsal

Backup test trước migration: `backups/checkpoint-f1/bookverse_ai_test_pre_f1_20260715T005944.dump`, SHA-256 `1ae75f765817d5d3a889514f23f7fc902e6f47156c40a877c6217c04443d5099`; `pg_restore --list` đọc được.

- Fresh database: chạy đủ 12 migration từ rỗng, chạy lần hai báo không còn migration.
- Clone từ backup: apply migration F1, count User/Category/Book 2.200, InteractionEvent 18.000, Recommendation 4.200 giữ nguyên; chạy lần hai idempotent.
- `bookverse_ai_test`: apply thành công; chạy lần hai không còn migration.
- Hai database rehearsal tạm đã được xóa; backup không commit. Migration chỉ additive và không backfill.

## F1.8. Temporal split

| Window | Positive events | Users | Books |
|---|---:|---:|---:|
| Train `< 01/06` | 12.206 | 1.100 | 2.189 |
| Validation `01/06–<20/06` | 1.405 | 759 | 1.032 |
| Final `>=20/06` | 1.188 | 687 | 883 |

Manifest checksum `545b12103c6f3c058363cc4249c6c7e419b4ed848a29e456d6c572e5f3e39df8`; overlap và event sai cửa sổ đều 0. Final hiện không còn unseen do Checkpoint E đã xem khoảng này; F1 không tính final metric và không tune.

## F1.9. CTR

Policy là click hợp lệ chia impression hợp lệ trong cùng surface/thời gian. Không dùng request làm impression hoặc BOOK_VIEW làm click. **CTR production = `NOT_AVAILABLE`** vì lịch sử synthetic, còn fixture instrumented đã cleanup và không đại diện người dùng thật.

## F1.10. Unit, integration và browser

- TypeScript: 74/74 test pass.
- Python: 21 pass, 1 skip; PostgreSQL integration riêng 1 pass.
- Telemetry integration trước/sau: User 2.200; request/item/event đều 0. Trong fixture: 3 request, 4 item, 5 event; non-owner, locked user, Book ngoài request, concurrency, attribution và cleanup đều pass.
- Browser: 5 card đầu viewport ghi đúng một impression; 5 card ngoài viewport chưa ghi trước scroll, sau dwell ghi đúng một lần; scroll ra/vào không trùng. Click ghi đúng một event và điều hướng. Khi request bị xóa để endpoint trả 404, click vẫn điều hướng và console không lỗi. Fixture user/request/event đã xóa hoàn toàn.

## F1.11. Regression

- Production recommendation parity: 3 user, 30 row, cùng Book/evidence, max score delta 0.
- Ba lượt E mới cùng checksum `5805f444ca12a74f4d4aba2da35685a6bca4f99360ec6993c10ae3a336a76332`; metrics/stats/leakage bằng artifact E cũ.
- Category: 2.200 category, 43 root, 2.157 child, 27 group; legacy demo chỉ đọc.
- Stock 11/11 pass và cleanup; Assistant contract d1 pass và cleanup.
- Next build, web image, AI image import/smoke và Compose config pass.

## F1.12. Command và exit code

| Command/nhóm lệnh | Exit code | Kết quả |
|---|---:|---|
| `npx prisma validate` / `npx prisma generate` | 0/0 | PASS |
| Fresh/clone/test `prisma migrate deploy` và lượt idempotent | 0 | PASS |
| `npm run typecheck` | 0 | PASS |
| `npm run test:unit` | 0 | PASS, 74/74 |
| `python -m compileall -q ai_service` | 0 | PASS |
| `python -m pytest ai_service/tests -q` | 0 | PASS, 21 pass/1 skip |
| Python PostgreSQL integration | 0 | PASS, 1/1 |
| `npm run test:taxonomy-parity` | 0 | PASS |
| `npm run test:telemetry-integration` | 0 | PASS, cleanup 0 |
| Browser tracking bằng in-app browser | N/A | ĐẠT; browser assertions và DB query đều đúng, công cụ không trả process exit code |
| Ba lượt `python ai_service/evaluate.py` và parity | 0 | PASS |
| Category/Assistant/Stock integration | 0 | PASS |
| `npm run build` | 0 | PASS |
| `docker compose config --quiet` | 0 | PASS |
| `docker compose build web ai_service` | 0 | PASS |
| AI image taxonomy/import smoke | 0 | PASS |

## F1.13. Database demo

Đối chiếu cuối bằng query read-only: 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem; đúng số trước F1. Cả ba bảng `recommendation_*` F1 đều không tồn tại. Không chạy migration, backfill, seed hoặc telemetry write trên `bookverse_ai`.

## F1.14. Hạn chế và F2

Dữ liệu lịch sử synthetic, required field legacy chưa đầy đủ, chưa có telemetry người dùng thật và final window cũ không unseen. F2 nên thu log thật đủ thời gian, thêm data-quality/retention monitoring và dashboard theo surface; chỉ tune trên validation. Sau khi khóa model mới tạo final test post-F1 hoàn toàn chưa xem.

---

# Báo cáo kiểm thử Checkpoint F1.1 — Telemetry reliability và hotfix R1.1

Ngày chạy cuối: 15/07/2026.

## F1.1.1. Root cause và bản sửa

`app/api/recommendations/route.ts` đọc chung Recommendation current/legacy, sắp xếp để hiển thị rồi dùng thẳng `rank` gốc làm request-item `position`. Hai Book khác nhau có cùng rank làm vi phạm unique `recommendation_request_items_requestId_position_key`; nested create rollback toàn request. Wrapper API bắt lỗi để recommendation vẫn hiển thị nên response có đủ Book nhưng `requestId=null`.

Hotfix đưa merge/dedupe/position vào policy tập trung. Book trùng được loại trước top-K; thứ tự production được giữ, tie-break là source priority, rank hợp lệ, Book ID; score không đổi và evidence không bị cộng/trùng. Position được gán lại liên tục `1..N`. Request và toàn bộ item được ghi trong một transaction; persistence lỗi trả contract degraded an toàn.

## F1.1.2. Kết quả test

- Unit TypeScript: 85/85 PASS, gồm rank trùng/null/0/âm/gap, ba nguồn, duplicate Book, top-K deterministic, evidence, score, empty/one Book, client payload giả và degraded contract.
- PostgreSQL integration: rank collision vẫn có requestId; position `[1,2,3]`; atomic failure không orphan; hai request concurrent độc lập; impression/click idempotent; non-owner/locked/arbitrary Book bị chặn; conversion attribution và cleanup PASS.
- Stress: 100/100 request TRACKED, 100 requestId duy nhất, null-rate 0; 34 HOME, 33 API, 33 DASHBOARD; 100 duplicate Book, 100 duplicate rank, 300 invalid rank và 200 candidate quá top-K được normalize. Mismatch Book/score/evidence/position = 0; duplicate Book/position = 0; orphan request/item/event = 0; recommendation/telemetry 5xx = 0.
- Production parity: 3 user/30 row PASS, max score delta 0, Book/evidence giữ nguyên. Hai evaluation run có cùng checksum `bfdb45b1981dd53715943d6f2271e731a3443dae70ed097ab965cd9236ac7ad9`.
- Regression: Prisma validate/generate, typecheck, Python compile/pytest, Category ultra + legacy, Stock 11/11, Assistant d1, taxonomy, Next build, Compose config và Docker web build đều exit 0.

## F1.1.3. Browser và degraded UI

Browser tích hợp lỗi runtime `Cannot redefine property: process`; kiểm thử chuyển sang Chrome Playwright headless theo fallback đã duyệt. Trên production build test: Home có 10 Book/15 link hero+grid; API position 1–10 và database khớp; scroll lần hai không phát impression lại; duplicate event trả 200; click grid và hero đều điều hướng. AI service tắt thật vẫn render fallback, không gắn requestId, không gửi telemetry và không có console crash.

Playwright phát hiện lớp chú thích hero chặn pointer event; thêm `pointer-events-none` và retest hero click PASS. Ảnh smoke demo xác nhận layout/card/reason hiển thị, nhưng một static cover resource trả 404 và một số bìa hiện nền trống; đây là rủi ro asset dữ liệu có sẵn, không thuộc telemetry F1.1.

## F1.1.4. Hotfix demo

- Baseline: 12/12 migration `APPLIED_VALID`; web R1 `sha256:7c05c1fdb4cc07f538819787d7b903c5e2f2824cb66cba87f2d0bf56df81d827`.
- Image R1.1: `sha256:216b0b32dd54b2de81afca696840d21ebf8b1049a8c80de04dd3b23799184b3f`; image env/history và web log secret/raw-DB scan PASS.
- Chỉ web container được recreate. StartedAt của DB `2026-07-15T13:51:12.382247592Z` và AI `2026-07-15T13:56:59.721176726Z` giữ nguyên.
- Surface lỗi thật có 22 candidate và 10 rank collision; API vẫn trả 10 Book, position 1–10, `trackingStatus=TRACKED`, requestId khác null. Marker `deployment-smoke-r1-1` được ghi đúng request.
- Impression 201, duplicate 200/idempotent; click 201 và điều hướng `/book/B0273`; non-owner 403, locked 403, arbitrary Book 404; `/`, `/catalog`, `/dashboard` và login đều HTTP 200.
- Cleanup xóa đúng 2 request, 10 current recommendation, 1 BOOK_VIEW theo ID và phục hồi `lastActiveAt`/lock của ba user.

## F1.1.5. Count và command cuối

| Dữ liệu demo | Trước | Sau cleanup |
|---|---:|---:|
| User | 300 | 300 |
| Category | 24 | 24 |
| Book | 1.200 | 1.200 |
| Listing | 1.200 | 1.200 |
| Order | 1.500 | 1.500 |
| OrderItem | 2.570 | 2.570 |
| Recommendation | 3.000 | 3.000 |
| RecommendationEvidence | 6.027 | 6.027 |
| RecommendationRequest/Item/Event | 0/0/0 | 0/0/0 |

| Command/cổng | Exit code | Kết quả |
|---|---:|---|
| `npx prisma validate` / `npx prisma generate` | 0/0 | PASS |
| `npm run typecheck` / `npm test` | 0/0 | PASS; 85/85 |
| Python compile / pytest / DB parity | 0 | PASS; 21 pass, 1 skip + 1 integration |
| Category / legacy Category / Stock / Assistant | 0 | PASS |
| Taxonomy / rank collision / telemetry integration | 0 | PASS |
| `npm run test:telemetry-reliability` | 0 | PASS; 100/100 |
| Hai lượt `ai_service/evaluate.py` | 0/0 | PASS; cùng checksum |
| `npm run build` / `docker compose config --quiet` | 0/0 | PASS |
| `docker compose build --no-cache web` | 0 | PASS |
| Browser Playwright headless | N/A | PASS; công cụ không trả process exit code |

Không sửa schema/migration, dataset, Category/stock/checkout, Assistant d1, evaluation split, FastAPI production weight hoặc AI image.
