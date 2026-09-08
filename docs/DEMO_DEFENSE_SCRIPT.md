# Kịch bản demo bảo vệ BookVerse AI

Thời lượng chính: **8–10 phút**. Có thêm luồng người bán 2 phút nếu giảng viên
muốn xem sâu hơn.

> BookVerse là sản phẩm học thuật. Catalog, giá, giao dịch và nội dung đọc hiện
> tại là dữ liệu demo có ghi nhãn. Không giới thiệu đây là nội dung nguyên tác,
> giao dịch ngân hàng hoặc dữ liệu khách hàng thật.

## 1. Trạng thái dữ liệu đã xác minh

| Hạng mục | Kết quả hiện tại |
|---|---:|
| Sách đang hoạt động | 5.246 |
| Sách có nội dung đọc | 5.246 |
| Sách thiếu nội dung | 0 |
| Sách BookVerse B | 2.200 sách / 28.435 trang |
| Sách catalog RB | 3.046 sách / 97.472 trang |
| Tổng trang/đoạn đọc | 125.907 |
| Sách thiếu edition Ebook | 0 |
| Sách thiếu DigitalAsset | 0 |
| Sách có trang rỗng | 0 |

Nhóm RB có 32 trang/cuốn và nội dung tiếng Việt do BookVerse biên soạn để demo.
Nhóm B có tối thiểu 12 trang/cuốn từ thư viện HTML demo. Reader ghi rõ nguồn
demo, không gọi đây là bản dịch hoặc nội dung nguyên tác.

## 2. Tài khoản demo

Mật khẩu chung trên máy demo: `123456`.

| Vai trò | Email | Dùng để trình bày |
|---|---|---|
| Độc giả | `reader.bookverse.demo@gmail.com` | Catalog, hội viên, Reader, trợ lý |
| Người bán | `seller.bookverse.demo@gmail.com` | Quản lý tin bán và đơn hàng |
| Quản trị | `admin.bookverse.demo@gmail.com` | Dashboard, analytics, subscription |
| Kiểm duyệt | `moderator.bookverse.demo@gmail.com` | Kiểm duyệt nội dung và tin bán |

Tài khoản độc giả đang có gói hội viên còn hạn nên mở được toàn bộ nội dung demo.
Không hiển thị mật khẩu trên màn hình production hoặc đưa vào slide công khai.

## 3. Chuẩn bị trước khi vào phòng bảo vệ

### 3.1. Khởi động hạ tầng

Mở PowerShell tại thư mục dự án:

```powershell
docker compose up -d db ai_service
npm run dev
```

Đợi dòng `Ready`, sau đó mở:

```text
http://127.0.0.1:3000
```

Không mở thêm một tiến trình Next.js khác trên cùng cổng 3000.

### 3.2. Kiểm tra nhanh, không sửa dữ liệu

```powershell
npm run demo:defense
```

Điều kiện được phép bắt đầu demo:

- route và tài liệu đều `PASS`;
- `demo:check` đạt `10 PASS`;
- sách có nội dung đọc là `5.246`;
- kết quả cuối là `0 FAIL`.

Khi còn thời gian trước ngày bảo vệ, chạy bộ đầy đủ:

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run test:python
npm run test:e2e:smoke
npm run build
```

### 3.3. Chuẩn bị trình duyệt

1. Đóng các tab không liên quan và đặt zoom trình duyệt 100%.
2. Mở sẵn trang chủ và trang đăng nhập.
3. Dùng một cửa sổ thường cho độc giả, cửa sổ riêng tư cho Admin nếu muốn tránh
   mất thời gian đăng xuất/đăng nhập.
4. Chuẩn bị đường dẫn Reader ổn định:
   `http://127.0.0.1:3000/read/RB00004`.
5. Không phụ thuộc Internet khi demo; catalog, nội dung và fallback đều chạy local.

## 4. Kịch bản trình bày chính 8–10 phút

### Phút 0:00–1:00 — Giới thiệu bài toán

**Thao tác**

1. Mở `/`.
2. Chỉ vào các khu vực Catalog, Kho đọc, Hội viên, Chợ sách và Trợ lý AI.

**Lời nói gợi ý**

> BookVerse AI là nền tảng quản lý, khám phá, mua bán và đọc sách trực tuyến.
> Hệ thống có bốn vai trò chính: độc giả, người bán, kiểm duyệt viên và quản trị
> viên. Dữ liệu đang trình bày là dữ liệu học thuật để kiểm thử đầy đủ quy trình.

**Điểm cần chứng minh**

- giao diện có điều hướng rõ ràng;
- các tính năng nằm trong cùng một quy trình nghiệp vụ;
- không tuyên bố dữ liệu demo là dữ liệu thật.

### Phút 1:00–2:15 — Catalog và tìm kiếm tiếng Việt

**Thao tác**

1. Mở `/catalog`.
2. Nhập `dam dai da qua`.
3. Chọn sắp xếp `Giá thấp đến cao`.
4. Mở sách **Dặm Dài Đã Qua**.

**Lời nói gợi ý**

> Tìm kiếm chuẩn hóa tiếng Việt nên truy vấn không dấu vẫn khớp tiêu đề có dấu.
> Catalog hỗ trợ lọc thể loại, ngôn ngữ, năm xuất bản và nhiều cách sắp xếp.
> Giá hiện tại có nhãn giá demo, không phải giá thị trường.

**Kết quả phải thấy**

- có sách “Dặm Dài Đã Qua”;
- chip bộ lọc hiện `Tìm: dam dai da qua`;
- trang chi tiết hiển thị tác giả, thể loại và nguồn dữ liệu.

### Phút 2:15–4:15 — Đăng nhập và đọc Ebook

**Thao tác**

1. Đăng nhập `reader.bookverse.demo@gmail.com`.
2. Mở trực tiếp `/read/RB00004`.
3. Quan sát màn hình “Đang tải nội dung sách”.
4. Đợi Reader hiện đúng `Trang 1 / 32`.
5. Bấm số trang `2`, sau đó chọn chương 2 trong mục lục.
6. Đổi theme Dark/Sepia/Light và tăng cỡ chữ.
7. Bấm `Đánh dấu trang`.
8. Nhập một highlight thủ công ngắn và lưu.

**Lời nói gợi ý**

> Reader kiểm tra quyền đọc ở server trước khi trả nội dung. Trong lúc chờ, hệ
> thống chỉ hiện trạng thái tải, không dựng sai số trang. Tài khoản này có hội
> viên còn hạn nên được mở toàn bộ 32 phần demo. Vị trí đọc, bookmark và
> highlight được lưu theo đúng người dùng và sách.

> Nội dung đang đọc là nội dung demo tiếng Việt do BookVerse biên soạn cho giao
> diện, không phải bản dịch hoặc trích đoạn nguyên tác của tác giả.

**Kết quả phải thấy**

- không xuất hiện `Trang 1 / 12` trong lúc tải;
- có 8 chương và 32 trang;
- phân trang dưới Reader đổi theo trang hiện tại;
- bookmark/highlight báo lưu thành công.

### Phút 4:15–5:15 — Kho đọc và thống kê

**Thao tác**

1. Mở `/read` hoặc `/library`.
2. Mở `/reading/insights`.
3. Chỉ vào tiến độ, thời gian, streak và sách đọc gần đây.

**Lời nói gợi ý**

> Các số liệu này lấy từ ReadingProgress và ReadingSession trong PostgreSQL.
> Hệ thống không chỉ đổi giao diện mà lưu được tiến độ để người đọc quay lại đúng
> vị trí.

### Phút 5:15–6:30 — Hội viên và thanh toán Sandbox

**Thao tác**

1. Mở `/membership`.
2. Giới thiệu ba gói hội viên.
3. Chọn một gói và đi tới checkout nhưng không nhất thiết xác nhận giao dịch mới.
4. Mở lịch sử hội viên tại `/profile/membership`.

**Lời nói gợi ý**

> Thanh toán ở đây là Sandbox. Trạng thái thành công là `PAID_DEMO`; hệ thống cấp
> subscription và quyền đọc bằng thao tác idempotent. Nhánh thất bại không cấp
> quyền. Đây không phải giao dịch ngân hàng thật.

### Phút 6:30–7:30 — Trợ lý AI có kiểm soát nguồn

**Thao tác**

Mở `/assistant` và hỏi một trong các câu:

```text
Thanh toán Sandbox hoạt động thế nào?
Gói hội viên của tôi còn hạn không?
Gợi ý sách cho người mới học kinh doanh.
```

**Lời nói gợi ý**

> Trợ lý phân biệt tri thức nghiệp vụ, dữ liệu tài khoản và catalog. Khi chưa có
> khóa OpenAI/Gemini, hệ thống dùng local grounded fallback và ghi nhãn rõ; em
> không gọi fallback là phản hồi từ nhà cung cấp bên ngoài.

### Phút 7:30–9:00 — Quản trị và phân quyền

**Thao tác**

1. Đăng xuất độc giả, đăng nhập `admin.bookverse.demo@gmail.com`.
2. Mở `/admin`.
3. Mở `/admin/analytics`.
4. Mở `/admin/integrations`.
5. Mở `/admin/subscriptions`.

**Lời nói gợi ý**

> Admin theo dõi vận hành, doanh thu demo, hội viên, dữ liệu đọc và trạng thái
> tích hợp. Mỗi route đều kiểm tra vai trò ở server; độc giả không thể truy cập
> bằng cách tự gõ URL Admin. Trang tích hợp chỉ trả trạng thái sẵn sàng, không
> làm lộ secret.

### Phút 9:00–10:00 — Kiến trúc và kết luận

**Lời nói gợi ý**

> Giao diện và Server Action dùng Next.js; PostgreSQL và Prisma lưu dữ liệu
> nghiệp vụ; FastAPI phục vụ recommendation; Reader kiểm tra entitlement ở
> server. Hệ thống hiện có 5.246 trên 5.246 sách có nội dung, không có sách trống,
> không thiếu edition Ebook và không thiếu DigitalAsset.

> Điểm em tập trung là tính nhất quán dữ liệu, phân quyền, khả năng phục hồi và
> ghi nhãn trung thực giữa dữ liệu thật, dữ liệu nguồn mở và dữ liệu demo.

## 5. Luồng người bán bổ sung 2 phút

Chỉ thực hiện nếu giảng viên hỏi.

1. Đăng nhập `seller.bookverse.demo@gmail.com`.
2. Mở `/seller`.
3. Vào `/seller/listings`.
4. Mở một listing để trình bày tồn kho, trạng thái kiểm duyệt và chỉnh sửa.
5. Mở `/seller/orders` và `/seller/revenue`.

**Lời nói gợi ý**

> Người bán chỉ quản lý listing và order item thuộc chính mình. Trạng thái đơn
> hàng đi theo state machine; người bán không thể tự sửa đơn của tài khoản khác.

Không tạo listing mới hoặc đổi trạng thái đơn đang dùng cho demo nếu không cần.

## 6. Câu hỏi phản biện thường gặp

### “Toàn bộ sách có đọc được không?”

> Có. Database hiện có 5.246 sách hoạt động và cả 5.246 sách đều có BookChunk,
> edition Ebook và DigitalAsset. Nhóm B có tối thiểu 12 trang; nhóm RB có 32
> trang demo tiếng Việt mỗi cuốn.

### “Nội dung này có phải nguyên tác không?”

> Không. Nội dung Reader hiện là nội dung demo do BookVerse biên soạn để kiểm
> thử trải nghiệm đọc. Giao diện ghi rõ không phải bản dịch, trích đoạn hoặc nội
> dung nguyên tác.

### “Ảnh bìa và metadata lấy ở đâu?”

> Metadata nhóm RB có provenance Open Library. Quyền ảnh bìa chưa xác minh vẫn
> giữ trạng thái `NOT_VERIFIED`; em không tuyên bố BookVerse sở hữu các bìa đó.
> Khi phát hành thật, chỉ bìa có hồ sơ quyền được duyệt mới được công khai.

### “Tại sao không đưa 50% nội dung sách thật?”

> Vì tỷ lệ phần trăm không tự tạo ra quyền sử dụng. Bản production chỉ được nhập
> nội dung khi có giấy phép cụ thể; bản đồ án dùng nội dung demo tự biên soạn.

### “AI có bịa dữ liệu cá nhân không?”

> Không. Claim cá nhân hóa chỉ được hiển thị khi có dữ liệu tài khoản đã xác minh.
> Khi thiếu dữ liệu, hệ thống trả trạng thái trung tính hoặc local fallback.

## 7. Phương án dự phòng

### Reader tải chậm

1. Giữ nguyên trang và đợi trạng thái “Đang tải nội dung sách”.
2. Nếu hiện lỗi, bấm `Thử tải lại`.
3. Dùng đường dẫn ổn định `/read/RB00004`.
4. Không khởi động thêm server khi cổng 3000 đã chạy.

### Internet ngoài bị mất

- Catalog, PostgreSQL, nội dung Reader và ảnh local vẫn hoạt động.
- Trợ lý chuyển sang local fallback.
- Không thử provider AI bên ngoài.

### Provider AI chưa cấu hình

- Mở `/admin/integrations` để chỉ rõ trạng thái.
- Dùng câu hỏi nghiệp vụ để trình diễn local grounded fallback.
- Không nói câu trả lời local đến từ OpenAI/Gemini.

### Không đăng nhập được

1. Kiểm tra Caps Lock.
2. Dùng đúng email demo và mật khẩu `123456`.
3. Tải lại `/login`.
4. Nếu cần, chạy `npm run demo:check` để xác nhận tài khoản không bị khóa.

### Không muốn thay đổi dữ liệu

- Không tạo payment, không hoàn tiền và không đổi trạng thái order.
- Chỉ xem các bản ghi đã chuẩn bị.
- Có thể bỏ qua thao tác bookmark/highlight nếu cần giữ nguyên số liệu.

## 8. Những điều tuyệt đối không được tuyên bố

- Không nói toàn bộ sách hoặc ảnh bìa là tài sản của BookVerse.
- Không nói nội dung demo là nội dung nguyên tác hoặc bản dịch được cấp phép.
- Không nói giá demo là giá thị trường.
- Không nói Sandbox đã chuyển tiền thật.
- Không nói dữ liệu demo là dữ liệu khách hàng thật.
- Không nói OpenAI, Gemini hoặc email thật đã sẵn sàng nếu trang
  tích hợp báo `Chưa cấu hình` hoặc `Một phần`.
- Không nói metric recommendation hiện tại chứng minh hiệu quả thương mại.

## 9. Checklist 60 giây trước khi trình bày

- [ ] Docker database và AI service đang chạy.
- [ ] Next.js báo `Ready` tại cổng 3000.
- [ ] `npm run demo:defense` đạt `0 FAIL`.
- [ ] Đăng nhập thử tài khoản độc giả.
- [ ] `/read/RB00004` tải đúng 32 trang.
- [ ] Catalog tìm được `dam dai da qua`.
- [ ] Chuẩn bị tài khoản Admin ở cửa sổ riêng.
- [ ] Tắt thông báo, ứng dụng chat và tab cá nhân.
- [ ] Nhớ nói rõ “dữ liệu demo” và “thanh toán Sandbox”.
