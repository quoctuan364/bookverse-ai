# BookVerse Recommendation Data Readiness

Cập nhật: 30/07/2026. Trạng thái hiện hành: **`BLOCKED_BY_DATA`**.

## 1. Phạm vi và nguồn đã kiểm tra

Đã đọc schema, migration telemetry F1, service/API impression–click–conversion,
component `RecommendationTrackedLink`, interaction taxonomy, reader/cart/order/
favorite/review action, evaluator, split manifest và toàn bộ test liên quan.

Đã đo `bookverse_ai_test` và `bookverse_ai` bằng transaction `READ ONLY`.
Không sửa, backfill hoặc nâng cấp provenance của dữ liệu lịch sử.

## 2. Dữ liệu hiện có

| Nguồn | User | Book | Legacy event | Request/item | Impression/click/conversion |
|---|---:|---:|---:|---:|---:|
| `bookverse_ai_test` | 2.200 | 5.246 | 18.002 | 5/15 | 0/0/0 |
| `bookverse_ai` demo | 10 | 20 | 0 | 0/0 | 0/0/0 |

18.002 event test và các bảng seed liên quan là synthetic/demo. Năm request
`CONTENT_BASED` không có impression. Không nguồn nào có
`PILOT_CONSENTED + pilotId + consentVersion`.

Vì vậy dữ liệu thật đủ provenance hiện bằng:

- User: **0**.
- Item exposure: **0**.
- Interaction: **0**.
- Density: **0**.
- User có ≥3/≥5/≥10 interaction: **0/0/0**.
- Khả năng tạo `final_v2`: **không**.

## 3. Event capability

| Event | Trạng thái | Ghi chú |
|---|---|---|
| Recommendation request/items/position | Đã có | Server snapshot, version và surface |
| Impression | Đã có | 50% viewport liên tục 1 giây |
| Recommendation click | Đã có | Xác minh owner và item thuộc request |
| Xem chi tiết | Đã có | `BOOK_VIEW` cho user đăng nhập |
| Search | Một phần | Có taxonomy nhưng chưa có caller production chuyên biệt |
| Wishlist | Đã có tương đương | `FAVORITE_ADD/FAVORITE_REMOVE` |
| Cart | Đã có | `CART_ADD` |
| Purchase | Đã có | Dùng OrderItem và trạng thái hợp lệ |
| Reading start | Đã có | `READING_START` |
| Reading progress | Đã có | ReadingProgress và ReadingSession |
| Completion | Một phần | Suy theo session ≥300 giây hoặc ≥50%; chưa có chapter-complete riêng |
| Rating | Đã có | `REVIEW_CREATE` chứa rating |

Migration mới bổ sung theo hướng additive:

- `collectionContext`, `pilotId`, `consentVersion`, `experimentGroup`.
- `sourceComponent` cho request item.
- `deviceClass` do server suy từ User-Agent.

Dữ liệu thường mặc định là `STANDARD_APP`. Chỉ cấu hình pilot đầy đủ mới được
gắn `PILOT_CONSENTED`; không backfill lịch sử.

## 4. Operational minimum data-readiness thresholds

Đây là ngưỡng vận hành tối thiểu để chuyển sang bước kiểm tra temporal split,
không phải ngưỡng bảo đảm statistical power. Trạng thái khi vượt toàn bộ là
`READY_FOR_FINAL_V2_ASSESSMENT`, chưa phải `READY_FOR_MODELING`.

- Ít nhất 30 user consented.
- Ít nhất 25/20/10 user có ≥3/≥5/≥10 event.
- Ít nhất 500 impression.
- Ít nhất 50 click + conversion.
- Thu thập ít nhất 28 ngày.

Khi chưa đạt, không chạy model search và không tạo final_v2.

Trước khi khóa `final_v2`, locker tiếp tục kiểm tra:

- User có positive và tổng positive riêng ở validation/final_v2.
- Impression theo từng algorithm đã quan sát.
- Candidate catalog thực tế của final_v2.
- Phân bố user positive theo cold `0`, sparse `1–4`, warm `≥5` train event.
- Tỷ lệ click/conversion có attribution hợp lệ.
- Conservative 95% CTR confidence-interval half-width theo algorithm.

Ngưỡng pre-final_v2 hiện khóa ở tối thiểu 10 user positive và 20 positive cho
mỗi validation/final_v2; 20 candidate item; 100 impression cho mỗi algorithm
đã quan sát; attribution hợp lệ ≥90%; CI half-width bảo thủ ≤0,10. Đây vẫn là
quality gate thăm dò, không thay thế power analysis theo effect size mục tiêu.
Nếu một điều kiện không đạt, locker trả `BLOCKED_BY_DATA` và không tính metric.

## 5. Lệnh

```powershell
npm run data:recommendation-readiness

$env:BOOKVERSE_EXPORT_HMAC_KEY="<local-secret-at-least-32-characters>"
npm run data:recommendation-export -- --pilot-id=pilot-2026

npm run evaluation:final-v2-lock -- `
  --input=outputs/pilot-export/<run>/pilot-interactions.anonymized.json `
  --validation-start=2026-09-01T00:00:00Z `
  --final-v2-start=2026-10-01T00:00:00Z
```

Cutoff phải được chọn trước khi thử model. Locker không tính hoặc in metric
final_v2.

## 6. E2E cô lập

```powershell
npm run test:e2e:isolated
```

Lệnh tạo `bookverse_e2e_test`, chạy 20 migration, seed tối thiểu có provenance
`TEST_FIXTURE`, chạy smoke và telemetry browser test, rồi xóa database trong
khối `finally`. Fixture không thuộc pilot/research và không kết nối database demo.
