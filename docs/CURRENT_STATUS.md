# Trạng thái hiện tại BookVerse AI

Cập nhật: 16/07/2026. Đây là nguồn trạng thái hiện hành; các báo cáo checkpoint cũ là historical snapshot tại thời điểm chúng được tạo.

## Quy ước

- `VERIFIED`: có command hiện tại, exit code 0 và output phù hợp tiêu chí.
- `PARTIAL`: mới xác minh được một phần.
- `NOT_VERIFIED`: chưa có đủ bằng chứng.
- `BLOCKED`: bị chặn bởi môi trường, quyền hoặc credential.
- `NOT_AVAILABLE`: hệ thống/dữ liệu cần đo chưa tồn tại.
- `FAILED`: command đã chạy và thất bại.

## Baseline source và database

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Git baseline lượt Cover V2 | VERIFIED | HEAD đầu lượt `2ebb170e466ac57bd8d88ecb2f659cfdba601ea8`, branch `checkpoint-f1-1-telemetry-reliability`, worktree sạch | Chưa phải commit Cover V2 |
| Prisma schema/client | VERIFIED | `npx prisma validate` và `npx prisma generate`, exit 0 | Có cảnh báo cấu hình `package.json#prisma` sẽ deprecated ở Prisma 7 |
| Demo database lượt Cover V2 | BLOCKED | Prisma read-only query tới `localhost:5432` và `5433` đều không kết nối; Docker API pipe không tồn tại | `BLOCKED_DB_UNAVAILABLE`; không restart, migrate, backfill, seed hay ghi DB |
| Migration/pgvector/category demo | NOT_VERIFIED | Không thể query lại trong lượt Cover V2 vì database dừng | Các số liệu P0 cũ chỉ là historical evidence, không dùng làm trạng thái DB hiện tại |

## P0 trước bảo vệ

| Hạng mục | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Evidence cá nhân hóa giả | VERIFIED | Đã xóa `buildMockEvidence`; không có evidence thì hiển thị “Chưa có giải thích cá nhân hóa đã được xác minh”; có unit test | Evidence hiện có trong demo vẫn là DEMO_DATA/SYNTHETIC_DATA |
| Seller AI Score giả | VERIFIED | Đã xóa cả hai `buildMockSellerAiScore`; UI/API dùng `seller-quality-v1`, không dùng random/seller ID và không gọi là AI | Dữ liệu giao dịch demo chủ yếu synthetic nên điểm không phải uy tín người bán thật |
| Công thức seller quality | VERIFIED | `70 + min(completed*2,20) + descriptionBonus + approvedBonus - min(cancelled*5,20) - min(reported*5,20)`, clamp 0..100; unit test deterministic/monotonic/bounds | Rule và trọng số là quyết định sản phẩm, chưa được nghiên cứu người dùng xác nhận |
| Production assistant mock guard | VERIFIED | `isDevelopmentMockEnabled` đã tồn tại trước lượt P0 và unit test xác nhận production luôn tắt mock | `ALREADY_FIXED_VERIFIED`; provider OpenAI/Gemini thật chưa được xác minh trong lượt này |
| Component `BookCover` V2 | VERIFIED | Dùng chung, tỷ lệ 2:3, alt text, timeout 8 giây, null/malformed/load error về fallback, reducer đóng trạng thái nên không retry vô hạn; unit test mới xác nhận | Remote tải thành công vẫn là `NOT_VERIFIED` nếu chưa có bằng chứng nguồn/giấy phép |
| Fallback bìa V2 | VERIFIED | 8 artwork `320x480`, 6 layout deterministic, seed `bookId`, title tối đa 3 dòng, author tối đa 2 dòng; không render giá/edition/ID/badge category trong ảnh | `GENERATED_DEMO_ASSET`, không phải bìa nhà xuất bản và không được gọi là bìa thật |
| Audit dataset cover | VERIFIED | `npm run covers:audit`, exit 0: 2.200/2.200 `LEGACY_SYNTHETIC`, 2.200 `NOT_VERIFIED`, 0 Git-tracked, 0 bìa thật được phê duyệt | Audit trên `SYNTHETIC_DATA` JSON read-only; database demo đang BLOCKED |
| Bìa thật hợp pháp | NOT_AVAILABLE | `config/real-cover-sources.json` có 0 nguồn được duyệt; `docs/REAL_COVER_CANDIDATES.csv` liệt kê 120 Book ưu tiên | Chưa có file/URL do NXB, tác giả hoặc nguồn có giấy phép cung cấp |
| Responsive trang Cover V2 | VERIFIED | In-app browser tại `/design/cover-system`: 360/768/1366/1920 đều 8 cover, 8 artwork, 6 layout, ratio 0,667, broken image 0, không tràn ngang, clamp 3 | Chụp screenshot qua browser đã chạy nhưng FAILED do timeout; không dùng screenshot làm bằng chứng |
| Đồng nhất các surface | PARTIAL | Source scan xác nhận `BookCover` trên Home, Catalog/Recommendation qua `BookCard`, Detail, Marketplace, Cart, Seller, Community, Library, Order, Profile, Admin, Assistant | Chưa browser-smoke từng trang vì database demo đang dừng |
| Secret trong source/image mới | VERIFIED | Dockerfile bỏ secret build; Compose yêu cầu environment; `.dockerignore` chặn `.env`; web builder/final và AI image audit không thấy DATABASE_URL/AUTH_SECRET/credential URL | Chưa rotate secret và chưa thay/restart container demo theo đúng phạm vi |
| Production mock scan | VERIFIED | Runtime source không còn `buildMockEvidence`, `buildMockSellerAiScore`, `sellerAiScore` hoặc nhãn AI Score; 94/94 unit test gồm production mock guard | Cần giữ scan trong CI để chống tái xuất hiện; chưa có bằng chứng CI runner đã chạy |
| Regression cuối P0 | VERIFIED | Prisma validate/generate, typecheck, 94/94 TypeScript, 21 Python + 1 database integration, Category/stock/assistant/taxonomy/rank/telemetry, stress 100/100 request và production build đều exit 0 | Không thay thế UAT, provider thật hoặc production deployment |
| Telemetry concurrency P2028 | VERIFIED | Regression đầu phát hiện stress fail; bỏ interactive transaction dư thừa, giữ nested create atomic; atomic rollback và stress 100/100 sau sửa đều exit 0, cleanup về baseline | Đây là lỗi mới phát hiện và sửa trong lượt P0, không phải kết quả PASS từ trước |
| Dependency production | FAILED | `npm audit --omit=dev --audit-level=moderate` exit 1: 2 moderate ở chuỗi Next.js/PostCSS | `npm audit fix --force` đề xuất breaking change nên chưa tự áp dụng; chuyển P1 |

## Phân loại mock/fake/placeholder/random

- Production fake đã loại: `buildMockEvidence`, `buildMockSellerAiScore`, nhãn Seller AI Score và lý do cá nhân hóa tự dựng.
- Development mock còn chủ đích: assistant `[DEV MOCK]`; chỉ bật ở development/test và production guard đã có từ trước (`ALREADY_FIXED_VERIFIED`).
- `placeholder` còn lại: thuộc tính gợi ý nhập liệu của form; không phải dữ liệu hoặc kết quả giả.
- `random` trong `src/sample_data.py` và `fetch_vn_books.py`: trình tạo `SYNTHETIC_DATA`, không chạy như production score. `random_seeded_sanity` trong evaluator có seed và đã ghi rõ không phải AI baseline.
- `crypto.randomUUID`/`randomBytes`: tạo ID/token, không tạo điểm. `Math.random` ở featured books chỉ chọn vị trí hiển thị, không tham gia seller/recommendation score; tính tái lập của danh sách featured có thể cải tiến ở P1.
- Score/rank hard-code trong test và integration: `TEST_FIXTURE`; không phải benchmark hoặc metric người dùng thật.
- Từ khóa fake/mock trong báo cáo baseline cũ: historical snapshot, không mô tả runtime source hiện tại.

## Dữ liệu và AI

- `SYNTHETIC_DATA`: dataset ultra-2200, phần lớn interaction/order/recommendation/evidence và seller score legacy trong dataset nguồn.
- `DEMO_DATA`: dữ liệu đang phục vụ bản demo local; không được gọi là hành vi người dùng thật.
- `TEST_FIXTURE`: dữ liệu do integration/browser test tạo có prefix/ID riêng và cleanup; không dùng tính CTR.
- `INSTRUMENTED_DEMO_DATA`: telemetry fixture có instrumentation nhưng đã cleanup; không phải CTR production.
- `REAL_USER_DATA`: `NOT_AVAILABLE`; chưa có cohort đủ điều kiện để báo metric sản phẩm hoặc UAT.
- AI offline metric hiện thấp: Behavior HitRate@10 `0,021008`; Hybrid production HitRate@10 `0,008403`.
- CTR production: `NOT_AVAILABLE`; database demo có 0 RecommendationRequest, 0 RequestItem và 0 TelemetryEvent tại baseline P0.
- UAT/SUS với người thật: `NOT_AVAILABLE`; không có participant, phản hồi hoặc SUS score được tự tạo.

## Những tuyên bố chưa được phép dùng khi bảo vệ

- Không nói “production-ready” hoặc “đã deploy P0”; P0 mới được build/test local và chưa restart demo.
- Không nói recommendation tốt, hybrid vượt baseline hoặc có CTR thật.
- Không nói OpenAI/Gemini provider PASS khi chưa dùng credential thật trong lượt này.
- Không nói GitHub Actions PASS; chưa có bằng chứng workflow chạy trên CI runner.
- Không gọi dữ liệu synthetic/demo/test fixture là dữ liệu người dùng thật.
- Không dùng các checkpoint report cũ làm bằng chứng cho source hiện tại nếu chưa chạy lại command tương ứng.

## Việc còn lại sau P0

1. P1: xử lý 2 moderate dependency advisory bằng kế hoạch nâng phiên bản có regression, không dùng `--force` mù quáng.
2. P1: CI thực chạy, service-to-service auth cho FastAPI, healthcheck/readiness và đóng cổng không cần thiết.
3. Thu telemetry `REAL_USER_DATA` có consent/retention, sau đó mới tính CTR và cân nhắc tuning trên validation mới.
4. Tổ chức UAT thật; chỉ báo SUS khi có người tham gia và dữ liệu khảo sát thật.
