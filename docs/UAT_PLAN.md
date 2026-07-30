# Kế hoạch UAT và SUS cho BookVerse

Kịch bản điều phối chi tiết và 10 câu SUS nằm tại
[`UAT_SESSION_GUIDE.md`](UAT_SESSION_GUIDE.md).

## Mục tiêu

Đánh giá khả năng người dùng hoàn thành các luồng cốt lõi và cảm nhận khả dụng
của hệ thống. UAT không dùng để chứng minh chất lượng recommendation hoặc chatbot;
hai thành phần đó có thước đo riêng.

## Mẫu và đạo đức

- Mục tiêu tối thiểu: 12 người; nên đạt 20 người nếu đủ thời gian.
- Mã hóa người tham gia bằng `P01`, `P02`..., không ghi họ tên, email hay số điện thoại.
- Giải thích đây là bản demo, thanh toán không dùng tiền thật.
- Người tham gia có quyền dừng bất kỳ lúc nào.
- Không điền kết quả thay người dùng và không loại phản hồi xấu khỏi báo cáo.
- Ghi `consent=1` sau khi người tham gia đồng ý; không nhập phiên chưa đồng thuận.
- Gán trước mỗi người vào `desktop` hoặc `mobile` và giữ cùng thiết bị suốt phiên.

## Nhiệm vụ

| Mã | Nhiệm vụ | Thành công khi |
|---|---|---|
| T01 | Tìm một sách bằng truy vấn tiếng Việt không dấu | Mở đúng trang chi tiết sách |
| T02 | Đọc thử, chuyển trang và tạo bookmark | Bookmark xuất hiện trong thư viện |
| T03 | Tạo highlight kèm ghi chú | Highlight được lưu sau khi tải lại |
| T04 | Chọn gói và hoàn tất thanh toán Sandbox | Giao dịch `PAID_DEMO`, quyền đọc được cấp |
| T05 | Hỏi trợ lý về quyền hội viên | Câu trả lời dẫn đúng route và không bịa trạng thái tài khoản |
| T06 | Đăng một tin bán sách cũ | Tin được tạo ở trạng thái đúng quy trình kiểm duyệt |

## Quy trình mỗi phiên

1. Giới thiệu và xin đồng thuận.
2. Giao nhiệm vụ chỉ bằng câu mô tả, không chỉ vị trí nút.
3. Ghi thành công, thời gian, số lỗi và số lần cần trợ giúp cho từng nhiệm vụ.
4. Không can thiệp trong 60 giây đầu; nếu hỗ trợ thì ghi một lỗi.
5. Sau nhiệm vụ cuối, người tham gia trả lời 10 câu SUS theo thang 1–5.
6. Ghi nhận nhận xét mở, kể cả nhận xét tiêu cực.

## Cổng kết luận

- Báo cáo số người tham gia và số lượt task.
- Công bố success rate, thời gian trung vị và số lỗi theo từng task.
- Công bố số lần trợ giúp và so sánh thăm dò desktop/mobile.
- Công bố số người hoàn thành đủ cả sáu nhiệm vụ; không giấu phiên thiếu task.
- Báo SUS trung bình, trung vị, khoảng giá trị và CI 95% khi có ít nhất 2 người.
- Ghi nguyên trạng giới hạn của mẫu thuận tiện.
- Chỉ ghi `AVAILABLE` sau khi CSV có phản hồi thật.

## Nhập và phân tích

Sao chép `docs/UAT_RESPONSE_TEMPLATE.csv` sang một file mới ngoài dữ liệu gốc,
điền một dòng cho mỗi cặp người tham gia–nhiệm vụ rồi chạy:

```powershell
python scripts/analyze_uat.py path\to\uat-responses.csv
```

Output mới được tạo trong `outputs/uat/<timestamp>/`; script không sửa CSV đầu vào.
