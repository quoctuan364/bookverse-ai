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
| Git baseline | VERIFIED | HEAD trước P0 `ccbc9329e48288f28fef57a676d0d1d030996673`, branch `checkpoint-f1-1-telemetry-reliability`, worktree sạch | Commit P0 chỉ tạo sau regression cuối |
| Prisma schema/client | VERIFIED | `npx prisma validate` và `npx prisma generate`, exit 0 | Có cảnh báo cấu hình `package.json#prisma` sẽ deprecated ở Prisma 7 |
| Demo database | VERIFIED | Query read-only xác nhận `bookverse_ai`: 300 User, 24 Category, 1.200 Book, 1.200 Listing, 1.500 Order, 2.570 OrderItem | Không migration/backfill/seed/write trong lượt P0 |
| Migration demo | VERIFIED | 12/12 migration `APPLIED_VALID`, schema checksum `465c2d7e5b93f385cb7052517a11bc942c4df22ef0059f416722448bcd9757cd` | Audit read-only |
| pgvector demo | VERIFIED | Container DB dùng `pgvector/pgvector:0.8.5-pg16`; extension `plpgsql`, `vector`; 12 migration hoàn tất | Không restart/recreate demo trong lượt P0 |
| Category demo | VERIFIED | Query Prisma trên field hierarchy: 24 root, 0 child, 24 canonical mapping | Đây là profile legacy 24 Category, không phải taxonomy ultra-2200 |

## P0 trước bảo vệ

| Hạng mục | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Evidence cá nhân hóa giả | VERIFIED | Đã xóa `buildMockEvidence`; không có evidence thì hiển thị “Chưa có giải thích cá nhân hóa đã được xác minh”; có unit test | Evidence hiện có trong demo vẫn là DEMO_DATA/SYNTHETIC_DATA |
| Seller AI Score giả | VERIFIED | Đã xóa cả hai `buildMockSellerAiScore`; UI/API dùng `seller-quality-v1`, không dùng random/seller ID và không gọi là AI | Dữ liệu giao dịch demo chủ yếu synthetic nên điểm không phải uy tín người bán thật |
| Công thức seller quality | VERIFIED | `70 + min(completed*2,20) + descriptionBonus + approvedBonus - min(cancelled*5,20) - min(reported*5,20)`, clamp 0..100; unit test deterministic/monotonic/bounds | Rule và trọng số là quyết định sản phẩm, chưa được nghiên cứu người dùng xác nhận |
| Production assistant mock guard | VERIFIED | `isDevelopmentMockEnabled` đã tồn tại trước lượt P0 và unit test xác nhận production luôn tắt mock | `ALREADY_FIXED_VERIFIED`; provider OpenAI/Gemini thật chưa được xác minh trong lượt này |
| Cover null/path/404 | VERIFIED | `normalizeBookCoverUrl` + `SafeBookCover`; browser audit production image ép 404 trên Home/Recommendation, Catalog, Book detail, Marketplace, Cart, Seller: broken=0 | Browser tích hợp bị lỗi runtime; dùng Playwright cục bộ, screenshot thật trong `outputs/p0-cover-audit` |
| Cover demo remote | PARTIAL | Query read-only: 1.200/1.200 URL remote, null/local = 0. Single-pass mới nhất có 1.196/1.200 GET 200 image; B0148/B0173/B0292/B0310 lỗi mạng/timeout tạm thời rồi mỗi URL đều trả 200 image ở 3/3 lần retry | Không có 404 bền vững được xác nhận; CDN remote không ổn định nên không được gọi 1.200/1.200 luôn khả dụng. UI fallback đã VERIFIED độc lập |
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
