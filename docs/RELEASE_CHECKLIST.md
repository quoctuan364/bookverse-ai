# Checklist phát hành và bảo vệ BookVerse

## 1. Đóng băng phạm vi

- Không thêm phân hệ mới.
- Đóng góp chính: nền tảng đọc và giao dịch sách tích hợp hệ gợi ý có giải thích
  cùng trợ lý RAG kiểm soát nguồn.
- Mọi số liệu trong báo cáo phải gắn commit và ngày chạy.

## 2. Clean-clone rehearsal

Trên máy hoặc thư mục mới:

```powershell
git clone <repository-url> bookverse-release-check
cd bookverse-release-check
npm run demo:bootstrap
npm run lint
npm run typecheck
npm run test:unit
python -m pytest ai_service/tests -q
npm run build
npm run test:e2e:smoke
```

Chỉ kết luận sẵn sàng khi:

- `demo:check`: 0 FAIL.
- Lint, typecheck, unit test, Python test và build exit 0.
- E2E đạt đủ desktop và mobile.
- Không cần file nằm ngoài Git, trừ secret được khai báo rõ.

## 3. Release evidence

Lưu trong biên bản bảo vệ:

- Commit SHA và trạng thái Git sạch.
- Phiên bản Node, npm, Python, Docker và PostgreSQL.
- Checksum dataset dùng cho evaluation.
- Log test có exit code.
- Ảnh chụp các luồng demo chính.
- File `evaluation.json` và research evaluation của đúng commit.

## 4. Dữ liệu và pháp lý

- Nội dung `NỘI_DUNG_DEMO_BOOKVERSE` phải được gọi là nội dung minh họa.
- Không tuyên bố bìa `NOT_VERIFIED` có quyền tái phân phối.
- Không gọi giá demo là giá thị trường.
- Không dùng dữ liệu synthetic để tạo tuyên bố CTR/UAT/người dùng thật.
- Không đưa secret, email cá nhân hoặc dữ liệu nhận dạng vào bản nộp.

## 5. Phương án dự phòng

- Video demo offline 5–8 phút.
- Ảnh chụp dashboard và kết quả test.
- Một database demo đã kiểm tra và một bản dump phục hồi.
- Provider AI lỗi: dùng grounded local fallback và nói rõ trạng thái degraded.
- Mạng lỗi: toàn bộ luồng cốt lõi vẫn demo được bằng dữ liệu local.

## 6. Trước giờ bảo vệ

```powershell
npm run demo:defense
```

- Đăng nhập thử tài khoản độc giả và admin.
- Mở Reader, bookmark, highlight, membership và Assistant.
- Kiểm tra không có tiến trình khác chiếm cổng 3000/5432/8000.
- Không chạy seed/import trong lúc thuyết trình.

