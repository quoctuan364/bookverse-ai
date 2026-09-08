# BookVerse AI - Phase 1 Core Platform

> Tài liệu này mô tả prototype Streamlit lịch sử tại `app.py` và `src/`.
> Hệ thống đồ án chính hiện nay là Next.js + PostgreSQL + FastAPI; xem
> [`README.md`](README.md). Không dùng prototype này làm kiến trúc production.

Tài liệu này dùng cho scaffold Next.js + Prisma được thêm vào repo hiện tại. Dữ liệu gốc trong `data/demo` chỉ được đọc khi seed, không bị xóa hoặc ghi đè.

## Lệnh khởi tạo nhanh

Nếu tạo project mới từ đầu:

```powershell
npx create-next-app@latest bookverse-ai --ts --tailwind --app --eslint --import-alias "@/*"
cd bookverse-ai
npm.cmd install prisma @prisma/client csv-parser lucide-react clsx tailwind-merge
npm.cmd install -D tsx
npx prisma init --datasource-provider postgresql
npx shadcn@latest init
```

Trong repo này, các file scaffold đã được tạo trực tiếp ở `D:\Doantotnghiep` để dùng lại thư mục `data/demo`.

## Cấu hình database

Tạo file `.env` từ `.env.example`, sau đó sửa `DATABASE_URL` theo PostgreSQL local:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/bookverse_ai?schema=public"
DEMO_DATA_DIR="D:/Doantotnghiep/data/demo"
```

## Chạy migrate và seed

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run db:seed
npm.cmd run dev
```

Sau khi chạy dev, mở `http://localhost:3000`.

## File chính

- `prisma/schema.prisma`: schema PostgreSQL cho user, sách, marketplace, order, community, interaction đa hình và recommendation.
- `prisma/seed.ts`: đọc CSV từ `data/demo`, import theo thứ tự Category -> Book -> User -> Listing -> Order -> Post -> Interaction.
- `app/layout.tsx`: layout Next.js App Router và metadata.
- `components/Navbar.tsx`: Navbar BookVerse AI với search, menu, giỏ hàng và đăng nhập.
