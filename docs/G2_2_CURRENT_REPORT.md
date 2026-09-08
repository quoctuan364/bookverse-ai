# Báo cáo Checkpoint G2.2 — historical snapshot trước regression cuối

Cập nhật: 19/07/2026. Đây là snapshot trước lượt sửa audit browser cuối; trạng thái source hiện hành xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md). Các report checkpoint cũ chỉ là historical snapshot.

## 1. Kết luận

`PARTIAL` — chưa đạt toàn bộ Definition of Done. Cover auditor đã chạy đủ 3.046/3.046 record và ghi redirect/final host/fallback reason; 687 đạt policy, 2.335 bị từ chối vì redirect cuối ngoài allowlist và 24 sai dimension. Review 24 anomaly đã hoàn tất theo metadata kỹ thuật. Category LOW đã review 8/8 và giữ broad fallback. Recommendation evidence đã audit read-only 8.400 dòng: 0 `REAL_USER_DATA`, 8.400 thiếu provenance; UI/API được sửa để không khẳng định cá nhân hóa khi thiếu provenance.

Không migration/import/backfill/seed/deploy hoặc ghi database demo trong snapshot này. Kết luận commit và regression mới nhất không được lấy từ tài liệu này.

## 2. Git baseline và inventory

- Branch: `checkpoint-g2-real-catalog`.
- HEAD: `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Remote: không có remote.
- Worktree trước lượt: 47 tracked file modified và 62 untracked; đây là thay đổi G1/G2 trước lượt, không được reset/clean.
- `git diff --check`: exit 0 (chỉ cảnh báo CRLF của Git).
- Phân loại inventory: các file dirty có trước lượt được giữ là `G1_PREEXISTING`/`G2_PREEXISTING`; file policy/provenance/review/test/docs tạo trong lượt là `G2_2`; file giao nhau như `actions/recommendation.actions.ts`, `components/shared/BookCard.tsx`, `components/shared/BookCover.tsx`, `lib/book-cover.ts`, `README.md`, `docs/CURRENT_STATUS.md`, `package.json` là `OVERLAP`, không giả vờ thuộc riêng G2.2.

## 3. Cover redirect audit

Command cuối exit 0:

`npm run catalog:real:audit-covers -- --delay-ms=250 --timeout-ms=15000`

Report: `outputs/real-catalog-cover-audit/cover-audit-2026-07-18T17-30-58-816Z.json`.

| Kết luận kỹ thuật | Số lượng | Trạng thái |
|---|---:|---|
| Tổng/audited | 3.046/3.046 | VERIFIED |
| HTTP_VERIFIED | 687 | VERIFIED theo policy kỹ thuật |
| INVALID_CONTENT | 2.335 | PARTIAL; redirect cuối ngoài allowlist |
| INVALID_DIMENSION | 24 | PARTIAL; đã review riêng |
| TIMEOUT/NOT_FOUND/NOT_VERIFIED | 0/0/0 | VERIFIED trong lượt audit |
| rightsStatus | toàn bộ `NOT_VERIFIED` | NOT_VERIFIED |

Report mới nhóm được `originalHost`, `finalHost`, HTTP status, redirect count, redirect chain và fallback reason. Final host thực tế có `archive.org`, nhiều `*.us.archive.org` và `covers.openlibrary.org`; allowlist vẫn chỉ HTTPS `covers.openlibrary.org`, không tự động nới theo tên miền.

Một lần audit trước khi sửa guard đã FAILED ở khoảng 200 record vì `UND_ERR_SOCKET`; không dùng kết quả đó. Auditor sau đó dừng fail-closed tại `Location` ngoài allowlist, resume được và chạy đủ 3.046 record exit 0.

## 4. Final host policy

Policy dùng chung ở `config/cover-policy.json`, được dùng bởi `lib/cover-policy.ts`, validator, `BookCover`, auditor và unit tests. Policy hiện tại:

- HTTPS `covers.openlibrary.org` với path `/b/id/<id>-L.jpg?default=false`.
- Redirect storage allowlist rỗng.
- Concurrency tối đa 2, retry tối đa 2, timeout theo command, không lưu binary.
- Dimension tối thiểu 80×120, aspect kỹ thuật 0,4–0,9.
- `rightsStatus` luôn `NOT_VERIFIED`; HTTP 200 không phải license.

## 5. Review 24 dimension anomaly

Command exit 0:

`npm run catalog:real:review-cover-dimensions`

Report: `outputs/real-catalog-cover-audit/dimension-review-2026-07-18T17-31-20-091Z.json`.

- 24/24 record đã được review, không bỏ qua record.
- 23 `LANDSCAPE_INVALID` theo policy ratio.
- 1 `TOO_SMALL` (RB01843, 35×53).
- Không có `PLACEHOLDER`, `CORRUPTED`, `TIMEOUT` hoặc `VALID_NON_STANDARD_BOOK_RATIO` trong 24 anomaly của audit hiện tại.
- Quyết định UI: dùng fallback deterministic cho record bị từ chối; ảnh hợp lệ nhưng không chuẩn nếu xuất hiện trong tương lai phải dùng `object-contain`, không kéo méo/crop.

Đây là phân loại metadata kỹ thuật, không phải tuyên bố đã xem visual từng ảnh hoặc đã xác minh bản quyền.

## 6. Category mapping LOW

Commands exit 0:

- `npm run catalog:real:review-category-low`
- `npm run catalog:real:audit-categories` trên `bookverse_ai_test`
- `npm run test:category-current`
- `npm run test:category-legacy`

Review report: `outputs/real-catalog-category-audit/category-low-review-2026-07-18T17-17-04-152Z.json`.

Đủ 8 mapping LOW: `science → education`, `economics → business`, `architecture → design`, `sociology → philosophy`, `politics → history`, `cooking → travel`, `religion → philosophy`, `vietnamese-books → literature`. Tổng sourceBookCount theo catalog là 628. Mỗi dòng có 10–20 mẫu title/subjects, rationale, ambiguity và quyết định cuối `KEEP_CURRENT_BROAD_FALLBACK_AND_PRESERVE_SOURCE_CATEGORY`. Không đổi mapping hoặc tạo taxonomy/migration mới.

Mapping invariant: 39 entries, duplicate source ID 0, duplicate source slug 0, orphan 0. Confidence của 8 dòng vẫn LOW; đây là bằng chứng contract/review, không phải chứng minh semantic mapping chính xác.

## 7. Recommendation evidence provenance

Command exit 0 trên transaction read-only của `bookverse_ai_test`:

`npm run test:recommendation-evidence-provenance`

Report: `outputs/g2-2-recommendation-evidence/provenance-audit-2026-07-18T17-20-54-707Z.json`.

- Tổng evidence: 8.400.
- `VERIFIED_REAL_USER`: 0.
- `SYNTHETIC_DATA`: 0 dòng có nhãn metadata rõ ràng trong report cũ.
- `MISSING_PROVENANCE`: 8.400.
- `INVALID_OWNER`: 0.
- Transaction read-only: true.

Source mới chỉ hiển thị claim “AI gợi ý” khi có `REAL_USER_DATA`, interaction ID, owner user, event type, source book/category/author, timestamp, taxonomy version và algorithm version hợp lệ. Evidence thiếu provenance, synthetic, anonymous, sai owner hoặc fallback được hiển thị trung tính. Home không còn dùng tiêu đề “dành riêng cho bạn” nếu chưa có provenance verified; profile và recommendation API cũng trả trạng thái neutral.

## 8. File sửa/tạo chính

- `config/cover-policy.json`, `lib/cover-policy.ts`.
- `scripts/audit_real_catalog_covers.ts`.
- `scripts/review_real_catalog_cover_dimensions.ts`.
- `scripts/review_real_catalog_category_low.ts`.
- `scripts/audit_recommendation_evidence_provenance.ts`.
- `lib/recommendation-evidence-policy.ts`, `lib/book-card-presentation.ts`.
- `actions/recommendation.actions.ts`, `actions/profile.actions.ts`, `app/api/recommendations/route.ts`, `app/page.tsx`, `app/profile/page.tsx`.
- `components/shared/BookCard.tsx`, `components/shared/BookCover.tsx`, `lib/book-cover.ts`.
- Unit tests: cover policy, category semantic contract, provenance và BookCard presentation.
- Tài liệu: `docs/CURRENT_STATUS.md`, report G2.2 này.
- Inventory chi tiết và phân loại pre-existing/overlap/new: `docs/G2_2_CHANGE_INVENTORY.md`.

## 9. Unit/integration/browser

- `npm run typecheck`: exit 0.
- `npm run test:unit`: exit 0, 123/123.
- `npm run build`: exit 0; Next.js production build tạo đủ app routes.
- `node scripts/audit_real_catalog_ui.cjs`: exit 0; 5 viewport (`360`, `390`, `768`, `1366`, `1920`) × 8 surface (Home, Catalog, Detail, Recommendation API, Marketplace, Cart, Library, Seller), không overflow/aspect failure; tối đa 24 remote requests trên catalog, 404 fallback 24/24, broken image 0. Dữ liệu là `TEST_FIXTURE`/local test, chưa phải deployment.
- `npm run test:g2-1-cart-covers`: exit 0; 5 viewport, valid/404/timeout, count trước/sau khớp và cleanup hoàn tất trên `bookverse_ai_test`.
- Các integration exit 0: `test:category-current`, `test:category-legacy`, `test:stock-integration` (11/11), `test:assistant-integration`, `test:rank-collision`, `test:telemetry-integration`, `test:telemetry-reliability`, `test:taxonomy-parity`, `test:real-catalog-integration`.
- `npm run test:assistant-api`: exit 1 (`fetch failed`); không gọi đây là provider PASS.
- `npm run test:stock-deployment`: exit 1 do verifier chặn DB rehearsal ngoài scope; trạng thái `BLOCKED`, không dùng làm PASS.
- `npm run test:production-env`, `npm run test:production-mock-policy`, `npm run test:image-secrets`: exit 0/VERIFIED. Image audit có finding secret 0; image local, không phải deployment.
- `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run test:unit`, `python -m compileall -q ai_service`: exit 0 ở lần chạy cuối; Python mặc định `pytest ai_service/tests -q`: 23 passed, 1 skipped. Một lần `prisma generate` bị `EPERM` do production server đang giữ Prisma engine; sau khi dừng server chạy lại exit 0.
- `npm run catalog:real:import` đúng scope `ALLOWED_DESTRUCTIVE_DATABASES=bookverse_ai_test`: exit 0, `PARTIAL` do source rights/validation, nhưng `INSERT=0`, `UPDATE=0`, `UNCHANGED=3046`, `REJECTED=0`, non-catalog counts unchanged; report `outputs/real-catalog/real-catalog-2026-07-18T17-53-22-713Z.json`.
- Cover unit test kiểm tra null, malformed, 404, timeout, non-standard ratio, fallback deterministic và không retry vô hạn.

## 10. Database

`bookverse_ai_test` được query read-only sau lần execute idempotent: Book 5.246, Category 2.200, Listing 2.204, Order 2.606, OrderItem 4.714, Review 3.600, Interaction 11.344, InteractionEvent 18.002, Recommendation 4.200, BookSourceMetadata 3.046, evidence 8.400. Import test lần hai ghi `INSERT=0`, `UPDATE=0`, `UNCHANGED=3046`, `REJECTED=0`; non-catalog counts không đổi. Các fixture/browser test đã cleanup.

`bookverse_ai` chỉ query read-only: Book 1.200, Category 24, Listing 1.200, Order 1.500, Review 3.500, Interaction 17.744, InteractionEvent 18.008, Recommendation 3.000; `book_source_metadata` không tồn tại. Không migration/import/backfill/seed/deploy demo.

## 11. VERIFIED / PARTIAL / NOT_VERIFIED / BLOCKED / FAILED

### VERIFIED

- Cover auditor chạy đủ 3.046 record exit 0; mỗi record có kết luận kỹ thuật.
- Review dimension 24/24 exit 0.
- Review category LOW 8/8 và mapping invariant 39/39.
- Provenance audit read-only 8.400/8.400 exit 0.
- Typecheck và unit 123/123 exit 0.
- Production build exit 0.
- Browser audit 5 viewport × 8 surface và cart-cover fixture exit 0.
- Category/stock/assistant contract/rank/telemetry/taxonomy/real-catalog integration exit 0.
- Production env/mock-policy/image-secret audits exit 0.
- Policy fail-closed không nới redirect allowlist.

### PARTIAL

- Chỉ 687/3.046 cover đạt technical policy.
- 2.335 redirect bị từ chối; 24 anomaly dùng fallback.
- Category LOW vẫn broad fallback.
- Recommendation isolation/parity có bằng chứng, nhưng evidence hiện thiếu provenance.

### NOT_VERIFIED / NOT_AVAILABLE

- Cover license/rights: `NOT_VERIFIED`.
- `REAL_USER_DATA`, CTR, UAT/SUS: `NOT_AVAILABLE`.
- Deployment/CI remote: `NOT_VERIFIED`.
- Backup/restore current: `NOT_VERIFIED`.
- OpenAI/Gemini credential thật: `BLOCKED_MISSING_CREDENTIAL`.
- Deployment/CI remote và provider assistant API thật: chưa xác minh; smoke command `test:assistant-api` đã FAILED với `fetch failed`.

### FAILED

- Một lần audit redirect đầu tiên FAILED do `UND_ERR_SOCKET`; đã sửa auditor fail-closed và chạy lại đủ 3.046 exit 0. Không dùng output FAILED làm kết quả cuối.
- `npm run test:assistant-api` FAILED (`fetch failed`). Đây là giới hạn môi trường/provider, không che bằng mock.
- `npm run test:stock-deployment` FAILED ở guard scope vì không được phép đọc database rehearsal ngoài scope; ghi đồng thời `BLOCKED` cho acceptance deployment.
- Một lần `npx prisma generate` FAILED `EPERM` vì server production local còn chạy và giữ file Prisma engine; sau khi dừng server, command chạy lại exit 0. Không coi lần lỗi tạm thời là trạng thái cuối.
- Một lần `npm run catalog:real:import` FAILED ở guard vì shell không đặt `ALLOWED_DESTRUCTIVE_DATABASES`; log xác nhận không ghi DB. Chạy lại với allowlist chỉ `bookverse_ai_test` exit 0 như mục regression.

## 12. Nội dung không được tuyên bố khi bảo vệ

- Không nói có 3.046 Open Library work; đúng là 3.044 WORK + 2 EDITION_ONLY.
- Không nói 3.046 cover có license hoặc cover HTTP 200 là bản quyền.
- Không nói có dữ liệu người dùng thật, CTR/UAT/SUS hoặc recommendation đã chứng minh hiệu quả.
- Không nói category LOW là mapping ngữ nghĩa chính xác.
- Không nói production-ready, CI PASS, provider OpenAI/Gemini PASS hoặc database demo đã được cập nhật.

## 13. Checkpoint tiếp theo

Build/browser/regression đã chạy; Critical vẫn `PARTIAL` ở quyền cover, provenance REAL_USER và deployment nên không commit. Checkpoint tiếp theo cần quyết định nguồn cover có license, bổ sung provenance/consent, rehearsal backup/migration demo và chỉ sau đó mới cân nhắc deploy.

## 14. Prompt P1 tiếp theo

```text
Tiếp tục BookVerse AI từ source hiện tại sau Checkpoint G2.2. Không reset/clean hoặc ghi đè dữ liệu gốc. Chỉ làm P1 theo bằng chứng.

Mục tiêu: xử lý 2.335 cover bị redirect ngoài allowlist bằng quyết định nguồn/giấy phép có thể kiểm tra; bổ sung provenance REAL_USER_DATA có consent cho recommendation nếu dữ liệu thật tồn tại; nếu không có thì giữ neutral; chuẩn bị backup/deploy rehearsal tách biệt với bookverse_ai demo.

Trước khi sửa: ghi HEAD/branch/worktree, database, count/schema và command baseline. Không migrate/backfill/seed/deploy demo khi chưa phê duyệt.

Cover: không sửa coverPath gốc; chỉ thêm host redirect khi có chính sách/nguồn được duyệt và audit HTTP lặp lại. Ghi original URL, redirect chain, final host, checksum, status, rights evidence, fallback reason. Không gọi HTTP 200 là có bản quyền.

Recommendation: chỉ hiển thị personalized khi có user owner, interaction/event, source book/category/author, timestamp, taxonomy version và algorithm version; nhãn REAL_USER_DATA phải có bằng chứng. Không có dữ liệu thật thì báo NOT_AVAILABLE/PENDING_REAL_USER_STUDY, không tạo CTR/SUS/UAT.

Deployment: tạo backup/restore rehearsal riêng, kiểm tra migration trên test database, ghi count trước/sau và cleanup. Không nói CI/deployment PASS nếu runner/remote chưa thực sự chạy.

Sau mỗi thay đổi: chạy typecheck, unit, Python, integration, build, browser và audit liên quan; báo command, exit code, output, database bị ghi/không bị ghi, diff và hạn chế. Nếu Critical còn PARTIAL/BLOCKED/NOT_VERIFIED/FAILED thì không commit.
```

Checkpoint G2.2 đã được đánh giá theo bằng chứng kỹ thuật hiện có. Mọi sách đều có remote cover đạt policy hoặc fallback xác định; điều này không đồng nghĩa toàn bộ cover có bản quyền. Category LOW và recommendation evidence được báo cáo đúng provenance, không có CTR/UAT giả và database demo không bị thay đổi.
