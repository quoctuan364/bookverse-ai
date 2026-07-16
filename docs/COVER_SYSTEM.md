# Hệ thống Book Cover V2

Cập nhật: 16/07/2026.

## Kết luận trung thực

BookVerse hiện **chưa có bìa nhà xuất bản đã xác minh**. Artwork V2 là tài sản demo nguyên bản được tạo cho đồ án và luôn mang nhãn `BookVerse Demo`. Không được gọi chúng là bìa thật trong báo cáo bảo vệ.

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Dataset ultra có 2.200 cover | VERIFIED | `npm run covers:audit`: 2.200 record | Toàn bộ là `SYNTHETIC_DATA` |
| Cover synthetic cũ | VERIFIED | 2.200 `LEGACY_SYNTHETIC`, 2.200 `NOT_VERIFIED`, 0 Git-tracked | File đang có cục bộ nhưng không bảo đảm tồn tại ở clone/deploy khác |
| Artwork fallback V2 | VERIFIED | 8 WebP `320x480`, manifest `GENERATED_DEMO_ASSET` | Không phải bìa của sách phát hành thật |
| Bìa thật có giấy phép | NOT_AVAILABLE | Manifest approved có 0 entry | Cần NXB/tác giả/nguồn hợp pháp cung cấp |
| HTTP audit database demo | BLOCKED | Database/Docker đang dừng | `BLOCKED_DB_UNAVAILABLE` |

## Luồng hiển thị

1. `BookCover` kiểm tra cú pháp `coverPath`.
2. Null hoặc malformed chuyển thẳng sang fallback.
3. `/covers/flat`, `/covers/3d`, PNG `Bxxx` cũ và Picsum được phân loại synthetic, không hiển thị như bìa thật.
4. Local/remote hợp lệ được thử tải đúng một lần.
5. Load error hoặc timeout chuyển sang fallback; reducer đã đóng trạng thái nên không retry vô hạn.
6. Local chỉ thành `LOCAL_VALID` sau `onLoad`. Remote chưa có bằng chứng nguồn vẫn giữ `NOT_VERIFIED`.

## Fallback V2

- 8 motif: Technology, Business, Literature, History, Health, Language, Science, Travel.
- 6 layout deterministic theo FNV-1a của `bookId`.
- Cùng `bookId` và title tạo cùng fallback ở mọi surface.
- Title tối đa 3 dòng; author tối đa 2 dòng.
- Loại `#xxxx` khỏi title hiển thị trong fallback và số synthetic cuối author; không sửa dữ liệu nguồn.
- Không có giá, edition, ID hoặc category badge bên trong ảnh.
- Kích thước asset `320x480`, tỷ lệ component `2:3`, có alt/aria label và vùng kích thước cố định.

## Surface đã nối component

Home, Catalog, Recommendation, Book Detail, Marketplace, Cart, Seller, Community, Library, Order Detail, Profile, Admin và Assistant đều dùng `components/shared/BookCover.tsx`. Browser-smoke từng surface còn `PARTIAL` vì database demo không hoạt động.

## Bổ sung bìa thật đúng cách

1. Nhận URL/file và bằng chứng sử dụng từ NXB, tác giả hoặc nguồn có giấy phép.
2. Không ghi đè dataset gốc.
3. Thêm entry vào `config/real-cover-sources.json` gồm `bookId`, URL và `licenseReference`.
4. Lưu file 2:3 tối ưu WebP nếu giấy phép cho phép self-host.
5. Chạy `npm run covers:audit` và browser-smoke mọi surface.
6. Chỉ phân loại `REAL_VALID` khi HTTP/image hợp lệ **và** có bằng chứng nguồn trong manifest.

Danh sách ưu tiên nằm tại `docs/REAL_COVER_CANDIDATES.csv`. Các rating dùng để xếp ưu tiên là `SYNTHETIC_DATA`, không phải rating người dùng thật.

## Lệnh tái lập

```powershell
npm run covers:build-art
npm run covers:candidates
npm run covers:audit
npx tsx --test tests/book-cover.test.ts
npm run typecheck
npm run build
```
