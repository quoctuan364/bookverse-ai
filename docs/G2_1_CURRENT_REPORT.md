# Báo cáo Checkpoint G2.1 — historical snapshot

Cập nhật: 18/07/2026. Đây là report của lượt trước; trạng thái source hiện hành xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md). Không dùng số liệu trong snapshot này thay cho regression source-current.

## Kết luận

`PARTIAL` — chưa đạt Definition of Done toàn bộ. Catalog/import/category/browser/cart đã có bằng chứng mới trên `bookverse_ai_test`, nhưng strict cover audit chỉ xác nhận 687/3.046 URL theo host/content/dimension policy; 2.335 redirect cuối ngoài allowlist, 24 ảnh sai dimension. Catalog vẫn là 3.044 `WORK` + 2 `EDITION_ONLY`; cover rights, REAL_USER_DATA, CTR, UAT, CI runner và deployment chưa được xác minh.

## Bằng chứng chính

| Hạng mục | Trạng thái | Bằng chứng hiện tại |
|---|---|---|
| Git baseline | VERIFIED | Branch `checkpoint-g2-real-catalog`, HEAD `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`, không có remote, worktree bẩn từ G1/G2 |
| Catalog identity | VERIFIED/PARTIAL | 3.046 record; 3.044 WORK + 2 EDITION_ONLY; RB00583/RB00822 được đối chiếu Open Library chính thức |
| Category mapping | PARTIAL | 39/39 resolve trên test DB; checksum `17d3f2ef5917900510117266dd43841ae3d6fc7f69d7ceb0672685ab813274cd`; 22 HIGH/9 MEDIUM/8 LOW |
| Import/idempotency | VERIFIED | Test DB: dry-run/execute ×2/final dry-run; 3.046 unchanged ở lượt cuối, reject 0, non-catalog counts không đổi |
| Browser UI | VERIFIED | Audit 5 viewport × 7 surface; catalog tối đa 24 remote request; 404 fallback 24/24; không overflow/ratio/broken image |
| Cart cover fixture | VERIFIED | Fixture `TEST_FIXTURE`, valid/404/timeout, 5 viewport, cleanup/count trước-sau khớp |
| Cover HTTP | PARTIAL | 3.046/3.046; 687 `HTTP_VERIFIED`, 2.335 `INVALID_CONTENT` (redirect ngoài host), 24 `INVALID_DIMENSION` |
| Recommendation isolation | PARTIAL | 0 Recommendation/DailyRecommendation/RequestItem trỏ catalog; parity fixture 30/30, max delta 0; Evidence/Feedback/Telemetry provenance chưa audit đầy đủ |
| Demo database | VERIFIED read-only | Book 1.200, Category 24, Recommendation 3.000, `book_source_metadata` không tồn tại; không ghi G2 |

## Dữ liệu và giới hạn

- `SYNTHETIC_DATA`: ultra-2200 và phần lớn interaction/order/recommendation.
- `DEMO_DATA`: giá catalog (`SYNTHETIC_DEMO_PRICE`).
- `TEST_FIXTURE`/`INSTRUMENTED_DEMO_DATA`: integration/browser/telemetry và đã cleanup.
- `REAL_USER_DATA`: `NOT_AVAILABLE`.
- Cover rights: `NOT_VERIFIED`; HTTP 200 không phải license.
- Không tuyên bố 3.046 Open Library work, publisher-licensed cover, recommendation tốt, CTR thật, UAT/SUS, production-ready hoặc GitHub Actions PASS.

## Command mới và exit code

| Command | Exit | Kết quả |
|---|---:|---|
| `npx prisma validate` | 0 | Schema hợp lệ |
| `npx prisma generate` | 0 | Client generated |
| `npm run typecheck` | 0 | TypeScript hợp lệ sau strict cover audit |
| `npm run test:unit` | 0 | 117/117 |
| `python -m pytest ai_service/tests` + integration flag | 0 | 24 passed |
| `npm run build` | 0 | Production build local |
| `npm run catalog:real:validate` | 0 | Status PARTIAL, identity đúng |
| `npm run catalog:real:audit-categories` | 0 | 39/39, PARTIAL do LOW |
| `npm run test:real-catalog-integration` | 0 | Isolation/counts |
| `npm run catalog:real:dry-run` / `catalog:real:import` ×2 / dry-run cuối | 0 | Idempotent trên test DB |
| `npm run test:category-current` | 0 | Current taxonomy |
| `npm run test:category-legacy` | 0 | Temp DB tạo/drop, tamper fail-closed |
| `npm run test:stock-integration` | 0 | 11/11 |
| `npm run test:assistant-integration` | 0 | Local degraded, mock false, cleanup |
| `npm run test:telemetry-integration` / reliability | 0 | Cleanup về baseline |
| `python ai_service/evaluate.py --parity-only` | 0 | 30 rows, max delta 0 |
| `npm run test:g2-1-cart-covers` | 0 | 5 viewport, fixture cleanup |
| `node scripts/audit_real_catalog_ui.cjs` | 0 | 5 viewport × 7 surface |
| `npm run catalog:real:audit-covers -- --delay-ms=250 --timeout-ms=15000` | 0 | 3.046/3.046, status PARTIAL |
| `docker compose ... config --quiet` | 0 | Placeholder config only, not credential/deployment PASS |
| `npm run test:production-mock-policy` / `test:image-secrets` | 0 | Violation/finding 0 |
| `git diff --check` | 0 | Không whitespace error |

## Việc còn lại và commit

Critical còn `PARTIAL` nên **không tạo commit G2.1** trong lượt này. Việc tiếp theo: quyết định xử lý 2.335 redirect ngoài allowlist/24 dimension, bổ sung provenance evidence, review 8 mapping LOW, và chỉ triển khai demo sau một checkpoint riêng có backup/phê duyệt.
