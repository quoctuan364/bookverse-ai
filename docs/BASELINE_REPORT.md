# BookVerse AI Baseline Report

> **Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.** Xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md) trước khi dùng bất kỳ kết luận nào.

Ngày khảo sát: 11/07/2026  
Phạm vi: chỉ Phase 0, khảo sát và thiết lập baseline. Không migration, không seed/reset, không backfill, không thay đổi schema, nghiệp vụ, AI hoặc UI.

## 1. Thông tin môi trường

- Workspace đã xác nhận: **D:\Doantotnghiep**.
- Node.js project: Next.js 15.5.20 thực tế từ build; package khai báo Next.js 15, React 19, Prisma 6, NextAuth 5 beta.31 và TypeScript 5.7.
- Prisma Client thực tế: 6.19.3. TypeScript thực tế: 5.9.3.
- Python host: 3.14.6; pip 26.1.2.
- Có các thư mục chính: **app**, **actions**, **components**, **lib**, **prisma**, **scripts**, **data**, **ai_service**, **docs**.
- Có **package.json**, **package-lock.json**, **README.md**, **docker-compose.yml**, **Dockerfile**, **.env**, **.env.example**.
- Không có **compose.yml**, **.env.local** và **ai_service/.env.example**.
- Secret thật không được ghi vào báo cáo này.

## 2. Trạng thái Git

Ba lệnh chỉ đọc **git rev-parse --is-inside-work-tree**, **git status --short** và **git log -5 --oneline** đều trả về “not a git repository”.

Thư mục **.git** có tồn tại nhưng hoàn toàn trống: không có **HEAD**, **config**, **objects** hoặc metadata khác. Kết luận hiện tại: đây là placeholder trống, không phải repository Git hợp lệ. Chưa đủ căn cứ để khẳng định lịch sử Git cũ không cần phục hồi.

Không chạy **git init**, không sửa hoặc xóa **.git**, không commit.

## 3. Trạng thái dependency

- **package-lock.json** tồn tại; **npm ci** cài 448 package và hoàn tất.
- npm báo 2 lỗ hổng mức moderate. Không chạy tự động **npm audit fix --force** vì có thể gây breaking change.
- npm còn cảnh báo 7 dependency có install script chưa được duyệt. Prisma Client vẫn được sinh thành công bằng lệnh riêng và production build đã pass.
- Root **requirements.txt** là dependency cho ứng dụng Streamlit/ML legacy: Streamlit, pandas, numpy, scikit-learn, plotly, Pillow và requests. Các version chỉ dùng khoảng phiên bản, chưa khóa bản dựng tái lập.
- **ai_service/requirements.txt** tồn tại, gồm FastAPI, Uvicorn, SQLAlchemy, psycopg2-binary, pandas và scikit-learn; không pin version và không có pytest.
- Python host chưa cài dependency AI; import dừng ngay tại **fastapi**.
- Không tìm thấy test framework, test file, script **test**, cấu hình CI hoặc pytest.
- Không có script **lint** độc lập. Production build có bước lint/type validation của Next.js nhưng không thay thế test suite.
- Khuyến nghị ở Lượt 3: pin dependency, thêm pytest cho AI, thêm test runner cho Next.js và tách rõ dependency AI với Streamlit legacy. Chưa di chuyển file trong Phase 0.

## 4. Prisma và database target

- Prisma schema hợp lệ và Prisma Client sinh thành công.
- Prisma đang đọc **DATABASE_URL** từ **.env**; Docker Compose cấp biến riêng cho web và AI service.
- Target hiện tại đã che thông tin xác thực: **postgresql://***:***@localhost:5432/bookverse_ai**.
- Database cuối cùng là **bookverse_ai**, tức database demo. Phase 0 chỉ thực hiện truy vấn đọc và validate/generate client.
- Không chạy migrate, reset, db push, seed, import, backfill hoặc integration test.
- Snapshot chỉ đọc:

| Đối tượng | Số lượng/kết quả |
|---|---:|
| Book | 1.200 |
| User | 300 |
| Listing | 1.200 |
| Listing APPROVED | 1.037 |
| Listing PENDING_REVIEW | 123 |
| Listing REJECTED | 40 |
| Listing SOLD | 0 |
| Listing có purchases > 0 | 1.198 |
| Order | 1.500 |
| Cart-as-order | 229 |
| Review | 3.500 |
| Review trùng userId + bookId | 27 dòng trùng |
| InteractionEvent | 18.008 |
| Recommendation | 3.000 |

- Chưa xác minh có PostgreSQL backup đầy đủ. Các file trong **data/backups** là backup CSV; **outputs/import_backups** chỉ chứa báo cáo/tóm tắt import, không phải database dump.
- Restore chưa được thử và không được phép thử trên database demo.
- Guard bắt buộc trước mọi thao tác destructive: parse URL để lấy đúng database name, chỉ cho phép tên nằm trong **ALLOWED_DESTRUCTIVE_DATABASES=bookverse_ai_test**, từ chối mặc định và không log password. Không chỉ tìm chuỗi “test”.

## 5. Các script có nguy cơ phá dữ liệu

| Vị trí | Hành vi | Phân loại | Kết luận |
|---|---|---|---|
| **scripts/import_seed_1200.ts:597-625** | Xóa dữ liệu gần như toàn bộ bảng bằng chuỗi deleteMany | DESTRUCTIVE_DATABASE | Chỉ được chạy trên bookverse_ai_test sau Checkpoint C |
| **scripts/import_seed_1200.ts:1454-1490** | main luôn gọi clearCurrentData trước import | DESTRUCTIVE_DATABASE | Không có dry-run, guard DB hoặc transaction toàn import |
| **package.json:14-15** | seed:1200 và seed:2200 gọi trực tiếp script destructive | REQUIRES_REVIEW | Có thể trỏ nhầm bookverse_ai qua môi trường hiện tại |
| **scripts/import_seed_1200.ts:572-594** | Tạo file JSON tóm tắt vào outputs/import_backups | SAFE_WRITE_DERIVED_FILE | Không phải backup có thể restore |
| **prisma/seed.ts** | Ghi DB bằng upsert | REQUIRES_REVIEW | Không xóa hàng loạt nhưng vẫn cấm chạy trên demo trong Phase 0 |
| **scripts/refresh_real_book_data.py** | Backup CSV rồi ghi đè các CSV hiện hành | DESTRUCTIVE_FILESYSTEM / REQUIRES_REVIEW | Backup-protected nhưng vẫn thay đổi file dữ liệu gốc |
| **scripts/fetch_vn_books.py** | Có thể tạo backup ban đầu rồi ghi đè output CSV | REQUIRES_REVIEW | Chỉ chạy sau khi xác nhận input/output |
| **src/sample_data.py** | Sinh dữ liệu legacy; mặc định không overwrite | TEST_ONLY / SAFE_WRITE_DERIVED_FILE | Không dùng làm nguồn dữ liệu production |
| Các delete trong cart/address/library/reader | Xóa bản ghi thuộc thao tác người dùng đã scope | REQUIRES_REVIEW | Không phải script reset; vẫn cần test authorization |

Không script nguy hiểm nào được chạy trong Phase 0.

## 6. Bản đồ cart-as-order

Sơ đồ hiện trạng:

    Listing(APPROVED)
      -> Order(PENDING, paymentMethod = null)
      -> OrderItem
      -> Checkout trong transaction
      -> COD: PENDING; demo payment: PAID_DEMO
      -> Timeline + Notification + Audit + PURCHASE event
      -> Buyer/Admin/Seller order view

- **Order** và **OrderItem** nằm trong **prisma/schema.prisma**. Không có Cart/CartItem và sẽ tiếp tục giữ cart-as-order.
- **actions/marketplace.actions.ts** chỉ cho thêm listing APPROVED, chặn self-purchase, gom item vào một cart PENDING/paymentMethod null và chặn nhiều seller trong cùng cart.
- Item trùng listing được tăng quantity. Model Listing chưa có **stock** hoặc **soldAt**; UI/action chỉ chặn quantity ở mức 1–9, không dựa trên tồn kho.
- **actions/cart.actions.ts** tính lại tổng, kiểm tra listing/status/seller/self-purchase khi checkout và cập nhật order, timeline, notification, audit trong transaction.
- Checkout đang tăng **Listing.purchases** nhưng không giảm stock hoặc chuyển SOLD.
- PURCHASE interaction được ghi ngay cả khi COD vẫn ở trạng thái PENDING. Điều này có thể làm recommendation hiểu cart/đơn chưa thanh toán là giao dịch hoàn tất.
- Buyer chỉ hủy order PENDING đã checkout; seller và admin/moderator cập nhật qua helper **lib/order-workflow.ts**.
- Seller query order qua OrderItem có Listing.sellerId của chính seller; order nhiều seller bị chặn cập nhật trạng thái. Buyer và admin có scope riêng.
- State helper hiện thực các transition đã chốt cho PENDING, PAID, PAID_DEMO, SHIPPED, COMPLETED và CANCELLED. Enum schema vẫn có REFUNDED từ trước, nhưng helper không cho chuyển tới trạng thái này.

Rủi ro chính: oversell đồng thời; quantity vượt tồn; PURCHASE ghi quá sớm; không có hoàn stock; dữ liệu seed có purchases nhưng không SOLD; listing có thể đổi trạng thái giữa lúc xem và checkout. Kiểm tra isLocked/self-purchase/seller/status đã có, nhưng chưa thay thế được conditional stock update.

## 7. Bản đồ review

- Model **Review** có userId, bookId, rating, reviewText và hai index đơn; chưa có unique userId + bookId.
- **actions/book-detail.actions.ts:createBookReview** lấy user hiện hành từ server, không nhận userId từ client, kiểm tra sách, rồi findFirst và update/create.
- Không có kiểm tra user đã mua sách. Chưa giới hạn order hợp lệ ở PAID, PAID_DEMO, SHIPPED, COMPLETED.
- Không có action xóa review riêng; action tạo đang đóng vai trò create-or-update.
- Vì thiếu unique constraint, hai request đồng thời có thể tạo trùng. DB hiện đã có 27 dòng trùng userId + bookId, nên migration unique sẽ fail nếu chưa lập rule deduplicate trên bookverse_ai_test.
- Quyết định mục tiêu vẫn là **@@unique([userId, bookId])**, không liên kết Review với OrderItem. Nếu bật verified purchase, phải query server-side theo buyerId, bookId và bốn trạng thái hợp lệ.

## 8. Dataset và import

File **data/json/bookverse_ultra_seed_2200.json** khoảng 21,2 MB, có 2.200 book, category, author, user, profile và listing; 2.600 order; 4.708 order item; 18.000 interaction; 4.200 daily recommendation; 8.400 evidence.

Kết quả kiểm tra schema và thống kê:

- Book thực tế dùng **published_year** và **rating_avg**.
- Interface/script lại đọc **publication_year** và **rating_average** tại **scripts/import_seed_1200.ts:49,56,793,795**. Hậu quả là publishYear/rating bị rơi về null hoặc sai mà không báo lỗi.
- Dataset listing có **stock** và **purchase_count**; script không đưa stock vào model vì schema chưa có field.
- Dataset có parent_id và level: 43 category gốc, 2.157 category con; không có parent reference hỏng trong kiểm tra sơ bộ.
- 2.200 category là duy nhất; 844 category không có sách, 770 category chỉ có một sách, 586 category có trên một sách; tối đa 8 sách/category.
- 2.200 title là duy nhất nhưng toàn bộ 2.200 description chỉ có một nội dung duy nhất, cho thấy mô tả synthetic và không đủ tốt cho semantic embedding/evaluation.
- Listing dataset: 1.636 APPROVED, 564 PENDING; 2.199 có purchase_count > 0; không có stock 0, 8 listing stock 1, 2.192 listing stock > 1.
- Import có deleteMany trước khi ghi; không transaction bao toàn bộ clear + import; không runtime schema validation; không dry-run; chỉ có summary trước import, không phải validation report có thể chặn thao tác.

Kết luận: chưa được chạy import. Cần Checkpoint B và C cho hierarchy, mapping, validation, dry-run, guard và import report.

Temporal audit sơ bộ:

- Dữ liệu không có timestamp sau ngày khảo sát 11/07/2026.
- Có nhiều timestamp trùng: interaction 977, recommendation 4.169, order 2.339, review 3.379, reading session 6.019 và chatbot message 7.109.
- 1.945/2.400 chatbot session có thứ tự timestamp message không đơn điệu theo ID.
- Trong 4.200 daily recommendation của seed: chỉ 9 cặp user-book có positive interaction trước recommendation, không có positive interaction sau recommendation, 4.191 recommendation không có positive tương ứng.
- Interaction type giữa seed/code/evaluator không thống nhất: READ_PAGE so với READ, ADD_TO_CART so với CART_ADD, VIEW_BOOK so với VIEW.

Kết luận temporal: **NOT_VALID_WITHOUT_REGENERATION**. Không công bố metric AI mới từ seed hiện tại.

## 9. Recommendation và AI

- Next.js gọi FastAPI **GET /recommend/{user_id}** tại **actions/recommendation.actions.ts**, timeout 4 giây, kiểm tra book có thật trong DB rồi lưu Recommendation và RecommendationEvidence.
- Nếu FastAPI lỗi hoặc trả rỗng, action trả sách mới từ DB. Đây là fallback thật về record nhưng không còn cá nhân hóa.
- FastAPI **ai_service/main.py** chấm hybrid theo category, author, purchase và popularity. Query purchase/popularity hiện lấy OrderItem mà không lọc trạng thái order, nên cart, cancelled hoặc refunded có thể làm lệch score.
- Endpoint FastAPI nhận user_id từ URL và service đang public cổng 8000, chưa có service authentication.
- Embedding dùng OpenAI hoặc Gemini trong **lib/book-embeddings.ts**, lưu vào bảng **book_embeddings** qua pgvector. Script generation ghi DB và cần API key nên chưa chạy.
- **ai_service/evaluate.py** chỉ tính Precision/HitRate kiểu giao nhau, dùng mọi positive không split theo thời gian, không có baseline, Recall, NDCG, Coverage hoặc artifact tái lập.
- Recommendation seed không phải ground truth hợp lệ; dữ liệu temporal không đủ để đánh giá offline đúng.

## 10. Assistant và chatbot

- Trang **/assistant** gọi **actions/assistant.actions.ts**, tìm Book bằng contains trên title/author/category/tag và trả tối đa 6 sách kèm lý do rule-based. Đây không phải LLM/RAG.
- **FloatingChatbot** gọi **POST /api/chat**. Route này chạy RAG trong Next.js bằng pgvector, fallback keyword, rồi gọi OpenAI/Gemini hoặc trả mock.
- Authenticated session lấy identity từ server. Requested session chỉ được dùng khi thuộc current user; anonymous request không được tin session client. Feedback yêu cầu login, kiểm tra session/message ownership và isLocked.
- Book context được lấy từ DB; ID context không do model tự bịa. Tuy nhiên text LLM/mock vẫn có thể diễn đạt không chính xác.
- Response contract của /assistant và /api/chat khác nhau; error/loading/UI cũng khác.
- FastAPI hiện chỉ phụ trách recommendation, chưa phụ trách chatbot. Không có lý do bắt buộc chuyển RAG khỏi Next.js ở Phase 0.
- Production hiện hiển thị dòng “Mock API, sẵn sàng nối dữ liệu hội thoại”; fallback mock có thể bị hiểu là AI thật.

Contract thống nhất đề xuất ở Checkpoint D phải có: success, answer, books đã validate, source/provider, mocked/degraded, sessionId, assistantMessageId và error code an toàn; auth/ownership tiếp tục do server quyết định.

## 11. Docker

- Services: **db** (cổng 5432, volume pgdata), **web** (3000) và **ai_service** (8000).
- **docker compose config** pass.
- Ba container đang chạy. Có configuration drift: container DB hiện hành báo image **postgres:16-alpine**, trong khi file Compose hiện tại khai báo **pgvector/pgvector:pg16**.
- depends_on chỉ chờ service_started; không có healthcheck/readiness.
- Không có startup migration hoặc seed command trong Compose; web chạy Next start, AI chạy Uvicorn. Đây là điểm an toàn cho dữ liệu nhưng schema readiness chưa được đảm bảo.
- Compose/Dockerfile chứa credential/secret development hard-code. Giá trị không được ghi trong tài liệu; phải chuyển sang environment/secret injection trước production.
- Database và AI service publish port ra host. FastAPI CORS hiện quá rộng và có thể trả chi tiết lỗi SQL/raw exception.
- Không chạy compose up/down/recreate trong Phase 0; tránh làm thay đổi container/volume đang hoạt động.

## 12. UI hiện tại

Inventory có Layout/Header/Navigation, form controls, card, BookCard, listing/order view, badge/table, pagination, loading/skeleton hạn chế, reader controls, chatbot, seller và admin. Không có bộ shared state hoàn chỉnh cho Empty/Error/ServiceUnavailable.

Kết quả kiểm tra code và trình duyệt ở 1280x720:

- Catalog tải 1.200 book; marketplace hiển thị 1.037 listing APPROVED, chứng minh DB đang đọc được.
- Catalog/marketplace/assistant có tràn ngang nhẹ khoảng 10 px.
- Có khoảng 726 lần hard-code màu hex và ít abstraction token, làm giao diện khó đồng nhất.
- Marketplace công khai AI Score được dựng bởi **buildMockSellerAiScore** và ghi rõ giao dịch giả lập.
- **BookCard.buildMockEvidence** tự dựng “Vì sao” khi không có evidence thật; trang chủ có thể hiển thị lý do giả trên sách fallback.
- FloatingChatbot công khai nhãn Mock API.
- Reader chỉ tìm HTML trong **public/ebooks/html**; khi thiếu/lỗi dùng **buildDemoPages** hoặc metadata lặp, không đọc JSON ebook.
- Catalog/marketplace bắt lỗi DB và trả mảng rỗng, khiến UI khó phân biệt “không có dữ liệu” với “service lỗi”.
- Loading chỉ có ở một số route; không thấy error.tsx/global-error.tsx/shared Error state. Empty state phân tán và không thể hiện service degraded.
- Số aria-label thấp so với lượng button; cần audit riêng icon-only control và form label.
- Trang Reader là client component lớn; cần tách phần fetch/server khi sửa ở Lượt 4, không thay trong Phase 0.

Thứ tự UI cần bảo vệ: Catalog, Book detail, Marketplace, Cart/Checkout, Orders, Reader, Assistant/Chatbot, Seller Center, Admin Center, Auth/Profile.

## 13. Kết quả baseline commands

| Lệnh | Trạng thái | Ghi chú |
|---|---|---|
| npm ci | PASS | 448 package; cảnh báo 2 moderate và 7 install script chờ duyệt |
| npx prisma validate | PASS | Schema hợp lệ; cảnh báo package.json#prisma deprecated cho Prisma 7 |
| npx prisma generate | PASS | Sinh Prisma Client 6.19.3 |
| npm run typecheck | PASS | tsc --noEmit, mã thoát 0 |
| npm run build | PASS | Next.js 15.5.20 production build thành công |
| python --version | PASS | Python 3.14.6 |
| python -m pip --version | PASS | pip 26.1.2 |
| docker compose config | PASS | Cấu hình parse thành công |
| Python AI import smoke check | BLOCKED_BY_ENVIRONMENT | Host chưa cài fastapi và dependency AI |
| docker compose ps | PASS | Ba service đang chạy; phát hiện DB image drift |
| Automated test suite | NOT_RUN | Repository chưa có test script/framework phù hợp |

## 14. Rủi ro

| Mức | Rủi ro đã xác nhận | Bằng chứng/tác động |
|---|---|---|
| P0 | Import có thể xóa database demo | npm seed alias gọi script deleteMany, không guard |
| P0 | Oversell và sai tồn kho | Listing không có stock; checkout không conditional decrement |
| P0 | Mapping dataset làm mất dữ liệu | published_year/rating_avg khác field script |
| P0 | Review trùng và migration unique sẽ fail | 27 dòng trùng user-book trong DB |
| P0 | AI metric không hợp lệ | Không có post-recommendation ground truth; temporal seed synthetic |
| P1 | PURCHASE ghi cho COD PENDING | Recommendation có thể học từ đơn chưa hoàn tất |
| P1 | Production mock bị trình bày như AI | Seller score, evidence, chatbot và reader demo |
| P1 | Recommendation đọc mọi OrderItem | Cart/cancel/refund có thể ảnh hưởng score |
| P1 | Service/API hardening thiếu | AI port public, CORS rộng, raw error, hard-code secret |
| P1 | Không có automated tests/CI | Không có regression gate cho checkout, auth, AI |
| P2 | UI không phân biệt empty với outage | Action nuốt lỗi và trả mảng rỗng |
| P2 | Git không hợp lệ | Không có lịch sử/rollback source-level đáng tin cậy |

## 15. Các phần bị blocked

- Git recovery/khởi tạo mới bị chặn cho đến khi người dùng xác nhận không cần phục hồi lịch sử.
- Chạy trực tiếp AI service trên Python host bị chặn do dependency chưa cài; container AI vẫn đang chạy.
- Migration rehearsal, import thử, restore test, integration test và concurrency test bị chặn đúng chủ đích vì chưa có database **bookverse_ai_test** đã xác minh và chưa duyệt checkpoint.
- Unique Review chưa thể migrate an toàn vì dữ liệu đang có duplicate và chưa duyệt rule deduplicate.
- Temporal evaluation bị chặn bởi chất lượng/tính nhân quả của seed; cần regenerate/split theo thời gian trước khi công bố metric.
- Không có automated test suite để chạy; đây là thiếu hụt repository, không được báo là PASS.
