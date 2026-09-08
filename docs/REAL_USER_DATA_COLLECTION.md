# Thu thập Tương tác Người dùng Thật — BookVerse AI

## Tổng quan

Tài liệu này mô tả quy trình thu thập tương tác người dùng thật phục vụ đánh giá mô hình Hybrid Recommendation trong đồ án tốt nghiệp BookVerse AI.

## Nguyên tắc

1. **Không thu thập khi chưa có consent** — mọi tương tác research chỉ được ghi khi người dùng đã đồng ý rõ ràng
2. **Không trộn với dữ liệu synthetic** — dữ liệu thật và synthetic được tách biệt bằng nhãn `REAL_USER_DATA`
3. **Không tạo số liệu giả** — pipeline sẽ trả `NOT_ENOUGH_REAL_DATA` nếu chưa đủ ngưỡng
4. **Ẩn danh hóa** — userId được hash SHA-256 trước khi export, không lưu email hoặc thông tin nhạy cảm

## Kiến trúc

```
User -> ConsentBanner -> POST /api/consent
                               |
                         UserResearchConsent (DB)
                               |
RecommendationTrackedLink -> POST /api/interactions (chỉ khi consent)
useResearchTracking hook  ->       |
                           UserInteractionLog (DB)
                                   |
                           real_data_pipeline.py
                                   |
                           quality_gate (check ngưỡng)
                                   |
                           temporal_split (train/val/test)
                                   |
                           anonymized CSV/JSON output
```

## Các Event được thu thập

| Event | Mô tả | Cần bookId |
|-------|-------|-----------|
| IMPRESSION | Sách xuất hiện trong viewport ≥ 500ms | ✓ |
| VIEW | Mở trang chi tiết sách | ✓ |
| RECOMMENDATION_CLICK | Click từ danh sách gợi ý | ✓ |
| SEARCH | Thực hiện tìm kiếm | ✗ |
| FAVORITE | Thêm yêu thích | ✓ |
| BOOKMARK | Bookmark sách | ✓ |
| ADD_TO_CART | Thêm giỏ hàng | ✓ |
| PURCHASE | Mua sách | ✓ |
| RATING | Đánh giá sách | ✓ |

## Trọng số Implicit Feedback

```
IMPRESSION          = 0.1 (thấp nhất — chỉ thấy)
SEARCH              = 0.2
VIEW                = 0.3
RECOMMENDATION_CLICK = 0.5
BOOKMARK            = 0.7
FAVORITE            = 0.8
ADD_TO_CART         = 0.9
PURCHASE            = 1.0 (cao nhất — tín hiệu mạnh nhất)
RATING              = 1.0 (cao nhất — tín hiệu mạnh nhất)
```

## Ngưỡng thu thập (theo INTERACTION_PILOT_PROTOCOL.md)

| Chỉ số | Ngưỡng tối thiểu |
|--------|-----------------|
| User đã consent | ≥ 30 |
| User đủ điều kiện (≥ 3 interaction) | ≥ 10 |
| Tổng Impression | ≥ 500 |
| Ngày thu thập | ≥ 28 ngày |

**Nếu chưa đạt ngưỡng**: pipeline trả `NOT_ENOUGH_REAL_DATA`, không chạy modeling.

## API Endpoints

### `GET /api/consent`
Lấy trạng thái consent của user hiện tại.

### `POST /api/consent`
```json
{ "consented": true }
```
Đặt hoặc thu hồi consent.

### `POST /api/interactions`
Ghi tương tác nghiên cứu (chỉ user đã đăng nhập và đã consent).
```json
{
  "eventType": "RECOMMENDATION_CLICK",
  "bookId": "...",
  "sourcePage": "home",
  "recommendationRequestId": "...",
  "position": 2,
  "idempotencyKey": "click:reqId:bookId"
}
```

### `GET /api/interactions/stats` (ADMIN)
Thống kê tổng hợp dữ liệu thu thập.

### `GET /api/interactions/export?format=csv` (ADMIN)
Export dữ liệu ẩn danh (userId hash SHA-256).

## Schema Database

```sql
-- Bảng consent
user_research_consents (id, userId, consentVersion, consented, consentedAt, revokedAt, ...)

-- Bảng tương tác
user_interaction_logs (id, userId, bookId, eventType, eventValue, sourcePage,
                       recommendationRequestId, recommendationModel, position,
                       consentVersion, idempotencyKey, createdAt, ...)
```

## Trạng thái hiện tại

```
DATA_READINESS_STATUS = BLOCKED_BY_DATA
```

Hệ thống đã sẵn sàng thu thập. Cần triển khai với người dùng thật và chờ đủ 28 ngày.

## Hướng dẫn triển khai với người dùng thật

1. Đảm bảo migration đã chạy: `npx prisma migrate deploy`
2. Triển khai ứng dụng — ConsentBanner tự hiển thị khi user đăng nhập lần đầu
3. Theo dõi tiến độ tại `/admin/research-data`
4. Sau 28+ ngày và đủ ngưỡng, chạy pipeline: `python -m ai_service.pipeline.real_data_pipeline --help`
5. Đưa kết quả vào benchmark: `python -m ai_service.evaluation.runner`

## Bảo vệ dữ liệu

- Không lưu IP trong bảng consent
- Không lưu email, mật khẩu, số điện thoại trong metadata
- userId được hash một chiều trước khi export
- Người dùng có thể thu hồi consent bất kỳ lúc nào trong Cài đặt
- Khi user bị xóa, userId trong interaction log được set NULL (ON DELETE SET NULL)