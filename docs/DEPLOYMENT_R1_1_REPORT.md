# Báo cáo triển khai BookVerse AI R1.1 — Checkpoint F1.1

> **Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.** Xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md) trước khi dùng bất kỳ kết luận nào.

Ngày triển khai: 15/07/2026. Phạm vi: hotfix code-only cho recommendation position và telemetry reliability.

## 1. Kết luận

Checkpoint F1.1 và hotfix R1.1 đã hoàn thành. Recommendation position được chuẩn hóa, requestId được tạo ổn định khi database khỏe và telemetry không còn mất do rank collision. Không thay đổi model weight, schema hoặc dữ liệu nghiệp vụ.

## 2. Git branch/commit/tag

- Branch: `checkpoint-f1-1-telemetry-reliability`.
- Baseline R1: source `c625d01da100bee1daee503a7c71f4615de8ba90`, report `9f398b79b112c57bc18d64da151042a3fd7d19a2`.
- Commit implementation được build: `f7b54a963c31629552c8d64e9168e96fc81fc2cc`.
- Tag success local: `demo-deployment-r1-1-success-20260715T232138`.
- Không push, không tạo remote, không commit output/runtime telemetry/secret.

## 3. Root cause

`app/api/recommendations/route.ts` đọc Recommendation current và legacy, sau đó dùng rank gốc làm request-item position. Hai Book khác nhau có rank giống nhau vi phạm unique `(requestId, position)` của `recommendation_request_items`. Nested create rollback request; wrapper API bắt lỗi để vẫn trả Book nên client thấy `requestId=null`.

Reproducer trước sửa FAIL đúng lỗi; sau sửa hai Book rank 1 được lưu position `[1,2]` và có requestId.

## 4. Merge/dedupe policy

Policy chung nằm ở `lib/recommendation-position-policy.ts`. Candidate được giữ theo thứ tự production hiện hành; tie-break là source priority `CURRENT > DAILY > LEGACY > FALLBACK`, rank hợp lệ rồi Book ID. Dedupe theo Book ID trước top-K; không cộng hoặc đổi score; evidence giữ theo candidate thắng và response evidence được dedupe có kiểm soát.

## 5. Position normalization

Rank nguồn null/0/âm/gap/trùng không bị dùng làm unique position. Sau dedupe/top-K, server gán `position = 1..N`. API trả thêm position, giữ rank gốc để quan sát và lưu request item theo đúng thứ tự card.

## 6. Request persistence

Server quyết định user, Book, score, position, evidence, algorithm/surface/profile. Request và toàn bộ item được tạo trong một transaction; FK failure được chứng minh không để request/item partial. Client telemetry chỉ nhận requestId/Book/event type; score/rank/userId giả bị loại.

## 7. Degraded contract

Database khỏe: `requestId != null`, `trackingStatus="TRACKED"`. Persistence unavailable: recommendation vẫn trả, `requestId=null`, `trackingStatus="DEGRADED"` và một reason code cố định. Log chỉ chứa reason/surface, không trả raw Prisma/PostgreSQL/SQL/connection string. UI không gửi impression/click nếu thiếu requestId và không crash khi AI/persistence unavailable.

## 8. Test

- Unit: 85/85 PASS.
- Rank collision reproducer: PASS sau hotfix.
- PostgreSQL integration: normalization, atomic rollback, concurrency, idempotency, 403/404, conversion và cleanup PASS.
- Stress: 100 request/5 user/3 surface, concurrency 10, top-K 10; toàn bộ acceptance criteria PASS.
- Browser: browser runtime tích hợp lỗi; Chrome Playwright headless fallback PASS cho Home/API/degraded/scroll/rerender/click/navigation.
- Visual QA: card/reason/layout hiển thị; hero overlay không còn chặn click sau `pointer-events-none`.

## 9. RequestId success rate

Trên database khỏe: 100/100 response hợp lệ TRACKED, 100 requestId khác null và duy nhất; success rate 100%, null-rate 0%, rank-collision 5xx = 0.

## 10. Observability

`npm run report:recommendation-tracking` là report database read-only. Khi ghép reliability snapshot, report có total response, TRACKED/DEGRADED/null-rate, duplicate Book/rank normalized, response–database mismatch, orphan, HTTP error và duplicate event rate. Sau cleanup demo, report xác nhận request/item/event/orphan đều 0; response metric không được bịa lại nên ghi `NOT_AVAILABLE` nếu không truyền snapshot.

## 11. Regression

Prisma validate/generate, TypeScript, Python compile/pytest, Category ultra/legacy, Stock 11/11, Assistant d1, taxonomy, telemetry, production parity, Checkpoint E reproducibility, Next build, Compose config và Docker web build đều exit 0. Production parity 30/30 row, max score delta 0. Hai evaluation run có checksum `bfdb45b1981dd53715943d6f2271e731a3443dae70ed097ab965cd9236ac7ad9`.

## 12. Hotfix deployment

Trước deploy: demo có 12/12 migration `APPLIED_VALID`, telemetry 0 và business count đúng baseline. Chỉ chạy:

```powershell
docker compose up -d --no-deps --force-recreate web
```

DB và AI service không restart; không migrate, backfill, seed hoặc đổi volume/image DB. Smoke surface lỗi thật đọc 22 candidate có 10 duplicate rank nhưng vẫn TRACKED, requestId khác null, position 1–10 và Book/score/evidence khớp database. Impression 201, duplicate 200, click 201/navigation, non-owner/locked 403 và arbitrary Book 404 đều PASS. Không cần rollback.

## 13. Web image/rollback

- Trước: `sha256:7c05c1fdb4cc07f538819787d7b903c5e2f2824cb66cba87f2d0bf56df81d827`.
- Sau: `sha256:216b0b32dd54b2de81afca696840d21ebf8b1049a8c80de04dd3b23799184b3f`.
- Alias local rollback: `bookverse-web:r1-rollback-20260715`.
- Image env/history và web log secret/raw database error scan: PASS.

Rollback nếu smoke/monitor lỗi:

```powershell
docker image tag sha256:7c05c1fdb4cc07f538819787d7b903c5e2f2824cb66cba87f2d0bf56df81d827 doantotnghiep-web:latest
docker compose up -d --no-deps --force-recreate web
```

Không rollback database vì R1.1 không đổi schema.

## 14. Count trước/sau

| Bảng | Trước | Sau cleanup |
|---|---:|---:|
| User | 300 | 300 |
| Category | 24 | 24 |
| Book | 1.200 | 1.200 |
| Listing | 1.200 | 1.200 |
| Order | 1.500 | 1.500 |
| OrderItem | 2.570 | 2.570 |
| Recommendation | 3.000 | 3.000 |
| RecommendationEvidence | 6.027 | 6.027 |
| RecommendationRequest | 0 | 0 |
| RecommendationRequestItem | 0 | 0 |
| RecommendationTelemetryEvent | 0 | 0 |

Cleanup xóa đúng từng ID: 2 request, 10 current recommendation, 1 BOOK_VIEW; phục hồi `lastActiveAt` và lock state của ba user. Không dùng deleteMany rộng trên demo.

## 15. File sửa/tạo

Mã chính: `actions/recommendation.actions.ts`, `app/api/recommendations/route.ts`, `app/page.tsx`, `lib/recommendation-telemetry.ts`, `lib/recommendation-position-policy.ts`.

Test/report: `tests/recommendation-position-policy.test.ts`, `tests/recommendation-telemetry.test.ts`, `scripts/verify_recommendation_rank_collision.ts`, `scripts/verify_recommendation_telemetry_integration.ts`, `scripts/verify_recommendation_tracking_reliability.ts`, `scripts/report_recommendation_tracking.ts`, `package.json`.

Tài liệu: `README.md`, `docs/RECOMMENDATION_TRACKING.md`, `docs/TEST_REPORT.md`, `docs/IMPLEMENTATION_PLAN_V2.md`, tài liệu này.

Không có file dưới `prisma/migrations`, `prisma/schema.prisma`, `ai_service`, dataset, Category, stock/checkout hoặc Assistant contract bị sửa.

## 16. Command/exit code

| Command/cổng | Exit code |
|---|---:|
| `npx prisma validate` | 0 |
| `npx prisma generate` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | 0 |
| Python compile/pytest/parity/evaluation | 0 |
| Category/legacy Category/Stock/Assistant | 0 |
| Taxonomy/rank-collision/telemetry integration/reliability | 0 |
| `npm run build` | 0 |
| `docker compose config --quiet` | 0 |
| `docker compose build --no-cache web` | 0 |
| Migration audit `--require-clean` | 0 |
| Browser Playwright | N/A; assertions PASS |

## 17. Rủi ro còn lại

- CTR production vẫn `NOT_AVAILABLE` vì chưa có kỳ thu thập user telemetry thật; stress/smoke đã cleanup và không đại diện traffic thật.
- Một static cover request 404 trong browser smoke làm một số bìa hiển thị nền trống; không ảnh hưởng telemetry nhưng nên audit cover path/asset ở checkpoint UI/data riêng.
- `npm ci` báo 3 moderate dependency vulnerabilities; không chạy `npm audit fix --force` trong hotfix để tránh breaking change. Cần checkpoint dependency riêng.
- `package.json#prisma` có cảnh báo deprecated cho Prisma 7; runtime hiện là Prisma 6.19.3.

## 18. Kế hoạch thu telemetry

Giữ observability read-only theo surface/ngày; theo dõi response count, TRACKED/DEGRADED/null-rate, item mismatch, duplicate normalized, orphan, telemetry 4xx/5xx và impression/click duplicate rate. Chốt retention/privacy trước khi giữ log dài hạn. Không công bố CTR cho đến khi có traffic thật đủ volume và loại fixture/smoke marker.

## 19. Điều kiện bắt đầu F2

Chỉ mở F2 khi R1.1 ổn định qua cửa sổ quan sát, requestId success rate và orphan/error đạt ngưỡng, đã xác định retention/privacy, có đủ impression/click thật theo surface và có validation window mới. Không tune trên final cũ; khóa model trước khi tạo final-test mới hoàn toàn chưa xem.
