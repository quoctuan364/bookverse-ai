# Hướng Dẫn Demo BookVerse AI

## Mục Tiêu Demo

BookVerse AI được demo như một hệ thống có 4 vai trò:

- Reader/Buyer: đọc sách, mua sách, quản lý hồ sơ, nhận gợi ý AI.
- Seller: đăng bán sách cũ và nhận thông báo khi có đơn.
- Admin/Moderator: quản lý user, sách, listing, order, report, AI feedback và audit log.
- AI System: chatbot RAG, recommendation có evidence và feedback.

## Route Quan Trọng

- `/`: Trang chủ và gợi ý sách.
- `/catalog`: Danh mục sách.
- `/marketplace`: Chợ sách cũ.
- `/seller`: Seller Dashboard tổng quan.
- `/seller/apply`: BUYER bật vai trò người bán.
- `/seller/listings`: Quản lý listing của seller.
- `/seller/listings/new`: Tạo listing mới chờ duyệt.
- `/seller/listings/[id]/edit`: Sửa, ẩn hoặc gửi duyệt lại listing.
- `/seller/orders`: Danh sách đơn có item thuộc seller.
- `/seller/orders/[id]`: Chi tiết đơn seller, timeline và cập nhật trạng thái hợp lệ.
- `/seller/revenue`: Doanh thu completed và top listing.
- `/cart`: Giỏ hàng.
- `/read/[bookId]`: Trình đọc sách, bookmark và highlight.
- `/dashboard`: Dashboard đọc sách/doanh thu.
- `/profile`: Hồ sơ cá nhân.
- `/profile/settings`: Cập nhật tên hiển thị, avatar, bio, sở thích đọc, ngân sách và mục tiêu đọc.
- `/profile/security`: Đổi mật khẩu tài khoản credentials.
- `/profile/addresses`: Quản lý địa chỉ giao hàng và địa chỉ mặc định.
- `/library`: Thư viện cá nhân gồm sách đang đọc, đã mua, yêu thích, bookmark và highlight.
- `/orders/[id]`: Chi tiết đơn hàng, timeline và snapshot địa chỉ giao hàng.
- `/notifications`: Trung tâm thông báo.
- `/admin`: Admin Center.
- `/assistant`: Trợ lý dùng contract `d1`, RAG/keyword fallback và sách đã xác minh.
- `/forgot-password`: Quên mật khẩu.
- `/reset-password`: Đặt lại mật khẩu.

## Luồng Demo Gợi Ý

1. Đăng nhập buyer hoặc đăng ký tài khoản mới.
2. Vào `/profile/settings`, cập nhật tên hiển thị, avatar, bio, persona, thể loại yêu thích, ngân sách và mục tiêu đọc.
3. Vào `/profile/security`, nhập mật khẩu hiện tại và đổi sang mật khẩu mới ít nhất 8 ký tự.
4. Vào `/profile/addresses`, thêm địa chỉ giao hàng và đặt làm mặc định.
5. Mở một sách, bấm yêu thích, đọc thử, bookmark và bôi đen highlight.
6. Vào marketplace, thêm sách vào giỏ hoặc bấm mua demo để chuyển sang `/cart`.
7. Vào `/cart`, chọn địa chỉ giao hàng, chọn COD/BANK_TRANSFER_DEMO/WALLET_DEMO và tạo đơn.
8. Mở `/orders/[id]`, kiểm tra timeline PENDING và địa chỉ giao hàng snapshot; nếu còn PENDING có thể hủy đơn.
9. Vào `/library` để kiểm tra sách đang đọc, đã mua, yêu thích, bookmark và highlight.
10. Vào `/notifications`, lọc tất cả/chưa đọc, mở notification có href và đánh dấu đã đọc.
11. Vào `/seller/apply` bằng tài khoản BUYER để bật role SELLER, hoặc đăng nhập tài khoản seller seed nhỏ.
12. Vào `/seller/listings/new`, tạo listing mới và kiểm tra listing ở trạng thái chờ duyệt.
13. Vào `/seller/listings`, sửa listing đã duyệt để thấy listing chuyển về chờ duyệt lại; thử ẩn và hiện lại listing demo.
14. Vào `/seller/orders`, mở đơn `PAID_DEMO`, chuyển sang `SHIPPED`; mở đơn `SHIPPED` và chuyển sang `COMPLETED`.
15. Vào `/seller/revenue` để xem doanh thu completed, top listing và giao dịch gần đây.
16. Đăng nhập admin/moderator và vào `/admin`.
17. Trong Admin Center:
   - Đổi role hoặc khóa/mở user.
   - Ẩn/lưu trữ sách thiếu dữ liệu.
   - Duyệt/từ chối/ẩn listing và nhập reason.
   - Cập nhật trạng thái order để tạo timeline và notification.
   - Xử lý bài viết/comment bị report.
   - Xem chatbot feedback và audit log.
18. Mở `/assistant` hoặc chatbot nổi, hỏi gợi ý sách, kiểm tra nhãn provider/fallback và các link `/book/{id}`, sau đó bấm hữu ích/không hữu ích khi đã đăng nhập.
19. Quay lại Admin Center để xem feedback AI.

## Luồng Demo Assistant — Checkpoint D

1. Mở `/assistant` và hỏi: `Gợi ý sách trí tuệ nhân tạo cho người mới`.
2. Nếu OpenAI/Gemini và pgvector sẵn sàng, UI hiển thị provider/source thật. Nếu một dịch vụ chưa sẵn sàng, UI phải hiện `Chế độ dự phòng từ catalog đã xác minh; không phải phản hồi giả`.
3. Kiểm tra mỗi sách có tiêu đề, tác giả, điểm phù hợp và link đúng dạng `/book/{id}`. Mở một card để chứng minh ID tồn tại trong catalog.
4. Gửi câu hỏi thứ hai trong cùng giao diện. Với user đăng nhập, hai lượt phải tiếp tục cùng session của chính user.
5. Bấm hữu ích/không hữu ích. User đăng nhập được lưu feedback cho assistant message của mình; khách ẩn danh thấy thông báo yêu cầu đăng nhập.
6. Mở chatbot nổi ở góc phải, gửi `Sách UX cho sinh viên` và kiểm tra contract/trạng thái giống trang `/assistant`.

Điểm cần nói rõ với giảng viên:

- FastAPI hiện phục vụ recommendation, không phục vụ chat. Checkpoint D chủ động giữ RAG tại Next.js để tránh thêm network hop khi chưa có benchmark.
- `mocked=true` không được xuất hiện ở production. Development mock chỉ bật bằng cờ rõ ràng và câu trả lời có nhãn `[DEV MOCK]`.
- Khi provider, embedding hoặc database lỗi, hệ thống không bịa trạng thái thành công: provider/vector hạ về catalog; database trả lỗi 503 an toàn.
- Rollback một release: đặt `BOOKVERSE_ASSISTANT_LEGACY_UI=true` để quay lại UI adapter cũ; không cần rollback database vì Checkpoint D không có migration.

## Luồng Demo Marketplace Và Order Phase 4

1. Đăng nhập buyer.
2. Vào `/marketplace`.
3. Thêm một listing `APPROVED` vào giỏ.
4. Vào `/cart`.
5. Kiểm tra item card có seller, condition, availability và tổng tiền.
6. Chọn địa chỉ mặc định hoặc thêm địa chỉ tại `/profile/addresses`.
7. Chọn `COD`, `BANK_TRANSFER_DEMO` hoặc `WALLET_DEMO`.
8. Checkout và mở `/orders/[id]` để xem payment method, snapshot địa chỉ, item, seller và timeline.
9. Vào `/notifications` để kiểm tra notification tạo đơn.
10. Đăng nhập seller.
11. Vào `/seller/orders`.
12. Mở order mới tại `/seller/orders/[id]`.
13. Nếu order ở `PAID` hoặc `PAID_DEMO`, seller bấm cập nhật sang `SHIPPED`.
14. Nếu order ở `SHIPPED`, seller bấm cập nhật sang `COMPLETED`.
15. Đăng nhập buyer để kiểm tra timeline và notification.
16. Đăng nhập admin/moderator để kiểm tra order, notification và audit log trong `/admin`.

## Quyền Và Transition Order

- BUYER chỉ được hủy order `PENDING` đã checkout.
- SELLER chỉ xem và xử lý order có item thuộc listing của mình.
- SELLER được chuyển `PAID`/`PAID_DEMO` sang `SHIPPED`, và `SHIPPED` sang `COMPLETED`.
- ADMIN/MODERATOR trong Admin Center chỉ được chuyển theo transition hợp lệ: `PENDING -> PAID/PAID_DEMO/CANCELLED`, `PAID/PAID_DEMO -> SHIPPED/CANCELLED`, `SHIPPED -> COMPLETED/CANCELLED`.
- `COMPLETED` và `CANCELLED` là trạng thái cuối trong demo, không đổi tiếp.
- COD checkout tạo order `PENDING`. `BANK_TRANSFER_DEMO` và `WALLET_DEMO` tạo order `PAID_DEMO` để seller có thể demo giao hàng ngay.

## Giới Hạn Multi-Seller

Phase 4 chọn cách an toàn và dễ demo: mỗi checkout chỉ chứa item của một seller.

- Khi thêm vào giỏ, hệ thống chặn item từ seller khác nếu cart đang có seller hiện tại.
- Khi checkout, server vẫn kiểm tra lại seller trong transaction.
- Nếu cart có nhiều seller do dữ liệu cũ, `/cart` hiển thị lỗi rõ và user có thể xóa item không phù hợp.
- Cách này tránh việc seller A cập nhật trạng thái làm ảnh hưởng item của seller B trong cùng order.

## Migration Và Seed

Chạy schema/database chuẩn:

```powershell
docker compose up -d db
npx prisma migrate deploy
npx prisma generate
```

Nếu môi trường local đang bị chặn bởi image pgvector chưa pull được, có thể apply riêng các migration không phụ thuộc pgvector bằng:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260706143000_add_password_reset_tokens/migration.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260706150000_admin_operations_foundation/migration.sql
```

Phân tích và dry-run dữ liệu lớn trên database test:

```powershell
npm run data:analyze
$env:DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/bookverse_ai_test?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai_test"
npm run data:import -- --dry-run
npm run data:import -- --execute
```

Không chạy `--replace-existing` trên database demo `bookverse_ai`. Hai alias `seed:1200` và `seed:2200` sẽ fail-closed nếu thiếu mode rõ ràng.

Migration mới của Phase 2:

```text
prisma/migrations/20260710130000_phase2_profile_shipping
```

Migration này thêm `ShippingAddress`, `FavoriteBook`, mục tiêu đọc trong `Profile` và field snapshot địa chỉ giao hàng trên `Order`.

Phase 3 Seller Dashboard không đổi schema. Seed nhỏ và quy trình `data:import` đều bổ sung dữ liệu demo seller bằng ID cố định cho listing, order, timeline và notification.

Tạo embedding RAG sau khi pgvector hoạt động:

```powershell
npm run embeddings:books -- --limit 20
npm run embeddings:books
```

## Kiểm Tra Trước Khi Bảo Vệ

```powershell
npx prisma validate
npm run typecheck
npm test
npm run test:assistant-integration
npm run build
docker compose config
```

## Ghi Chú Hiện Trạng

- Admin Center đã có audit log và notification cho các hành động quản trị chính.
- Regenerate embedding trong Admin Books gọi trực tiếp provider embedding đang cấu hình và cập nhật bảng `book_embeddings`.
- Rerun AI trong Admin Users gọi FastAPI recommendation, lưu lại recommendation/evidence và tạo notification cho user.
- Chatbot feedback đã lưu vào database và hiển thị ở Admin AI Management.
- `/assistant` và chatbot nổi đã dùng chung contract `d1`; production mock bị khóa, local/keyword fallback có nhãn degraded rõ ràng.
- Checkout hiện bắt buộc chọn địa chỉ giao hàng; order lưu snapshot nên thay đổi địa chỉ sau đó không làm thay đổi lịch sử đơn.
- Giỏ hàng vẫn dùng `Order PENDING`, nhưng chỉ những order PENDING chưa có `paymentMethod` được xem là cart tạm.
- Seller Dashboard đã có phân quyền DB: BUYER phải vào `/seller/apply`, SELLER/ADMIN mới xem dashboard và server action luôn kiểm tra listing/order thuộc seller hiện tại.
