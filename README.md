# BookVerse AI — Đồ án tốt nghiệp

Nền tảng khám phá sách, đọc Ebook, hội viên, chợ sách và trợ lý AI. Hệ thống chính dùng **Next.js + TypeScript + PostgreSQL/Prisma + FastAPI**; ứng dụng mobile dùng **React Native/Expo**.

- [Báo cáo đồ án Word](Do_An_Tot_Nghiep_BookVerse_AI_Luong_Nguyen_Quoc_Tuan_22050098_Hoan_Chinh_Theo_File_Mau.docx)
- [Hướng dẫn cài đặt trên máy sạch](docs/INSTALL_CLEAN_MACHINE.md)
- [Kiến trúc hệ thống](docs/DEFENSE_ARCHITECTURE.md)
- [Kịch bản demo bảo vệ](docs/DEMO_DEFENSE_SCRIPT.md)
- [Phạm vi và lưu ý bản GitHub](docs/BAN_DANG_GITHUB.md)

## Chạy demo trên Windows

Cần Node.js 20+, PowerShell 7 và Docker Desktop đang chạy. Trong PowerShell:

```powershell
git clone https://github.com/quoctuan364/bookverse-ai.git
cd bookverse-ai
npm run demo:bootstrap
npm run demo:start
```

Web mặc định ở `http://127.0.0.1:3000`. Xem hướng dẫn máy sạch nếu cần cấu hình cổng hoặc khắc phục lỗi. Python dependencies của dịch vụ AI ở `ai_service/requirements.txt`; demo dùng Docker để dựng dịch vụ. Hướng dẫn mobile nằm ở [mobile/README.md](mobile/README.md). `app.py` và `src/` là prototype Streamlit lịch sử.

## Phạm vi demo và kiểm chứng

Thanh toán là Sandbox, không phải giao dịch tiền thật. Dữ liệu synthetic/demo không đại diện hành vi người dùng thật; nội dung đọc minh họa không phải toàn văn sách gốc. Chưa có bằng chứng Hybrid vượt baseline hay UAT người dùng thật đầy đủ.

Ngày 08/09/2026, `npm run test:unit` chạy trên workspace nguồn đạt **272/272**, không có test lỗi hoặc bị bỏ qua. Lần đăng này chưa chạy lại production build, E2E hoặc Python integration. Các kết quả khác trong tài liệu có thể là snapshot lịch sử.

## Tài liệu chức năng chi tiết

## Trải nghiệm giao diện thích ứng

BookVerse dùng một hệ điều hướng thống nhất cho toàn bộ website:

- Desktop có thanh điều hướng chính luôn hiển thị và đánh dấu route hiện tại.
- Mobile có bottom navigation năm mục, icon Lucide kèm nhãn, vùng chạm tối
  thiểu 44px và safe-area cho thiết bị có thanh gesture.
- Các luồng cần tập trung như đăng nhập, trình đọc, Admin và thanh toán tự ẩn
  bottom navigation để không che biểu mẫu hoặc nội dung.
- Chatbot nổi tự dịch lên trên bottom navigation trên màn hình nhỏ.
- Route loading dùng skeleton giữ kích thước card, tránh màn hình trắng và giảm
  layout shift.
- Catalog có sáu chế độ sắp xếp, chip bộ lọc xóa riêng, empty state có hướng
  phục hồi và URL giữ nguyên trạng thái để chia sẻ hoặc quay lại.

## Tìm kiếm thông minh và Recommendation V2

Catalog xếp hạng kết quả tại tầng ứng dụng theo tiêu đề, tác giả, ISBN, thể
loại, nhà xuất bản và mô tả. Bộ tìm kiếm hỗ trợ tiếng Việt không dấu, ISBN bỏ
dấu phân cách và lỗi gõ nhẹ ở từ đủ dài. Cách làm này chạy nhất quán trên
PostgreSQL local/test mà không bắt buộc extension `unaccent`, đồng thời không
sửa metadata nguồn.

Recommendation giữ thứ tự liên quan từ FastAPI nhưng áp dụng diversity policy
trước khi hiển thị: tối đa hai sách cùng thể loại và một sách cùng tác giả ở
lượt chọn đầu. Nếu catalog không đủ đa dạng, hệ thống bù lại theo thứ tự liên
quan gốc để không trả thiếu kết quả. Hybrid V2 vẫn giữ phạm vi catalog synthetic
đã khóa benchmark; catalog tuyển chọn chưa có interaction/provenance thật nên
chỉ dùng fallback trung tính, không được giả thành cá nhân hóa. Có thể kiểm tra
riêng hai chính sách bằng:

```powershell
npx tsx --test tests/catalog-search.test.ts tests/recommendation-diversity.test.ts
python -m pytest ai_service/tests/test_catalog_scope.py
```

## Trợ lý hiểu nghiệp vụ nhà sách

Chatbot dùng RAG thay vì fine-tune trực tiếp trên dữ liệu nhạy cảm. Mỗi câu hỏi
được phân loại thành một trong các nhóm: hội viên, đọc sách, đơn hàng, chợ sách,
tài khoản, AI, chính sách, catalog hoặc tìm sách.

Luồng trả lời:

1. Phân loại ý định bằng chính sách deterministic đã kiểm thử.
2. Truy xuất bài tri thức BookVerse liên quan.
3. Chỉ truy xuất catalog khi câu hỏi thật sự cần gợi ý sách.
4. Lấy số liệu nhà sách hiện tại trực tiếp từ database.
5. Nếu đã đăng nhập, chỉ lấy trạng thái hội viên, giỏ, đơn và tiến độ thuộc
   chính tài khoản đó.
6. Gửi toàn bộ ngữ cảnh đã xác minh cho OpenAI/Gemini; nếu provider lỗi thì dùng
   fallback nội bộ, không dựng phản hồi AI giả.

Kho tri thức nằm tại `lib/assistant-knowledge.ts`. Khi thay đổi nghiệp vụ, cần cập
nhật bài tri thức và unit test tương ứng. Chatbot không tự tạo mã sách, giá,
đường dẫn, trạng thái đơn hoặc quyền hội viên. Khi đăng nhập, trang `/assistant`
hiển thị tối đa tám cuộc trò chuyện gần đây của chính tài khoản và cho phép tiếp
tục đúng phiên; người dùng khác và khách ẩn danh không đọc được lịch sử này.

## Kiểm tra trước khi demo

Chạy lệnh chỉ đọc dưới đây trước buổi bảo vệ:

```powershell
npm run demo:defense
```

Lệnh kiểm tra các route/tài liệu bắt buộc, sau đó chạy `demo:check` để đối chiếu
sách hoạt động, sách có nội dung đọc, gói hội viên, tài khoản quản trị/độc giả,
thuê bao còn hạn, tiến độ, bookmark, highlight và tin bán.
`FAIL` là dữ liệu bắt buộc còn thiếu; `WARN` là dữ liệu nên chuẩn bị để phần demo
thuyết phục hơn. Script không tạo, xóa hoặc cập nhật bản ghi.

Kịch bản thuyết trình 8–10 phút và phương án dự phòng nằm tại
[`docs/DEMO_DEFENSE_SCRIPT.md`](docs/DEMO_DEFENSE_SCRIPT.md).
Sơ đồ kiến trúc, ERD, Use Case, sequence và ma trận phân quyền nằm tại
[`docs/DEFENSE_ARCHITECTURE.md`](docs/DEFENSE_ARCHITECTURE.md).

Sau khi cài browser cho Playwright, chạy smoke E2E không tạo đơn/payment:

```powershell
npx playwright install chromium
npm run test:e2e:smoke
npm run test:e2e:isolated
```

Để lấy bằng chứng hiệu năng trên bản production demo, mở hai terminal sau khi đã
chạy `npm run demo:bootstrap`:

```powershell
# Terminal 1
npm run build
npm run demo:start:production

# Terminal 2
$env:PERF_BASE_URL="http://127.0.0.1:3300"
npm run performance:smoke
```

Bài đo mặc định gửi 30 request cho mỗi đường dẫn `/`, `/catalog` và
`/api/marketplace` với concurrency 5. Quality gate yêu cầu p95 không quá 3 giây
và tỷ lệ lỗi không quá 2%. Artifact JSON mới được lưu trong
`outputs/performance/`; đây là smoke load test phục vụ demo, không phải benchmark
quy mô production.

Kịch bản demo đề xuất:

1. Mở trang chủ và vào kho `/read`.
2. Dùng tài khoản thường để đọc thử một cuốn sách.
3. Chọn gói tại `/membership`, đi qua cổng Sandbox và mô phỏng thanh toán thành công.
4. Tạo bookmark/highlight, sau đó mở `/library`.
5. Trình diễn `/reading/insights`, `/reading/calendar` và `/reading/goals`.
6. Đăng nhập quản trị để mở `/admin/analytics`, `/admin/membership-plans` và
   `/admin/subscriptions`.

## Hội viên và đọc Ebook

BookVerse hỗ trợ kho đọc chung cho toàn bộ đầu sách đang hoạt động:

- Người dùng đã mua riêng Ebook được giữ quyền đọc cuốn đó.
- Chỉ cần một kỳ hội viên còn hạn để đọc toàn bộ kho, kể cả sách được bổ sung
  sau ngày đăng ký.

Toàn bộ catalog local có nội dung BookVerse V2 gồm 8 chương × 4 trang. Nội dung
được sinh deterministic theo tiêu đề, tác giả và thể loại; Reader chỉ ưu tiên V2
khi một cuốn đủ trọn bộ 32 trang. Script chỉ thêm chunk mới, không xóa hoặc ghi
đè nội dung cũ:

```powershell
# Kiểm tra sách còn thiếu nội dung V2
npm run content:all:audit

# Chỉ thực thi sau khi kiểm tra đúng tên database được in ở dry-run
npx tsx scripts/ensure_all_book_content.ts --execute --confirm-database=bookverse_ai
```

Catalog hiện có nhiều đầu sách hiện đại chỉ mang metadata tham khảo nên không tự
tải toàn văn từ Internet. Khi bổ sung Ebook ngoài, chỉ ingest bản public domain
hoặc open-license có nguồn rõ; bản dịch cũng phải là bản mở. Project Gutenberg,
GITenberg và Standard Ebooks là các nguồn ứng viên, nhưng phải đối chiếu đúng
đầu sách trước khi import.

Người chưa có quyền chỉ nhận tối đa 10% nội dung từ server. Giao diện không tải
trước phần bị khóa. Thanh toán hội viên hỗ trợ `WALLET_DEMO` và
`BANK_TRANSFER_DEMO` để phục vụ demo đồ án, không phải giao dịch tiền thật.

Luồng thanh toán Sandbox:

1. Checkout tạo `MembershipPayment` ở trạng thái `PENDING`.
2. `/membership/payment/[paymentId]` mô phỏng phản hồi thành công hoặc thất bại.
3. Thành công chuyển giao dịch sang `PAID_DEMO`, tạo subscription và thông báo.
4. Thất bại chuyển sang `FAILED`, không cấp quyền đọc.
5. `transactionRef` duy nhất giúp gửi lại cùng yêu cầu mà không tạo giao dịch trùng.
6. Admin có thể hoàn giao dịch `PAID_DEMO` tại `/admin/subscriptions`; hệ thống
   chuyển payment sang `REFUNDED`, hủy kỳ liên quan, gửi thông báo và ghi audit.

Các route chính:

- `/read`: kho đọc trực tuyến, hỗ trợ tìm theo sách/tác giả, lọc thể loại và
  phân trang.
- `/read/[bookId]`: trình đọc thử hoặc đọc toàn bộ tùy quyền hội viên.
- `/membership`: chọn gói hội viên.
- `/membership/checkout`: chọn phương thức thanh toán Sandbox.
- `/membership/payment/[paymentId]`: mô phỏng cổng ví/chuyển khoản.
- `/membership/benefits`: giải thích quyền lợi và cách mở khóa nội dung.
- `/membership/books`: danh sách toàn bộ sách thuộc kho hội viên.

## Thống kê đọc, lịch hoạt động, mục tiêu và khám phá

BookVerse bổ sung ba luồng dùng trực tiếp dữ liệu hiện có, không tạo metric giả:

- `/reading/insights`: tổng phút đọc, số phiên, sách bắt đầu/hoàn thành, streak
  hiện tại và dài nhất, biểu đồ 7 ngày, tiến độ mục tiêu tuần, chủ đề đọc nhiều
  và danh sách đọc tiếp.
- `/reading/challenges`: tám huy hiệu có điều kiện rõ ràng theo số sách, streak,
  bookmark, highlight và tổng thời gian đọc. Ngày trùng không làm tăng streak;
  nếu hôm nay chưa đọc nhưng hôm qua có đọc thì chuỗi vẫn còn hiệu lực.
- `/reading/calendar`: heatmap hoạt động theo toàn bộ ngày trong năm, tổng thời
  gian, số phiên, số ngày hoạt động, ngày tốt nhất và thống kê 12 tháng.
- `/reading/goals`: đặt mục tiêu phút đọc mỗi tuần và số sách hoàn thành trong
  năm. Mục tiêu lưu riêng theo tài khoản trên trình duyệt; tiến độ lấy từ dữ liệu
  đọc thật và không sửa dữ liệu hồ sơ gốc.
- `/discover`: chọn tâm trạng `Tập trung`, `Thư giãn`, `Tìm cảm hứng` hoặc
  `Khám phá`, kết hợp độ dài, ngôn ngữ, giai đoạn xuất bản và thể loại để nhận
  tối đa 12 gợi ý từ metadata catalog.

Mục tiêu phút/ngày được lấy từ hồ sơ người dùng tại `/profile/settings`. Số liệu
insight chỉ tổng hợp `ReadingProgress` và `ReadingSession` của tài khoản đang
đăng nhập trong 90 ngày gần nhất; trang khám phá ghi rõ đây là lọc metadata,
không tuyên bố là hành vi người dùng thật.

Luồng demo:

1. Chạy migration Prisma mới và khởi động ứng dụng theo hướng dẫn bên dưới.
2. Chạy `npm run membership:seed-demo` để tạo ba gói mẫu và mười lăm Ebook demo.
   Script có thể chạy lại an toàn, không tạo bản ghi trùng và không sửa file HTML nguồn.
3. Đăng nhập tài khoản `ADMIN`, mở `/admin/membership-plans` nếu muốn chỉnh giá,
   thời hạn hoặc trạng thái mở bán. Không cần gắn từng sách vào từng gói.
4. Đăng nhập tài khoản độc giả, mở `/membership`, chọn gói và xác nhận tại
   `/membership/checkout`. Mỗi yêu cầu có mã chống gửi trùng.
5. Mở `/read` hoặc `/membership/books` để chọn sách, `/profile/membership` để xem thời hạn
   hoặc `/profile/membership/payments` để xem toàn bộ giao dịch.

Quyền hội viên được kiểm tra tại server theo trạng thái và thời hạn subscription.
Trường `isActive` của gói chỉ điều khiển việc mở bán; tắt gói không tước thời hạn
đã thanh toán. Bảng `subscription_book_accesses` của checkpoint cũ vẫn được giữ
để tương thích dữ liệu, nhưng không còn dùng để giới hạn quyền theo từng cuốn.

Các trang quản trị và hỗ trợ:

- `/admin/analytics`: doanh thu hội viên/chợ sách 30 ngày, kho đọc, người dùng
  và tỷ lệ phản hồi chatbot.
- `/admin/membership-plans`: tạo, sửa và bật/tắt gói; kho sách được áp dụng tự động.
- `/admin/subscriptions`: tìm thuê bao, xem doanh thu demo, đổi trạng thái và tạo
  thông báo sắp hết hạn; giao dịch `PAID_DEMO` có thể được hoàn với lý do bắt buộc.
- `/admin/integrations`: kiểm tra mức sẵn sàng của PostgreSQL,
  email đặt lại mật khẩu, LLM, AI Service và domain HTTPS mà không lộ secret.
- `/membership/faq`: giải thích đọc thử, gia hạn, hủy và quyền Ebook mua riêng.
- `/orders`: danh sách, lọc trạng thái và phân trang đơn hàng của người mua.
- `/help`, `/privacy`, `/terms`, `/refund-policy`, `/copyright`: trợ giúp và
  chính sách chung của nền tảng.

BookVerse AI là đồ án tốt nghiệp xây dựng nền tảng sách điện tử thông minh. Hệ thống có kho sách, chợ sách cũ, giỏ hàng, cộng đồng, trình đọc online, hồ sơ người dùng, dashboard quản trị và gợi ý AI có giải thích.

> Trạng thái hiện hành: xem [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md). Các báo cáo checkpoint cũ chỉ là historical snapshot, không tự động chứng minh source hiện tại. AI metric offline còn thấp, dữ liệu chủ yếu là `SYNTHETIC_DATA`/`DEMO_DATA`, CTR production hiện `NOT_AVAILABLE` và chưa có UAT/SUS người dùng thật.

## Catalog tuyển chọn G2

Source hiện có pipeline riêng cho 3.046 bibliographic record tuyển chọn từ Open Library. Trên `bookverse_ai_test`, catalog này được tách khỏi ultra-2200 bằng bảng 1–1 `BookSourceMetadata`; Home có khu vực “Sách tuyển chọn”, Catalog có filter/phân trang 24 sách và Detail hiển thị metadata nguồn.

Trạng thái trung thực là `PARTIAL`: 3.044 record có work key hợp lệ, 2 record chỉ có edition key và 34 record thiếu language. 259 record là **ấn bản tiếng Việt**, không phải 259 tác giả Việt Nam. Strict audit HTTP mới kiểm tra 3.046/3.046 cover: 687 đạt host/content/dimension policy, 2.335 redirect cuối ngoài allowlist và 24 sai dimension; cover rights là `NOT_VERIFIED`, mọi giá là `SYNTHETIC_DEMO_PRICE`, không có review/order/interaction thật đi kèm và database demo chưa được import.

Tài liệu chi tiết: [`docs/REAL_CATALOG_REPORT.md`](docs/REAL_CATALOG_REPORT.md) và [`docs/REAL_CATALOG_CATEGORY_MAPPING.md`](docs/REAL_CATALOG_CATEGORY_MAPPING.md).

### Đồng bộ catalog thật sang gian hàng

Script dưới đây tạo seller hệ thống, `BookEdition.PAPER_NEW` và một listing chính thức cho
từng sách `RBxxxxx`. ID edition/listing cố định nên chạy lại không tạo trùng; script không
sửa listing do người dùng đăng.

Kiểm tra kế hoạch, chưa ghi database:

```powershell
npm run catalog:listings:sync -- --dry-run
```

Chạy thật sau khi thay tên database bằng đúng tên được dry-run báo:

```powershell
npm run catalog:listings:sync -- --execute --confirm-database=bookverse_ai_runtime_clone
```

Báo cáo mỗi lần chạy được tạo mới trong `outputs/catalog-listings/`. Catalog công khai và
marketplace chỉ hiển thị listing còn hàng, đã duyệt và liên kết với sách thật `RBxxxxx`.

### Phiên bản sách và quyền đọc Ebook

Migration `20260723150000_add_ebook_editions_and_entitlements` tách đầu sách khỏi phiên bản
kinh doanh:

- `BookEdition`: phân biệt sách giấy mới, sách giấy cũ và Ebook.
- `DigitalAsset`: lưu đường dẫn, hash file và số trang được đọc thử.
- `ReadingEntitlement`: quyền đọc toàn bộ theo cặp người dùng - đầu sách.
- `Listing` và `OrderItem`: có `editionId` để checkout biết chính xác sản phẩm đã mua là Ebook
  hay sách giấy.

Khi đơn chứa edition `EBOOK` chuyển sang `PAID`, `PAID_DEMO` (thanh toán thành công trong môi
trường đồ án) hoặc `COMPLETED`, hệ thống cấp entitlement bằng thao tác idempotent. Người chưa
có entitlement chỉ nhận tối đa `samplePages` và 10% nội dung từ Server Action. File trong
`/ebooks/*` bị chặn truy cập tĩnh; người đã mua mở file qua API có kiểm tra phiên đăng nhập và
entitlement.

Áp dụng migration:

```powershell
npx prisma migrate deploy
```

Lưu ý: chỉ đăng bán edition `EBOOK` khi đã có `DigitalAsset` hợp lệ và quyền phân phối nội
dung. Không tự gắn 2.200 file Ebook demo cũ vào catalog thật `RBxxxxx` vì tiêu đề không khớp.

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
- Trang chủ có kệ “Đọc tiếp”, lịch sử sách đã xem gần đây theo từng tài khoản và bảng “Xu hướng 7 ngày”. Xếp hạng xu hướng dùng tín hiệu `BOOK_VIEW`, đọc, bookmark, yêu thích, thêm giỏ, mua và review; tín hiệu mới có trọng số cao hơn và không dùng dữ liệu ngẫu nhiên.
- Luồng AI Discovery bắt đầu ngay tại hero trang chủ: người dùng mô tả nhu cầu bằng ngôn ngữ tự nhiên hoặc chọn prompt mẫu, `/assistant?q=...` tự chạy truy vấn và trả các thẻ sách có bìa, điểm phù hợp, nguồn retrieval cùng trạng thái provider/fallback minh bạch.
- Notification Center có filter tất cả/chưa đọc, thông báo listing, đơn hàng, cộng đồng, bảo mật và AI.
- Trang chủ, profile và recommendation API chỉ hiển thị claim cá nhân hóa khi evidence có provenance `REAL_USER_DATA` đầy đủ; audit hiện tại chưa có dòng nào được xác minh nên UI giữ trạng thái trung tính.
- Danh mục sách tìm kiếm sách theo tên, tác giả, mô tả, thể loại và thẻ.
- Trang chi tiết sách có tracking `VIEW`, đọc thử, yêu thích, thêm giỏ, mua demo qua checkout và viết review thật.
- Chợ sách cũ cho người bán đăng tin, quản trị viên duyệt/từ chối, người mua thêm giỏ hoặc mua ngay.
- Seller Dashboard tại `/seller` cho SELLER/ADMIN quản lý listing, tạo/sửa/ẩn/hiện listing, theo dõi đơn của chính mình, cập nhật trạng thái giao hàng hợp lệ, xem doanh thu và điểm chất lượng deterministic theo quy tắc.
- Giỏ hàng dùng bảng `Order PENDING` chưa có `paymentMethod`, hỗ trợ đổi số lượng, xóa sách, chọn địa chỉ giao hàng và tạo đơn thật có timeline.
- Checkout đã harden: giữ tồn kho bằng conditional update trong transaction, chống oversell/self-purchase/double submit và chỉ checkout một seller mỗi đơn.
- Trình đọc online tải Ebook qua tầng server có kiểm tra quyền, hỗ trợ đọc thử, lưu tiến độ, phiên đọc, bookmark và highlight theo `blockId`.
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
├─ data/real-catalog/   # Artifact catalog G2 đã lọc; không chứa audit/cache tải hàng loạt
├─ public/covers/       # Artwork fallback V2; bìa synthetic cũ chỉ giữ làm dữ liệu lịch sử
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

### Cách khuyến nghị: bootstrap demo một lệnh

Nếu cài trên máy mới, làm theo checklist có bước xác minh và xử lý lỗi tại
[`docs/INSTALL_CLEAN_MACHINE.md`](docs/INSTALL_CLEAN_MACHINE.md).

Yêu cầu Docker Desktop đang chạy, Node.js 20+ và PowerShell 7. Lệnh sau tạo
`.env.demo` mới nếu chưa có, khởi động PostgreSQL cô lập, chạy migration, seed
catalog, sinh nội dung đọc minh họa, tạo gói hội viên và kiểm tra readiness:

```powershell
npm run demo:bootstrap
```

Script không ghi đè `.env`, không sửa CSV/JSON/HTML nguồn và có thể chạy lại.
Nội dung đọc được sinh deterministic từ metadata, luôn gắn nhãn
`NỘI_DUNG_DEMO_BOOKVERSE`; đây không phải bản dịch hoặc nội dung nguyên tác.

Sau bootstrap, chạy AI service trong Docker và web ở chế độ phát triển:

```powershell
npm run demo:start
```

Môi trường demo dùng cổng riêng để không xung đột stack mặc định:
PostgreSQL `55432`, AI service `8800`, web `3000`. Lần đầu `demo:start` sẽ
build image AI; các lần sau có thể dùng `npm run demo:start -- -SkipAiBuild`.

### Cách thủ công

Sao chép cấu hình mẫu trước lần chạy đầu và thay toàn bộ giá trị `REPLACE_ME`,
`YOUR_USER`, `YOUR_PASSWORD`:

```powershell
Copy-Item .env.example .env
```

Cài dependency:

```powershell
npm install
```

Khởi động PostgreSQL local bằng Compose tách môi trường:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db
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

Seed dữ liệu demo:

```powershell
npx tsx prisma/seed.ts
```

Sinh nội dung đọc minh họa cho các sách chưa có nội dung:

```powershell
npm run content:demo:seed
npm run content:demo:seed -- --execute --confirm-database=bookverse_ai
```

Lập chỉ mục 1.200 file Ebook demo vào database để mọi sách có đọc thử:

```powershell
npm run ebooks:ingest:demo
npm run ebooks:ingest:demo -- --execute --confirm-database=bookverse_ai
```

Lệnh đầu là dry-run. Lệnh `--execute` tạo/cập nhật `BookEdition`, `DigitalAsset`
và `BookChunk` từ file HTML đã có; không xóa hoặc ghi đè file Ebook nguồn.

Với clean clone không có bộ HTML lớn, dùng `content:demo:seed` ở trên. Pipeline
membership hiện đọc `BookChunk` đã sinh và không còn phụ thuộc `public/ebooks/html`.

### Tài khoản kiểm thử (Demo Accounts)

Hệ thống cung cấp sẵn các tài khoản demo đã được seed mật khẩu mặc định `123456`:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn & Mô tả |
|---|---|---|---|
| **Độc giả (Buyer)** | `reader.bookverse.demo@gmail.com` | `123456` | Đọc sách online, đăng ký gói hội viên, bookmark/highlight, quản lý giỏ hàng và đơn hàng cá nhân. |
| **Người bán (Seller)** | `seller.bookverse.demo@gmail.com` | `123456` | Quản lý gian hàng, đăng tin sách cũ, cập nhật trạng thái đơn hàng và theo dõi doanh thu người bán. |
| **Quản trị viên (Admin)** | `admin.bookverse.demo@gmail.com` | `123456` | Toàn quyền quản trị: thêm/sửa/bật/tắt gói hội viên (`/admin/membership-plans`), tra cứu và cập nhật thuê bao (`/admin/subscriptions`), duyệt tin bán, xem audit logs. |
| **Kiểm duyệt viên (Moderator)** | `moderator.bookverse.demo@gmail.com` | `123456` | Kiểm duyệt nội dung bài đăng cộng đồng, báo cáo vi phạm và nội dung sách. |

### Hướng dẫn kiểm thử chức năng Đăng ký gói & Đọc sách Online:

1. **Khách chưa đăng nhập**:
   - Truy cập `/read` hoặc `/read/RB00001`.
   - Backend chỉ trả về tối đa 10% số phần nội dung (tối thiểu 1 phần cho sách ngắn).
   - Tại vị trí khóa hiển thị thông báo: *“Bạn đã đọc hết nội dung xem thử (10%). Hãy đăng ký gói để tiếp tục đọc.”* kèm nút *“Xem các gói đọc sách”*.
2. **Đăng nhập và đăng ký gói**:
   - Đăng nhập bằng tài khoản độc giả hoặc tài khoản mới tạo.
   - Truy cập `/membership` -> Chọn gói mong muốn -> Chuyển đến `/membership/checkout` -> Xác nhận phương thức Sandbox.
   - Trang `/membership/payment/[paymentId]` cho phép bấm **“Mô phỏng thành công”** (kích hoạt gói ngay lập tức) hoặc **“Mô phỏng thất bại”** (không kích hoạt gói).
3. **Đọc toàn bộ sách**:
   - Sau khi thanh toán thành công, mở lại `/read/[bookId]`, backend kiểm tra gói `ACTIVE` và trả toàn bộ 100% nội dung sách.
   - Vào `/profile/membership` để theo dõi trạng thái gói hiện tại, ngày bắt đầu và ngày hết hạn.
4. **Quản lý gói phía Quản trị viên**:
   - Đăng nhập bằng `admin.bookverse.demo@gmail.com`.
   - Vào `/admin/membership-plans` để tạo gói mới, chỉnh sửa thông tin gói, bật/tắt hiển thị gói hoặc xóa gói (tự động chuyển sang ẩn nếu đã có lịch sử đăng ký nhằm bảo vệ dữ liệu).
   - Vào `/admin/subscriptions` để xem danh sách thuê bao, đổi trạng thái và hoàn tiền mô phỏng.

Tạo ba gói hội viên và tài khoản hội viên demo còn hạn:

```powershell
npm run membership:seed-demo
npm run demo:check
```

`membership:seed-demo` có tính idempotent. Tài khoản
`reader.bookverse.demo@gmail.com / 123456` được chuẩn bị gói demo để trình diễn quyền đọc
toàn bộ; người chưa có gói vẫn chỉ nhận phần đọc thử do server giới hạn.

Nếu web chạy trong Docker:

```powershell
docker compose exec web npm run ebooks:ingest:demo -- --execute --confirm-database=bookverse_ai
docker compose exec web npm run membership:seed-demo
docker compose exec web npm run demo:check
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
npm run test:python:integration:evidence
npm run evaluation:ai
npm run evaluation:research
npm run evaluation:hybrid-audit
npm run data:recommendation-readiness
```

Mỗi run tạo JSON, CSV và Markdown mới trong `outputs/evaluation/<run-id>`; thư mục này không được commit. Hai lượt kiểm chứng ngày 14/07/2026 cho cùng checksum chuẩn hóa `ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e`. Kết quả hiện còn thấp: Behavior có HitRate@10 cao nhất `0,021008`, còn Hybrid production là `0,008403`; không được chỉnh trọng số theo test để làm metric đẹp hơn. Xem phân tích, công thức và giới hạn tại `docs/AI_EVALUATION.md`.

`test:python:integration:evidence` luôn bật integration, chỉ chấp nhận database
`bookverse_ai_test` và tạo JSON/Markdown trong `outputs/test-evidence/`. Artifact
ghi commit nền, trạng thái Git, SHA-256 manifest của toàn bộ source, host/cổng
database, thời gian, lệnh và exit code; username/mật khẩu không được lưu.

`evaluation:research` so sánh production, bốn ablation và năm profile định trước
trên validation, chạy random sanity qua năm seed, khóa profile rồi mới đọc
final-test. Báo cáo tự đưa ra quyết định `KEEP_PRODUCTION` nếu profile đã khóa
không vượt đồng thời production và baseline tốt nhất; final không được dùng để
tune lại.

`evaluation:hybrid-audit` chạy năm rolling temporal window kết thúc trước final
cũ, thử RRF/weighted-rank/gated hybrid đã khóa trước và tạo artifact mới trong
`outputs/hybrid-audit/`. Lệnh chỉ đọc `bookverse_ai_test`, lưu cả cấu hình thất
bại, dataset/source manifest checksum và không thay production. Gate mới trả
`NO_PROMOTION`, đồng thời tách `REJECT_CANDIDATE` khỏi
`RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA`; giữ cấu hình hiện tại không có nghĩa
Hybrid tốt hơn Behavior. Xem `docs/AI_HYBRID_DIAGNOSTIC.md`.

`data:recommendation-readiness` chỉ đọc database và chỉ tính dữ liệu có
`PILOT_CONSENTED`, pilot ID và consent version. Trạng thái hiện hành là
`BLOCKED_BY_DATA`: chưa có impression/click/conversion người thật nên không chạy
model search hoặc tạo final_v2. Hướng dẫn pilot, export HMAC, khóa temporal
final_v2 và blinded relevance nằm tại:

- `docs/RECOMMENDATION_DATA_READINESS.md`
- `docs/INTERACTION_PILOT_PROTOCOL.md`
- `docs/BLINDED_RELEVANCE_STUDY.md`

## UAT/SUS người dùng thật

Checklist phần việc cần người tham gia và hồ sơ quyền dữ liệu nằm tại
[`docs/RESEARCH_NEXT_ACTIONS.md`](docs/RESEARCH_NEXT_ACTIONS.md).

Bộ UAT nằm tại `docs/UAT_PLAN.md` và `docs/UAT_RESPONSE_TEMPLATE.csv`. Mỗi người
thực hiện sáu task trên một loại thiết bị (`desktop` hoặc `mobile`), có cờ đồng
thuận, thời gian, lỗi, số lần trợ giúp, 10 câu SUS và nhận xét. Không tự tạo dữ
liệu mẫu để làm kết quả.

```powershell
python scripts/analyze_uat.py path\to\uat-responses.csv
```

Analyzer kiểm tra đồng thuận, task trùng/thiếu, SUS không nhất quán và xuất task
success, thời gian trung vị, lỗi/trợ giúp, CI 95% SUS cùng so sánh thăm dò
desktop/mobile. Với 10–20 người, kết quả phải được gọi là UAT thăm dò, không
phải bằng chứng recommendation/AI hiệu quả.

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
- OpenAI/Gemini có timeout cấu hình bằng `BOOKVERSE_CHAT_TIMEOUT_MS`; khi provider, embedding hoặc vector lỗi, hệ thống hạ về catalog có ID đã xác minh và gắn trạng thái degraded. Đây không phải bằng chứng provider thật đã PASS.
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
Độc giả:       reader.bookverse.demo@gmail.com / 123456
Người bán:     seller.bookverse.demo@gmail.com / 123456
Quản trị viên: admin.bookverse.demo@gmail.com / 123456
Kiểm duyệt:    moderator.bookverse.demo@gmail.com / 123456
```

Bạn cũng có thể đăng ký tài khoản mới trên giao diện.

## Kiểm tra chất lượng trước khi nộp

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:python
npm run test:production-env
npm run test:production-mock-policy
npm run demo:check
npm run build
```

Các bài integration có thao tác ghi chỉ được chạy với database
`bookverse_ai_test` và allowlist tương ứng. Nếu chạy trên `bookverse_ai`, guard
sẽ từ chối để bảo vệ dữ liệu demo.

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

### Khôi phục riêng catalog và 2.200 bìa gốc

Khi chỉ cần đưa lại 2.200 sách và bìa SVG mà vẫn giữ tài khoản, đơn hàng cùng
dữ liệu tính năng hiện tại, dùng quy trình chuyên biệt:

```powershell
npm run catalog:ultra:dry-run
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai"
npm run catalog:ultra:restore
```

Dry-run phải báo `verifiedCoverAssets: 2200`. Lệnh restore chỉ upsert bảng
`Book` và các nhóm thể loại canonical còn thiếu; không xóa bảng và không sửa
`data/json/bookverse_ultra_seed_2200.json` hoặc `public/covers/flat`.

### Kích hoạt catalog thật 3.046 cuốn và bìa local

Bộ catalog thật dùng mã `RB00001` đến `RB03046`. Ứng dụng ưu tiên ảnh đúng mã
sách trong `public/covers/real-catalog-local`, sau đó mới dùng bản WebP chuẩn hóa
hoặc URL Open Library có trong metadata.

```powershell
npm run catalog:real:activate:dry-run
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai"
$env:CONFIRM_REAL_CATALOG_ACTIVATION="bookverse_ai"
npm run catalog:real:activate
```

Lệnh kích hoạt chỉ upsert sách `RBxxxxx` và ẩn catalog tổng hợp `Bxxxx` khỏi danh
sách công khai. Sách cũ, tài khoản, đơn hàng và dữ liệu hành vi không bị xóa.
Luôn chạy dry-run và tạo backup PostgreSQL trước khi kích hoạt.

### Làm sạch sách trùng và thể loại của catalog thật

Sau khi kích hoạt đủ 3.046 bản ghi gốc, có thể dùng bước làm sạch để giao diện chỉ
hiển thị một bản đại diện cho mỗi cặp tên sách - tác giả. Quy trình chỉ chuyển sách
và listing trùng sang trạng thái ẩn, không xóa sách, ảnh bìa, tồn kho hoặc metadata
nguồn. Một số trường hợp sai rõ ràng cũng được chuyển về thể loại canonical phù hợp.

```powershell
npm run catalog:real:cleanup:dry-run
$env:ALLOWED_DESTRUCTIVE_DATABASES="bookverse_ai"
$env:CONFIRM_CATALOG_CLEANUP="bookverse_ai"
npm run catalog:real:cleanup
```

Sau khi chạy trên bộ dữ liệu hiện tại, 3.046 bản ghi gốc vẫn được giữ nguyên và
3.014 đầu sách riêng biệt được hiển thị công khai. Mỗi lần chạy đều tạo một báo cáo
mới trong `outputs/data-quality`; nên tạo backup PostgreSQL trước khi execute.

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

Không dùng chung project/volume giữa local, test và production. Sao chép `.env.example` thành `.env`, thay toàn bộ placeholder bằng giá trị riêng của máy và không commit `.env`.

Chạy local:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Kiểm tra cấu hình test hoặc production:

```powershell
docker compose -f docker-compose.yml -f docker-compose.test.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
```

Các service:

- `db`: PostgreSQL, port `5432`.
- `web`: Next.js, port `3000`.
- `ai_service`: FastAPI Recommendation, port `8000`.

Image web chứa toàn bộ `prisma/migrations`. Khi container web khởi động, script `start:docker` chạy `prisma migrate deploy` trước `next start`; nếu migration thất bại thì web không được khởi động với schema cũ. Bản production kiểm tra biến môi trường bắt buộc trước khi chạy migration.

Nếu đã từng chạy Docker trước đó và route mới như `/marketplace` vẫn trả 404, hãy rebuild lại image web:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build web
```

## Chuẩn bị catalog đã được cấp phép

Pipeline này chỉ tạo manifest và kiểm tra đầu vào; không xóa, sửa hoặc ghi đè
file dữ liệu gốc. Tạo mẫu cho toàn bộ sách đang có trong database:

```powershell
npm run licensed:prepare
```

File CSV mới được tạo trong `outputs/licensed-catalog`. Với từng sách, cần điền:

- `vietnamese_title`: tên tiếng Việt đã được người có trách nhiệm duyệt;
- `title_reviewed=true`: xác nhận không dùng tên dịch máy chưa kiểm tra;
- `content_file`: đường dẫn tương đối tới file nội dung được cấp phép;
- `cover_file`: đường dẫn tương đối tới bìa thật được cấp phép;
- `total_pages` và `included_pages`: số trang để kiểm tra mức tối thiểu 50%;
- `license_reference`: mã hợp đồng, giấy phép hoặc hồ sơ quyền tương ứng;
- `cover_source_url`: URL nguồn dùng để truy vết.

Đặt file nguồn trong `data/licensed-catalog` hoặc một thư mục con của workspace,
sau đó kiểm tra toàn bộ manifest:

```powershell
npm run licensed:validate -- --validate=outputs/licensed-catalog/manifest-da-dien.csv
```

Lệnh validate từ chối manifest thiếu sách, trùng ID, thiếu file, thiếu tham chiếu
giấy phép, tên chưa duyệt hoặc nội dung chưa đạt 50%. Lệnh không ghi database.

### Tạo nội dung nguyên bản BookVerse

Khi chưa có file nguyên tác được cấp phép, có thể tạo **sổ tay đồng hành đọc**
bằng tiếng Việt. Nội dung này luôn mang nhãn
`NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE`; không được gọi là bản dịch, trích đoạn hoặc
50% tác phẩm gốc.

Kiểm tra danh sách pilot mà không gọi provider và không ghi file:

```powershell
npm run content:generate:dry-run -- --limit=3
```

Để sinh bản nháp thật, cấu hình `OPENAI_API_KEY` hoặc `GEMINI_API_KEY`, sau đó:

```powershell
npm run content:generate -- --limit=3
```

Mỗi bản nháp có ít nhất sáu chương, năm đoạn mỗi chương và 2.500 từ. Script lưu
file mới trong `data/derived/bookverse-original-content`, không ghi đè file đã
có và không tự nhập vào database trước khi được duyệt.

Nếu chỉ cần nội dung demo để kiểm tra Reader, có thể tạo tám chương tiếng Việt
cho mọi sách chưa có `BookChunk`. Nội dung luôn ghi rõ không phải nguyên tác:

```powershell
npm run content:demo:seed
npm run content:demo:seed -- --execute --confirm-database=bookverse_ai
```

Muốn làm mới phần nội dung demo đã tạo (không thay đổi dữ liệu sách gốc):

```bash
npm run content:demo:seed -- --refresh-existing
npm run content:demo:seed -- --refresh-existing --execute --confirm-database=bookverse_ai
```

Lệnh mặc định chỉ dry-run. Chế độ execute không sửa file nguồn và không thay
thế nội dung sách đã có; nó chỉ bổ sung `BookChunk`, Ebook edition và digital
asset cho các sách đang hoàn toàn thiếu nội dung đọc.

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
npm run catalog:real:validate
npm run catalog:real:dry-run
npm run test:real-catalog-integration
npm run build
python -m compileall -q ai_service
docker compose config --quiet
npm run test:production-env
npm run test:production-mock-policy
npm run test:python:integration:evidence
npm run test:e2e:isolated
npm run demo:defense:full
```

`test:e2e:isolated` tạo riêng `bookverse_e2e_test`, apply migration, seed
`TEST_FIXTURE`, chạy smoke + telemetry + Axe trên desktop/mobile rồi xóa database
trong `finally`. Lượt full gate ngày 02/08/2026 đạt 222/222 unit TypeScript,
44/44 Python khi bật integration, 46/46 E2E, lint, typecheck và build.

Lệnh `data:import` và `catalog:real:import` phải dùng biến `DATABASE_URL` của `bookverse_ai_test` cùng allowlist phù hợp; không chạy import để kiểm thử trên database demo. `catalog:real:validate` không ghi database, còn `catalog:real:dry-run` chỉ đọc và lập kế hoạch.

## Quản trị chất lượng dữ liệu sách

BookVerse lưu trạng thái chất lượng trực tiếp trên `Book`:

- `languageCode`: mã ISO 639-1 như `vi`, `en`.
- `coverReviewStatus`: `VERIFIED_LOCAL` hoặc `NEEDS_COVER_REVIEW`.
- `isPubliclyVisible`: chỉ sách đã có bìa local hợp lệ mới được duyệt công khai.

Rà soát toàn bộ catalog RBxxxxx ở chế độ chỉ đọc:

```powershell
npm run catalog:data-quality:audit -- --dry-run
```

Ghi kết quả vào database BookVerse đã xác nhận:

```powershell
npm run catalog:data-quality:audit -- --execute --confirm-database=TEN_DATABASE
```

Script chỉ đọc file trong `public/covers/real-catalog-local/`, không xóa hoặc ghi đè
bộ dữ liệu/bìa gốc. Mỗi lần chạy tạo báo cáo mới trong `outputs/data-quality/`.
Moderator hoặc Admin truy cập `/admin/data-quality` để sửa ngôn ngữ, kiểm tra lại
bìa và duyệt/ẩn sách trên Catalog và Marketplace.

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
- Ebook HTML/JSON đã được thêm vào `public/ebooks`. Cover SVG cũ là `SYNTHETIC_DATA`, không được dùng như bìa thật; UI hiện dùng `BookCover` và fallback V2 có nhãn “BookVerse Demo”.
- Browser smoke Cover V2 dùng Playwright trên database test riêng; test giỏ hàng tạo `TEST_FIXTURE` có ID riêng và phải cleanup về baseline.

### Trạng thái bìa sách

- `2.200/2.200` URL trong dataset ultra là bìa synthetic cũ, trạng thái `NOT_VERIFIED`.
- Có 8 artwork fallback nguyên bản, 6 layout deterministic, tỷ lệ `2:3`; đây là `GENERATED_DEMO_ASSET`, không phải bìa nhà xuất bản.
- Số bìa thật có nguồn/giấy phép đã duyệt: `0` (`NOT_AVAILABLE`).
- Có 20 bìa `EXTERNAL_PROVIDER_ASSET` khớp ISBN/metadata cho bộ `data/demo/books.csv`; quyền tái phân phối từng ảnh vẫn `NOT_VERIFIED` và bộ này chưa được nhập vào database Next.js 1.200 sách synthetic.
- Tải/kiểm tra lại bộ curated bằng `npm run covers:download-curated`; manifest ở `config/curated-demo-cover-sources.json`, dữ liệu dẫn xuất ở `data/derived/demo-books-with-local-covers.csv`.
- Danh sách 120 sách ưu tiên cần bìa thật: `docs/REAL_COVER_CANDIDATES.csv`.
- Audit và hướng dẫn: `docs/COVER_SYSTEM.md`; bằng chứng triển khai: `docs/COVER_V2_REPORT.md`; chạy `npm run covers:audit`.
- Script `prisma/seed.ts` seed demo nhỏ và đặt mật khẩu `123456` cho user mẫu.
- Script import quy mô lớn mặc định fail-closed; chỉ `--execute --replace-existing` mới dọn dữ liệu và chỉ được phép trên database test nằm trong allowlist.
