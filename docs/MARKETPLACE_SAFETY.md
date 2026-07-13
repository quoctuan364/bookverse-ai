# Chính sách an toàn Marketplace — Checkpoint A

Tài liệu này chốt các quy tắc nghiệp vụ phải được giữ đồng nhất giữa schema, checkout, hủy đơn, migration, backfill và kiểm thử. Đây là chính sách của Checkpoint A; không mở rộng sang recommendation, chatbot, community hoặc Seller AI.

## 1. Mô hình giỏ hàng và giao dịch mua

- BookVerse chưa có bảng `Cart` riêng. Một giỏ hàng là `Order` có `status = PENDING` và `paymentMethod = null`.
- Khi checkout thành công, chính `Order` đó được cập nhật `paymentMethod`, snapshot địa chỉ và trạng thái thanh toán. Không xóa giỏ rồi tạo đơn mới.
- Một đơn chỉ chứa listing của một seller. Luồng thêm giỏ, hiển thị giỏ và checkout đều phải duy trì quy tắc này.
- Một lượt mua thành công được biểu diễn bằng `Order` đã checkout, `OrderItem`, timeline, audit log, notification, `InteractionEvent(PURCHASE)` và `Interaction(PURCHASE)`. Không tạo thêm model `Purchase` trong Checkpoint A.
- `purchases` là bộ đếm lịch sử, không phải số tồn và không được dùng để suy ra tồn kho.

## 2. Chính sách tồn kho

- `Listing.stock` là số lượng còn có thể giữ cho checkout, luôn là số nguyên không âm.
- Một listing có thể có nhiều bản. Không ép mọi listing thành hàng đơn chiếc vì dataset và `OrderItem.quantity` đang hỗ trợ số lượng lớn hơn 1.
- `condition = DIGITAL` hiện vẫn là một marketplace listing có số entitlement hữu hạn và dùng cùng invariant stock; Checkpoint A không tự coi ebook là tồn kho vô hạn vì schema chưa có license policy riêng.
- Listing mới do form hiện tại tạo chưa có trường nhập số lượng nên mặc định `stock = 1`. Việc thêm màn hình quản trị số lượng nằm ngoài Checkpoint A.
- Listing chỉ có thể được mua khi `status = APPROVED`, `stock > 0`, đúng book, đúng seller dự kiến và buyer không phải seller.
- Checkout giữ kho ngay khi tạo đơn, kể cả COD. Mỗi item giảm đúng `quantity` trong cùng transaction với cập nhật order và các side effect.
- Nếu còn hàng sau khi giảm, listing tiếp tục `APPROVED` và `soldAt = null`.
- Nếu số lượng sau khi giảm bằng 0, listing chuyển sang `SOLD` và `soldAt` được đặt tại thời điểm giữ đơn vị cuối cùng.
- Khi hoàn kho làm `stock > 0`, listing `SOLD` được mở lại thành `APPROVED` và `soldAt = null`. Các trạng thái kiểm duyệt khác như `HIDDEN`, `REJECTED`, `ARCHIVED` không được tự động đổi thành `APPROVED`.
- Ràng buộc database `stock >= 0` là lớp bảo vệ cuối cùng; logic ứng dụng vẫn phải dùng conditional update.

## 3. Checkout nguyên tử và idempotency

- Server phải đọc lại user từ database trong transaction và từ chối user không tồn tại hoặc `isLocked = true`; không chỉ tin dữ liệu session cũ.
- Idempotency key do giao diện gửi phải ổn định cho cùng một giỏ. Khóa được lưu trên order và unique theo `(buyerId, checkoutKey)` để hai buyer có thể dùng cùng chuỗi nhưng một buyer không thể tạo hai đơn với cùng khóa.
- Retry cùng buyer và cùng khóa trả lại order đã tạo, không giảm kho hoặc ghi timeline/audit/notification/PURCHASE lần nữa.
- Các listing được sắp xếp theo ID trước khi giữ kho để giảm nguy cơ deadlock.
- Mỗi lần giữ kho phải là conditional update với `id`, `sellerId`, `status = APPROVED` và `stock >= quantity`. Kết quả khác đúng một row làm thất bại toàn bộ checkout.
- Bất kỳ item nào không hợp lệ hoặc thiếu kho đều rollback order, tồn kho và toàn bộ side effect của mọi item trong giỏ.
- Không trả raw error, SQL hoặc thông tin nội bộ ra giao diện. Lỗi được ánh xạ thành mã miền và thông báo tiếng Việt an toàn.

## 4. State machine của đơn hàng

| Actor | Trạng thái hiện tại | Trạng thái kế tiếp hợp lệ |
| --- | --- | --- |
| Buyer | `PENDING` đã checkout | `CANCELLED` |
| Seller | `PAID`, `PAID_DEMO` | `SHIPPED` |
| Seller | `SHIPPED` | `COMPLETED` |
| Admin/Moderator | `PENDING` đã checkout | `PAID`, `PAID_DEMO`, `CANCELLED` |
| Admin/Moderator | `PAID`, `PAID_DEMO` | `SHIPPED`, `CANCELLED` |
| Admin/Moderator | `SHIPPED` | `COMPLETED`, `CANCELLED` |

- `COMPLETED` và `CANCELLED` là terminal trong phạm vi hiện tại.
- `REFUNDED` chưa có quy trình hoàn tiền/tồn kho hoàn chỉnh nên không được mở thêm transition ở Checkpoint A.
- Seller không được hủy đơn trong policy hiện tại.
- Mọi transition phải conditional theo trạng thái cũ. Chỉ request thắng conditional update mới được ghi timeline, audit, notification và thực hiện side effect.

## 5. Hủy đơn và hoàn kho

- Hủy đơn hợp lệ hoàn đúng `OrderItem.quantity` cho từng listing trong cùng transaction.
- Một đơn chỉ được hoàn kho một lần. Retry hoặc hai request hủy đồng thời không được increment lần hai và không tạo side effect trùng.
- Hủy đơn không giảm bộ đếm lịch sử `purchases` và không xóa sự kiện PURCHASE; đó là lịch sử đã phát sinh. Trạng thái `CANCELLED` và timeline thể hiện kết quả cuối cùng.
- Nếu listing đã bị xóa liên kết (`listingId = null`), transaction hủy vẫn đổi trạng thái đơn nhưng ghi nhận anomaly trong audit; không thể hoàn vào listing không còn tồn tại.

## 6. Quy tắc backfill dữ liệu cũ

- Chỉ backfill trên database test hoặc database rehearsal; tuyệt đối không ghi database demo trong lượt này.
- Listing khớp ID `Lxxxxx` với nguồn `bookverse_ultra_seed_2200.json` dùng trực tiếp `stock` hợp lệ từ nguồn. Đây là snapshot tồn hiện tại; không trừ `purchases` hoặc order lịch sử lần nữa.
- Listing `SOLD` hiện có luôn nhận `stock = 0`. `soldAt` lấy thời điểm order giữ hàng gần nhất nếu có, nếu không dùng `updatedAt` và ghi rule này trong report.
- Listing không khớp nguồn là dữ liệu legacy được tạo khi form chưa có trường số lượng: nếu không có order đã checkout/chưa hủy thì dùng mặc định tạm `stock = 1`; nếu đã có reservation hợp lệ thì dùng nguồn cung legacy 1, đặt stock 0 và chuyển `APPROVED` thành `SOLD`. Mọi row legacy và trường hợp quantity lịch sử vượt 1 đều phải nằm trong report review; không suy từ `purchases`.
- Dry-run và execute phải dùng cùng một hàm lập kế hoạch. Execute phải chạy lại an toàn, không đổi kết quả ở lần thứ hai.
- Report phải có tổng số row, matched/unmatched, stock min/max, số SOLD, số anomaly và danh sách cần review.

## 7. Điều kiện nghiệm thu

- Không oversell khi hai transaction tranh cùng stock.
- Retry checkout cùng key chỉ có một order và một bộ side effect.
- Multi-item checkout rollback toàn bộ nếu một item thiếu kho.
- Hủy thành công hoàn kho đúng một lần; retry và hủy đồng thời không hoàn hai lần.
- User bị khóa, self-purchase, listing không duyệt/không còn hàng và địa chỉ không thuộc buyer đều bị chặn ở server.
- Migration/backfill được thử trên `bookverse_ai_test`; triển khai được diễn tập bằng bản sao read-only của database demo và bản rehearsal bị xóa sau khi xác minh.
