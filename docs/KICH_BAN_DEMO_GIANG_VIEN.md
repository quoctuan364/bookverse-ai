# Kịch bản video demo BookVerse AI

> Bản video mới quay thao tác thật qua ba vai trò độc giả, người bán và quản trị.
> Video slideshow cũ chỉ được giữ làm tư liệu, không dùng làm bản gửi giảng viên.

Thời lượng mục tiêu: khoảng 2 phút. Tài khoản sử dụng trong video là tài khoản độc giả demo đã được chuẩn bị sẵn.

## 1. Mở đầu

> Em xin chào thầy/cô. Đây là BookVerse AI, đồ án xây dựng nền tảng đọc, khám phá và trao đổi sách trong cùng một hệ thống. Video này trình bày nhanh luồng sử dụng chính ở góc nhìn độc giả.

## 2. Trang chủ

> Trang chủ tập trung vào hành động tìm cuốn sách tiếp theo. Người dùng có thể tìm theo từ khóa, mô tả nhu cầu bằng ngôn ngữ tự nhiên, tiếp tục sách đang đọc hoặc đi thẳng tới kho Ebook. Các bìa hiển thị trong khu vực công khai đều lấy từ danh mục sách thật đã được xác minh.

## 3. Danh mục và bộ lọc

> Danh mục hỗ trợ tìm theo tên sách, tác giả, ISBN hoặc nhà xuất bản. Người dùng có thể kết hợp thể loại, khoảng giá, ngôn ngữ, năm xuất bản, mức đánh giá, tình trạng còn hàng và cách sắp xếp. Trong ví dụ này, hệ thống đang lọc các sách từ bốn sao và còn hàng.

## 4. Chi tiết sách

> Trang chi tiết cung cấp bìa, tác giả, giá, mô tả và thông tin ra quyết định. Hệ thống cho biết nội dung có thể đọc thử hay đọc toàn bộ, tình trạng tin bán và cách theo dõi đơn hàng. Người dùng có thể lưu yêu thích, thêm giỏ hoặc mở trình đọc.

## 5. Thư viện cá nhân

> Khu vực đọc sách tổng hợp các đầu sách người dùng được cấp quyền truy cập, tiến độ đang đọc và vị trí gần nhất. Nhờ đó người dùng có thể tiếp tục đúng nội dung đã dừng mà không phải tìm lại thủ công.

## 6. Trình đọc Ebook

> Trình đọc hỗ trợ mục lục, chuyển trang, bookmark, highlight, ghi chú, tìm trong sách, đổi phông và cỡ chữ, chế độ màu, tự cuộn và đọc thành tiếng. Bên cạnh nội dung là trợ lý AI theo ngữ cảnh để hỗ trợ đặt câu hỏi trong quá trình đọc.

## 7. Trợ lý AI

> Trợ lý AI tiếp nhận câu hỏi tự nhiên, xác định ý định rồi truy xuất dữ liệu nội bộ phù hợp trước khi trả lời. Với yêu cầu tìm sách, hệ thống sử dụng danh mục và cơ chế gợi ý có giải thích. Nếu dịch vụ mô hình bên ngoài không sẵn sàng, giao diện hiển thị rõ trạng thái dự phòng thay vì giả lập kết quả.

## 8. Chợ sách cũ

> Chợ sách cũ giúp sách có thêm một vòng đời. Người dùng có thể tìm tin bán, xem tình trạng sách, người bán, giá và thêm sản phẩm vào giỏ. Luồng người bán còn có quản lý tin đăng, đơn hàng và doanh thu.

## 9. Dashboard

> Dashboard tổng hợp số phút đọc, tiến độ trung bình, số phiên, số trang và biểu đồ thói quen theo thời gian. Đây là dữ liệu cá nhân của tài khoản đang đăng nhập, đồng thời tạo tín hiệu cho chức năng gợi ý sách.

## 10. Kết thúc

> Tóm lại, BookVerse AI kết nối bốn luồng chính: khám phá sách, đọc Ebook, giao dịch sách và hỗ trợ bằng AI. Hệ thống được thiết kế responsive, có phân quyền, kiểm tra accessibility và công khai rõ dữ liệu demo cũng như trạng thái tích hợp. Em cảm ơn thầy/cô đã theo dõi.

## Gợi ý khi trình bày trực tiếp

- Không khẳng định mô hình AI đang đạt chất lượng cao nếu chưa có đánh giá người dùng thật.
- Nói rõ nội dung Ebook hiện tại là nội dung minh họa do BookVerse biên soạn để thử chức năng trình đọc.
- Nếu giảng viên hỏi dữ liệu, trình bày rõ catalog công khai dùng đầu sách và bìa thật; dữ liệu hành vi, đơn hàng và một phần giá là dữ liệu demo.
- Nếu cần demo sâu hơn, ưu tiên mở thêm trang quản trị và luồng người bán sau video chính.

## Dựng lại video khi giao diện thay đổi

```powershell
python -m pip install --target outputs/demo-tools -r scripts/requirements-demo-video.txt
python scripts/build_demo_video.py
```

Video được xuất tại `outputs/demo-video/BookVerse_AI_Demo_GiangVien.mp4`.

## Quay bản thao tác thật để gửi giảng viên

Đảm bảo web đang chạy tại `http://127.0.0.1:3000`, sau đó chạy:

```powershell
npx tsx scripts/record_demo_walkthrough.ts
python scripts/add_walkthrough_narration.py
```

File hoàn chỉnh có thao tác trình duyệt và lời thuyết minh:

`outputs/demo-walkthrough/BookVerse_AI_Demo_Gui_GiangVien.mp4`
