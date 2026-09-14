

BookVerse AI là nền tảng nhà sách trực tuyến thông minh tích hợp khám phá sách, đọc Ebook, hội viên, chợ sách và hệ thống gợi ý.
Dự án kết hợp ứng dụng web Next.js với dịch vụ recommendation FastAPI, sử dụng PostgreSQL/Prisma làm tầng dữ liệu chính.

🛠️ Công nghệ chính

Frontend / Web: Next.js 15, React 19, TypeScript, Tailwind CSS

Backend: Next.js Server Actions & Route Handlers

Database: PostgreSQL, Prisma ORM, pgvector

AI / Recommendation: FastAPI, Pandas, Scikit-learn, SQLAlchemy

Authentication: Auth.js / NextAuth.js

Mobile: React Native / Expo

Deployment & Demo: Docker Compose

✨ Chức năng nổi bật

Đăng ký, đăng nhập, quên mật khẩu và phân quyền Độc giả / Người bán / Kiểm duyệt / Quản trị viên.

Khám phá, tìm kiếm và xem chi tiết sách theo catalog.

Gợi ý sách dựa trên Popularity + Content + Behavior và dữ liệu tương tác.

Trợ lý AI hỗ trợ hỏi đáp và tìm sách bằng RAG, có cơ chế fallback khi dịch vụ ngoài không khả dụng.

Đọc Ebook online, đọc thử, lưu tiến độ, bookmark và highlight.

Gói hội viên cho phép mở khóa kho đọc theo thời hạn.

Chợ sách và Seller Dashboard hỗ trợ đăng bán, quản lý listing, đơn hàng và doanh thu.

Giỏ hàng, đơn hàng và thanh toán Sandbox/Demo.

Admin Center quản lý người dùng, sách, listing, đơn hàng, hội viên, nội dung và audit log.

🧩 Kiến trúc tổng quan

Browser / Mobile
       │
       ▼
Next.js 15 + React 19
 ├─ UI / Server Actions / API Routes
 ├─ Authentication & Authorization
 └─ RAG Assistant
       │
       ├──────────────► FastAPI Recommendation Service
       │
       ▼
PostgreSQL + Prisma + pgvector

🚀 Chạy nhanh

Yêu cầu

Node.js 20+

PowerShell 7

Docker Desktop

git clone https://github.com/quoctuan364/bookverse-ai.git
cd bookverse-ai
npm run demo:bootstrap
npm run demo:start

Mở ứng dụng tại:

http://127.0.0.1:3000

👤 Tài khoản demo

Vai trò

Email

Mật khẩu

Độc giả

reader.bookverse.demo@gmail.com

123456

Người bán

seller.bookverse.demo@gmail.com

123456

Kiểm duyệt viên

moderator.bookverse.demo@gmail.com

123456

Quản trị viên

admin.bookverse.demo@gmail.com

123456

Các tài khoản trên chỉ phục vụ môi trường demo của đồ án.

📖 Documentation

Hướng dẫn cài đặt trên máy sạch

Kiến trúc hệ thống

Kịch bản demo bảo vệ

Trạng thái hiện hành của dự án

⚠️ Lưu ý

Thanh toán trong hệ thống sử dụng Sandbox/Demo, không phải giao dịch tiền thật.

Một phần catalog, giá, interaction và dữ liệu đánh giá được sử dụng dưới dạng demo/synthetic data phục vụ đồ án.

Nội dung Ebook minh họa không mặc định được xem là toàn văn tác phẩm gốc.

Các giới hạn và trạng thái kiểm chứng hiện hành được ghi rõ trong docs/CURRENT_STATUS.md.

🎓 Thông tin đồ án

Đề tài: PHÁT TRIỂN NHÀ SÁCH TRỰC TUYẾN THÔNG MINH TÍCH HỢP HỆ THỐNG GỢI Ý (BOOKVERSE AI)
Sinh viên: Lương Nguyễn Quốc Tuấn
MSSV: 22050098

<p align="center">
  <strong>BookVerse AI</strong> — Smart Online Bookstore & Recommendation System
</p>
