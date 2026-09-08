# Hướng dẫn tổ chức phiên UAT BookVerse

Tài liệu này dùng cho người điều phối. Không điền trước kết quả và không thay
người tham gia trả lời SUS.

## 1. Chọn người tham gia

- Mục tiêu 10–20 người từng sử dụng website mua sách hoặc đọc nội dung số.
- Cố gắng cân bằng người dùng desktop/mobile; ghi rõ đây là mẫu thuận tiện.
- Không tuyển thành viên trực tiếp phát triển BookVerse vào mẫu chính.
- Chỉ lưu mã `P01`, `P02`...; không lưu họ tên, email hoặc số điện thoại trong CSV.

## 2. Lời giới thiệu và đồng thuận

Đọc nguyên ý sau trước mỗi phiên:

> Đây là bản demo học thuật BookVerse. Chúng tôi đánh giá giao diện, không đánh
> giá năng lực của bạn. Thanh toán chỉ là Sandbox, không dùng tiền thật. Bạn có
> thể dừng bất kỳ lúc nào. Dữ liệu chỉ lưu dưới mã Pxx và không ghi thông tin
> định danh. Bạn có đồng ý tham gia không?

Chỉ ghi `consent=1` khi người tham gia trả lời đồng ý. Nếu không đồng ý, kết thúc
phiên và không nhập dữ liệu.

## 3. Quy tắc điều phối

1. Gán trước `desktop` hoặc `mobile`; không đổi thiết bị giữa phiên.
2. Đọc câu nhiệm vụ, không chỉ vị trí nút và không gợi ý trong 60 giây đầu.
3. Bắt đầu tính giờ ngay sau khi đọc xong; dừng khi đạt tiêu chí thành công hoặc
   người tham gia bỏ cuộc.
4. Mỗi lần phải chỉ dẫn thao tác được tính một `assistance_count`.
5. Mỗi thao tác sai, thông báo lỗi hoặc quay lại do nhầm được tính một
   `error_count`; ghi nhận nhất quán cho mọi người.
6. Không loại phiên thất bại hoặc nhận xét tiêu cực.

## 4. Câu giao nhiệm vụ

| Mã | Câu đọc cho người tham gia |
|---|---|
| T01 | Hãy tìm và mở một cuốn sách bằng cụm từ tiếng Việt không dấu. |
| T02 | Hãy đọc thử, chuyển trang và tạo một bookmark có thể tìm lại. |
| T03 | Hãy đánh dấu một đoạn văn, thêm ghi chú và kiểm tra sau khi tải lại. |
| T04 | Hãy chọn một gói hội viên và hoàn tất thanh toán Sandbox. |
| T05 | Hãy hỏi trợ lý về quyền lợi hội viên và tìm trang liên quan từ câu trả lời. |
| T06 | Hãy tạo một tin bán sách cũ và kiểm tra trạng thái sau khi gửi. |

## 5. SUS sau nhiệm vụ

Người tham gia chấm 1–5, từ “hoàn toàn không đồng ý” đến “hoàn toàn đồng ý”.
Giữ cùng 10 câu trả lời SUS trên mọi dòng task của một người trong CSV để
analyzer kiểm tra tính nhất quán.

1. Tôi muốn sử dụng hệ thống này thường xuyên.
2. Tôi thấy hệ thống phức tạp không cần thiết.
3. Tôi thấy hệ thống dễ sử dụng.
4. Tôi nghĩ mình cần người có kỹ thuật hỗ trợ để dùng hệ thống.
5. Tôi thấy các chức năng được tích hợp tốt.
6. Tôi thấy hệ thống có quá nhiều điểm thiếu nhất quán.
7. Tôi nghĩ đa số mọi người có thể học cách dùng hệ thống nhanh.
8. Tôi thấy hệ thống khó sử dụng.
9. Tôi cảm thấy tự tin khi sử dụng hệ thống.
10. Tôi cần học nhiều thứ trước khi có thể sử dụng hệ thống.

## 6. Chốt phiên và phân tích

- Hỏi mở: “Điểm khó chịu nhất là gì?” và “Bạn muốn thay đổi điều gì đầu tiên?”.
- Kiểm tra đủ sáu task trước khi kết thúc, nhưng không tự bổ sung dòng còn thiếu.
- Sao chép template sang file mới, nhập dữ liệu thật rồi chạy:

```powershell
python scripts/analyze_uat.py path\to\uat-responses.csv
```

- Báo cáo đầy đủ cả kết quả tốt, xấu, phiên thiếu task và giới hạn mẫu.
