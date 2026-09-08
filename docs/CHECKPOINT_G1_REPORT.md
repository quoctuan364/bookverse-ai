# Báo cáo Checkpoint G1 — P0 trước bảo vệ

Ngày thực hiện: 16/07/2026. Dữ liệu test được gắn nhãn `TEST_FIXTURE`; dataset cover là `SYNTHETIC_DATA`.

## 1. Kết luận

Checkpoint G1 **chưa hoàn thành toàn bộ Definition of Done**. Cover live, mock/evidence, Seller Quality Score, secret policy, Compose, unit/integration/browser và production build local đã được xác minh. Image build trên source cuối và final demo DB query chưa đạt vì Docker backend phát sinh I/O error rồi chuyển filesystem nội bộ sang read-only. Không deploy, không rotate secret và không commit local dưới danh nghĩa hoàn thành G1.

## 2. Git branch/commit

- Baseline: `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Branch: `checkpoint-g1-p0-defense`.
- Tag: `NOT_AVAILABLE`.
- Commit G1: `NOT_AVAILABLE` vì DoD còn FAILED/BLOCKED.
- Không push, không remote, không sửa lịch sử.

## 3. Baseline

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Worktree đầu lượt | VERIFIED | `git status --short` rỗng trước khi tách branch | Không phản ánh worktree cuối |
| Demo DB đầu lượt | VERIFIED | 1.200 Book, 300 User, 1.200 Listing, 1.500 Order, telemetry 0, 12 migration | Read-only |
| Test DB đầu lượt | VERIFIED | 2.200 Book/User, 2.204 Listing, 2.606 Order, request/event/chat 0 | Database dùng cho fixture có cleanup |
| Docker daemon đầu lượt | BLOCKED | Docker Desktop ban đầu chưa chạy | Khi mở daemon, container demo tự auto-start ngoài ý định; không dùng demo web/AI cho test |

## 4. Cover live verification

Playwright chạy trên source hiện tại và `bookverse_ai_test`:

- Viewport: 360×800, 390×844, 768×1024, 1366×768, 1440×900, 1920×1080.
- Surface: Home/Recommendation, Catalog, Book Detail, Marketplace, Community, Cover System, Cart, Library, Profile, Order Detail, Seller Listing, Admin.
- Kết quả cuối: 72/72 VERIFIED; 145 Book kiểm tra deterministic; 0 conflict; 0 broken image; 0 overflow ngang; 0 sai tỷ lệ; 0 clamp failure; 0 forbidden text.
- `REAL_VALID` quan sát: 0. Không tự tải bìa Internet.
- Assistant hiện hành không render `BookCover` khi chưa có kết quả; nhánh legacy dùng component nhưng không được suy visual PASS ngoài trạng thái đã quan sát.

Các lỗi được phát hiện và sửa trước kết quả cuối: hậu tố số ở nhiều tác giả, artwork đổi theo category có/thiếu, flex stretch Marketplace/Profile/Cart, grid overflow Catalog/Library/Admin, Navbar desktop và Community render 2.600 post mất khoảng 59 giây. Feed Community hiện lấy 20 bài mới nhất; cursor pagination đầy đủ là P1.

## 5. Mock search/classification

| Kết quả | File | Production/Test | Có dữ liệu giả | Hướng xử lý |
|---|---|---|---|---|
| Không còn builder evidence giả | Runtime scan | Production | Không | Guard bằng `test:production-mock-policy` |
| Không còn builder Seller AI Score | Runtime scan | Production | Không | Dùng `seller-quality-v1` |
| Development assistant mock | `lib/assistant-service.ts`, `lib/assistant-runtime.ts` | Development/Test | Có, nhãn `[DEV MOCK]` | Giữ; production guard và startup policy từ chối |
| Placeholder form | `app/**`, `components/**` | Production UI | Không; chỉ là gợi ý input | Giữ |
| Score cố định | `tests/**`, `scripts/verify_*` | TEST_FIXTURE | Có | Giữ trong test, không gọi benchmark/real metric |
| Random generator | `src/sample_data.py` | SYNTHETIC_DATA generator | Có | Giữ ngoài production runtime |
| Prototype CSV | `app.py`, `src/seller_ai.py` | Legacy prototype, không có trong Docker production | Heuristic deterministic | Đổi nhãn thành điểm chất lượng theo quy tắc; ghi rõ không phải AI |
| `seller_ai_scores` | Prisma schema/migration legacy | Database compatibility | Dữ liệu nguồn synthetic | Runtime mới không đọc bảng để tính quality score |
| Từ mock/fake trong báo cáo cũ | `docs/*REPORT.md` | Historical | Có mô tả lịch sử | Gắn header historical snapshot |

Scan policy kiểm tra 120 file runtime/config và trả 0 violation. `Math.random` đã bị loại khỏi featured runtime; danh sách featured dùng rating desc rồi ID asc.

## 6. Personalized evidence

- `BookCard` chỉ hiện “AI gợi ý/Vì sao” khi server cung cấp evidence không rỗng.
- Thiếu evidence dùng “Sách trong danh mục/Chưa có giải thích cá nhân hóa đã được xác minh”.
- Anonymous browser không có claim “vì bạn/dựa trên lịch sử”.
- Unit test presentation và assistant contract PASS.

## 7. Seller quality score

`seller-quality-v1` được server tính lại từ dữ liệu order/listing:

```text
clamp(70
  + min(completedOrders × 2, 20)
  + 5 nếu >=60% listing có mô tả >=80 ký tự
  + 5 nếu có >=3 listing APPROVED
  - min(cancelledOrders × 5, 20)
  - min(reportedListings × 5, 20), 0, 100)
```

Không dùng random/seller ID/bảng `seller_ai_scores`; không gọi là AI. Unit deterministic/monotonic/bounds PASS. Vì dữ liệu chủ yếu synthetic, score không phải uy tín người bán thật.

## 8. Secret audit

- Dockerfile không có secret ARG/ENV; final image chỉ copy schema Prisma và startup validator.
- `.dockerignore` chặn `.env`, output, node_modules và `.venv` lồng nhau.
- Production startup từ chối AUTH_SECRET thiếu/ngắn/placeholder/entropy thấp, DB URL thiếu/password yếu/placeholder và mock flag true.
- `.env.example` chỉ có placeholder.
- Compose local/test/production có project/port/env tách rõ; production đặt `no-new-privileges`, drop capability cho web/AI.
- Không rotate secret, không in credential thật.

## 9. Docker/image verification

| Hạng mục | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| AI image current | VERIFIED | Build exit 0; history/config credential match 0; filesystem broad scan 0 | Chưa deploy |
| Web candidate trước Cart fix | VERIFIED | Build exit 0; history/config 0; filesystem strict scan postgres/OpenAI/Gemini/.env = 0 | Không phải source cuối |
| Startup fail-fast trong image | VERIFIED | Thiếu AUTH_SECRET exit 1; cấu hình mạnh test exit 0 | Dùng TEST_FIXTURE env |
| Web image source cuối | FAILED | Build chạy Next build xong nhưng BuildKit `metadata_v2.db: read-only file system`; legacy retry cũng fail | Cần sửa Docker Desktop/backend rồi build/scan lại |

Không dùng image cũ để tuyên bố image source cuối PASS.

## 10. Documentation consistency

- Cập nhật `CURRENT_STATUS`, README, Implementation Plan, AI Evaluation, Cover System, Demo Guide, Deployment.
- Tạo `SECURITY.md` và runbook rotation/deployment.
- Tạo `DEFENSE_TALK_TRACK.md`.
- Thêm header chính xác “Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.” vào các báo cáo cũ.
- Category/Dataset report giữ bằng chứng lịch sử và trỏ trạng thái hiện hành.

## 11. Defense talk track

Tài liệu [`DEFENSE_TALK_TRACK.md`](DEFENSE_TALK_TRACK.md) chốt các câu nên/không nên nói. Các tuyên bố cấm gồm: 2.200 bìa thật, Hybrid vượt baseline, CTR cải thiện, dữ liệu user thật, payment thật, production-ready, secret đã rotate, OpenAI/Gemini hoặc CI PASS.

## 12. Test/exit code

| Command | Exit | Trạng thái |
|---|---:|---|
| `git switch -c checkpoint-g1-p0-defense` | 0 | VERIFIED |
| `npx prisma validate` | 0 | VERIFIED |
| `npx prisma generate` lần đầu khi dev server giữ DLL | 1 | FAILED_ENV_LOCK |
| `npx prisma generate` sau khi dừng web test | 0 | VERIFIED |
| `npm run typecheck` | 0 | VERIFIED |
| `npm run test:unit` | 0 | VERIFIED, 103/103 |
| `python -m compileall -q ai_service src app.py` | 0 | VERIFIED |
| `python -m pytest ai_service/tests` | 0 | 21 PASS, 1 SKIP |
| Python DB integration khi cart fixture còn tồn tại | 1 | FAILED_FIXTURE_CONTAMINATION |
| Python DB integration sau cleanup | 0 | VERIFIED |
| `npm run covers:audit` | 0 | VERIFIED, 2.200 synthetic, real 0 |
| `npm run test:production-mock-policy` | 0 | VERIFIED |
| `npm run test:production-env` | 0 | VERIFIED |
| Compose local/test/production/rehearsal `config --quiet` | 0 | VERIFIED |
| Category integration dùng sai demo credential | 1 | FAILED_CONFIGURATION |
| Category integration full với giả định demo còn legacy | 1 | FAILED_OBSOLETE_ASSUMPTION |
| `npm run test:category-current` | 0 | VERIFIED |
| `npm run test:category-legacy` | 0 | VERIFIED, temp DB đã drop |
| `npm run test:stock-integration` | 0 | VERIFIED, 11/11 |
| Assistant/taxonomy/rank collision | 0 | VERIFIED |
| Telemetry integration/reliability 100 request | 0 | VERIFIED, cleanup 0 |
| Playwright lần đầu | 1 | FAILED_MISSING_DEPENDENCY |
| Playwright các lần phát hiện lỗi UI | 1 | FAILED và đã sửa theo bằng chứng |
| Playwright cuối | 0 | VERIFIED, 72/72 |
| `npm run build` source cuối | 0 | VERIFIED |
| Docker web lần đầu | 1 | FAILED thiếu copy manifest config |
| Docker web sau sửa, trước Cart fix cuối | 0 | VERIFIED candidate cũ |
| Docker AI | 0 | VERIFIED |
| Docker web source cuối | 1 | FAILED_DOCKER_BACKEND_READ_ONLY |
| `npm audit --omit=dev --audit-level=moderate` | 1 | FAILED, 2 moderate |
| Cleanup/count test DB | 0 | VERIFIED |
| Final demo DB query | 1 | BLOCKED_DOCKER_BACKEND |

## 13. VERIFIED/PARTIAL/NOT_VERIFIED/BLOCKED/FAILED

- VERIFIED: Cover live, evidence neutral, Seller score, mock policy, secret policy, Compose config, TypeScript/Python/category/stock/assistant/telemetry tests, local production build, test cleanup.
- PARTIAL: Image secret audit vì candidate scan sạch nhưng image source cuối chưa build được.
- NOT_VERIFIED: G1 deployment, rotation, real user UAT/SUS, CTR production, CI runner.
- BLOCKED: OpenAI/Gemini credential thật; final demo query do Docker backend.
- FAILED: Docker image source cuối; npm production dependency audit.

## 14. Database demo

Không migration, seed, backfill, reset, `db push` hoặc telemetry test nào trỏ `bookverse_ai`. Baseline read-only đã VERIFIED. Final count `BLOCKED`, nên không được kết luận tuyệt đối “demo không đổi”. Docker Desktop auto-start demo lúc mở daemon và về cuối backend lỗi khiến DB container bị đánh dấu `exited`; G1 không tự restart lại.

## 15. Rủi ro còn lại

1. 0 bìa thật hợp pháp; visual vẫn là fallback demo.
2. Docker backend read-only; chưa có image current.
3. 2 advisory moderate trong dependency production.
4. PENDING cart OrderItem làm score production thay đổi; parity test cho thấy production popularity đang nhạy với cart chưa thanh toán. Không sửa/tune ở G1 vì cần thay thuật toán và tái lập evaluation.
5. Community mới giới hạn 20 bài, chưa có cursor pagination.
6. Chưa có CI thực chạy, UAT thật, CTR thật hoặc provider credential thật.

## 16. Prompt deployment hoặc P1 tiếp theo

```text
Tiếp tục BookVerse AI tại D:\Doantotnghiep, branch checkpoint-g1-p0-defense.

Tuân thủ Quy tắc trung thực tuyệt đối. Không ghi database demo, không deploy và không rotate secret nếu chưa được phê duyệt riêng.

Mục tiêu P1.1:
1. Khôi phục Docker Desktop/backend an toàn, tuyệt đối không xóa/recreate volume demo.
2. Xác minh trạng thái container/volume và query read-only demo: Book/User/Listing/Order, telemetry, 12 migration; so với baseline G1.
3. Build lại bookverse-web từ source HEAD hiện tại; scan image history/config/filesystem, kiểm tra không có .env/credential và startup fail-fast.
4. Chạy npm audit, lập kế hoạch nâng Next/PostCSS có regression; không dùng npm audit fix --force.
5. Audit ai_service production popularity: PENDING/cart và CANCELLED/REFUNDED OrderItem không được tính như purchase. Trước khi sửa phải tạo test tái hiện và ghi metric/parity ảnh hưởng; không cập nhật fixture để che drift.
6. Thêm cursor pagination Community, giữ feed đầu 20 bài và test thời gian/response.
7. Chưa tải bìa Internet. Chỉ chuẩn bị manifest/quy trình cho 50–120 bìa có license.
8. Chạy lại Prisma, typecheck, 103 unit, Python + DB integration, Category current/legacy, stock, assistant, telemetry, browser Cover và production build.
9. Chỉ commit local khi tất cả DoD P1.1 VERIFIED; nếu Docker/demo vẫn blocked thì báo đúng trạng thái và không deploy.
```
