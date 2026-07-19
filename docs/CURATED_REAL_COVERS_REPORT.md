# Báo cáo bộ bìa curated cho demo nhỏ

Cập nhật: 16/07/2026.

## 1. Kết luận

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Khớp sách | VERIFIED | 20/20 ISBN có metadata title/author tương thích trên Open Library; downloader exit 0 | Xác minh bibliographic, không phải giấy phép bản quyền |
| File ảnh | VERIFIED | 20 JPEG, 20 checksum SHA-256 duy nhất theo manifest; min `200x300`, ratio `0.55–0.85` | Hai ảnh chỉ rộng 200–229px, đủ card nhưng chưa tối ưu màn hình chi tiết lớn |
| Quan sát nội dung ảnh | VERIFIED | Đã mở trực tiếp đủ 20 file; lỗi screenshot `Mindset` được loại và thay bằng edition sạch | Chưa quan sát trong Next.js vì bộ 20 sách chưa tồn tại trong DB hiện hành |
| Quyền sử dụng/tái phân phối | NOT_VERIFIED | Manifest ghi `rightsStatus=NOT_VERIFIED` cho 20/20 | Không được gọi là publisher-licensed hoặc dùng thương mại khi chưa xác minh |
| Tích hợp database Next.js | NOT_AVAILABLE | Read-only DB: 1.200 sách synthetic, không có 20 ID `B001–B020` này | Lượt này không seed/import/migration hoặc ghi DB |

## 2. Phạm vi dữ liệu

- Nguồn: `data/demo/books.csv`, 20 sách có title/author và URL Open Library chứa ISBN.
- Dataset ultra-2200 và database Next.js 1.200 sách hiện hành là synthetic, không có bìa xuất bản thật khớp chính xác.
- Không sửa/ghi đè `data/demo/books.csv` hoặc `data/demo/covers`.
- Tạo file dẫn xuất `data/derived/demo-books-with-local-covers.csv`.

## 3. Quality gate

Mỗi ảnh chỉ được nhận khi:

1. Search API trả đúng ISBN.
2. Title của work/edition và author tương thích với dòng dữ liệu.
3. Cover API trả HTTP thành công và `image/jpeg`.
4. JPEG đọc được, dung lượng tối thiểu 5.000 byte.
5. Kích thước tối thiểu `200x300`, tỷ lệ từ `0.55` đến `0.85`.
6. SHA-256 trong manifest khớp file local.

`B014 Mindset` dùng ISBN `9781400062751` thay cho URL trong CSV vì ảnh gốc là screenshot tỷ lệ `0.45`. `B019 Made to Stick` dùng ISBN `9780099505693` vì ảnh gốc chỉ `183x276`. Cả hai thay đổi chỉ nằm trong derived/manifest.

## 4. Artifact

- `public/covers/curated-real/*.jpg`: 20 ảnh.
- `config/curated-demo-cover-sources.json`: ISBN, nguồn, metadata, kích thước, checksum và trạng thái quyền.
- `data/derived/demo-books-with-local-covers.csv`: bản dẫn xuất trỏ tới local cover.
- `scripts/download_curated_demo_covers.ts`: downloader có thể chạy lại.
- `tests/curated-cover-assets.test.ts`: test offline cho count, file set, checksum và quality gate.

## 5. Lệnh và exit code

```text
npm run covers:download-curated                         exit 0 — 20/20 VERIFIED
npx tsx --test tests/curated-cover-assets.test.ts       exit 0 — 2/2 PASS
npx tsc --noEmit --pretty false                         exit 0
git status --short -- data/demo/books.csv data/demo/covers
                                                        exit 0 — không có output, file gốc không đổi
```

## 6. Điều chưa được tuyên bố

- Không nói 20 ảnh đã có giấy phép nhà xuất bản.
- Không nói database/app Next.js hiện đã hiển thị 20 ảnh này.
- Không nói 1.200 hoặc 2.200 sách synthetic đã có bìa thật.
- Không gọi lượt tải/kiểm tra của agent là UAT người dùng thật.

Hướng dẫn API được dùng: [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) và [Open Library Search API](https://openlibrary.org/dev/docs/api/search).
