# Trạng thái hiện tại BookVerse AI

Cập nhật: 02/08/2026. Đây là nguồn trạng thái hiện hành; báo cáo checkpoint cũ chỉ là historical snapshot.

## Quality, accessibility và demo isolation 02/08/2026

- Full defense gate đạt lint không warning, TypeScript strict, production build,
  policy production/mock và **222/222** unit test.
- Python integration chạy một lệnh trên `bookverse_ai_test`, đạt **44/44** và
  sinh evidence kèm source-manifest SHA-256. Suite mặc định không database đạt
  43 test, skip có chủ đích một integration test.
- Playwright đạt **46/46** trên desktop 1280×720 và mobile 375×812: 14 smoke,
  14 telemetry và 18 accessibility. Axe không còn vi phạm `serious`/`critical`
  trên chín bề mặt public/Reader/Dashboard/Admin.
- Đã sửa contrast accent, tooltip biểu đồ, mobile navigation và vùng bảng cuộn
  bằng bàn phím. Mười sáu màu dùng nhiều nhất được đưa vào semantic Tailwind
  token; số mã hex trực tiếp trong `app`/`components` giảm từ 1.984 còn 459.
- Credentials login có rate limit theo khóa băm email+IP, bounded memory và
  timing hash cho tài khoản không tồn tại. Production bổ sung CSP và HSTS.
- `demo:check` không còn âm thầm đọc database ở `.env`; runner giải quyết đúng
  cổng container `bookverse-demo-db`. Readiness của database demo cô lập đạt
  10 PASS, 0 WARN, 0 FAIL với 20 sách.
- GitHub Actions mới chạy source quality, Python và E2E PostgreSQL cô lập trên
  push/pull request. Dependency JavaScript audit hiện có 0 vulnerability.

## Data readiness recommender 30/07/2026

- Audit read-only xác nhận verified real data bằng 0 user, 0 event, 0
  impression/click/conversion; 18.002 event test là synthetic.
- Decision hiện hành: `BLOCKED_BY_DATA`; không huấn luyện, không tune và chưa
  tạo final_v2.
- Migration additive lưu pilot/consent provenance, experiment group, source
  component và device phía server; không backfill lịch sử.
- Đã chuẩn bị export HMAC, final-v2 locker không tính metric, protocol pilot
  interaction và blinded relevance study; chưa sinh kết quả người dùng.
- Ngưỡng 30 user/500 impression/50 outcome/28 ngày được ghi rõ là operational
  minimum, không phải statistical power. Locker còn chặn nếu split thiếu user
  positive, positive event, candidate catalog, exposure, attribution hoặc có
  confidence interval dự kiến quá rộng.
- Artifact timestamp mới được tạo dưới `outputs/data-readiness/` sau mỗi lần
  audit; không ghi đè lượt cũ.

## Audit hybrid và rolling backtest 30/07/2026

- Đã kiểm tra lại temporal split, ground truth, loại sách đã xem, tie-break,
  candidate catalog và công thức metric; chưa phát hiện leakage hoặc lỗi metric.
- Năm rolling window cố định đều kết thúc trước final-test cũ. Behavior là
  baseline mạnh nhất với NDCG@10 trung bình `0,003560`; ứng viên tốt nhất
  `rrf_behavior_focused` đạt `0,003551` và chỉ thắng baseline mạnh nhất 1/5
  cửa sổ.
- Phân tích score cho thấy content và behavior gần như không đồng thuận
  (Jaccard top-10 `0,003620`), còn score theo lịch sử rất thưa. Hybrid production
  không thiếu backfill nhưng đang kết hợp các tín hiệu có thang đo và độ phủ
  khác nhau.
- Không có `final_v2` chưa từng quan sát, nên gate trả `NO_PROMOTION`, gồm
  `REJECT_CANDIDATE` và `RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA`. Không đổi
  trọng số production, không tune theo final-test; giữ cấu hình hiện tại không
  có nghĩa Hybrid tốt hơn Behavior.
- Artifact bất biến nằm tại
  `outputs/hybrid-audit/20260730T063523453561Z/`; diễn giải đầy đủ ở
  `docs/AI_HYBRID_DIAGNOSTIC.md`.

## Tái kiểm chứng integration, research AI và bộ UAT 30/07/2026

- Khôi phục riêng `bookverse_ai_test` trong PostgreSQL cô lập ở
  `127.0.0.1:55432`; database demo `bookverse_ai` không bị sửa.
- `RUN_EVALUATION_INTEGRATION=1` và toàn bộ Python suite đạt **44/44**, không
  còn test skip. Script evidence ghi commit, dirty state, source manifest,
  database identity, thời gian, command và exit code nhưng không ghi credential.
- Research evaluation chạy production + 4 ablation + 5 candidate trên
  validation, random sanity 5 seed, sau đó khóa profile mới đọc final.
- `no_reading_category` thắng validation nhưng thua production/content/behavior
  ở final; artifact lịch sử ghi `KEEP_PRODUCTION`, tương ứng `NO_PROMOTION`
  theo taxonomy mới. Không dùng final để tune lại và không tuyên bố Hybrid đã
  vượt baseline.
- UAT analyzer đã đo thêm đồng thuận, thiết bị, số lần trợ giúp, độ đầy đủ sáu
  task, CI 95% SUS và so sánh desktop/mobile. Kết quả người dùng thật vẫn
  `NOT_AVAILABLE` cho đến khi tổ chức khảo sát; không có số liệu giả.

## Khôi phục catalog và bìa gốc 2.200 sách 27/07/2026

- Đã đối chiếu dataset gốc có 2.200 sách, 2.200 bìa phẳng và 2.200 bìa 3D;
  đường dẫn `cover_url` khớp đầy đủ với `public/covers/flat`.
- Database hiện có đúng 2.200 sách `B0001`–`B2200`, đều `ACTIVE` và dùng đúng
  `/covers/flat/book-xxxx.svg`: tạo thêm 1.000, cập nhật 1.200 bản ghi.
- Bộ SVG người dùng cung cấp không còn bị `isLegacySyntheticCover` loại bỏ.
  Artwork BookVerse tự động chỉ còn là phương án cuối khi thật sự thiếu ảnh.
- Script `catalog:ultra:restore` chỉ hợp nhất category và upsert Book, không xóa
  tài khoản, đơn hàng hoặc dữ liệu tính năng hiện tại.
- Đã sao lưu database trước phục hồi tại
  `outputs/import_backups/bookverse_before_restore_2200_20260727.dump`.

## Phủ bìa minh họa toàn bộ kho sách 27/07/2026

- Mọi sách thật sự chưa có bìa hợp lệ dùng artwork BookVerse 2:3 thay cho dòng
  “Ảnh bìa đang cập nhật”; áp dụng đồng thời ở Home, Catalog, Detail, Reader,
  Library, Marketplace, Assistant và các trang quản trị.
- Artwork được chọn deterministic theo `bookId`, sau đó phủ tiêu đề, tác giả và
  thể loại nên cùng một sách luôn có cùng bìa trên mọi màn hình.
- Bìa thật đã xác minh vẫn được ưu tiên. Artwork thay thế có nhãn “Minh họa
  BookVerse” để không bị hiểu nhầm là bìa chính thức của nhà xuất bản.
- Không sửa `coverPath`, database hoặc dataset gốc; 16 kiểm thử bìa, lint,
  typecheck và production build đều đạt.

## Nâng cấp trang sách và Smart Dashboard 27/07/2026

- Trang chi tiết sách có khối tóm tắt điểm đánh giá, số trang và quyền đọc;
  phần nhận xét cộng đồng có số lượt và phân cấp thị giác rõ hơn.
- Smart Dashboard được đồng bộ sang hệ màu xanh thư viện, coral và vàng ấm;
  KPI, biểu đồ, tiến độ đọc và điểm uy tín người bán dùng chung ngôn ngữ thiết kế.
- Biểu đồ có tiêu đề vùng, mô tả và `aria-label`; số liệu quan trọng luôn hiển
  thị bằng văn bản, không phụ thuộc vào tooltip hoặc màu sắc.
- Production build, 205 unit test và 14 E2E desktop/mobile đều đạt; dữ liệu
  nghiệp vụ gốc không bị sửa trong quá trình kiểm thử.

## Nâng cấp điều hướng và Catalog UX 27/07/2026

- Thêm điều hướng desktop có active state và bottom navigation năm mục trên
  mobile; các route biểu mẫu, Admin, payment và trình đọc tự ẩn thanh mobile.
- Bottom navigation tôn trọng safe-area, body có khoảng đệm tương ứng và
  Floating Chatbot không còn che thao tác ở cạnh dưới.
- Catalog hỗ trợ sắp xếp theo relevance, tên, rating, năm và giá; trạng thái
  sort/filter được giữ trong URL, mỗi filter có chip xóa riêng.
- Bổ sung global loading skeleton và empty state có hành động phục hồi.
- Smart Search có E2E riêng cho truy vấn tiếng Việt không dấu trên desktop và
  mobile; không tạo hoặc cập nhật dữ liệu nghiệp vụ.

## Audit và hoàn thiện giao diện 27/07/2026

- Đã duyệt trực tiếp các nhóm trang công khai, tài khoản, đọc sách, hội viên,
  quản trị và người bán ở kích thước 375px và 1280px.
- Sửa lỗi tràn ngang thật tại đơn hàng/doanh thu Seller; bảng rộng vẫn cuộn
  trong vùng riêng mà không làm rộng toàn bộ trang.
- Sửa chữ trắng bị mất trên panel đã chuyển sang nền sáng ở Dashboard,
  Notification Center, Profile, Library, Order và Seller.
- Chuẩn hóa vùng chạm tối thiểu 44px cho navbar, thông báo, kho hội viên,
  reader, form hồ sơ và các thao tác Seller; bổ sung focus state.
- Form quản lý gói hội viên có nhãn hiển thị rõ; ô tìm kiếm catalog,
  marketplace và Seller có accessible name; trang tạo listing chỉ còn một H1.
- Chatbot nổi nhỏ hơn trên mobile và tự ẩn ở Admin, đăng nhập, đặt lại mật khẩu,
  checkout và thanh toán để không che biểu mẫu quan trọng.
- Audit mobile cuối trên 15 trang trọng yếu đạt: không tràn ngang, đúng một H1,
  không thiếu alt, không thiếu nhãn form và không còn control nhỏ dưới 44px.

## Sơ đồ bảo vệ và kiểm thử trình duyệt 27/07/2026

- Thêm `docs/DEFENSE_ARCHITECTURE.md` gồm sơ đồ ngữ cảnh, kiến trúc triển khai,
  ERD lõi, use case theo vai trò và sequence diagram cho đăng nhập, thanh toán
  Sandbox, quyền đọc Ebook và chatbot RAG.
- Thêm Playwright smoke test cho Chrome desktop và mobile, bao phủ trang công
  khai, route cần đăng nhập, chặn truy cập file Ebook trực tiếp, đăng nhập sai,
  phân quyền độc giả và quyền truy cập Admin Center.
- Bộ E2E tạo `bookverse_e2e_test` cô lập, apply migration, seed ba tài khoản và
  một sách có provenance `TEST_FIXTURE`, rồi xóa database trong `finally`.
  Smoke hiện đạt 14/14; 14 browser test bổ sung cho impression/click/consent
  cũng đạt, tổng cộng 28/28 trên desktop/mobile. Database demo không bị sửa.
- Thêm `npm run demo:defense:full` để chạy tuần tự lint, typecheck, 195 unit
  test và E2E trước khi demo; artifact Playwright được loại khỏi Git.
- Production build đạt và audit dependency production báo 0 lỗ hổng.

## Gói sẵn sàng bảo vệ 26/07/2026

- Admin Center có tổng quan vận hành từ database, bốn thanh tiến độ có nhãn
  accessibility và hàng chờ listing/report/AI feedback/tài khoản khóa.
- Người dùng đã đăng nhập có thể đổi tên hoặc xóa lịch sử chatbot. Hai Server
  Action luôn lọc đồng thời `sessionId` và `userId`; tên được chuẩn hóa 3–80 ký
  tự, thao tác xóa có xác nhận trên giao diện.
- Thêm `npm run demo:defense`: kiểm tra route/tài liệu bắt buộc rồi gọi
  `demo:check` ở chế độ chỉ đọc. Kịch bản 8–10 phút nằm tại
  `docs/DEMO_DEFENSE_SCRIPT.md`.
- Browser QA xác minh đổi tên được lưu sau khi tải trang mới; Admin Center và
  Assistant không tràn ngang ở 375px, dashboard đạt ở 1280px, không có control
  nhỏ hơn 44px và không có lỗi console trên tab sạch.
- Lint, typecheck và production build đạt; unit test hiện hành đạt 195/195;
  preflight đạt đủ route và dữ liệu 10 PASS, 0 WARN, 0 FAIL.

## Lịch sử AI, Integration Readiness và hoàn tiền Sandbox 26/07/2026

- `/assistant` hiển thị lịch sử gần đây cho tài khoản đã đăng nhập, mở lại tối
  đa 12 tin nhắn mỗi phiên và tiếp tục bằng đúng `sessionId`; truy vấn luôn lọc
  theo `userId` hiện tại.
- Bộ phân loại ưu tiên cụm `thanh toán Sandbox` vào nghiệp vụ hội viên, tránh
  trả nhầm quy trình đơn hàng; câu hỏi ngắn đã được kiểm tra bằng unit và browser.
- Thêm `/admin/integrations` để kiểm tra kết nối database và mức đầy đủ của
  webhook email, LLM, AI Service, app origin. Giao diện chỉ nêu
  tên biến môi trường, không trả giá trị khóa bí mật.
- `/admin/subscriptions` hỗ trợ hoàn giao dịch `PAID_DEMO` với lý do từ 5–300
  ký tự. Luồng chuyển payment sang `REFUNDED`, hủy kỳ liên quan, gửi thông báo,
  ghi audit và chống xử lý đồng thời; không xóa bản ghi gốc.
- Lint và typecheck đạt; unit test hiện hành đạt 193/193.
- Browser QA đạt trên 375px và 1280px: không tràn ngang, vùng chạm chính 44px,
  lịch sử mở lại đúng tin nhắn, hoàn tiền ra `REFUNDED/CANCELLED`, nhánh lỗi
  thanh toán ra `FAILED` và không ghi lỗi console.

## Thanh toán Sandbox, Analytics và tri thức chatbot 26/07/2026

- Checkout hội viên không còn kích hoạt gói ngay: hệ thống tạo giao dịch
  `PENDING`, sau đó `/membership/payment/[paymentId]` mô phỏng hai phản hồi
  `PAID_DEMO` và `FAILED`.
- Giao dịch dùng UUID/`transactionRef` duy nhất, kiểm tra đúng chủ sở hữu và chỉ
  tạo subscription sau khi thanh toán thành công. Nhánh thất bại không cấp quyền.
- Thêm `/admin/analytics` với số liệu 30 ngày từ database: doanh thu hội viên,
  doanh thu marketplace, giao dịch, user, subscription, kho đọc và feedback AI.
- Chatbot có thêm tri thức về thanh toán Sandbox, khôi phục tài khoản và câu hỏi
  nhanh cho quy mô catalog; không tuyên bố Sandbox là giao dịch tiền thật.
- Mốc trước đó đạt 188/188 unit test; số hiện hành được ghi ở mục mới nhất phía trên.

## Audit toàn hệ thống và hoàn thiện thư viện 26/07/2026

- Bốn tài khoản demo chính dùng địa chỉ Gmail dễ nhớ; trang đăng nhập có hiện/ẩn
  mật khẩu, trạng thái đang xử lý, autocomplete chuẩn và nút điền nhanh chỉ ở
  development để không công khai mật khẩu demo trên production.
- Khôi phục catalog công khai: khi pipeline catalog thật chưa được import, hệ
  thống dùng 1.200 sách demo có bìa và gắn nhãn `Dữ liệu demo`; khi catalog thật
  đạt quality gate, policy tự ưu tiên catalog thật.
- Thêm `npm run ebooks:ingest:demo` với dry-run và xác nhận database khi ghi.
  Pipeline đã lập chỉ mục 1.200 Ebook thành 15.502 chunk mà không sửa file nguồn.
- Database demo hiện có 1.200/1.200 sách đọc được, ba gói hội viên và một tài
  khoản hội viên còn hạn; `npm run demo:check` đạt 10 PASS, 0 WARN, 0 FAIL.
- Bổ sung ESLint 9 flat config và lệnh `npm run lint`; loại bỏ toàn bộ lỗi/cảnh
  báo hiện hành trong phạm vi mã ứng dụng, action, thư viện, test và script.
- Nâng vùng chạm tối thiểu lên 44px cho input/select/điều khiển admin, Việt hóa
  shortcut hồ sơ, thêm nhãn truy cập cho bộ lọc và thêm security headers.
- Middleware bảo vệ nhất quán library, orders, reading, seller và checkout hội
  viên trước khi vào page; kiểm tra quyền ở Server Action vẫn được giữ.

## Nâng cấp trợ lý hiểu nhà sách 26/07/2026

- Chatbot phân loại ý định nghiệp vụ trước khi truy xuất dữ liệu.
- Kho tri thức nội bộ bao phủ hội viên, trình đọc, đơn hàng, chợ sách, tài
  khoản, AI, chính sách và catalog.
- Câu hỏi vận hành không còn bị ép sang gợi ý sách không liên quan.
- Khi đăng nhập, chatbot chỉ đọc trạng thái hội viên, giỏ hàng, số đơn và tiến
  độ của chính tài khoản hiện tại; người ẩn danh không nhận dữ liệu cá nhân.
- Số liệu catalog được đếm trực tiếp từ database. Fallback local mới vẫn ghi rõ
  đây là dữ liệu nội bộ, không giả làm phản hồi provider.

## Hoàn thiện trang chủ và kiểm tra demo 26/07/2026

- Trang chủ ưu tiên thông điệp đọc thử, hội viên mở toàn bộ kho và lưu hành
  trình đọc; AI, catalog và chợ sách vẫn giữ thành các luồng khám phá.
- Số sách, sách có nội dung, thể loại và tin bán trên trang chủ được đếm trực
  tiếp từ database, không dùng số liệu quảng cáo giả.
- Có lệnh `npm run demo:check` chỉ đọc để kiểm tra dữ liệu bắt buộc và dữ liệu
  nên chuẩn bị trước buổi bảo vệ.

## Bổ sung lịch đọc, mục tiêu và bộ lọc khám phá 26/07/2026

- Có lịch đọc năm tại `/reading/calendar`, tổng hợp trực tiếp `ReadingSession`
  theo múi giờ Asia/Bangkok và không tạo số liệu giả.
- Có mục tiêu cá nhân tại `/reading/goals`; cấu hình lưu trong localStorage theo
  ID tài khoản, còn số phút/sách hoàn thành lấy từ dữ liệu hệ thống.
- `/discover` hỗ trợ thêm bộ lọc ngôn ngữ, năm xuất bản và thể loại.
- Logic gom phiên theo ngày và phân mức heatmap có unit test độc lập.

## Bổ sung Reading Insights, Challenges và Mood Discovery 26/07/2026

- Thêm `/reading/insights`: metric đọc 90 ngày, streak, biểu đồ bảy ngày, mục
  tiêu tuần, phân bổ thể loại và luồng đọc tiếp.
- Thêm `/reading/challenges`: tám huy hiệu có tiến độ và điều kiện mở khóa từ
  dữ liệu progress/session/bookmark/highlight/favorite hiện có.
- Thêm `/discover`: khám phá sách theo bốn tâm trạng và ba nhóm độ dài; kết quả
  là lọc metadata deterministic, không gắn nhãn cá nhân hóa bằng dữ liệu thật.
- Thư viện cá nhân có lối vào thống kê/thành tích; navbar có mục Khám phá.
- Hàm streak thuần có test cho chuỗi từ hôm nay, giữ chuỗi từ hôm qua, ngày
  trùng/khoảng trống và trạng thái không có dữ liệu.
- Xác minh source: typecheck PASS, unit 168/168 PASS. Không migration, không
  sửa dữ liệu nguồn và không tạo metric CTR/SUS/UAT.

## Bổ sung kho đọc hội viên toàn cục 26/07/2026

- Mọi đầu sách `ACTIVE`, chưa xóa đều xuất hiện tại `/read` và có route đọc thử
  `/read/[bookId]`; kho hỗ trợ tìm kiếm, lọc thể loại và phân trang.
- Người chưa có quyền nhận phần đọc thử từ server. Một subscription `ACTIVE`
  còn hạn mở toàn bộ kho và tự áp dụng cho sách mới; quyền mua Ebook cũ vẫn được
  giữ để không tước quyền đã thanh toán.
- Thêm trang `/membership/benefits`; trang chi tiết mọi sách đều có CTA đọc thử
  và trình đọc luôn dẫn đúng sang gói hội viên khi cần mở khóa.
- Admin không còn chọn sách riêng cho từng gói; `/admin/membership-plans` chỉ
  quản lý giá, thời hạn và trạng thái mở bán.
- Xác minh source tại checkpoint này: `npm run typecheck` PASS, `npm run test:unit`
  164/164 PASS, `npm run build` PASS. Browser QA PASS tại 375px và 1440px cho
  `/read`, `/membership/benefits`, luồng đọc thử và CTA `/membership`.
- Với sách chưa có file/chunk được xác minh, trình đọc ghi rõ đây là nội dung
  demo từ metadata; không tuyên bố đó là toàn văn có bản quyền.

## Bổ sung checkpoint giao diện 22/07/2026

- Đã đồng bộ giao diện sáng theo phong cách biên tập cho trang chủ, catalog, chi tiết sách, navbar, footer và thẻ sách; giữ nguyên các nhãn phân biệt catalog tuyển chọn với dữ liệu demo.
- Trang chi tiết có breadcrumb, trạng thái gửi form, chia sẻ liên kết và tối đa 5 sách cùng thể loại; truy vấn liên quan không làm thay đổi dữ liệu.
- Trình đọc ebook có tìm kiếm trong toàn bộ nội dung đã tải, chọn nhanh trang, chế độ toàn màn hình, phím tắt, ghi nhớ theme/font/cỡ chữ bằng local storage và xóa highlight có kiểm tra quyền sở hữu.
- Công cụ đọc nâng cao gồm đọc thành tiếng bằng Web Speech API, tự cuộn, chế độ tập trung, ước tính thời gian đọc còn lại, mục tiêu phiên đọc, sửa ghi chú, sao chép trích dẫn và xuất highlight dạng TXT. Khả năng đọc thành tiếng phụ thuộc trình duyệt/giọng đọc trên thiết bị.
- P0-1 password reset: production không log/trả token, origin bắt buộc HTTPS từ cấu hình tin cậy, webhook giao email bắt buộc qua production policy, token giao thất bại bị vô hiệu hóa, rate limit best-effort theo email/IP và mật khẩu mới thống nhất tối thiểu 8 ký tự. Unit hiện hành 133/133; production env policy từ chối 12 cấu hình không an toàn.
- P0-2 AI service: endpoint recommendation hỗ trợ service token bằng constant-time compare, production fail-closed nếu thiếu token/CORS allowlist, bỏ CORS wildcard và không trả raw database exception. Checkpoint này đạt 35/35 Python test khi bật integration trên database test cô lập; production env policy từ chối 16 cấu hình không an toàn; Compose production config đạt với placeholder chỉ dùng kiểm tra cấu hình.
- P0-3 fresh migration rehearsal 22/07/2026: database tách biệt `bookverse_ai_fresh_migration_test` trên port loopback 55433 đã bootstrap pgvector 0.8.5, apply đủ 14/14 migration, Prisma smoke rollback sạch và audit 14/14 `APPLIED_VALID`; schema checksum `657bad3dae47a7b621e37ea30ee45d2d0960b911417d0c0e3d7ebbeb69193bef`. Container, network và volume rehearsal đã được xóa sau khi lưu report. Database demo `bookverse_ai` vẫn chưa bị migrate.
- Bổ sung skip link, thông báo `aria-live`/`role="alert"`, icon Lucide thay ký tự sao, trạng thái focus và quy tắc `prefers-reduced-motion`.
- Xác minh hiện hành: `npm run typecheck` exit 0; `npm run test:unit` đạt 129/129; `npm run build` biên dịch và kiểm tra kiểu thành công.
- Đây là kiểm tra mã nguồn local; browser QA nhiều viewport và deployment cho giao diện mới vẫn `NOT_VERIFIED`.

## Quy ước

- `VERIFIED`: có bằng chứng trực tiếp và command liên quan exit 0.
- `PARTIAL`: chỉ xác minh được một phần.
- `NOT_VERIFIED`: chưa đủ bằng chứng.
- `BLOCKED`: không thể kiểm tra do môi trường, quyền hoặc credential.
- `NOT_AVAILABLE`: hệ thống hoặc dữ liệu không tồn tại.
- `FAILED`: command đã chạy và thất bại.

## Baseline source 19/07/2026

- Branch `checkpoint-g2-real-catalog`; HEAD trước commit lượt này `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Worktree trước lượt có 52 tracked file modified và 75 untracked path; tar runtime 1.12 GB được giữ ngoài commit, không xóa.
- Không có remote; lượt này không push, không reset/clean/checkout/restore/stash.

## Kết luận Checkpoint G2.2

Checkpoint G2.2 **chưa hoàn thành toàn bộ Definition of Done**. Cover audit kỹ thuật đã xử lý đủ 3.046/3.046 record và review riêng đủ 24 anomaly, nhưng chỉ 687 đạt policy; 2.335 redirect ngoài allowlist và rights vẫn `NOT_VERIFIED`. Category LOW đã review đủ 8 mapping nhưng vẫn là broad fallback. Evidence audit đọc 8.400 dòng và xác nhận 0 `REAL_USER_DATA`; UI/API đã chuyển sang neutral khi thiếu provenance. Database demo chưa migration/import và chưa deploy.

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| ZIP bàn giao | VERIFIED | SHA-256 `986824e5a06c8b7125376a4af8ff6c5cce482e9d568ca458dbf6613c3d3255f4` khớp | Chỉ xác minh tính toàn vẹn file |
| Catalog 3.046 record | PARTIAL | 3.046 Book/source record/cover ID/cover URL duy nhất; 3.044 work + 2 edition-only; 34 record thiếu language | Không được tuyên bố có 3.046 work key |
| Category mapping | PARTIAL | Audit mới trên `bookverse_ai_test`: 39/39 resolve, checksum `17d3f2ef5917900510117266dd43841ae3d6fc7f69d7ceb0672685ab813274cd`, 22 HIGH/9 MEDIUM/8 LOW | 628/3.046 record thuộc 8 mapping LOW; science → education và cooking → travel là broad fallback, không phải mapping ngữ nghĩa chính xác |
| Schema/migration | VERIFIED | Model 1–1 `BookSourceMetadata`; migration additive mới, không sửa migration cũ | Chỉ apply trên test |
| Import test | VERIFIED | Dry-run cuối và execute lần hai: INSERT/UPDATE/REJECTED = 0, UNCHANGED = 3.046; count hành vi không đổi | Import trước đó đã tồn tại; không áp dụng trên demo |
| Catalog UI | VERIFIED | Pagination 24; filter real/demo/language/year/ISBN/rating nguồn; Home có “Sách tuyển chọn”; Detail có metadata nguồn | Chạy local trên database test, chưa deploy |
| Recommendation evidence provenance | PARTIAL | Test DB read-only: 8.400 evidence, 0 verified real-user, 8.400 missing provenance; source policy chỉ cho phép claim khi có interaction/user/taxonomy/algorithm đầy đủ | Chưa có `REAL_USER_DATA`; không được gọi recommendation hiệu quả |
| Recommendation isolation | PARTIAL | Integration: 0 Recommendation/DailyRecommendation/RequestItem trỏ catalog; parity 30/30, max delta 0 | Evidence/Feedback/Telemetry cũ không có provenance; UI giữ neutral |
| Browser G2.2 | VERIFIED | `node scripts/audit_real_catalog_ui.cjs` exit 0 trên 360/390/768/1366/1920, đủ 8 surface; catalog tối đa 24 remote request, 404 fallback 24/24, không broken image | Đây là local test với `TEST_FIXTURE`, chưa phải deployment |
| Cart cover fixture | VERIFIED | `test:g2-1-cart-covers` exit 0: 5 viewport; valid/404/timeout; counts trước/sau khớp, cleanup hoàn tất | Dữ liệu là `TEST_FIXTURE`, không phải user behavior |
| Cover HTTP toàn catalog | PARTIAL | Policy v4 audit mới 3.046/3.046: 687 `HTTP_VERIFIED`, 2.335 `INVALID_CONTENT` (redirect cuối ngoài allowlist), 24 `INVALID_DIMENSION`; groups ghi original/final host, status, redirect count và fallback reason | Redirect `archive.org`/`*.us.archive.org` không được coi là cover đã verify; HTTP 200 không phải license |
| Review 24 dimension anomaly | VERIFIED | `review_real_catalog_cover_dimensions`: 24/24; 23 `LANDSCAPE_INVALID`, 1 `TOO_SMALL`, đều có quyết định fallback | Đây là phân loại kỹ thuật theo metadata; không phải visual/license review |
| Cover policy dùng chung | VERIFIED | `config/cover-policy.json` được dùng bởi validator, importer contract, BookCover, auditor và unit tests | Không tự động thêm redirect host |
| Cover có giấy phép | NOT_AVAILABLE | Không có manifest license hợp lệ (`approvedReal=0`); rights của Open Library cover là `NOT_VERIFIED` | Tải được ảnh không đồng nghĩa có quyền tái phân phối |
| Docker image build | VERIFIED | Audit image current-source: web sha256:`6c8dde47f8d20daf11bbc7d38f50d5867caadd6bcc4740a06339164259e7ea01`, AI sha256:`2c8ff5ebaedb96f394c35c8009e12c1fae1d253acac246749d7f6a9e1ad6af32`; FindingCount 0 | Image local, không phải deployment |
| Deployment | NOT_VERIFIED | Không push/deploy/restart demo | Không được gọi production-ready |

## Database

### `bookverse_ai_test`

- Trước G2: Book 2.200, Category 2.200, Order 2.606, Review 3.600, Interaction 11.344, InteractionEvent 18.002, Recommendation 4.200.
- Sau import: Book 5.246 = 2.200 `SYNTHETIC_DATA` + 3.046 catalog tuyển chọn.
- `BookSourceMetadata`: 3.046; work 3.044; edition-only 2; ISBN 2.343; ấn bản tiếng Việt 259; thiếu language 34.
- Order/Review/Interaction/InteractionEvent/Recommendation cuối lượt giữ lần lượt 2.606/3.600/11.344/18.005/4.200.
- Backup/restore rehearsal `20260716T1705` là **historical snapshot** (file/checksum được giữ ngoài Git); lượt G2.1 này chưa tạo backup hoặc restore mới, nên backup/restore current `NOT_VERIFIED`.

### `bookverse_ai` demo

Query read-only cuối lượt: Book 1.200, Category 24, Listing 1.200, Order 1.500, Review 3.500, Interaction 17.744, InteractionEvent 18.008, Recommendation 3.000, 12 migration. `book_source_metadata` là `NOT_AVAILABLE`. G2 không migration/import/backfill/seed database demo.

## Test hiện hành

- Prisma validate: VERIFIED; `npx prisma generate` tại host FAILED do EPERM khi đổi tên query engine đang bị Windows lock. Docker build cô lập chạy generate thành công; warning deprecation `package.json#prisma` vẫn còn.
- Typecheck: VERIFIED.
- TypeScript unit: 226/226 (chạy lại ngày 02/08/2026).
- Python: `compileall` exit 0; `pytest ai_service/tests` 23 passed, 1 skipped (integration DB không chạy trong suite mặc định).
- Stock integration: 11/11.
- Assistant integration: local degraded fallback, không mock, cleanup count về baseline.
- Telemetry/rank collision: VERIFIED và cleanup.
- Production parity: 30/30 row, max score delta 0 (parity fixture/test DB; không phải metric recommendation online).
- Cover audit G2.2: 3.046/3.046 request hoàn tất với rate limit/resume; policy v4 ghi final host/redirect chain/fallback reason; 687 verified, 2.335 redirect rejected, 24 dimension anomaly.
- Cover dimension review: 24/24, không có record bị bỏ qua.
- Category LOW semantic review: 8/8, source category được giữ lại và confidence vẫn LOW.
- Recommendation evidence provenance audit: 8.400/8.400 thiếu provenance; transaction read-only.
- Production build local: exit 0.
- Browser cover UI audit: VERIFIED; 72 surface trên 6 viewport (360/390/768/1366/1440/1920), deterministic không conflict, cart cover status VERIFIED.
- Browser real-catalog audit: VERIFIED; 5 viewport × 8 surface, catalog tối đa 24 remote request, 404 fallback 24/24 và không broken image.
- Cart cover browser fixture: VERIFIED; test DB counts trước/sau giữ nguyên và fixture cleanup hoàn tất.
- Assistant API smoke: VERIFIED với production server local trên port 3101 và provider `local`; HTTP 200, contract `d1`, `mocked=false`, `degraded=true`, invalid payload 400 và anonymous feedback 401. Đây không phải bằng chứng OpenAI/Gemini credential thật.
- Stock deployment verifier: BLOCKED/FAILED theo command vì scope chỉ cho phép rehearsal database, không đọc DB ngoài scope.
- `npm audit`: 0 lỗ hổng (chạy lại ngày 02/08/2026).
- Docker Compose base/production config: exit 0 với placeholder kiểm tra cấu hình; không phải credential thật. Image current-source đã audit secret với FindingCount 0; đây vẫn là image local, chưa deploy.

## Nhãn dữ liệu và AI

- `SYNTHETIC_DATA`: ultra-2200 và phần lớn interaction/order/recommendation hiện có.
- `DEMO_DATA`: giá của catalog tuyển chọn (`SYNTHETIC_DEMO_PRICE`).
- `TEST_FIXTURE`: dữ liệu integration/browser; không dùng báo CTR.
- `INSTRUMENTED_DEMO_DATA`: telemetry integration đã cleanup; không phải hành vi production.
- Bibliographic metadata từ Open Library: 3.046 record tuyển chọn, tách bằng `BookSourceMetadata`; không đồng nghĩa toàn bộ nội dung là dữ liệu người dùng thật.
- `REAL_USER_DATA`: `NOT_AVAILABLE`.
- 259 là **ấn bản tiếng Việt**, không phải 259 tác giả Việt Nam.
- Hybrid production HitRate@10 `0,008403`, thấp hơn baseline tốt nhất; CTR production `NOT_AVAILABLE`.
- OpenAI/Gemini credential thật: `BLOCKED_MISSING_CREDENTIAL` nếu môi trường chưa cung cấp key.
- Recommendation evidence: `PARTIAL`; source nhận diện `VERIFIED_REAL_USER` chỉ khi provenance đầy đủ, còn synthetic/legacy/missing/anonymous hiển thị neutral. Audit hiện tại có 0 `REAL_USER_DATA`.

## Không được tuyên bố khi bảo vệ

- Không nói có 3.046 Open Library work key; chỉ 3.044 work và 2 edition-only.
- Không gọi cover Open Library là publisher-licensed hoặc `REAL_VALID`.
- Không gọi giá demo là giá bán thật.
- Không nói 259 tác giả Việt Nam.
- Không nói catalog có review/order/interaction người dùng thật.
- Không nói hybrid vượt baseline, CTR đã cải thiện, UAT/SUS PASS hoặc production-ready.
- Không nói G2 đã deploy hoặc database demo đã được cập nhật.

## Việc còn lại

1. Quyết định với 2 edition-only: bổ sung work key có nguồn xác minh hoặc sửa acceptance criteria thành 3.044 work + 2 edition-only; không tự đổi dữ liệu.
2. Quyết định business policy cho 2.335 cover redirect ngoài allowlist; hiện giữ fallback, không sửa URL nguồn tự động.
3. Bổ sung provenance `REAL_USER_DATA` từ telemetry có consent nếu muốn bật claim cá nhân hóa; hiện UI đã giữ neutral.
4. Chỉ deployment database demo ở checkpoint riêng có backup, migration/import rehearsal và phê duyệt.
5. Thu thập UAT/telemetry người dùng thật có consent trước khi báo SUS/CTR hoặc tune recommendation.

## Bằng chứng hiệu năng và truy vết lỗi 02/08/2026

- Production build: PASS.
- Smoke load test: 90 request, concurrency 5, tỷ lệ lỗi 0%.
- p95: trang chủ 344,31 ms; catalog 94,58 ms; API marketplace 30,89 ms.
- API chat và marketplace trả `x-request-id`, `server-timing`; lỗi và request chậm
  được ghi JSON có lọc trường nhạy cảm.
- Kết quả nằm trong `outputs/performance/performance-*.json`; đây là bằng chứng
  trên máy demo, không suy rộng thành năng lực tải production.

## Độ phủ nội dung đọc 02/08/2026

- Database `bookverse_ai`: 5.246/5.246 sách active có bộ BookVerse V2 hoàn chỉnh.
- Mỗi sách có 8 chương × 4 trang; tổng cộng 167.872 chunk V2.
- 5.246/5.246 sách vẫn giữ nội dung cũ; thao tác nâng cấp chỉ thêm dữ liệu.
- Bộ sinh deterministic theo metadata và thể loại; Reader chỉ chọn V2 khi đủ
  32 trang, tránh hiển thị sách bị seed dở dang.
- Không tự sao chép toàn văn từ Open Library: catalog chứa nhiều tác phẩm hiện
  đại và metadata không phải giấy phép/toàn văn. Ebook ngoài chỉ được ingest khi
  có bản public-domain hoặc open-license khớp chính xác.
