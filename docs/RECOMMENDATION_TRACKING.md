# Recommendation tracking — Checkpoint F1

## 1. Contract bốn giai đoạn

| Giai đoạn | Khi nào được ghi | Nguồn dữ liệu đáng tin |
|---|---|---|
| Request | Server tạo một danh sách recommendation thật | Server lưu user, version, taxonomy, surface, candidate/filter profile, Book, position liên tục, score, evidence |
| Impression | Card ở viewport ít nhất 50% liên tục ít nhất 1 giây | Client chỉ báo requestId/Book; server đối chiếu request và đóng timestamp |
| Click | User chọn Book từ card recommendation | Client chỉ báo requestId/Book; navigation không chờ telemetry |
| Conversion | Strong-positive cùng user/Book xảy ra sau exposure trong cửa sổ | Server đọc Order/ReadingSession/Bookmark/Favorite/Review đã xác minh |

Các surface đang instrument là recommendation engine thật ở trang chủ và luồng recommendation. Catalog thông thường và assistant link không được gắn nhãn recommendation.

## 2. Request và dữ liệu client

Mỗi request có ID do server tạo, owner đã xác thực, `algorithmVersion`, `taxonomyVersion`, `generatedAt`, `surface`, candidate/filter profile. Mỗi item có Book, position duy nhất, score và evidence từ server. Client không có API để tự khai userId, score, version hoặc position; Book không nằm trong request bị từ chối.

Anonymous telemetry chưa được hỗ trợ trong F1 vì chưa có session token an toàn. User không tồn tại hoặc `isLocked=true` không được ghi event.

### Policy position F1.1

Mọi surface dùng chung `normalizeRecommendationCandidates` trước khi lưu request item. Policy giữ thứ tự output production; khi cần tie-break dùng source priority `CURRENT > DAILY > LEGACY > FALLBACK`, rank gốc hợp lệ rồi Book ID. Book được dedupe theo ID trước top-K, không cộng score và chỉ giữ evidence của candidate thắng; evidence response được dedupe theo type/label/source.

Rank gốc chỉ dùng để quan sát chất lượng nguồn. Sau dedupe/top-K, server luôn gán lại `position = 1..N`, vì vậy rank trùng, null, 0, âm hoặc có khoảng trống không thể làm vi phạm unique `(requestId, position)`. Position trong database khớp đúng thứ tự card response. Reason code cố định gồm `TRACKED`, `DUPLICATE_BOOK_NORMALIZED`, `INVALID_RANK_NORMALIZED`, `PERSISTENCE_UNAVAILABLE`, `DATABASE_UNAVAILABLE` và `REQUEST_VALIDATION_FAILED`.

## 3. Impression và click

`RecommendationTrackedLink` dùng `IntersectionObserver` với threshold 0,5 và timer 1.000 ms. Timer bị hủy nếu card rời viewport; một cặp request–item chỉ gửi impression một lần trong vòng đời component. Constraint database và idempotency key tiếp tục chống trùng khi rerender, retry hoặc request đồng thời.

Click gửi bất đồng bộ với `keepalive`, không chặn điều hướng. Nếu endpoint lỗi, UI vẫn mở Book bình thường. Server dùng thời gian nhận event; không chấp nhận raw URL.

## 4. Conversion attribution

Cửa sổ mặc định là 7 ngày và có thể cấu hình bằng `RECOMMENDATION_ATTRIBUTION_WINDOW_DAYS` trong giới hạn policy. Một conversion phải cùng user/Book, xảy ra sau exposure và không quá cửa sổ.

Policy là **last-click**, nếu không có click hợp lệ thì **last-impression**. Mỗi nguồn conversion chỉ được ghi một lần bằng unique key. Nguồn hợp lệ:

- Purchase có quantity > 0 và order ở `PAID`, `PAID_DEMO`, `SHIPPED` hoặc `COMPLETED`.
- Reading session có `timeSpent >= 300` giây hoặc `progressPercent >= 50`.
- Bookmark, Favorite.
- Review từ 4 sao.

Order `CANCELLED`/`REFUNDED`, conversion trước exposure và conversion ngoài cửa sổ đều bị loại. F1 không dựng impression/click giả từ lịch sử.

## 5. Security, privacy và độ bền UI

- Endpoint đọc user từ session và đọc lại `isLocked` trong database.
- Request owner và quan hệ request–Book đều được xác minh phía server.
- Body JSON tối đa 2.048 byte; rate limit 120 event/phút cho mỗi user.
- Schema chỉ nhận `requestId`, `bookId`, `eventType`; lỗi database thô không trả ra client.
- Không lưu secret/token/search text/chat text. Event chỉ chứa định danh giả danh, loại event và quan hệ nghiệp vụ cần thiết.
- Telemetry là best-effort ở UI: lỗi ghi log không làm recommendation biến mất hoặc làm hỏng navigation.
- Khi persistence khỏe, response có `requestId` khác null và `trackingStatus="TRACKED"`. Khi persistence thật sự unavailable, recommendation vẫn được trả với `requestId=null`, `trackingStatus="DEGRADED"` và reason code an toàn; UI không gửi impression/click nếu thiếu requestId.
- Log degraded chỉ chứa reason code và surface, không chứa raw Prisma/PostgreSQL error, SQL, stack trace công khai hoặc connection string.

## 6. Idempotency và schema

Ba bảng additive: `recommendation_requests`, `recommendation_request_items`, `recommendation_telemetry_events`. Foreign key bảo vệ ownership graph; `(requestId, bookId)` và `(requestId, position)` là unique. Event dùng `deduplicationKey` unique:

- Impression/click: một event loại đó cho mỗi request item.
- Conversion: một event cho mỗi `sourceType + sourceId`.

Migration `20260715180500_add_recommendation_telemetry` chỉ thêm enum/bảng/index, không sửa dữ liệu lịch sử. Migration đã được rehearsal trên fresh DB/clone/test và được triển khai ở R1. Hotfix R1.1 không tạo hoặc chạy migration, không backfill và không seed.

## 7. CTR policy

```text
CTR = số RECOMMENDATION_CLICK hợp lệ / số RECOMMENDATION_IMPRESSION hợp lệ
```

Tử và mẫu phải cùng surface, cùng khoảng thời gian và cùng policy lọc. Request count không phải impression; `BOOK_VIEW` không phải click. Fixture chỉ kiểm tra công thức, không phải kết quả production.

**CTR hiện tại: `NOT_AVAILABLE`.** Lý do: dữ liệu lịch sử là synthetic và chưa có kỳ thu thập telemetry instrumented thật. Không được công bố CTR thật từ các fixture đã cleanup.

## 8. Cách kiểm tra

```powershell
npm run test:unit
npm run test:taxonomy-parity
npm run test:rank-collision
npm run test:telemetry-integration
npm run test:telemetry-reliability
npm run report:recommendation-tracking -- --since-hours=24
npm run typecheck
npm run build
```

Ba test có ghi dữ liệu chỉ được chạy với `DATABASE_URL` trỏ đúng `bookverse_ai_test`; fixture được cleanup và số telemetry phải về 0. Report observability chỉ đọc database; có thể nhận `--responses=<reliability.json>` để ghép metric response/TRACKED/DEGRADED với kiểm tra database. Browser regression dùng fixture test; deployment smoke mới được dùng tài khoản demo và bắt buộc marker `deployment-smoke-r1-1`, xóa đúng từng ID, phục hồi user và đối chiếu count trước/sau.
