# Trạng thái hiện tại BookVerse AI

Cập nhật: 19/07/2026. Đây là nguồn trạng thái hiện hành; báo cáo checkpoint cũ chỉ là historical snapshot.

## Quy ước

- `VERIFIED`: có bằng chứng trực tiếp và command liên quan exit 0.
- `PARTIAL`: chỉ xác minh được một phần.
- `NOT_VERIFIED`: chưa đủ bằng chứng.
- `BLOCKED`: không thể kiểm tra do môi trường, quyền hoặc credential.
- `NOT_AVAILABLE`: hệ thống hoặc dữ liệu không tồn tại.
- `FAILED`: command đã chạy và thất bại.

## Baseline source 19/07/2026

- Branch `checkpoint-g2-real-catalog`; HEAD trước commit lượt này `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Worktree trước lượt có 52 tracked file modified và 75 untracked path; tar runtime 1.12 GB được giữ ngoài commit, không xóa.
- Không có remote; lượt này không push, không reset/clean/checkout/restore/stash.

## Kết luận Checkpoint G2.2

Checkpoint G2.2 **chưa hoàn thành toàn bộ Definition of Done**. Cover audit kỹ thuật đã xử lý đủ 3.046/3.046 record và review riêng đủ 24 anomaly, nhưng chỉ 687 đạt policy; 2.335 redirect ngoài allowlist và rights vẫn `NOT_VERIFIED`. Category LOW đã review đủ 8 mapping nhưng vẫn là broad fallback. Evidence audit đọc 8.400 dòng và xác nhận 0 `REAL_USER_DATA`; UI/API đã chuyển sang neutral khi thiếu provenance. Database demo chưa migration/import và chưa deploy.

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| ZIP bàn giao | VERIFIED | SHA-256 `986824e5a06c8b7125376a4af8ff6c5cce482e9d568ca458dbf6613c3d3255f4` khớp | Chỉ xác minh tính toàn vẹn file |
| Catalog 3.046 record | PARTIAL | 3.046 Book/source record/cover ID/cover URL duy nhất; 3.044 work + 2 edition-only; 34 record thiếu language | Không được tuyên bố có 3.046 work key |
| Category mapping | PARTIAL | Audit mới trên `bookverse_ai_test`: 39/39 resolve, checksum `17d3f2ef5917900510117266dd43841ae3d6fc7f69d7ceb0672685ab813274cd`, 22 HIGH/9 MEDIUM/8 LOW | 628/3.046 record thuộc 8 mapping LOW; science → education và cooking → travel là broad fallback, không phải mapping ngữ nghĩa chính xác |
| Schema/migration | VERIFIED | Model 1–1 `BookSourceMetadata`; migration additive mới, không sửa migration cũ | Chỉ apply trên test |
| Import test | VERIFIED | Dry-run cuối và execute lần hai: INSERT/UPDATE/REJECTED = 0, UNCHANGED = 3.046; count hành vi không đổi | Import trước đó đã tồn tại; không áp dụng trên demo |
| Catalog UI | VERIFIED | Pagination 24; filter real/demo/language/year/ISBN/rating nguồn; Home có “Sách tuyển chọn”; Detail có metadata nguồn | Chạy local trên database test, chưa deploy |
| Recommendation evidence provenance | PARTIAL | Test DB read-only: 8.400 evidence, 0 verified real-user, 8.400 missing provenance; source policy chỉ cho phép claim khi có interaction/user/taxonomy/algorithm đầy đủ | Chưa có `REAL_USER_DATA`; không được gọi recommendation hiệu quả |
| Recommendation isolation | PARTIAL | Integration: 0 Recommendation/DailyRecommendation/RequestItem trỏ catalog; parity 30/30, max delta 0 | Evidence/Feedback/Telemetry cũ không có provenance; UI giữ neutral |
| Browser G2.2 | VERIFIED | `node scripts/audit_real_catalog_ui.cjs` exit 0 trên 360/390/768/1366/1920, đủ 8 surface; catalog tối đa 24 remote request, 404 fallback 24/24, không broken image | Đây là local test với `TEST_FIXTURE`, chưa phải deployment |
| Cart cover fixture | VERIFIED | `test:g2-1-cart-covers` exit 0: 5 viewport; valid/404/timeout; counts trước/sau khớp, cleanup hoàn tất | Dữ liệu là `TEST_FIXTURE`, không phải user behavior |
| Cover HTTP toàn catalog | PARTIAL | Policy v4 audit mới 3.046/3.046: 687 `HTTP_VERIFIED`, 2.335 `INVALID_CONTENT` (redirect cuối ngoài allowlist), 24 `INVALID_DIMENSION`; groups ghi original/final host, status, redirect count và fallback reason | Redirect `archive.org`/`*.us.archive.org` không được coi là cover đã verify; HTTP 200 không phải license |
| Review 24 dimension anomaly | VERIFIED | `review_real_catalog_cover_dimensions`: 24/24; 23 `LANDSCAPE_INVALID`, 1 `TOO_SMALL`, đều có quyết định fallback | Đây là phân loại kỹ thuật theo metadata; không phải visual/license review |
| Cover policy dùng chung | VERIFIED | `config/cover-policy.json` được dùng bởi validator, importer contract, BookCover, auditor và unit tests | Không tự động thêm redirect host |
| Cover có giấy phép | NOT_AVAILABLE | Không có manifest license hợp lệ (`approvedReal=0`); rights của Open Library cover là `NOT_VERIFIED` | Tải được ảnh không đồng nghĩa có quyền tái phân phối |
| Docker image build | VERIFIED | Audit image current-source: web sha256:`6c8dde47f8d20daf11bbc7d38f50d5867caadd6bcc4740a06339164259e7ea01`, AI sha256:`2c8ff5ebaedb96f394c35c8009e12c1fae1d253acac246749d7f6a9e1ad6af32`; FindingCount 0 | Image local, không phải deployment |
| Deployment | NOT_VERIFIED | Không push/deploy/restart demo | Không được gọi production-ready |

## Database

### `bookverse_ai_test`

- Trước G2: Book 2.200, Category 2.200, Order 2.606, Review 3.600, Interaction 11.344, InteractionEvent 18.002, Recommendation 4.200.
- Sau import: Book 5.246 = 2.200 `SYNTHETIC_DATA` + 3.046 catalog tuyển chọn.
- `BookSourceMetadata`: 3.046; work 3.044; edition-only 2; ISBN 2.343; ấn bản tiếng Việt 259; thiếu language 34.
- Order/Review/Interaction/InteractionEvent/Recommendation cuối lượt giữ lần lượt 2.606/3.600/11.344/18.005/4.200.
- Backup/restore rehearsal `20260716T1705` là **historical snapshot** (file/checksum được giữ ngoài Git); lượt G2.1 này chưa tạo backup hoặc restore mới, nên backup/restore current `NOT_VERIFIED`.

### `bookverse_ai` demo

Query read-only cuối lượt: Book 1.200, Category 24, Listing 1.200, Order 1.500, Review 3.500, Interaction 17.744, InteractionEvent 18.008, Recommendation 3.000, 12 migration. `book_source_metadata` là `NOT_AVAILABLE`. G2 không migration/import/backfill/seed database demo.

## Test hiện hành

- Prisma validate: VERIFIED; `npx prisma generate` tại host FAILED do EPERM khi đổi tên query engine đang bị Windows lock. Docker build cô lập chạy generate thành công; warning deprecation `package.json#prisma` vẫn còn.
- Typecheck: VERIFIED.
- TypeScript unit: 123/123.
- Python: `compileall` exit 0; `pytest ai_service/tests` 23 passed, 1 skipped (integration DB không chạy trong suite mặc định).
- Stock integration: 11/11.
- Assistant integration: local degraded fallback, không mock, cleanup count về baseline.
- Telemetry/rank collision: VERIFIED và cleanup.
- Production parity: 30/30 row, max score delta 0 (parity fixture/test DB; không phải metric recommendation online).
- Cover audit G2.2: 3.046/3.046 request hoàn tất với rate limit/resume; policy v4 ghi final host/redirect chain/fallback reason; 687 verified, 2.335 redirect rejected, 24 dimension anomaly.
- Cover dimension review: 24/24, không có record bị bỏ qua.
- Category LOW semantic review: 8/8, source category được giữ lại và confidence vẫn LOW.
- Recommendation evidence provenance audit: 8.400/8.400 thiếu provenance; transaction read-only.
- Production build local: exit 0.
- Browser cover UI audit: VERIFIED; 72 surface trên 6 viewport (360/390/768/1366/1440/1920), deterministic không conflict, cart cover status VERIFIED.
- Browser real-catalog audit: VERIFIED; 5 viewport × 8 surface, catalog tối đa 24 remote request, 404 fallback 24/24 và không broken image.
- Cart cover browser fixture: VERIFIED; test DB counts trước/sau giữ nguyên và fixture cleanup hoàn tất.
- Assistant API smoke: VERIFIED với production server local trên port 3101 và provider `local`; HTTP 200, contract `d1`, `mocked=false`, `degraded=true`, invalid payload 400 và anonymous feedback 401. Đây không phải bằng chứng OpenAI/Gemini credential thật.
- Stock deployment verifier: BLOCKED/FAILED theo command vì scope chỉ cho phép rehearsal database, không đọc DB ngoài scope.
- `npm audit --omit=dev`: FAILED với 2 moderate PostCSS advisory; chưa chạy `npm audit fix --force`.
- Docker Compose base/production config: exit 0 với placeholder kiểm tra cấu hình; không phải credential thật. Image current-source đã audit secret với FindingCount 0; đây vẫn là image local, chưa deploy.

## Nhãn dữ liệu và AI

- `SYNTHETIC_DATA`: ultra-2200 và phần lớn interaction/order/recommendation hiện có.
- `DEMO_DATA`: giá của catalog tuyển chọn (`SYNTHETIC_DEMO_PRICE`).
- `TEST_FIXTURE`: dữ liệu integration/browser; không dùng báo CTR.
- `INSTRUMENTED_DEMO_DATA`: telemetry integration đã cleanup; không phải hành vi production.
- Bibliographic metadata từ Open Library: 3.046 record tuyển chọn, tách bằng `BookSourceMetadata`; không đồng nghĩa toàn bộ nội dung là dữ liệu người dùng thật.
- `REAL_USER_DATA`: `NOT_AVAILABLE`.
- 259 là **ấn bản tiếng Việt**, không phải 259 tác giả Việt Nam.
- Hybrid production HitRate@10 `0,008403`, thấp hơn baseline tốt nhất; CTR production `NOT_AVAILABLE`.
- OpenAI/Gemini credential thật: `BLOCKED_MISSING_CREDENTIAL` nếu môi trường chưa cung cấp key.
- Recommendation evidence: `PARTIAL`; source nhận diện `VERIFIED_REAL_USER` chỉ khi provenance đầy đủ, còn synthetic/legacy/missing/anonymous hiển thị neutral. Audit hiện tại có 0 `REAL_USER_DATA`.

## Không được tuyên bố khi bảo vệ

- Không nói có 3.046 Open Library work key; chỉ 3.044 work và 2 edition-only.
- Không gọi cover Open Library là publisher-licensed hoặc `REAL_VALID`.
- Không gọi giá demo là giá bán thật.
- Không nói 259 tác giả Việt Nam.
- Không nói catalog có review/order/interaction người dùng thật.
- Không nói hybrid vượt baseline, CTR đã cải thiện, UAT/SUS PASS hoặc production-ready.
- Không nói G2 đã deploy hoặc database demo đã được cập nhật.

## Việc còn lại

1. Quyết định với 2 edition-only: bổ sung work key có nguồn xác minh hoặc sửa acceptance criteria thành 3.044 work + 2 edition-only; không tự đổi dữ liệu.
2. Xác minh quyền sử dụng/tái phân phối cover hoặc tiếp tục remote lazy-load với rights `NOT_VERIFIED` trong demo học thuật.
3. Quyết định business policy cho 2.335 cover redirect ngoài allowlist; hiện giữ fallback, không sửa URL nguồn tự động.
4. Bổ sung provenance `REAL_USER_DATA` từ telemetry có consent nếu muốn bật claim cá nhân hóa; hiện UI đã giữ neutral.
5. Chỉ deployment database demo ở checkpoint riêng có backup, migration/import rehearsal và phê duyệt.
6. Thu thập UAT/telemetry người dùng thật có consent trước khi báo SUS/CTR hoặc tune recommendation.
