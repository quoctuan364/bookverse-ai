# Biên bản Deployment R1 — BookVerse AI

> **Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.** Xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md) trước khi dùng bất kỳ kết luận nào.

Ngày triển khai: 15/07/2026. Database: `bookverse_ai`. Báo cáo này không chứa mật khẩu, token hoặc connection string đầy đủ.

## 1. Kết luận

Deployment R1 PASS. Web, FastAPI và PostgreSQL đang chạy; dữ liệu nghiệp vụ khớp backup maintenance.

## 2. Git HEAD, tag và commit

- Branch triển khai: `checkpoint-f1-recommendation-telemetry`.
- Commit source đã triển khai: `c625d01da100bee1daee503a7c71f4615de8ba90`.
- Pre-tag: `pre-demo-deployment-r1-20260715T204909`.
- Worktree sạch trước thao tác database và sau khi hoàn nguyên toàn bộ guard tạm.
- Commit ancestor Category/stock, legacy Category, A.2, Assistant D, Evaluation E và Telemetry F1 đều hợp lệ.

## 3. Maintenance window

- Bắt đầu: `2026-07-15T20:49:10+07:00`.
- Kết thúc: `2026-07-15T21:15:05+07:00`.
- Web và AI đã dừng; `pg_stat_activity` không còn session nghiệp vụ trước backup.

## 4. Preflight

- Prisma validate/generate, TypeScript typecheck, 74/74 unit test và Next production build: PASS.
- Python compile, 22/22 pytest và AI image import smoke: PASS.
- Category, legacy Category, stock, Assistant, taxonomy và telemetry integration: PASS.
- Hai evaluation run mới có cùng checksum `798531514721020f3dada04667bce3dd6f88efdc09c681291815413b773fcd1d`.
- Compose config, rehearsal config và Docker build không cache: PASS.
- Test database ban đầu chưa chạy nên lượt đầu bị từ chối kết nối; sau khi khởi động lại, toàn bộ gate liên quan được chạy lại và PASS. Không dùng kết quả lỗi làm bằng chứng đạt.

## 5. Final clone rehearsal

- Dump clone: `bookverse_ai_final_clone_20260715T203836.dump`, SHA-256 `890B8D298E4B70AD05EFCAE90692590E1950526D4CDF6E0482806F36FF0B2F19`.
- Rehearsal dùng PostgreSQL 16.14 và pgvector 0.8.5 đúng cấu hình thật.
- Audit ban đầu: 5 `APPLIED_VALID`, 2 `APPLIED_HISTORY_MISSING`, 5 `PENDING`.
- Reconcile, 5 migration, Category, stock, telemetry, app smoke và migrate deploy lần hai: PASS.
- Lượt đầu đã phát hiện không được bootstrap vector trước audit legacy; clone được tạo lại từ dump, chạy đúng thứ tự và PASS. Demo chưa bị chạm ở thời điểm đó.
- Clone/database/volume/container tạm đã drop sau khi lưu artifact.

## 6. Backup, checksum và restore validation

- Custom backup: `backups/deployment-r1/bookverse_ai_maintenance_20260715T204934.dump`, 1.526.606 byte.
- SHA-256 custom: `5EA8FAE1BE877F630AEF17B2FC64550900C825B50ACAF919A8E1C5430D5EE239`.
- Schema-only: `bookverse_ai_maintenance_20260715T204934_schema.sql`, 55.061 byte.
- SHA-256 schema: `5B63B39CF62CE035433418A43D3A8E984419E5A6DD898A8FE98E54D443CA897E`.
- `pg_restore -l`, restore vào database tạm và cleanup tài nguyên: PASS.
- Fingerprint nguồn/restore: `77dd1f20bbb32cb31dd0e404244aadaa`.

## 7. PostgreSQL và pgvector

- Trước: `postgres:16-alpine`; sau: `pgvector/pgvector:0.8.5-pg16`.
- Image digest: `sha256:1d533553fefe4f12e5d80c7b80622ba0c382abb5758856f52983d8789179f0fb`.
- PostgreSQL giữ nguyên 16.14; volume giữ nguyên `doantotnghiep_pgdata:/var/lib/postgresql/data`.
- Vector extension 0.8.5; cast `[1,2,3]`, L2 `1`, cosine `0`, inner product `-14`: PASS.

## 8. Migration history reconciliation

Chỉ resolve bằng Prisma hai migration đã chứng minh đủ object/checksum:

- `20260706143000_add_password_reset_tokens`.
- `20260706150000_admin_operations_foundation`.

Không sửa trực tiếp `_prisma_migrations`, không `db push`, reset hoặc sửa migration cũ.

## 9. Migration deploy

- Pending hợp lệ trước deploy: pgvector, profile/shipping, Category, stock và telemetry.
- `prisma migrate deploy`: áp dụng đủ 5 migration.
- Audit cuối: 12/12 `APPLIED_VALID`; checksum catalog `465c2d7e5b93f385cb7052517a11bc942c4df22ef0059f416722448bcd9757cd`.
- Deploy lần hai: không có migration chờ.

## 10. Category backfill

- Profile `legacy-demo-24@1.0.0`; fingerprint `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`.
- Mapping checksum `fb547a5e5cda329aeaf0046e24aeef94f650c7108255320f50d5a8de1aa760e9`.
- Execute đầu đổi 24 dòng; lần hai đổi 0.
- Kết quả: 24 root, 0 child, 24 mapped, 0 orphan/cycle/self-parent.
- Book–Category checksum giữ nguyên `f051090fb24abf12888453c87498030839ade45f3c6901721c1cbc6f75327ebc`.

## 11. Stock backfill

- Source checksum `e1e7b7d29f659fa9ea9272ce5ab1ca28095e289b0cc170d8f93e43221acf0047`.
- Match 1.200/1.200; không unmatched, oversubscribed hoặc anomaly ngoài policy.
- Execute đầu đổi 1.193 dòng; lần hai đổi 0.
- Stock 1–120, không âm, không `APPROVED` hết stock, SOLD/soldAt nhất quán.

## 12. Telemetry schema

- Đủ 3 bảng request/item/event, enum, FK, index, unique và position check.
- Ban đầu 0/0/0; không backfill CTR hoặc event synthetic.
- Smoke impression/click có marker `deployment-smoke-r1`, kiểm tra deduplicate và cleanup exact request ID; cuối cùng trở về 0/0/0.

## 13. Application deployment

- Web image: `sha256:7c05c1fdb4cc07f538819787d7b903c5e2f2824cb66cba87f2d0bf56df81d827`.
- AI image: `sha256:41f3c5445fafb7fcadb671110bf614feca9e5632d08072d0f068372388dbcbbe`.
- Web chạy `NODE_ENV=production`; code production không thể chọn provider mock.
- Log không có connection string hoặc AUTH secret; Assistant không có key ngoài đã degraded về local catalog.

## 14. Smoke test

- Auth.js login thật: BUYER, SELLER, ADMIN PASS.
- Home, catalog, filter C001, marketplace, book detail, reader, community, buyer dashboard, seller dashboard, admin và Assistant: HTTP 200.
- Home card có server requestId; impression mới 201, duplicate 200, click 201 và đích điều hướng 200.
- Non-owner 403, arbitrary Book 404, locked account 403.
- FastAPI health `ok`, 10/10 recommendation trỏ đến Book tồn tại.
- Assistant d1: provider local, `mocked=false`, degraded an toàn, 5 Book hợp lệ; session/message cleanup giữ count 9/18/1.
- Checkout/concurrency không chạy ghi trên demo; dùng bằng chứng final clone theo phê duyệt.
- Browser tích hợp không khởi tạo được do lỗi runtime nội bộ; smoke dùng HTTP session thật. Điều kiện impression 50%/1 giây được xác minh bởi unit test hiện tại và component production.

## 15. Count và invariant trước/sau

Count từ backup và database cuối khớp: `300|24|1200|1200|1500|2570|17744|18008|3000|6027|9|18|1` tương ứng User, Category, Book, Listing, Order, OrderItem, Interaction legacy, interaction_events, Recommendation, RecommendationEvidence, chatbot session/message/feedback.

Sau deploy: telemetry 0/0/0, migration success 12 và failed/pending 0; marketplace available 1.037; FK chưa validate 0. Schema fingerprint hợp lệ thay đổi từ `77dd1f20bbb32cb31dd0e404244aadaa` thành `64f76fa4a691591a54cee2456c48cdeb` do 5 migration đã duyệt.

## 16. Rollback readiness

Backup maintenance được giữ ngoài Git và đã restore kiểm chứng hai lần. Nếu cần rollback, dừng web/AI, restore backup vào database mới, đối chiếu fingerprint/count rồi mới chuyển connection string; không chạy down migration destructive.

## 17. Command và exit code

Tất cả command bắt buộc cuối cùng exit 0. `prisma migrate status` trước deploy exit 1 là trạng thái dự kiến vì có đúng 5 pending; sau deploy exit 0. Các lượt HTTP smoke tự đặt giả định sai đã được cleanup, điều chỉnh phép kiểm tra theo contract thật và chạy lại; không được tính là lỗi ứng dụng.

## 18. File và tài liệu cập nhật

- `docs/DEPLOYMENT.md`.
- `docs/DEPLOYMENT_R1_REPORT.md`.
- Backup/runtime output tiếp tục bị `.gitignore` loại khỏi commit.

## 19. Rủi ro còn lại

- `/api/recommendations` trả 10 sách nhưng `requestId=null` khi dữ liệu hiện tại trộn rank legacy và rank mới bị trùng; transaction telemetry fail closed, recommendation vẫn hoạt động. Trang chủ không gặp lỗi này.
- Vector chưa khóa dimension và chưa có ANN index; chưa là blocker ở quy mô hiện tại.
- Compose local còn dùng AUTH secret cấu hình tĩnh; chưa xuất hiện trong image/log nhưng phải chuyển sang secret manager trước môi trường công khai.
- Cần một lượt visual smoke thủ công vì browser tích hợp của phiên triển khai không khởi tạo được.

## 20. Kế hoạch telemetry và Checkpoint F2

- Thu dữ liệu thật, không seed impression/click/conversion; CTR giữ `NOT_AVAILABLE` khi chưa có impression.
- Theo dõi request success, duplicate rate, 4xx/5xx, impression/click/conversion và orphan mỗi ngày.
- F2 phải chuẩn hóa position sau khi merge recommendation legacy/current, bổ sung integration fixture có rank trùng và buộc API có requestId.
- Chỉ tune model khi đủ dữ liệu instrumented và đã kiểm tra leakage/data quality.

Deployment R1 đã hoàn thành. Database demo đã được backup, nâng cấp pgvector, apply đầy đủ Category, stock và telemetry migration; backfill và smoke test PASS. Không mất dữ liệu nghiệp vụ và rollback backup đã được xác minh.
