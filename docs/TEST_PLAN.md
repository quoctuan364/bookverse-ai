# Kế hoạch kiểm thử Checkpoint A

## 1. Mục tiêu

Chứng minh bằng test tự động và PostgreSQL thật rằng BookVerse không oversell, không xử lý checkout trùng, rollback toàn bộ khi một item lỗi và chỉ hoàn kho đúng một lần. Tất cả fixture ghi dữ liệu chỉ được chạy trên `bookverse_ai_test` hoặc database rehearsal có tên cố định.

## 2. Cổng an toàn

- `DATABASE_URL` được parse để lấy đúng database name; log chỉ dùng URL đã che.
- Destructive test/backfill yêu cầu `ALLOWED_DESTRUCTIVE_DATABASES` chứa đúng target.
- Integration test chỉ nhận `bookverse_ai_test` hoặc `bookverse_ai_deploy_rehearsal` trong allowlist cứng.
- Fixture dùng prefix `IT-STOCK-<timestamp>-<pid>` và cleanup chỉ ID/user của prefix đó.
- Dataset JSON và database demo `bookverse_ai` chỉ được đọc.

## 3. Unit test

| Nhóm | Trường hợp mong đợi |
| --- | --- |
| Stock | quantity nguyên dương, không vượt stock, không tạo stock âm |
| soldAt | Giữ đơn vị cuối đặt `SOLD/soldAt`; hoàn từ `SOLD` đặt `APPROVED/soldAt=null` |
| Backfill | Ưu tiên stock dataset; legacy không match phải có `needsReview` |
| Idempotency | Key hợp lệ được normalize; key ngắn/ký tự lạ trả domain error |
| State machine | Buyer/seller/admin chỉ có transition đã duyệt; terminal không chuyển tiếp |
| Ownership | Seller chỉ nhận item thuộc listing của seller đó |

## 4. Integration PostgreSQL

1. Database check constraint từ chối ghi stock âm.
2. Marketplace public chỉ trả listing `APPROVED` và `stock > 0`.
3. Hai buyer tranh listing stock 1: đúng một checkout; bên còn lại `OUT_OF_STOCK`; stock cuối 0; một order/PURCHASE hợp lệ.
4. Hai request cùng buyer/key: cùng `orderId`; stock, timeline, audit và PURCHASE chỉ phát sinh một lần.
5. Stock 5, quantity 3: stock cuối 2, listing tiếp tục `APPROVED`.
6. Giỏ nhiều item có một item `HIDDEN`: order vẫn là cart, checkoutKey/payment null, stock item còn lại không đổi, không timeline.
7. Self-purchase, `HIDDEN`, `REJECTED`, `SOLD` đều bị chặn phía server và stock không đổi.
8. Locked user không checkout hoặc cancel; buyer khác không cancel order không thuộc mình; admin được cancel theo policy.
9. Cancel quantity 2 hoàn đúng 2, mở lại listing, xóa soldAt; lần hai không tăng kho/audit/notification.
10. Hai cancel đồng thời: đúng một request thành công, một timeline/audit, stock chỉ hoàn một lần.

## 5. Regression

- Prisma validate/generate, TypeScript strict.
- Toàn bộ unit test cũ.
- Category analyzer và Category integration verifier.
- FastAPI compileall.
- Next.js production build.
- Docker Compose config.
- Stock backfill dry-run/execute/execute lần hai.
- Rehearsal clone demo: count trước/sau, migration, constraint/index/unique, FK, stock backfill và checkout smoke.

## 6. Tiêu chí kết luận

Chỉ kết luận Checkpoint A hoàn thành khi mọi cổng có exit code 0, bao gồm Category backfill trên clone demo. Nếu mapping Category legacy không tương thích và bị fail-closed thì Checkpoint A phải ghi **chưa hoàn thành**, dù riêng phần stock đã PASS.
