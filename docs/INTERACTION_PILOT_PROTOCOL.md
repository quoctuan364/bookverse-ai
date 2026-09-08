# Protocol thu thập interaction thật

Đây là pilot có đồng thuận, không phải UAT và không tự sinh kết quả.

## Chuẩn bị

1. Tạo môi trường pilot riêng, không dùng tài khoản demo chia sẻ.
2. Cung cấp thông tin mục đích, loại event, thời gian lưu, quyền rút lui và đầu
   mối liên hệ.
3. Chỉ sau khi người tham gia chọn đồng ý mới cấp tài khoản pilot.
4. Khóa trước pilot ID, consent version, thời gian và experiment group.
5. Bật cấu hình server:

```env
RECOMMENDATION_PILOT_MODE=consented
RECOMMENDATION_PILOT_ID=pilot-2026-01
RECOMMENDATION_CONSENT_VERSION=v1
RECOMMENDATION_EXPERIMENT_GROUP=observational
```

Không bật pilot mode trên môi trường người dùng chưa đồng thuận.

## Nhiệm vụ

Mỗi người thực hiện nhiều phiên vào các ngày khác nhau:

1. Khám phá recommendation và cuộn đủ để card thực sự vào viewport.
2. Mở một số sách phù hợp và không phù hợp.
3. Tìm kiếm theo nhu cầu thật.
4. Bắt đầu đọc, tiếp tục đọc ở phiên sau và lưu tiến độ.
5. Tùy nhu cầu thật: favorite, bookmark, cart, mua Sandbox hoặc rating.

Không yêu cầu người tham gia click/mua chỉ để làm metric đẹp. Hành động không
xảy ra là dữ liệu hợp lệ.

## Định nghĩa

- Impression: card thấy ≥50% liên tục ≥1 giây.
- CTR: recommendation click hợp lệ / impression hợp lệ trong cùng surface và
  thời gian.
- Conversion: hành động mục tiêu được server xác minh sau exposure trong cửa sổ.
- UAT/SUS: khả năng sử dụng, không phải CTR.
- Relevance rating: đánh giá chủ quan, không phải production conversion.

### Định nghĩa completion khóa trước pilot

Pilot này chưa thu canonical `CHAPTER_COMPLETE` riêng. `READING_COMPLETE` là
proxy cấp sách, chỉ phát sinh phía server khi một ReadingSession có
`timeSpent >= 300 giây` **hoặc** `progressPercent >= 50`. Không diễn giải proxy
này thành việc người dùng đã hoàn thành một chương cụ thể. Định nghĩa được khóa
trước thu thập; nếu thay đổi phải tăng taxonomy version và áp dụng cho pilot mới,
không sửa hồi tố pilot đang chạy.

## Kiểm soát chất lượng

- Impression phải có trước click/conversion.
- Không dùng request count làm impression.
- Không suy recommendation click từ `BOOK_VIEW`.
- Theo dõi requestId null/degraded, duplicate, device UNKNOWN và event orphan.
- Người rút consent không được đưa vào export modeling tiếp theo.
- Chỉ export `PILOT_CONSENTED`; HMAC key lưu cục bộ và không commit.

## Kết thúc pilot

Chạy data-readiness. Nếu còn `BLOCKED_BY_DATA`, tiếp tục thu thập theo protocol
hoặc dừng nghiên cứu; không giảm ngưỡng sau khi xem metric. Các ngưỡng 30 user,
500 impression, 50 outcome và 28 ngày chỉ là **operational minimum
data-readiness thresholds**, không bảo đảm statistical power.

Khi vượt operational minimum, chọn cutoff trước rồi chạy pre-final_v2 gate.
Nếu validation/final thiếu user positive, positive event, candidate catalog,
exposure theo algorithm, attribution hoặc CI dự kiến quá rộng thì vẫn phải trả
`BLOCKED_BY_DATA`. Chỉ sau khi split manifest được khóa và không mở metric
final_v2 mới bắt đầu modeling trên train/validation.
