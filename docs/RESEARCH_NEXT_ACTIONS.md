# Việc cần người thực hiện cho UAT và nghiên cứu relevance

Code không được tự tạo consent, rating hoặc hành vi giả. Phần này liệt kê đúng
những việc chủ đồ án cần tổ chức; pipeline phân tích và quality gate đã có sẵn.

## 1. Chuẩn bị người tham gia

- Tuyển 12–20 người cho UAT; dùng mã `P01`–`P20`, không lưu họ tên/email trong CSV.
- Tuyển 10–20 người cho relevance pilot. Có thể dùng cùng nhóm nếu tổ chức hai
  phiên tách biệt và nói rõ nguy cơ carry-over trong limitation.
- Chốt trước thiết bị desktop/mobile, lịch, người điều phối và consent version.
- Không chọn/lọc lại người tham gia sau khi nhìn kết quả.

## 2. UAT/SUS

1. Sao chép `docs/UAT_RESPONSE_TEMPLATE.csv` thành file làm việc mới; không sửa
   template gốc.
2. Làm đúng sáu task trong `docs/UAT_SESSION_GUIDE.md`.
3. Ghi thời gian, lỗi, assistance và đủ 10 câu SUS; không điền hộ người dùng.
4. Phân tích:

```powershell
python scripts/analyze_uat.py path\to\uat-responses.csv
```

5. Chỉ công bố số liệu khi analyzer trả `AVAILABLE`; giữ cả phiên thất bại và
   nhận xét tiêu cực.

## 3. Blinded human relevance

1. Với mỗi participant, xuất top-10 của `content`, `behavior`, `hybrid` trên
   cùng catalog snapshot. Candidate phải có đủ metadata theo
   `docs/BLINDED_RELEVANCE_CANDIDATES_TEMPLATE.csv`.
2. Khóa seed trước khi tạo phiếu:

```powershell
npm run study:relevance:prepare -- `
  --candidates=path\to\real-candidates.csv `
  --seed=20260730
```

3. Chỉ đưa `participant-rating-form.csv` cho người tham gia. Giữ
   `organizer-secret-key.csv` kín và không commit.
4. Người tham gia điền `consent=YES` và rating 1–5; không cho xem tên thuật toán.
5. Phân tích bằng `study:relevance:analyze`. Không gọi kết quả này là CTR.

## 4. Dữ liệu cần gửi lại để hoàn tất báo cáo

- CSV UAT thật đã mã hóa.
- Candidate/rating relevance thật và secret key lưu riêng.
- Số người mời, số người consent, thiết bị và ngày tổ chức.

Khi có các dữ liệu này, chạy analyzer trước; chỉ đưa artifact đã qua validation
vào chương thực nghiệm và UAT.
