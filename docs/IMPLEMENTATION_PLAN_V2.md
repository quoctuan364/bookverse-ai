# BookVerse AI Implementation Plan V2

Tài liệu này chia việc nâng cấp thành các lượt có checkpoint và ghi trạng thái thực thi đã được kiểm chứng.

Trạng thái ngày 14/07/2026:

- **Checkpoint C: ĐÃ DUYỆT và đã hoàn thành Lượt 1A.**
- Đã có database guard, runtime validation, dataset analyzer, dry-run, import report và unit test.
- Rehearsal đã chạy trên database độc lập `bookverse_ai_test`; database demo `bookverse_ai` chỉ được đọc để xác minh guard.
- **Checkpoint B: ĐÃ DUYỆT và đã hoàn thành Lượt 1B trên `bookverse_ai_test`.** Migration, backfill, idempotency, ba chế độ import, integration verifier, FastAPI compatibility và restore rehearsal đều PASS.
- **Checkpoint A.2: ĐÃ HOÀN THÀNH deployment readiness.** Fresh migration, full clone, pgvector, migration reconciliation, Category/stock idempotency, smoke và rollback rehearsal đều PASS. Database demo chưa được thay đổi.
- **Checkpoint D: ĐÃ DUYỆT VÀ HOÀN THÀNH.** Giữ RAG tại Next.js, thống nhất contract `d1`, session/feedback ownership, safe error, degraded fallback và khóa mock production; không đổi schema, migration, FastAPI hoặc database demo.
- **Checkpoint E: ĐÃ DUYỆT VÀ HOÀN THÀNH.** Temporal split, strong-positive policy, baseline/metric, cold-start, leakage assertion, production parity và output tái lập đều PASS; không đổi production weight hoặc database demo.
- Git local đã được khởi tạo an toàn; baseline Checkpoint E là commit `eb881a7c`. Branch thực thi là `checkpoint-e-ai-evaluation`; không push remote trong checkpoint này.

## 1. Mục tiêu

Hoàn thiện BookVerse AI theo hướng có thể demo, kiểm thử và giải thích được với giảng viên:

- Không làm mất database demo **bookverse_ai**.
- Chống oversell theo transaction và có test đồng thời.
- Chuẩn hóa dataset trước khi import; không đánh giá AI bằng dữ liệu sai trục thời gian.
- Loại bỏ mock production theo lộ trình có fallback minh bạch.
- Bảo vệ auth, ownership, role và isLocked ở server.
- Có test, CI, Docker readiness và tài liệu chạy rõ ràng.
- Ưu tiên các luồng người dùng chính trước khi làm đẹp diện rộng.

## 2. Các quyết định kiến trúc đã chốt

1. Giữ cart-as-order: **Order(PENDING, paymentMethod null)** là giỏ; không thêm Cart/CartItem.
2. State machine duy nhất:
   - PENDING → PAID, PAID_DEMO hoặc CANCELLED.
   - PAID/PAID_DEMO → SHIPPED hoặc CANCELLED.
   - SHIPPED → COMPLETED hoặc CANCELLED.
   - COMPLETED và CANCELLED là terminal.
3. Không thêm trạng thái order mới. Enum REFUNDED đang tồn tại sẽ không được dùng hoặc mở transition nếu chưa có checkpoint hoàn tiền riêng.
4. Review unique theo userId + bookId; không liên kết trực tiếp OrderItem. Verified purchase, nếu bật, chỉ chấp nhận PAID, PAID_DEMO, SHIPPED, COMPLETED từ query server-side.
5. Không bắt buộc chuyển chatbot sang FastAPI. Ưu tiên contract, UI, error, auth và bỏ mock trước khi đổi service boundary.
6. Mọi destructive operation, import và integration/concurrency test chỉ chạy trên **bookverse_ai_test** hoặc database rehearsal tạm có tên allowlist rõ ràng; không ghi **bookverse_ai**.
7. Git cũ không có HEAD/config/refs/logs/objects để phục hồi. Sau khi được duyệt, repository local mới đã được khởi tạo và loại secret, dump, output runtime, dataset/ebook lớn khỏi index.

## 3. Lượt 1 - Dataset và chống oversell

Thứ tự thực hiện sau khi các checkpoint tương ứng được duyệt:

1. Thêm database guard dùng URL parser và allowlist; guard phải chạy trước khi đọc dataset hoặc mở transaction destructive.
2. Tách import thành chế độ validate/dry-run và apply; tạo report machine-readable.
3. Sửa mapping **published_year → Book.publishYear**, **rating_avg → Book.rating** và kiểm tra stock/category hierarchy.
4. Rehearsal import trên **bookverse_ai_test**, đối chiếu count, null-rate, foreign key, category tree và restore.
5. Chỉ sau Checkpoint A: migration Listing.stock/soldAt/index/constraint trên test DB.
6. Backfill test có report, không suy stock từ purchases một cách mù quáng.
7. Checkout dùng conditional stock decrement trong cùng transaction với order/timeline/audit.
8. Cancel dùng conditional state transition và hoàn stock đúng một lần.
9. Thêm unit, integration và concurrent checkout test.
10. Chỉ đề xuất áp dụng database demo sau khi rehearsal, backup và restore test đều pass.

File trọng tâm: **prisma/schema.prisma**, migration mới, **scripts/import_seed_1200.ts**, **actions/marketplace.actions.ts**, **actions/cart.actions.ts**, **actions/order.actions.ts**, **actions/seller.actions.ts**, **actions/dashboard.actions.ts**, **lib/order-workflow.ts**.

Review unique là migration riêng trong Lượt 1: trước tiên phải lập report 27 duplicate hiện tại, duyệt rule giữ bản cập nhật mới nhất hoặc merge nội dung, thử trên test DB rồi mới thêm unique. Không gộp âm thầm vào stock migration.

## 4. Lượt 2 - AI thật và evaluation

1. Chuẩn hóa interaction taxonomy dùng chung cho tracking, FastAPI và evaluator.
2. Chỉ coi purchase hợp lệ khi order thuộc PAID, PAID_DEMO, SHIPPED hoặc COMPLETED; loại cart/cancel/refund khỏi feature.
3. Regenerate dữ liệu temporal hoặc thu thập log có thời gian thật; split train/test theo mốc thời gian.
4. Thêm Popularity và Content-only baseline; báo Precision@K, Recall@K, NDCG@K, HitRate@K và Coverage.
5. Lưu config, seed, query window, commit/build identifier và output JSON để tái lập.
6. Thay **buildMockSellerAiScore** bằng SellerAiScore được tính từ dữ liệu thật hoặc ẩn toàn bộ khối nếu chưa đủ dữ liệu.
7. Không để **BookCard.buildMockEvidence** tạo lý do giả; hiển thị evidence thật hoặc trạng thái “chưa có giải thích”.
8. Chatbot phải báo rõ degraded/unavailable; mock chỉ được bật bằng cờ development/test.
9. Reader không được trình bày demo page như ebook thật.

File trọng tâm: **ai_service/main.py**, **ai_service/evaluate.py**, **actions/recommendation.actions.ts**, **actions/tracking.actions.ts**, **actions/cart.actions.ts**, **lib/book-embeddings.ts**, **components/shared/BookCard.tsx**, **app/api/chat/route.ts**, **components/FloatingChatbot.tsx**, **app/read/[bookId]/page.tsx**.

## 5. Lượt 3 - Security, test, CI và Docker

- Auth: test role/ownership/isLocked cho admin, moderator, seller, buyer và anonymous.
- API: không nhận identity đáng tin từ client; che raw error; validate input; rate-limit chat và route AI nhạy cảm.
- Service-to-service: bảo vệ FastAPI recommendation, không public cổng 8000 trong cấu hình production nếu không cần.
- Dependency: pin Node/Python version, xử lý 2 npm vulnerability sau khi đọc advisory, không dùng audit fix force tự động.
- Test: Vitest/Jest cho helper/action, Playwright cho flow chính, pytest cho FastAPI/evaluator, PostgreSQL integration trên bookverse_ai_test.
- CI: install sạch, Prisma validate/generate, typecheck, lint, unit test, integration test có service DB riêng, build.
- Docker: healthcheck DB/AI/web, depends_on theo healthy, secret injection, xác minh pgvector migration/readiness và loại configuration drift.
- Documentation: lệnh chạy host/container, biến môi trường, quy tắc DB guard, backup/restore và demo checklist.

## 6. Lượt 4 - UI trọng yếu và tài liệu

Thứ tự khóa hồi quy:

1. Catalog.
2. Book detail.
3. Marketplace.
4. Cart/Checkout.
5. Orders.
6. Reader.
7. Assistant/Chatbot.
8. Seller Center.
9. Admin Center.
10. Auth/Profile.

Việc thực hiện: tạo design token; chuẩn hóa Button/Input/Select/Dialog/Badge/Card/Table/Pagination/Toast; thêm Loading/Empty/Error/ServiceUnavailable; sửa overflow và responsive table; audit label/aria-label/focus; phân biệt empty với DB/AI outage; bảo đảm chatbot không che CTA; tách client component không cần thiết; cập nhật README và kịch bản demo.

## 7. Dependencies

Quan hệ phụ thuộc:

    Database guard
      -> Import dry-run + runtime validation
      -> Rehearsal trên bookverse_ai_test
      -> Stock/category/review migration rehearsal
      -> Transaction checkout + cancel restore
      -> Integration/concurrency test
      -> Áp dụng có kiểm soát cho database demo

    Temporal dataset + interaction taxonomy
      -> Recommendation feature đúng
      -> Evaluation có time split
      -> AI evidence thật
      -> UI bỏ mock production

    Contract chatbot thống nhất
      -> Error/auth/degraded state thống nhất
      -> Quyết định giữ Next.js hoặc chuyển FastAPI
      -> Regression test

Không bắt đầu UI polish cho một luồng khi contract/error state của luồng đó còn thay đổi lớn.

## 8. Must / Should / Could

### Must

- Database guard và bookverse_ai_test.
- Dry-run, runtime validation, import report và backup/restore test.
- Sửa mapping dataset trước import.
- Stock conditional update, cancel restore một lần và concurrency test.
- Dedupe Review trước unique constraint.
- Interaction/order-status filtering và temporal evaluation hợp lệ.
- Bỏ hoặc gắn nhãn rõ production mock.
- Auth/ownership/isLocked test, CI tối thiểu, Docker healthcheck/secrets.

### Should

- Category hierarchy + canonicalKey.
- Contract thống nhất cho assistant/chatbot.
- Design token và shared state components.
- Pin Python dependency và tách dependency legacy.
- Artifact evaluation tái lập và monitoring degraded mode.

### Could

- Chuyển RAG sang FastAPI nếu benchmark cho thấy lợi ích rõ.
- canonicalId riêng nếu sau audit có nhiều category alias cần hợp nhất.
- Quy trình refund đầy đủ với checkpoint riêng.
- Observability nâng cao, queue cho embedding hoặc recommendation batch.

## 9. Checkpoint

### CHECKPOINT: A — Listing stock và chống oversell — ĐÃ HOÀN THÀNH DEPLOYMENT READINESS

Trạng thái thực thi ngày 14/07/2026: schema/migration, backup, profile `legacy-demo-24`, Category/stock backfill, atomic checkout, idempotency, cancel/restock, unit test, PostgreSQL concurrency, ultra-2200 regression, FastAPI smoke, build và deployment verifier đều PASS. A.2 bổ sung image pgvector pin đúng PostgreSQL 16, audit bảy trạng thái, fresh database từ rỗng, full clone migration deploy và rollback rehearsal. Database demo chỉ được đọc và chưa có migration/backfill; triển khai thật vẫn cần phê duyệt riêng theo `docs/DEPLOYMENT.md`.

Kết quả bổ sung A.1:

- 24 Category legacy được map bằng name/slug + whole-profile fingerprint, không dùng ID làm khóa nhận diện chính.
- Dry-run ghi 0; execute đầu ghi 24; execute lần hai `changed=0`.
- Tampered name/slug fail-closed trước write; không partial update.
- Clone có 24 root, 0 child, 24 mapped, 0 unmapped; checksum ID/name/slug và Book–Category khớp demo.
- Stock/checkout integration 11/11 PASS; deployment verifier `status=PASS`, không còn blocker Category.

Kết quả bổ sung A.2:

- Review 45 Book metadata cho ba mapping MEDIUM; giữ mapping/profile/checksum vì chưa có bằng chứng mapping sai.
- PostgreSQL rehearsal `16.14`, pgvector `0.8.5`; cast, L2/cosine/inner-product operator PASS.
- Fresh database: 11/11 migration `APPLIED_VALID`; deploy lần hai không pending; Prisma/schema/constraint smoke PASS.
- Full clone: 5 migration valid, 2 history-missing được chứng minh đầy đủ và resolve bằng Prisma, 4 pending được deploy; audit cuối 11/11 valid.
- Category dry/execute/execute là 0 write/24/0; stock là 0 write/1.193/0.
- Full smoke giữ nguyên count 300/24/1.200/1.200/1.500/2.570, không orphan; checkout integration 11/11 PASS.
- Rollback restore exit 0 trong 1.931 ms, schema semantic checksum và count khớp pre-deployment.
- Ba database rehearsal đã drop; container demo không restart/recreate và vẫn ở schema cũ.

1. **Vấn đề hiện tại**
   - Model Listing chưa có stock/soldAt. Quantity chỉ bị chặn 1–9, không dựa trên tồn kho.
   - Hai buyer có thể cùng checkout một listing APPROVED.
   - Cancel chưa có tồn kho để hoàn; purchases chỉ tăng và không phản ánh hàng còn lại.

2. **Bằng chứng từ repository**
   - **prisma/schema.prisma:model Listing** có purchases nhưng không có stock/soldAt.
   - DB đọc ngày 11/07/2026: 1.200 listing; 1.198 có purchases > 0; 1.035 vừa APPROVED vừa purchases > 0; 0 SOLD.
   - **actions/cart.actions.ts** revalidate listing nhưng không conditional decrement. **actions/marketplace.actions.ts** tăng quantity của OrderItem.

3. **Thiết kế đề xuất**
   - Thêm **stock Int @default(1)**, **soldAt DateTime?**, index **[status, stock]** và DB check **stock >= 0**.
   - Trong checkout transaction, mỗi item dùng conditional update với id, sellerId dự kiến, status APPROVED và stock >= quantity; decrement stock. Nếu affected row khác 1, rollback toàn checkout.
   - Khi stock về 0, chuyển Listing sang SOLD và set soldAt. Không cho item của nhiều seller vì kiến trúc hiện tại đã chặn.
   - COD cũng giữ stock tại thời điểm checkout. Cancel dùng conditional Order status update trong cùng transaction rồi increment stock; chỉ request chuyển trạng thái thành công đầu tiên được hoàn. COMPLETED/CANCELLED terminal.

4. **File bị ảnh hưởng**
   - **prisma/schema.prisma**, migration mới.
   - **actions/marketplace.actions.ts**, **actions/cart.actions.ts**, **actions/order.actions.ts**, **actions/seller.actions.ts**, **actions/dashboard.actions.ts**.
   - **lib/order-workflow.ts** và test mới.

5. **Model/field/index bị ảnh hưởng**
   - Listing.stock, Listing.soldAt, index Listing(status, stock), check constraint stock non-negative.
   - Không thêm Cart/CartItem; không thêm order status.

6. **Dữ liệu cũ bị ảnh hưởng**
   - 1.198 listing có purchases > 0 nhưng không thể kết luận stock = 0 vì seed hiện vẫn để 1.035 listing đó APPROVED.
   - Không dùng purchases làm tồn kho. Phải join listing.id với nguồn dataset đã validate; listing không match được đưa vào report.

7. **Kế hoạch backfill**
   - Chỉ chạy trên bookverse_ai_test.
   - SOLD hiện có → stock 0, soldAt lấy thời điểm hợp lý đã duyệt.
   - Listing match nguồn và stock hợp lệ → dùng stock nguồn.
   - Listing không match → mặc định tạm 1 nhưng bắt buộc có danh sách review; không apply demo nếu tỷ lệ match/validation chưa đạt acceptance criteria.
   - purchases được giữ làm counter lịch sử, không trừ lần nữa.

8. **Backup và restore test**
   - Tạo pg_dump có timestamp/checksum trước rehearsal; restore vào database test thứ hai; so count/checksum các bảng Listing, Order, OrderItem.
   - Hiện chưa có DB backup đã xác minh và restore chưa được thử.

9. **Migration dự kiến**
   - Expand: thêm stock nullable và soldAt/index/check.
   - Backfill có report trên test.
   - Contract: đổi stock thành required/default sau khi không còn null.
   - Không gộp migration Review hoặc category để rollback độc lập.

10. **Test dự kiến**
    - Unit: state machine, quantity/stock validation, self-purchase, hidden/rejected/sold.
    - Integration: checkout success/insufficient stock, transaction rollback, COD cancel, paid cancel, terminal state.
    - Concurrency: hai request tranh stock 1, đúng một request thành công; retry cancel không hoàn hai lần.
    - Authorization: buyer/seller/admin không thấy hoặc sửa dữ liệu seller khác.

11. **Rollback**
    - Trước apply: restore dump nếu rehearsal/apply lỗi.
    - Sau deploy: feature flag tắt checkout mới; rollback app trước. Chỉ drop field/index sau khi xác minh code cũ không ghi chúng và có migration rollback riêng.

12. **Rủi ro còn lại**
    - Dataset stock synthetic phần lớn > 1, có thể không phù hợp marketplace sách cũ.
    - Order PENDING COD vừa là trạng thái thanh toán vừa có thể nhầm với cart; mọi query cart phải tiếp tục kèm paymentMethod null.

13. **Khuyến nghị**
    - Duyệt thiết kế, nhưng chỉ apply sau Checkpoint C, test DB guard, dry-run và restore test. Không backfill theo purchases.

14. **Yêu cầu duyệt: YES/NO**
    - Bạn có duyệt Checkpoint A để sau Phase 0 thiết kế migration/rehearsal stock đúng nội dung trên, chỉ trên **bookverse_ai_test**, không áp dụng database demo khi chưa có báo cáo test không? Trả lời **YES A** hoặc **NO A + nội dung cần sửa**.

### CHECKPOINT: B — Category hierarchy và canonical category — ĐÃ HOÀN THÀNH TRÊN DATABASE TEST

Kết quả thực thi ngày 13/07/2026:

- Migration `20260712153000_add_category_hierarchy_and_canonical_fields` chỉ được apply lên `bookverse_ai_test`.
- 2.200 Category gồm 43 root và 2.157 child; 27 canonical group; orphan/cycle/self-parent/unmapped đều bằng 0.
- Dry-run dự kiến 2.200 thay đổi; execute lần một cập nhật 2.200 row; execute lần hai `changed = 0`, `unchanged = 2200`.
- Import dry-run, non-replace và replace-existing đều giữ hierarchy; backfill sau replace tiếp tục `changed = 0`.
- FastAPI sử dụng canonical → parent → category gốc và chạy được với cả schema test mới lẫn schema demo cũ.
- Backup SHA-256 đúng kỳ vọng; restore sang `bookverse_ai_restore_test` trả 2.200 Book/Category, 2.200 quan hệ, 9 migration cũ và không có cột Category mới; database tạm đã được drop sau kiểm tra.
- Database demo không được ghi: vẫn có 1.200 Book, 24 Category và chưa apply migration Category.

1. **Vấn đề hiện tại**
   - Category trong Prisma là danh sách phẳng. Dataset có cây parent_id/level nhưng import không lưu.
   - Category quá phân mảnh làm feature category của recommendation thưa và khó giải thích.

2. **Bằng chứng từ repository**
   - **prisma/schema.prisma:model Category** chỉ có id/name/slug/description/books.
   - Dataset có 2.200 category duy nhất: 43 root, 2.157 child, 844 không có sách, 770 chỉ có một sách; không có parent reference hỏng trong audit sơ bộ.
   - FastAPI chấm trọng số theo categoryId trực tiếp.

3. **Thiết kế đề xuất**
   - Thêm self relation **parentId/parent/children**, field **level Int** và **canonicalKey String?** có index.
   - canonicalKey của category con lấy từ root đã resolve, giúp recommendation gom feature theo nhánh.
   - Chưa thêm canonicalId ở lượt đầu; chỉ đề xuất nếu audit alias chứng minh nhiều cây/category khác nhau cùng một nghĩa. Không xóa category gốc.

4. **File bị ảnh hưởng**
   - **prisma/schema.prisma**, migration category riêng.
   - **scripts/import_seed_1200.ts**, **ai_service/main.py**, catalog/filter actions và test.

5. **Model/field/index bị ảnh hưởng**
   - Category.parentId, Category.level, Category.canonicalKey; self relation; index parentId, level, canonicalKey.
   - Book.categoryId và ID category gốc được giữ nguyên.

6. **Dữ liệu cũ bị ảnh hưởng**
   - Tất cả category được bổ sung metadata; không đổi ID và không xóa row.
   - Category không match dataset giữ parentId null và được gắn cờ trong report.

7. **Kế hoạch backfill**
   - Validate unique id/slug, parent tồn tại, không cycle, level khớp độ sâu.
   - Root: parentId null, level 1 theo schema nguồn, canonicalKey theo bảng rule root đã review.
   - Child: parentId theo dataset, level 2 theo cây đã tính lại, canonicalKey kế thừa root.
   - Report riêng 844 category rỗng và 770 category một sách; chưa xóa/merge tự động.

8. **Backup và restore test**
   - Dùng cùng quy trình dump/restore test nhưng kiểm tra thêm adjacency list, cycle và count category/book trước-sau.

9. **Migration dự kiến**
   - Thêm field nullable/index/self FK; backfill; chỉ chuyển level required sau validation.
   - Không cascade delete parent; chính sách xóa phải RESTRICT hoặc SetNull theo migration được duyệt.

10. **Test dự kiến**
    - Unit parser cây/canonicalKey; cycle/orphan/duplicate detection.
    - Integration import 43 root/2.157 child, catalog filter và recommendation fallback root.
    - Regression bảo đảm Book.categoryId và URL/filter cũ còn hoạt động.

11. **Rollback**
    - Recommendation feature flag quay lại categoryId leaf.
    - Giữ ID/category row gốc; drop metadata mới bằng migration riêng chỉ sau khi code rollback.

12. **Rủi ro còn lại**
    - canonicalKey theo root có thể quá rộng; tên synthetic/description lặp làm semantic signal vẫn yếu.

13. **Khuyến nghị**
    - Duyệt parentId + level + canonicalKey; hoãn canonicalId và mọi merge/delete cho tới khi có alias audit.

14. **Trạng thái duyệt**
    - Đã duyệt và hoàn thành rehearsal trên **bookverse_ai_test**. Việc apply migration lên `bookverse_ai` cần một phê duyệt riêng; không tự động suy rộng từ Checkpoint B.

### CHECKPOINT: C — Dataset import — ĐÃ DUYỆT, LƯỢT 1A HOÀN THÀNH

1. **Vấn đề hiện tại**
   - Script import xóa DB trước khi import, không guard, dry-run, runtime validation hoặc transaction toàn quy trình.
   - Mapping tên field sách bị sai và stock/category hierarchy bị bỏ qua.

2. **Bằng chứng từ repository**
   - Dataset thực tế: **published_year**, **rating_avg**, category **parent_id/level**, listing **stock/purchase_count**.
   - Script interface/mapper đọc **publication_year**, **rating_average** tại các dòng 49, 56, 793, 795.
   - **clearCurrentData** ở dòng 597–625 dùng deleteMany; main gọi nó ở dòng 1460.

3. **Thiết kế đề xuất**
   - Ba pha tách biệt: parse + validate; dry-run + report; apply có guard.
   - Mapping rõ: published_year → Book.publishYear; rating_avg → Book.rating; purchase_count → Listing.purchases; stock chỉ map sau Checkpoint A; parent_id/level chỉ map sau Checkpoint B.
   - Không biến field thiếu/sai type thành 0. Nullable hợp lệ → null; lỗi type/range → chặn apply.

4. **File bị ảnh hưởng**
   - **scripts/import_seed_1200.ts**, module schema/guard/report mới trong **scripts/lib** nếu cần.
   - **package.json** đổi alias để destructive mode phải explicit.
   - Test fixtures nhỏ; không sửa file JSON gốc.

5. **Model/field/index bị ảnh hưởng**
   - Không schema change trong chính checkpoint import. Mapping theo schema đã được duyệt ở A/B.
   - Không thêm status/order field.

6. **Dữ liệu cũ bị ảnh hưởng**
   - Apply mode vẫn thay toàn bộ seed nên có tác động lớn. Database demo không được làm target rehearsal.
   - File gốc **bookverse_ultra_seed_2200.json** chỉ đọc, không ghi đè.

7. **Kế hoạch backfill**
   - Import mới và backfill cũ là hai command khác nhau.
   - Backfill chỉ cập nhật field đã validate theo ID, xuất count matched/unmatched/changed/skipped; không xóa row.

8. **Backup và restore test**
   - Trước apply test: pg_dump, checksum, restore sang DB test thứ hai và chạy smoke query.
   - outputs/import_backups hiện không đủ điều kiện restore.

9. **Migration dự kiến**
   - Không migration cho việc sửa tên mapping.
   - Nếu A/B được duyệt, migration của A/B phải rehearsal trước import apply; tuyệt đối không tự db push/reset.

10. **Test dự kiến**
    - Unit: field alias, number/date/enum/range, orphan parent, duplicate ID, malformed JSON.
    - Dry-run: không có DB write; report deterministic.
    - Integration: guard từ chối bookverse_ai, chấp nhận đúng allowlist bookverse_ai_test, rollback khi batch lỗi.
    - Reconciliation: count/null-rate/FK/order total/timestamp/category tree trước-sau.

11. **Rollback**
    - Apply chỉ được phép khi dump đã restore thử. Lỗi import rollback transaction/batch strategy đã thiết kế; nếu không thể atomic toàn bộ thì restore dump, không chạy lại mù quáng.

12. **Rủi ro còn lại**
    - Dataset synthetic: description lặp, timestamp trùng và recommendation không có ground truth sau thời điểm gợi ý.
    - Import “thành công” không đồng nghĩa dữ liệu đủ tốt cho evaluation.

13. **Khuyến nghị**
    - Đây là checkpoint cần làm đầu tiên ở Lượt 1. Guard và dry-run phải được merge/test trước mọi migration/backfill.

14. **Yêu cầu duyệt: YES/NO**
    - Bạn có duyệt Checkpoint C để xây guard + validation + dry-run + report và rehearsal chỉ trên **bookverse_ai_test**, không chạy apply trên **bookverse_ai** không? Trả lời **YES C** hoặc **NO C + nội dung cần sửa**.

### CHECKPOINT: D — Assistant service boundary

Trạng thái thực thi ngày 14/07/2026: **ĐÃ HOÀN THÀNH theo phương án 1**. `/assistant` và FloatingChatbot cùng gọi contract `d1` qua `/api/chat`; RAG/keyword retrieval, OpenAI/Gemini và local catalog fallback nằm tại service Next.js dùng chung. FastAPI recommendation, Prisma schema, migration, embedding hiện có và database demo không bị sửa.

1. **Vấn đề trước Checkpoint D**
   - /assistant và FloatingChatbot là hai trải nghiệm, contract và error handling khác nhau.
   - Chat route có fallback mock production-visible; FastAPI chưa phục vụ chatbot.

2. **Bằng chứng từ repository**
   - **actions/assistant.actions.ts** là SQL/Prisma contains search rule-based.
   - **components/FloatingChatbot.tsx** gọi **app/api/chat/route.ts**, nơi chạy RAG pgvector/keyword và OpenAI/Gemini/mock.
   - **ai_service/main.py** hiện có recommendation endpoint, không có chat endpoint.

3. **Thiết kế đề xuất**
   - Phương án 1, khuyến nghị: giữ RAG trong Next.js; tạo contract chung và adapter cho UI. Chuẩn hóa auth, ownership, safe error, degraded state và mock flag.
   - Phương án 2: chuyển retrieval/LLM sang FastAPI, Next.js làm BFF/auth proxy; chỉ làm khi benchmark hoặc vận hành chứng minh lợi ích.
   - Contract tối thiểu: success, answer, validatedBooks, provider/source, mocked/degraded, sessionId, assistantMessageId, errorCode.

4. **File bị ảnh hưởng**
   - Phương án 1: **actions/assistant.actions.ts**, **app/assistant/page.tsx**, **app/api/chat/route.ts**, **app/api/chat/feedback/route.ts**, **components/FloatingChatbot.tsx**, contract module/test mới.
   - Phương án 2 thêm **ai_service/main.py**, Python schemas/dependency, Docker/AI client.

5. **Model/field/index bị ảnh hưởng**
   - Phương án 1 dự kiến không migration; tiếp tục ChatbotSession/Message/Feedback và BookEmbedding.
   - Phương án 2 không được tự đổi model; mọi migration phát sinh phải checkpoint riêng.

6. **Dữ liệu cũ bị ảnh hưởng**
   - Session/message/feedback cũ được giữ. Adapter phải đọc contract cũ trong giai đoạn chuyển tiếp nếu cần.
   - Không regenerate embedding tự động.

7. **Kế hoạch backfill**
   - Không backfill mặc định. Chỉ thêm version/source metadata nếu thật sự cần và phải có report/checkpoint DB riêng.

8. **Backup và restore test**
   - Không migration ở phương án khuyến nghị; vẫn snapshot sample session/feedback và test ownership. Nếu có schema change, dùng quy trình DB test chung.

9. **Migration dự kiến**
   - Phương án giữ Next.js: không migration.
   - Phương án FastAPI: chưa đề xuất migration; service boundary không phải lý do để đổi schema.

10. **Test dự kiến**
    - Contract test /assistant và /api/chat.
    - Auth: anonymous, locked, session owner/non-owner, feedback ownership.
    - RAG: invalid model book ID không lọt response; provider timeout; DB/embedding unavailable; mock disabled production.
    - UI: loading/error/degraded, keyboard/accessibility, chatbot không che CTA.
    - Nếu FastAPI: regression parity, timeout/retry, service auth và benchmark latency.

    **Kết quả thực tế:** 63/63 unit test PASS; integration thật trên `bookverse_ai_test` PASS cho owner/non-owner/locked/anonymous và cleanup về 0; production API smoke PASS với `mocked=false` dù cờ mock được bật; UI browser smoke PASS cho `/assistant`, chatbot nổi, validated link và anonymous feedback; database-unavailable trả safe 503; Prisma validate/generate, typecheck, build, Python compile và Docker Compose config đều PASS. Chi tiết tại `docs/CHECKPOINT_D_TEST_REPORT.md`.

11. **Rollback**
    - Giữ feature flag adapter/UI cũ trong một release. Phương án FastAPI phải có flag quay về Next.js RAG mà không mất session.

12. **Rủi ro còn lại**
    - Giữ Next.js tập trung nhiều trách nhiệm ở route; chuyển FastAPI tạo thêm network hop, deployment và service-auth failure mode.
    - Chưa benchmark OpenAI/Gemini thật trong CI vì không đưa API key vào repository; timeout/fallback đã được unit test và production local smoke.
    - Prisma báo cấu hình `package.json#prisma` sẽ deprecated ở Prisma 7; hiện dự án vẫn dùng Prisma 6.19.3 và schema hợp lệ.

13. **Khuyến nghị**
    - Chọn phương án 1: giữ RAG trong Next.js, thống nhất contract/UI/error/auth và loại mock trước. Chỉ mở checkpoint chuyển FastAPI khi có lợi ích đo được.

14. **Yêu cầu duyệt: YES/NO**
    - Người dùng đã duyệt phương án giữ RAG trong Next.js và cho phép triển khai Checkpoint D. Không mở checkpoint chuyển chatbot sang FastAPI.

### CHECKPOINT: E — Temporal AI Evaluation — ĐÃ HOÀN THÀNH

Trạng thái thực thi ngày 14/07/2026: **ĐÃ HOÀN THÀNH** trên `bookverse_ai_test` bằng query read-only. Evaluator dùng global cutoff `2026-06-01`, tạo strong-positive từ purchase hợp lệ/reading đủ ngưỡng/bookmark/favorite/review tích cực, loại cancelled/refunded và không dùng bảng Recommendation làm ground truth.

1. **Split và leakage**
   - 12.206 positive train, 2.593 positive test; train max nhỏ hơn test min.
   - 0 event ID overlap, 0 future feature, 0 future popularity, 0 cancelled/refunded positive.
   - Candidate 2.000 Book; 952 user đủ điều kiện; 2.349 ground-truth pair.

2. **So sánh cùng policy**
   - Popularity, Content, Behavior và Hybrid production dùng cùng split/candidate/K/cohort.
   - Random seeded chỉ là sanity check, không được gọi là AI baseline.
   - Behavior HitRate@10 `0,021008`; Content Recall@10 `0,010812`; Hybrid HitRate@10 `0,008403`.
   - Metric thấp được báo cáo đúng; không thay trọng số production theo test.

3. **Reproducibility và parity**
   - Hai run JSON/CSV/Markdown có cùng checksum chuẩn hóa `ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e`.
   - Production parity 3 user/30 row, max score delta 0, evidence không đổi.
   - CTR là `NOT_AVAILABLE` vì chưa có impression/exposure log.

4. **Cổng hoàn thành**
   - Python 17/17, TypeScript 63/63, Prisma, Category, Assistant, Stock 11/11, Uvicorn smoke, Next build và Compose đều PASS.
   - Database demo, schema, migration, `ai_service/main.py`, API contract và trọng số giữ nguyên.
   - Báo cáo chi tiết tại `docs/AI_EVALUATION.md` và phụ lục Checkpoint E trong `docs/TEST_REPORT.md`.

5. **Bước tiếp theo**
   - Chuẩn hóa interaction taxonomy giữa tracking/FastAPI/dataset.
   - Thu impression/exposure/click log thật.
   - Tạo validation window riêng trước khi thử learned ranking hoặc trọng số mới.

### CHECKPOINT: F1 — Interaction Taxonomy và Recommendation Telemetry — ĐÃ HOÀN THÀNH

Trạng thái thực thi ngày 15/07/2026: **ĐÃ HOÀN THÀNH** trên branch `checkpoint-f1-recommendation-telemetry`; database demo không được migrate hoặc ghi dữ liệu.

1. Taxonomy versioned dùng chung gồm 22 canonical event và 38 alias; audit 18.000 legacy event có unknown = 0, không rewrite lịch sử.
2. Request snapshot do server lưu owner, algorithm/taxonomy version, surface, profile, Book/rank/score/evidence. Client chỉ gửi requestId, Book và impression/click.
3. Impression cần 50% viewport trong 1 giây; click bất đồng bộ không chặn navigation. Ownership, locked account, item membership, rate/body limit và database idempotency đều có test.
4. Conversion dùng last-click, fallback last-impression trong 7 ngày; chỉ nhận strong-positive đã xác minh, loại order cancelled/refunded và event trước exposure.
5. Migration additive đã rehearsal fresh/clone và apply trên test; telemetry cleanup về 0. Demo giữ 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem và không có bảng F1.
6. Split train/validation/final có checksum và leakage = 0. Final cũ được ghi rõ không còn unseen; F1 không tune hoặc tính final metric.
7. Toàn bộ unit/integration/browser/regression/build/Compose pass. CTR vẫn `NOT_AVAILABLE` vì chưa có log instrumented thật.

Checkpoint F2 đề xuất chỉ bắt đầu sau thời gian thu log thật: giám sát data quality, retention/privacy, dashboard CTR theo surface và tuning trên validation. Khóa model trước khi tạo một final-test mới hoàn toàn sau F1.

## 10. Acceptance criteria

### Lượt 1

- Guard từ chối 100% destructive command khi target không nằm trong allowlist chính xác.
- Dry-run không tạo DB write; report có source hash, count, mapping error, null-rate, orphan/duplicate và target DB đã che.
- Restore test pass trước apply test.
- Một listing stock 1 với hai checkout đồng thời: đúng một thành công.
- Retry cancel không hoàn stock lần hai.
- Cart tiếp tục là PENDING/paymentMethod null; không có Cart model.
- Không có transition ngoài state machine đã chốt.
- Review unique chỉ migrate sau khi duplicate report và dedupe test pass.

### Lượt 2

- Không còn PRODUCTION_MOCK được trình bày như dữ liệu AI thật.
- Recommendation chỉ dùng purchase từ trạng thái hợp lệ.
- Evaluation có time split, baseline, Recall/NDCG/Coverage và artifact tái lập.
- Không dùng seed recommendation làm ground truth cho chính nó.

### Lượt 3

- CI pass install, Prisma validate/generate, typecheck, lint, unit/integration, build.
- Auth/ownership/isLocked có test âm.
- Docker healthcheck/readiness pass; không hard-code secret production; pgvector image/schema khớp.

### Lượt 4

- Mười luồng ưu tiên không overflow ở viewport mục tiêu.
- DB/AI outage hiển thị error/degraded, không giả thành empty/mock success.
- Form có label, icon button có accessible name, keyboard/focus hoạt động.
- README có hướng dẫn host/container, test, demo, backup/restore và giới hạn AI.

## 11. Rollback

- Mỗi lượt dùng migration/feature flag nhỏ, không gộp stock, category và Review unique vào một migration.
- Trước mọi DB write: xác minh target test, tạo dump, checksum và restore thử.
- Deploy theo expand → backfill → switch code → contract; không drop field cũ cùng lượt.
- Nếu reconciliation hoặc test fail: dừng, không retry destructive; rollback app/feature flag và restore test dump.
- Database demo chỉ được áp dụng khi người dùng duyệt riêng sau khi xem report rehearsal.
- Source rollback local đã khả dụng từ baseline commit `df4602f`. Repository chưa có remote và chưa push; dataset/ebook lớn, secret, dump và output runtime không nằm trong Git.
