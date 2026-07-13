# BookVerse AI

BookVerse AI là đồ án tốt nghiệp xây dựng nền tảng sách điện tử thông minh. Hệ thống có kho sách, chợ sách cũ, giỏ hàng, cộng đồng, trình đọc online, hồ sơ người dùng, dashboard quản trị và gợi ý AI có giải thích.

## Công nghệ sử dụng

- Next.js 15 App Router, React 19, TypeScript strict.
- Tailwind CSS, component UI tự xây theo phong cách Shadcn.
- NextAuth.js v5 Credentials Provider.
- Prisma ORM và PostgreSQL.
- Python FastAPI AI Microservice.
- Pandas, Scikit-learn, SQLAlchemy cho thuật toán gợi ý.
- Docker Compose cho database, web và AI service.

## Chức năng chính

- Đăng ký, đăng nhập, đăng xuất, quên mật khẩu và phân quyền Độc giả/Người bán/Kiểm duyệt/Quản trị viên.
- Hồ sơ cá nhân hóa cho phép cập nhật tên hiển thị, avatar, bio, sở thích đọc, ngân sách và mục tiêu đọc hằng ngày.
- Bảo mật tài khoản có đổi mật khẩu bằng hash hiện tại và notification bảo mật.
- Sổ địa chỉ giao hàng hỗ trợ thêm/sửa/xóa/đặt mặc định, checkout lưu snapshot địa chỉ vào đơn hàng.
- Thư viện cá nhân hiển thị sách đang đọc, đã mua, yêu thích, bookmark và highlight từ database thật.
- Notification Center có filter tất cả/chưa đọc, thông báo listing, đơn hàng, cộng đồng, bảo mật và AI.
- Trang chủ hiển thị gợi ý AI, lý do gợi ý và danh sách dự phòng khi AI service chưa chạy.
- Danh mục sách tìm kiếm sách theo tên, tác giả, mô tả, thể loại và thẻ.
- Trang chi tiết sách có tracking `VIEW`, đọc thử, yêu thích, thêm giỏ, mua demo qua checkout và viết review thật.
- Chợ sách cũ cho người bán đăng tin, quản trị viên duyệt/từ chối, người mua thêm giỏ hoặc mua ngay.
- Seller Dashboard tại `/seller` cho SELLER/ADMIN quản lý listing, tạo/sửa/ẩn/hiện listing, theo dõi đơn của chính mình, cập nhật trạng thái giao hàng hợp lệ, xem doanh thu và điểm uy tín.
- Giỏ hàng dùng bảng `Order PENDING` chưa có `paymentMethod`, hỗ trợ đổi số lượng, xóa sách, chọn địa chỉ giao hàng và tạo đơn thật có timeline.
- Checkout đã harden: validate địa chỉ thuộc buyer, payment method hợp lệ, listing còn `APPROVED`, không tự mua listing của mình và chỉ checkout một seller mỗi đơn.
- Trình đọc online đọc ebook HTML trong `public/ebooks/html`, lưu tiến độ, phiên đọc, bookmark và highlight theo `blockId`.
- Diễn đàn cộng đồng hỗ trợ bài viết, bình luận, thích/báo cáo và quản trị viên xử lý bài bị báo cáo.
- Trang hồ sơ hiển thị lịch sử đọc, đơn hàng, tin bán, highlight, mục tiêu đọc và gợi ý đã lưu.
- Admin Center quản lý user, role, khóa/mở tài khoản, sách, listing, đơn hàng, report cộng đồng, AI feedback và audit log.
- Trợ lý AI tư vấn sách từ dữ liệu nội bộ bằng RAG, hỗ trợ pgvector, fallback keyword search và feedback hữu ích/không hữu ích.
- Smart Dashboard hiển thị thói quen đọc sách và doanh thu người bán bằng biểu đồ Recharts.
- AI service FastAPI tính gợi ý hybrid từ đọc, bookmark, mua hàng và điểm phổ biến.

## Cấu trúc thư mục

```text
D:\Doantotnghiep
├─ app/                 # Next.js pages/routes
├─ actions/             # Server Actions xử lý nghiệp vụ
├─ components/          # UI components
├─ prisma/              # Prisma schema, migrations, seed
├─ data/demo/           # CSV demo nhỏ, không xóa dữ liệu gốc
├─ data/json/           # Dataset lớn 2.200 sách để import khi cần
├─ public/covers/       # Bìa sách PNG/SVG
├─ public/ebooks/       # Ebook HTML/JSON cho reader
├─ ai_service/          # FastAPI service cho gợi ý sách
├─ scripts/             # Script import/làm mới dữ liệu
├─ requirements.txt     # Dependency Python cấp project
└─ README.md
```

## Chạy local

Mở PowerShell tại thư mục dự án:

```powershell
cd D:\Doantotnghiep
```

Cài dependency:

```powershell
npm install
```

Khởi động PostgreSQL:

```powershell
docker compose up -d db
```

Tạo schema database:

```powershell
npx prisma migrate dev
```

Khi deploy hoặc dùng database đã có migration:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Seed dữ liệu demo nhỏ:

```powershell
npx tsx prisma/seed.ts
```

Chạy Next.js:

```powershell
npm run dev
```

URL web:

```text
http://127.0.0.1:3000
```

## Chạy AI service

Mở terminal PowerShell thứ hai:

```powershell
cd D:\Doantotnghiep\ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

URL kiểm tra:

```text
Health: http://127.0.0.1:8000/health
Recommend: http://127.0.0.1:8000/recommend/U001
```

## Cấu hình pgvector và RAG Chatbot

Database trong `docker-compose.yml` dùng image `pgvector/pgvector:pg16`. Nếu đang dùng container PostgreSQL cũ, hãy recreate service `db` nhưng giữ nguyên volume:

```powershell
docker compose up -d db
npx prisma migrate deploy
```

Thiết lập khóa LLM/Embedding trong `.env`:

```env
BOOKVERSE_LLM_PROVIDER="openai"
BOOKVERSE_EMBEDDING_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

Tạo embedding thử cho một phần dữ liệu:

```powershell
npm run embeddings:books -- --limit 20
```

Tạo embedding cho toàn bộ kho sách:

```powershell
npm run embeddings:books
```

Nếu chưa có pgvector hoặc chưa seed embedding, chatbot vẫn hoạt động bằng keyword fallback để demo không bị gián đoạn.

## Tài khoản demo sau khi seed nhỏ

```text
Độc giả:       u001@bookverse.local / 123456
Người bán:     u008@bookverse.local / 123456
Quản trị viên: u009@bookverse.local / 123456
Kiểm duyệt:    u010@bookverse.local / 123456
```

Bạn cũng có thể đăng ký tài khoản mới trên giao diện.

## Seller Dashboard

Các route chính của luồng người bán:

```text
/seller
/seller/apply
/seller/listings
/seller/listings/new
/seller/listings/[id]/edit
/seller/orders
/seller/orders/[id]
/seller/revenue
```

Quy tắc demo:

- BUYER vào `/seller` sẽ thấy lời mời đăng ký, sau đó vào `/seller/apply` để bật role SELLER.
- SELLER/ADMIN mới được xem dữ liệu dashboard seller.
- Listing mới hoặc listing đã sửa khi đang `APPROVED` sẽ chuyển về `PENDING_REVIEW` để admin duyệt lại.
- Seller chỉ xem được listing và order item thuộc seller đó.
- Seller chỉ được chuyển đơn `PAID`/`PAID_DEMO` sang `SHIPPED`, và `SHIPPED` sang `COMPLETED`.
- Seed nhỏ và import dataset lớn đều có dữ liệu demo Phase 3 cho listing, order, timeline và notification seller.

## Order Và Checkout Phase 4

Quy tắc checkout:

- Buyer phải đăng nhập, có item trong cart, chọn địa chỉ giao hàng thuộc chính mình và chọn payment method hợp lệ.
- Các route/action nhạy cảm luôn lấy lại `role` và `isLocked` từ database ở server request, không tin role lưu trong JWT cũ.
- User bị khóa hoặc bị hạ quyền sẽ bị chặn khỏi Admin/Seller/action nhạy cảm ở request kế tiếp; middleware chỉ làm lớp điều hướng nhanh.
- Payment method hỗ trợ `COD`, `BANK_TRANSFER_DEMO`, `WALLET_DEMO`.
- Listing trong cart phải tồn tại, còn `APPROVED`, đúng sách, giá hợp lệ và không thuộc chính buyer.
- Marketplace public chỉ hiển thị listing `APPROVED`; seller/admin vẫn xem được listing `PENDING_REVIEW` trong khu vực quản lý.
- Demo Phase 4 giới hạn một seller mỗi checkout. Nếu cart có nhiều seller, UI báo lỗi và buyer cần xóa item khác seller.
- Seller mở chi tiết đơn qua `/orders/[id]` chỉ thấy item và doanh thu thuộc seller đó; buyer/admin/moderator thấy toàn bộ đơn.
- Order lưu snapshot địa chỉ bằng các field `shippingFullName`, `shippingPhone`, `shippingProvince`, `shippingDistrict`, `shippingWard`, `shippingAddressLine`, `shippingNote`.
- COD tạo order `PENDING`; `BANK_TRANSFER_DEMO` và `WALLET_DEMO` tạo order `PAID_DEMO`.

Quy tắc chatbot:

- User đã đăng nhập chỉ được tiếp tục session chatbot thuộc chính tài khoản đó.
- Khách ẩn danh không được tái sử dụng `sessionId` do client gửi; mỗi lượt sẽ tạo session ẩn danh mới.
- Feedback chatbot yêu cầu đăng nhập và chỉ ghi nhận cho session/message thuộc user hiện tại.

Transition order hiện tại:

```text
BUYER:  PENDING -> CANCELLED
SELLER: PAID/PAID_DEMO -> SHIPPED, SHIPPED -> COMPLETED
ADMIN/MODERATOR: PENDING -> PAID/PAID_DEMO/CANCELLED
ADMIN/MODERATOR: PAID/PAID_DEMO -> SHIPPED/CANCELLED
ADMIN/MODERATOR: SHIPPED -> COMPLETED/CANCELLED
TERMINAL: COMPLETED, CANCELLED
```

## Phân tích và import dataset an toàn

File `data/json/bookverse_ultra_seed_2200.json` chỉ được đọc. Quy trình dưới đây không sửa hoặc ghi đè dataset gốc.

### Phân tích dataset không cần database

```powershell
npm run data:analyze
```

Kết quả được ghi vào:

```text
outputs/dataset/dataset-analysis.json
outputs/dataset/dataset-analysis.csv
docs/DATASET_REPORT.md
```

### Dry-run trên database test

Không đổi `.env` chính. Chỉ cấp biến môi trường cho process hiện tại:

```powershell
$env:DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/bookverse_ai_test?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai_test"
npm run data:import -- --dry-run
```

Dry-run chỉ load, validate, phân tích, đọc count và tạo report; không gọi Prisma write method. Report phải có `countsUnchanged: true`.

### Import an toàn

```powershell
npm run data:import -- --execute
```

Lệnh chỉ được phép khi `DATABASE_URL` trỏ chính xác tới database nằm trong `ALLOWED_DESTRUCTIVE_DATABASES`. Không có allowlist thì mọi execute bị từ chối.

### Replace database test

```powershell
npm run data:import -- --execute --replace-existing
```

> **Cảnh báo:** Không chạy `--replace-existing` trên database `bookverse_ai`. Guard sẽ từ chối, nhưng người vận hành vẫn phải kiểm tra target trước khi chạy.

Mỗi dry-run/import sinh file mới trong `outputs/import`. Report chỉ chứa database name và không chứa password hoặc connection string đầy đủ.

Hai script `seed:1200` và `seed:2200` được giữ để tương thích tài liệu cũ nhưng đã fail-closed: nếu không có `--dry-run` hoặc `--execute`, script sẽ dừng và không ghi database.

Tài khoản demo của dataset lớn sau khi import thành công trên test database:

```text
Độc giả:       user001@bookverse.local / 123456
Quản trị viên: user005@bookverse.local / 123456
```

## Chạy bằng Docker Compose

Chạy toàn bộ hệ thống:

```powershell
docker compose up --build
```

Các service:

- `db`: PostgreSQL, port `5432`.
- `web`: Next.js, port `3000`.
- `ai_service`: FastAPI Recommendation, port `8000`.

Nếu đã từng chạy Docker trước đó và route mới như `/marketplace` vẫn trả 404, hãy rebuild lại image web:

```powershell
docker compose up -d --build web
```

## Kịch bản demo DATN

1. Đăng nhập bằng tài khoản Độc giả hoặc đăng ký tài khoản mới.
2. Mở `Quên mật khẩu`, tạo link reset demo và kiểm tra trang đặt lại mật khẩu.
3. Vào `/profile/settings` để cập nhật tên hiển thị, avatar, bio, sở thích đọc, ngân sách và mục tiêu đọc.
4. Vào `/profile/security` để đổi mật khẩu bằng mật khẩu hiện tại.
5. Vào `/profile/addresses` để thêm địa chỉ giao hàng mặc định.
6. Mở trang chủ để xem gợi ý AI và lý do gợi ý.
7. Vào Danh mục sách, tìm kiếm sách theo chủ đề, mở chi tiết sách và bấm yêu thích.
8. Mở marketplace hoặc chi tiết sách, thêm giỏ hoặc mua demo để chuyển sang `/cart`.
9. Vào Giỏ hàng, chọn địa chỉ giao hàng, chọn COD/BANK_TRANSFER_DEMO/WALLET_DEMO và tạo đơn.
10. Mở `/orders/[id]` để xem timeline và địa chỉ snapshot, sau đó hủy đơn nếu còn PENDING.
11. Bấm Đọc thử, chuyển trang, bookmark và bôi đen nội dung để lưu highlight.
12. Vào `/library` để xem sách đang đọc, đã mua, yêu thích, bookmark và highlight.
13. Vào `/seller/apply` bằng tài khoản BUYER để bật role người bán, hoặc đăng nhập tài khoản Người bán seed nhỏ.
14. Vào `/seller/listings/new` tạo listing, sau đó vào `/seller/listings` để sửa, ẩn hoặc gửi duyệt lại.
15. Vào `/seller/orders` và `/seller/orders/[id]` để chuyển đơn PAID_DEMO sang SHIPPED, rồi SHIPPED sang COMPLETED.
16. Vào `/seller/revenue` để xem doanh thu completed, top listing và giao dịch gần đây.
17. Vào `/cart` với item nhiều seller hoặc item không còn available để thấy lỗi rõ và nút xóa item.
18. Vào Notification Center để lọc thông báo tất cả/chưa đọc và mở notification có href.
19. Đăng nhập Quản trị viên/Kiểm duyệt, vào Admin Center để quản lý user, sách, listing, order, report, AI feedback và audit log.
20. Vào Cộng đồng để tạo bài, bình luận, thích và báo cáo.
21. Vào Trợ lý AI để hỏi gợi ý sách theo nhu cầu và bấm đánh giá câu trả lời.

Tài liệu demo chi tiết hơn nằm tại:

```text
docs/DEMO_GUIDE.md
```

## Lệnh kiểm thử

```powershell
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run data:analyze
npm run data:import -- --dry-run
npm run test:unit
npm run build
python -m py_compile ai_service/main.py ai_service/evaluate.py scripts/refresh_real_book_data.py
docker compose config
```

Lệnh `data:import` phải dùng biến `DATABASE_URL` của `bookverse_ai_test`; không chạy import để kiểm thử trên database demo.

## Migration mới của Phase 2

- `20260710130000_phase2_profile_shipping`: thêm mục tiêu đọc trong `Profile`, model `ShippingAddress`, model `FavoriteBook` và các field snapshot địa chỉ trên `Order`.

## Phase 3 Seller Dashboard

- Phase 3 không đổi Prisma schema, nên không có migration mới.
- Code chính nằm ở `actions/seller.actions.ts`, `lib/seller-score.ts` và các route trong `app/seller`.
- Dữ liệu demo bổ sung bằng `upsert` trong `prisma/seed.ts`; import dataset lớn chỉ chạy khi có mode rõ ràng và database guard cho phép.

## Phase 4 Order/Checkout Hardening

- Phase 4 không đổi Prisma schema, nên không có migration mới.
- Code chính nằm ở `actions/cart.actions.ts`, `actions/order.actions.ts`, `actions/seller.actions.ts`, `actions/dashboard.actions.ts` và `lib/order-workflow.ts`.
- Seed demo có đủ order `PENDING`, `PAID`, `PAID_DEMO`, `SHIPPED`, `COMPLETED`, `CANCELLED` cho seller dashboard và admin workflow.

## Ghi chú dữ liệu

- Không xóa hoặc ghi đè file dữ liệu gốc trong `data/demo`.
- Ebook HTML/JSON và cover SVG đã được thêm vào `public/ebooks` và `public/covers` để reader/catalog dùng trực tiếp.
- Script `prisma/seed.ts` seed demo nhỏ và đặt mật khẩu `123456` cho user mẫu.
- Script import quy mô lớn mặc định fail-closed; chỉ `--execute --replace-existing` mới dọn dữ liệu và chỉ được phép trên database test nằm trong allowlist.
