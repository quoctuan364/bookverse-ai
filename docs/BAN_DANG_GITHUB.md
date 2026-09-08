# Phạm vi bản đăng GitHub

Bản này là snapshot mã nguồn ngày 08/09/2026, xuất riêng từ workspace hiện tại. Không mang lịch sử Git cũ lên repository mới. Workspace và file dữ liệu gốc được giữ nguyên.

Bao gồm web, AI service, mobile, schema/migration, bộ kiểm thử, script demo, tài liệu, dữ liệu demo và báo cáo Word. Các tài khoản và giao dịch trong fixture/seed dùng cho demo; không dùng mật khẩu demo ở production.

Không bao gồm .env thực tế, database backup, node_modules, output/cache, video quay demo, nội dung Ebook ngoài và ảnh bìa tải về thuộc các thư mục bị loại. Các script báo cáo lịch sử có thể tham chiếu ảnh/output chỉ còn trên máy tác giả. Demo cô lập dùng seed riêng; không cần phục hồi database gốc.

Dữ liệu Ultra-2200 là synthetic; catalog tuyển chọn là metadata tham khảo, không phải quyền phân phối toàn văn sách. Bản đọc minh họa và Sandbox phải được ghi rõ khi báo cáo/demo. Xem DATA_AND_LICENSE_MANIFEST.md để hiểu nguồn dữ liệu.

Kiểm chứng khi đăng: npm run test:unit đạt 272/272 trên workspace nguồn. Đã quét mẫu API token/private key và đối chiếu các secret đủ dài trong .env: không phát hiện khớp trong bản xuất. Đây không phải cam kết kiểm toán bảo mật đầy đủ.
