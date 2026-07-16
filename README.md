# BookVerse AI

BookVerse AI là đồ án tốt nghiệp xây dựng nền tảng sách điện tử thông minh. Hệ thống có kho sách, chợ sách cũ, giỏ hàng, cộng đồng, trình đọc online, hồ sơ người dùng, dashboard quản trị và gợi ý AI có giải thích.

> Trạng thái hiện hành: xem [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md). Các báo cáo checkpoint cũ chỉ là historical snapshot, không tự động chứng minh source hiện tại. AI metric offline còn thấp, dữ liệu chủ yếu là `SYNTHETIC_DATA`/`DEMO_DATA`, CTR production hiện `NOT_AVAILABLE` và chưa có UAT/SUS người dùng thật.

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
- Trang chủ chỉ hiển thị lý do cá nhân hóa khi có evidence; danh sách dự phòng dùng trạng thái trung tính “chưa có giải thích cá nhân hóa đã được xác minh”.
- Danh mục sách tìm kiếm sách theo tên, tác giả, mô tả, thể loại và thẻ.
- Trang chi tiết sách có tracking `VIEW`, đọc thử, yêu thích, thêm giỏ, mua demo qua checkout và viết review thật.
- Chợ sách cũ cho người bán đăng tin, quản trị viên duyệt/từ chối, người mua thêm giỏ hoặc mua ngay.
- Seller Dashboard tại `/seller` cho SELLER/ADMIN quản lý listing, tạo/sửa/ẩn/hiện listing, theo dõi đơn của chính mình, cập nhật trạng thái giao hàng hợp lệ, xem doanh thu và điểm chất lượng deterministic theo quy tắc.
- Giỏ hàng dùng bảng `Order PENDING` chưa có `paymentMethod`, hỗ trợ đổi số lượng, xóa sách, chọn địa chỉ giao hàng và tạo đơn thật có timeline.
- Checkout đã harden: giữ tồn kho bằng conditional update trong transaction, chống oversell/self-purchase/double submit và chỉ checkout một seller mỗi đơn.
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

## Đánh giá recommendation theo thời gian — Checkpoint E

Evaluator chỉ đọc `bookverse_ai_test`, tách strong-positive theo cutoff, dựng toàn bộ user feature và popularity từ train snapshot rồi so sánh Popularity, Content, Behavior và Hybrid production tại K=5/10. CTR được ghi `NOT_AVAILABLE` vì chưa có impression log đáng tin cậy. Evaluator không ghi database, không dùng bảng Recommendation làm ground truth và fail-closed nếu URL trỏ sang database demo.

```powershell
cd D:\Doantotnghiep
ai_service\.venv\Scripts\Activate.ps1
pip install -r ai_service\requirements-dev.txt

$env:DATABASE_URL="postgresql://USER:PASSWORD@localhost:5433/bookverse_ai_test?schema=public"
$env:RUN_EVALUATION_INTEGRATION="1"

npm run test:python
npm run evaluation:ai
```

Mỗi run tạo JSON, CSV và Markdown mới trong `outputs/evaluation/<run-id>`; thư mục này không được commit. Hai lượt kiểm chứng ngày 14/07/2026 cho cùng checksum chuẩn hóa `ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e`. Kết quả hiện còn thấp: Behavior có HitRate@10 cao nhất `0,021008`, còn Hybrid production là `0,008403`; không được chỉnh trọng số theo test để làm metric đẹp hơn. Xem phân tích, công thức và giới hạn tại `docs/AI_EVALUATION.md`.

## Interaction taxonomy và recommendation telemetry — Checkpoint F1

Taxonomy dùng chung nằm tại `shared/interaction-taxonomy.v1.json`; tài liệu chi tiết ở `docs/INTERACTION_TAXONOMY.md`. Recommendation engine ghi bốn giai đoạn riêng: request do server tạo, impression khi card thấy ít nhất 50% trong 1 giây, click không chặn điều hướng và conversion được server xác minh. Contract, attribution 7 ngày, idempotency và privacy nằm tại `docs/RECOMMENDATION_TRACKING.md`.

```powershell
npm run data:analyze-interactions
npm run test:taxonomy-parity
npm run test:rank-collision
npm run test:telemetry-integration
npm run test:telemetry-reliability
npm run report:recommendation-tracking -- --since-hours=24
python -m pytest ai_service/tests -q
python ai_service/prepare_temporal_split.py
```

Integration và split chỉ dùng `bookverse_ai_test`. Ba cửa sổ hiện tại là train trước 01/06/2026, validation từ 01/06 đến trước 20/06 và final từ 20/06. Final hiện không còn unseen vì đã được xem ở Checkpoint E; không dùng nó để tune. CTR production vẫn là `NOT_AVAILABLE` vì dữ liệu cũ synthetic và chưa có kỳ thu thập impression/click instrumented thật.

Hotfix F1.1 chuẩn hóa recommendation ở mọi surface: dedupe Book theo source policy, giữ score/evidence của candidate thắng và gán `position` liên tục `1..N` thay vì dùng rank gốc làm unique position. Database khỏe trả `requestId` khác null với `trackingStatus="TRACKED"`; persistence thật sự lỗi trả recommendation ở chế độ `DEGRADED` mà không lộ raw database error. Stress test bắt buộc chạy 100 request trên ba surface, đối soát Book/score/evidence/position với database và cleanup về 0. Chi tiết tại `docs/RECOMMENDATION_TRACKING.md` và `docs/DEPLOYMENT_R1_1_REPORT.md`.

## Cấu hình pgvector và RAG Chatbot

Database trong `docker-compose.yml` đã pin image `pgvector/pgvector:0.8.5-pg16`. Nếu đang dùng container PostgreSQL cũ, chỉ recreate service `db` sau khi đã backup và đi đúng `docs/DEPLOYMENT.md`; luôn giữ nguyên volume:

```powershell
docker compose up -d db
npx prisma migrate deploy
```

Thiết lập khóa LLM/Embedding trong `.env`:

```env
BOOKVERSE_LLM_PROVIDER="openai"
BOOKVERSE_EMBEDDING_PROVIDER="openai"
BOOKVERSE_CHAT_TIMEOUT_MS="8000"
BOOKVERSE_CHAT_MOCK_ENABLED="false"
BOOKVERSE_ASSISTANT_LEGACY_UI="false"
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

Nếu chưa có pgvector, embedding hoặc khóa provider, chatbot vẫn hoạt động bằng keyword/local catalog fallback và trả `degraded=true`. UI phải hiển thị rõ đây là dữ liệu dự phòng đã xác minh, không giả thành phản hồi AI.

## Assistant contract — Checkpoint D

`/assistant` và chatbot nổi dùng chung `/api/chat` cùng contract `d1`. Phản hồi thành công luôn có các field chính: `answer`, `validatedBooks`, `provider`, `source`, `mocked`, `degraded`, `sessionId`, `assistantMessageId` và `errorCode`. Mọi link sách do assistant trả về phải có dạng `/book/{id}` và ID phải được đọc lại từ database.

Quy tắc vận hành:

- RAG chatbot tiếp tục nằm ở Next.js; FastAPI hiện chỉ phục vụ recommendation. Chưa chuyển chat sang FastAPI vì chưa có benchmark chứng minh lợi ích.
- OpenAI/Gemini có timeout cấu hình bằng `BOOKVERSE_CHAT_TIMEOUT_MS`; khi provider, embedding hoặc vector lỗi, hệ thống hạ về catalog thật và gắn trạng thái degraded.
- `BOOKVERSE_CHAT_MOCK_ENABLED=true` chỉ có hiệu lực trong development/test. Production luôn vô hiệu mock, kể cả khi `BOOKVERSE_LLM_PROVIDER=mock`.
- Khách ẩn danh không được tiếp tục session do client cung cấp. User đăng nhập chỉ tiếp tục session thuộc chính mình; user bị khóa bị chặn.
- Feedback chỉ nhận cho assistant message thuộc session của user đăng nhập. API không trả raw database/provider error cho client.
- Có thể rollback UI trong một release bằng `BOOKVERSE_ASSISTANT_LEGACY_UI=true`; adapter cũ không phải đường chạy mặc định.

Kiểm thử riêng Checkpoint D trên database test:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@localhost:5433/bookverse_ai_test?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai_test"
$env:BOOKVERSE_LLM_PROVIDER="local"
$env:BOOKVERSE_CHAT_MOCK_ENABLED="false"
npm test
npm run test:assistant-integration
```

Sau khi chạy `npm run build` và mở bản production ở cổng riêng, đặt `ASSISTANT_API_URL` rồi chạy `npm run test:assistant-api`. Script chỉ cho phép cleanup trên đúng `bookverse_ai_test`. Kết quả và tình huống lỗi đã kiểm tra nằm tại `docs/CHECKPOINT_D_TEST_REPORT.md`.

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
- Marketplace public chỉ hiển thị listing `APPROVED` có `stock > 0`; seller/admin vẫn xem được listing `PENDING_REVIEW` trong khu vực quản lý.
- Demo Phase 4 giới hạn một seller mỗi checkout. Nếu cart có nhiều seller, UI báo lỗi và buyer cần xóa item khác seller.
- Seller mở chi tiết đơn qua `/orders/[id]` chỉ thấy item và doanh thu thuộc seller đó; buyer/admin/moderator thấy toàn bộ đơn.
- Order lưu snapshot địa chỉ bằng các field `shippingFullName`, `shippingPhone`, `shippingProvince`, `shippingDistrict`, `shippingWard`, `shippingAddressLine`, `shippingNote`.
- COD tạo order `PENDING`; `BANK_TRANSFER_DEMO` và `WALLET_DEMO` tạo order `PAID_DEMO`.
- `stock` là lượng còn có thể giữ cho checkout và luôn không âm. Khi đơn vị cuối được giữ, listing chuyển `SOLD` và `soldAt` được gắn; hủy hợp lệ mở lại listing và xóa `soldAt`.
- UI gửi `checkoutKey` ổn định theo giỏ; unique `(buyerId, checkoutKey)` bảo đảm retry chỉ trả lại order cũ và không trừ stock/ghi side effect lần nữa.
- Hủy đơn dùng conditional state update trong cùng transaction với hoàn kho, timeline, audit và notification nên retry/hủy đồng thời chỉ hoàn đúng một lần.

Quy tắc chatbot:

- User đã đăng nhập chỉ được tiếp tục session chatbot thuộc chính tài khoản đó.
- Khách ẩn danh không được tái sử dụng `sessionId` do client gửi; mỗi lượt sẽ tạo session ẩn danh mới.
- Feedback chatbot yêu cầu đăng nhập, chỉ ghi nhận assistant message thuộc session của user hiện tại và từ chối user message/cross-session.
- Production không dùng mock. Khi provider/vector không sẵn sàng, UI ghi rõ fallback từ catalog đã xác minh.

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

## Category hierarchy, canonical mapping và profile legacy

Dataset gốc có 43 category root và 2.157 category con. Lượt 1B giữ nguyên toàn bộ ID/tên/slug gốc, bổ sung `parentId`, `level`, `canonicalKey`, `canonicalName` và gom feature recommendation vào 27 nhóm canonical đã review.

Database demo lại có 24 Category legacy dùng cùng ID `C001–C024` nhưng khác nghĩa. Checkpoint A.1 vì vậy dùng hai profile độc lập:

- `ultra-2200`: mapping cũ, SHA-256 `dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527`.
- `legacy-demo-24`: mapping theo name/slug, fingerprint `23b01b3ef8d4b9293fbf4bc9e9d893880661e00ec834919a410ee30f348acea3`.

Auto detection chỉ thành công khi count, toàn bộ normalized name/slug, fingerprint và expected ID kiểm tra phụ cùng khớp. Không map Category theo ID đơn lẻ.

Phân tích và tạo lại mapping dẫn xuất, không sửa dataset gốc:

```powershell
npm run data:analyze-categories
```

Phân tích profile database ở chế độ chỉ đọc:

```powershell
npm run data:analyze-category-profile
```

Trước mọi migration/backfill, đặt URL của database test và allowlist trong đúng terminal đang chạy:

```powershell
$env:DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5433/bookverse_ai_test?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai_test"
```

Apply migration và chạy backfill theo thứ tự:

```powershell
npx prisma migrate deploy
npm run data:backfill-categories -- --dry-run
npm run data:backfill-categories -- --execute
npm run data:backfill-categories -- --execute
```

Lần execute thứ hai phải báo `changed: 0` và `unchanged: 2200`. Mỗi lần chạy tạo report mới trong `outputs/categories`; script dùng `flag: wx` nên không ghi đè report cũ.

Chạy integration verifier trên database test và một fixture legacy độc lập có database name `bookverse_ai` ở chế độ read-only. Không trỏ biến legacy vào demo hiện tại vì demo đã có bốn field hierarchy:

```powershell
$env:CATEGORY_LEGACY_DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/bookverse_ai?schema=public"
npm run test:category-integration
```

Verifier kiểm tra 2.200 Category, 43 root, 2.157 child, 27 canonical group, Book–Category, orphan/cycle/self-parent, thứ tự canonical → parent → category gốc và khả năng chạy với fixture schema legacy chưa có cột mới.

Integration riêng cho legacy tự tạo database tạm, từ chối ghi đè database có sẵn, test dry-run/execute/idempotency/tamper rồi drop đúng database do lượt test tạo:

```powershell
$env:CATEGORY_LEGACY_TEST_ADMIN_URL="postgresql://USER:PASSWORD@localhost:5433/postgres?schema=public"
$env:CATEGORY_LEGACY_TEST_ALLOW_CREATE="bookverse_ai_category_legacy_test"
npm run test:category-legacy
```

Xem bảng 24 mapping và lý do tại `docs/CATEGORY_LEGACY_COMPATIBILITY.md`; runbook migration/restore nằm tại `docs/DEPLOYMENT.md`.

Backup trước migration được giữ ngoài Git tại `backups/database`. Quy trình restore rehearsal dùng database tạm `bookverse_ai_restore_test`: tạo database tạm, chạy `pg_restore`, đối chiếu count/schema, sau đó chỉ drop đúng database tạm. Không restore đè hoặc chạy lại destructive migration/backfill trên `bookverse_ai` nếu chưa có phê duyệt và backup mới.

## Tồn kho và checkout an toàn — Checkpoint A

Migration `20260713161000_add_listing_stock_checkout_safety` thêm `Listing.stock`, `Listing.soldAt`, `Order.checkoutKey`, check constraint `stock >= 0`, index truy vấn marketplace và unique idempotency theo buyer. Migration additive, không xóa field hoặc dữ liệu cũ.

Đặt database test và allowlist trước khi chạy migration/backfill:

```powershell
$env:DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5433/bookverse_ai_test?schema=public"
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai_test,bookverse_ai_deploy_rehearsal"
npx prisma migrate deploy
npm run data:backfill-stock -- --dry-run
npm run data:backfill-stock -- --execute
npm run data:backfill-stock -- --execute
```

Lần execute thứ hai phải có `changed: 0`. Script chỉ đọc `data/json/bookverse_ultra_seed_2200.json`, fail-closed nếu target không phải test/rehearsal và tạo report mới trong `outputs/stock`.

Chạy integration thật trên PostgreSQL test:

```powershell
$env:STOCK_INTEGRATION_DATABASE="bookverse_ai_test"
npm run test:stock-integration
```

Test tự tạo fixture có prefix riêng, bao phủ tranh stock 1, retry cùng idempotency key, quantity lớn hơn 1, rollback nhiều item, self-purchase, listing không khả dụng, user bị khóa và hủy đồng thời; cleanup chỉ fixture của lượt test.

Checkpoint A.2 ngày 14/07/2026 đã thay rehearsal cũ bằng quy trình đầy đủ: database rỗng chạy 11 migration hai lần, full clone demo được audit/reconcile rồi chạy trọn `prisma migrate deploy`, Category/stock idempotency, catalog/filter/canonical/FastAPI/vector/marketplace/checkout smoke đều PASS. Rollback restore từ backup cũng khớp count và semantic schema checksum. Ba database tạm đã được drop sau khi lưu report.

Compose nguồn đã pin `pgvector/pgvector:0.8.5-pg16` và có `docker-compose.rehearsal.yml` tách project/volume/port. Baseline read-only ngày 16/07/2026 xác nhận container demo đang chạy đúng image này, có extension `vector`, 12 migration hoàn tất và 24/24 Category legacy đã có canonical mapping. Chi tiết hiện hành ở `docs/CURRENT_STATUS.md`.

Checkpoint D ngày 14/07/2026 đã thống nhất `/assistant` và chatbot nổi theo contract `d1`, thêm timeout/local fallback minh bạch, chặn mock production, chuẩn hóa session ownership/feedback ownership và safe error. Checkpoint này không sửa Prisma schema, migration, FastAPI hay database demo. Unit 63/63, integration database test, production API/UI smoke, build và database-unavailable smoke đều PASS; xem `docs/CHECKPOINT_D_TEST_REPORT.md`.

Checkpoint E ngày 14/07/2026 đã thêm temporal split, strong-positive policy, leakage assertion, bốn phương pháp so sánh, sáu metric, cohort cold-start và output tái lập. Python 17/17, parity production 30/30, toàn bộ regression Category/Assistant/Stock, build và Compose đều PASS. Production weight, API, schema, migration và database demo giữ nguyên.

Ba mapping MEDIUM (`C013`, `C023`, `C024`) đã được review bằng 15 Book metadata mỗi Category. Nội dung ủng hộ mapping hiện tại nhưng taxonomy đích chưa đủ chi tiết và tag synthetic bị nhiễu, nên mapping/profile/checksum được giữ nguyên với confidence MEDIUM. Bảng 45 mẫu nằm trong `docs/CATEGORY_LEGACY_COMPATIBILITY.md`.

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
21. Vào `/assistant`, hỏi gợi ý sách và kiểm tra provider/source hoặc nhãn fallback; mọi card phải mở `/book/{id}` thật. Đăng nhập để bấm đánh giá câu trả lời.

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
npm run test:assistant-integration
npm run test:category-integration
npm run test:stock-integration
npm run build
python -m compileall -q ai_service
docker compose config --quiet
```

Lệnh `data:import` phải dùng biến `DATABASE_URL` của `bookverse_ai_test`; không chạy import để kiểm thử trên database demo.

## Migration mới của Phase 2

- `20260710130000_phase2_profile_shipping`: thêm mục tiêu đọc trong `Profile`, model `ShippingAddress`, model `FavoriteBook` và các field snapshot địa chỉ trên `Order`.

## Phase 3 Seller Dashboard

- Phase 3 không đổi Prisma schema, nên không có migration mới.
- Code chính nằm ở `actions/seller.actions.ts`, `lib/seller-score.ts` và các route trong `app/seller`.
- Dữ liệu demo bổ sung bằng `upsert` trong `prisma/seed.ts`; import dataset lớn chỉ chạy khi có mode rõ ràng và database guard cho phép.

## Phase 4 Order/Checkout Hardening

- Checkpoint A có migration stock/order safety riêng; schema hiện có stock thật và idempotency key.
- Code chính nằm ở `actions/cart.actions.ts`, `actions/order.actions.ts`, `actions/seller.actions.ts`, `actions/dashboard.actions.ts`, `lib/checkout-service.ts`, `lib/order-cancellation-service.ts` và `lib/order-workflow.ts`.
- Seed demo có đủ order `PENDING`, `PAID`, `PAID_DEMO`, `SHIPPED`, `COMPLETED`, `CANCELLED` cho seller dashboard và admin workflow.

## Ghi chú dữ liệu

- Không xóa hoặc ghi đè file dữ liệu gốc trong `data/demo`.
- Ebook HTML/JSON và cover SVG đã được thêm vào `public/ebooks` và `public/covers` để reader/catalog dùng trực tiếp.
- Script `prisma/seed.ts` seed demo nhỏ và đặt mật khẩu `123456` cho user mẫu.
- Script import quy mô lớn mặc định fail-closed; chỉ `--execute --replace-existing` mới dọn dữ liệu và chỉ được phép trên database test nằm trong allowlist.
