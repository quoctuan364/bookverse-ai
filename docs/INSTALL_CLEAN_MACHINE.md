# Cài đặt BookVerse AI trên máy sạch

Tài liệu này mô tả đường chạy demo chuẩn trên Windows. Quy trình dùng database
và container riêng, không sửa file dữ liệu nguồn và không yêu cầu API key của
OpenAI hoặc Gemini.

## 1. Yêu cầu

- Windows 10/11 64-bit.
- Git.
- Node.js 20 LTS trở lên, kèm npm.
- PowerShell 7 (`pwsh`).
- Docker Desktop đang chạy ở chế độ Linux containers.
- Tối thiểu 12 GB RAM trống và khoảng 15 GB dung lượng đĩa cho image/cache.

Kiểm tra phiên bản:

```powershell
git --version
node --version
npm --version
pwsh --version
docker version
docker compose version
```

## 2. Cài đặt demo cô lập

```powershell
git clone <URL_REPOSITORY_BOOKVERSE>
cd BookVerse-AI
npm run demo:bootstrap
```

`demo:bootstrap` thực hiện `npm ci`, tạo `.env.demo` bằng secret ngẫu nhiên,
khởi động PostgreSQL riêng ở cổng `55432`, apply migration, seed dữ liệu demo và
chạy readiness gate. Script không ghi đè `.env` hay CSV/JSON/HTML nguồn.

Nếu dependency đã được cài đúng từ `package-lock.json`, có thể bỏ qua bước cài:

```powershell
npm run demo:bootstrap -- -SkipInstall
```

## 3. Khởi động

```powershell
npm run demo:start
```

Các địa chỉ mặc định:

| Thành phần | Địa chỉ |
|---|---|
| Web | `http://127.0.0.1:3000` |
| AI service | `http://127.0.0.1:8800` |
| PostgreSQL | `127.0.0.1:55432` |

Lần đầu AI service cần build image. Những lần sau có thể chạy:

```powershell
npm run demo:start -- -SkipAiBuild
```

## 4. Cổng kiểm tra trước khi demo

Không chạy seed lại ngay trước buổi bảo vệ. Chỉ chạy các kiểm tra không sửa dữ
liệu sau:

```powershell
npm run typecheck
npm run test:unit
npm run demo:defense
```

Kết quả tối thiểu chấp nhận:

- TypeScript không có lỗi.
- Unit test không có test thất bại.
- `demo:defense` có `0 WARN, 0 FAIL`.

Full gate cần nhiều thời gian và tạo database test cô lập:

```powershell
npm run demo:defense:full
```

## 5. Xử lý lỗi thường gặp

### Docker Engine chưa chạy

Mở Docker Desktop, chờ trạng thái Engine running rồi chạy lại bootstrap. Không
xóa volume hoặc database để xử lý lỗi này.

### Cổng đang được sử dụng

Kiểm tra tiến trình/container đang giữ cổng:

```powershell
Get-NetTCPConnection -LocalPort 3000,55432,8800 -ErrorAction SilentlyContinue
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Không dừng container không thuộc BookVerse. Nếu cần đổi cổng, sửa bản sao local
`.env.demo`; không commit secret hoặc cấu hình máy cá nhân.

### `npm ci` thất bại

Xác minh Node.js 20+, kết nối npm registry và `package-lock.json` còn nguyên.
Không dùng `--force` hoặc tự ý xóa lockfile.

### Readiness báo thiếu dữ liệu

Lưu toàn bộ log, kiểm tra đúng container `bookverse-demo-db`, sau đó chạy lại:

```powershell
npm run demo:check
```

Không chạy migration reset, `prisma db push --force-reset` hoặc seed vào database
không rõ tên.

## 6. Quy tắc dữ liệu và AI

- Nội dung gắn nhãn `NỘI_DUNG_DEMO_BOOKVERSE` là nội dung minh họa, không phải
  nguyên tác hoặc bản dịch chính thức.
- Không báo CTR, SUS, UAT hoặc hiệu quả người dùng thật khi chưa có evidence thật.
- Không đưa API key vào Git, slide, video hoặc log.
- Chỉ ingest tài liệu có provenance và quyền sử dụng rõ ràng.
