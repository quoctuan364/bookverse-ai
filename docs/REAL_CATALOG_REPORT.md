# Báo cáo Real Curated Catalog G2

Cập nhật: 19/07/2026. Các số liệu bên dưới được đối chiếu lại trong lượt G2.2; report runtime mới nằm trong `outputs/` và không commit.

## 1. Kết luận

Tích hợp kỹ thuật trên `bookverse_ai_test` đã chạy thành công và idempotent. Trạng thái artifact là `PARTIAL`, không phải hoàn tất tuyệt đối, vì gói bàn giao ghi 3.046 work key nhưng runtime validation chỉ xác nhận 3.044 key dạng `/works/OL...W`; hai record `RB00583`, `RB00822` chỉ xác minh được edition key. 34 record không có language và được giữ `NOT_AVAILABLE`, không đoán bổ sung.

## 2. Artifact

| Thuộc tính | Kết quả |
|---|---:|
| ZIP SHA-256 | `986824e5a06c8b7125376a4af8ff6c5cce482e9d568ca458dbf6613c3d3255f4` |
| Catalog JSON SHA-256 | `79aed37578a638757216af19e80634b9b6ad925ca77fa47f3a55ccfe203bd3a3` |
| Book/source record | 3.046 |
| Open Library work | 3.044 |
| Edition-only | 2 |
| Author | 3.260 |
| Category nguồn | 39 |
| ISBN duy nhất | 2.343 |
| Cover ID/URL duy nhất | 3.046/3.046 |
| Ấn bản tiếng Việt | 259 |
| Thiếu language | 34 |
| Orphan Book–Author/Book–Category | 0/0 |

Chỉ `bookverse_real_catalog.json` đã lọc được dùng cho import. Audit/unfiltered/cache/sample cover không được nhập production data.

## 3. Nhãn bắt buộc

- Metadata thư mục: Open Library, `SOURCE_METADATA_VERIFIED` ở mức schema/contract đã kiểm tra.
- Cover: `COVER_ID_PRESENT`, `RIGHTS_NOT_VERIFIED`.
- Giá: `SYNTHETIC_DEMO_PRICE`.
- 259 record: `Ấn bản tiếng Việt`; quốc tịch tác giả giữ `NOT_VERIFIED` nếu không có nguồn.
- Review/order/interaction/recommendation đi kèm catalog: `NOT_AVAILABLE`.

## 4. Data model và import

Migration `20260716235000_add_book_source_metadata` chỉ tạo bảng 1–1 `book_source_metadata`, unique `bookId`, `(sourceProvider, sourceRecordKey)`, `(sourceProvider, sourceWorkKey)` và các index filter. Hai edition-only dùng `sourceRecordType=EDITION_ONLY`, `sourceWorkKey=null`, giữ raw key để audit; không giả thành work.

Pipeline hỗ trợ `validate-only`, `dry-run`, `execute` và report không ghi đè. Safety guard chỉ cho database test/clone được allowlist, chặn demo mặc định. Import upsert theo provider + source record key, không theo title/ISBN, không ghi đè Book synthetic.

| Lượt | Insert | Update | Unchanged | Reject |
|---|---:|---:|---:|---:|
| Dry-run | 3.046 dự kiến | 0 | 0 | 0 |
| Execute 1 | 3.046 | 0 | 0 | 0 |
| Execute 2 | 0 | 0 | 3.046 | 0 |

## 5. Cover và UI

Remote cover chỉ được import khi URL thuộc `https://covers.openlibrary.org`. Trang Catalog dùng 24 record/trang và lazy loading; không tải hàng loạt 3.046 ảnh. `BookCover` chuyển một lần sang Generated Fallback V2 khi null/malformed/load error/404/timeout, tỷ lệ 2:3 và không retry vô hạn.

Audit HTTP strict toàn catalog G2.1 (rate-limited, concurrency 2, retry tối đa 2, resume, không lưu binary) đã kiểm tra 3.046/3.046 URL: `687 HTTP_VERIFIED`, `2.335 INVALID_CONTENT` do final redirect ngoài allowlist, `24 INVALID_DIMENSION`, `0 TIMEOUT`, `0 NOT_FOUND`, `0 NOT_VERIFIED`, `0 malformed`, `0 duplicate cover ID`. Chỉ HTTPS host `covers.openlibrary.org` được chấp nhận; redirect `*.archive.org` không được tính là HTTP_VERIFIED. Quyền ảnh vẫn `NOT_VERIFIED`.

Browser G2 chạy 360, 390, 768, 1366, 1920 trên Home, Catalog, Detail, Marketplace, Cart, Library, Seller. Catalog luôn có 24 card, tối đa 24 remote request; interception 404 trả 24 fallback, 0 ảnh vỡ. Cart fixture G2.1 chạy riêng với một cover hợp lệ, một 404 và một timeout; 5/5 viewport VERIFIED, cleanup/count trước-sau khớp. Audit UI tổng thể vẫn ghi timeout bằng unit marker, không gọi đó là timeout browser production.

## 6. Recommendation isolation

Next.js server action/API và FastAPI loại Book có `BookSourceMetadata` khỏi recommendation/evaluation cũ. Database legacy chưa có bảng vẫn dùng phạm vi cũ. Không thay bốn production weight. Parity: 30/30 row, max score delta 0; không có Recommendation, DailyRecommendation hoặc RecommendationRequestItem trỏ catalog mới. Verifier chưa bao phủ đầy đủ RecommendationEvidence/Feedback/Telemetry hoặc provenance của chuỗi evidence; không tuyên bố recommendation tốt hay evidence là REAL_USER_DATA.

## 7. Database và rollback (historical rehearsal)

- Backup test trước migration và restore clone được ghi trong report G2 ngày 16/07/2026; đây là **historical snapshot**, không phải command chạy lại trong lượt G2.1.
- G2.1 chỉ query test/demo và import idempotency trên test; không tạo backup/restore mới. Current backup/restore status: `NOT_VERIFIED`.
- Database demo chỉ query read-only; bảng metadata không tồn tại, chứng minh G2 chưa được triển khai ở demo.

## 8. Rủi ro còn lại

1. Hai record edition-only làm invariant 3.046 work key không đạt.
2. Report permissive cũ từng ghi 103 cover HTTP 200 và 3 lỗi tạm thời; đó là historical snapshot, không dùng thay strict policy v4. Strict G2.2 hiện ghi 2.335 redirect ngoài allowlist và 24 dimension anomaly.
3. Cover rights chưa xác minh; tải được không đồng nghĩa có license.
4. Metadata nguồn có 34 record thiếu language và có thể còn sai lệch thư mục chưa được chuyên gia nội dung review toàn bộ.
5. Không có interaction người dùng thật, CTR, UAT hoặc SUS cho catalog này; evidence hiện chưa có provenance REAL_USER_DATA.

## G2.2 — cover reliability, category semantic review và provenance

Command cuối `npm run catalog:real:audit-covers -- --delay-ms=250 --timeout-ms=15000` exit 0, audit 3.046/3.046. Policy dùng chung nằm ở `config/cover-policy.json`, không tự động cho phép redirect ngoài allowlist và không lưu binary.

- `HTTP_VERIFIED`: 687.
- `INVALID_CONTENT`: 2.335, gồm redirect cuối tới `archive.org`/`*.us.archive.org` hoặc chain cuối ngoài `covers.openlibrary.org`.
- `INVALID_DIMENSION`: 24.
- `TIMEOUT`, `NOT_FOUND`, `NOT_VERIFIED`: 0 trong lượt cuối.
- rights/license: `NOT_VERIFIED`; không được gọi Open Library cover là publisher-licensed.

`npm run catalog:real:review-cover-dimensions` exit 0 và review 24/24: 23 `LANDSCAPE_INVALID`, 1 `TOO_SMALL`; quyết định UI là fallback deterministic. Đây là phân loại kỹ thuật theo metadata, không phải visual/license proof.

`npm run catalog:real:review-category-low` exit 0: 8/8 mapping LOW có mẫu subjects, rationale, ambiguity và quyết định giữ broad fallback; 628 Book thuộc 8 mapping này. Không sửa dữ liệu source, taxonomy hoặc migration.

`npm run test:recommendation-evidence-provenance` exit 0 trên test DB read-only: 8.400 evidence, 0 `VERIFIED_REAL_USER`, 8.400 `MISSING_PROVENANCE`. UI/API không còn claim cá nhân hóa cho chuỗi evidence cũ thiếu provenance.
6. Chưa deployment, chưa CI runner và chưa kiểm tra provider OpenAI/Gemini bằng credential thật.
