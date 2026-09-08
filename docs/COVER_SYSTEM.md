# Hệ thống Book Cover V2

Cập nhật: 19/07/2026.

## Kết luận trung thực

BookVerse hiện **chưa có bìa nhà xuất bản đã xác minh giấy phép**. Artwork V2 là tài sản demo nguyên bản được tạo cho đồ án và luôn mang nhãn `BookVerse Demo`. Ngoài ra repository có bộ 20 ảnh bìa bên ngoài đã khớp ISBN/metadata cho catalog demo nhỏ, nhưng quyền tái phân phối từng ảnh vẫn `NOT_VERIFIED`; không được gọi chúng là bìa “đã cấp phép”.

G2 bổ sung 3.046 URL/cover ID Open Library cho catalog tuyển chọn trên database test. Đây là `COVER_ID_PRESENT` và URL đã qua allowlist, **không phải** `REAL_VALID` hoặc publisher-licensed. UI lazy-load tối đa 24 cover mỗi trang Catalog; 404 chuyển fallback V2. G2.2 audit strict mới kiểm tra 3.046/3.046: 687 đạt technical policy, 2.335 redirect ngoài allowlist và 24 sai dimension; rights vẫn `NOT_VERIFIED`.

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Dataset ultra có 2.200 cover | VERIFIED | `npm run covers:audit`: 2.200 record | Toàn bộ là `SYNTHETIC_DATA` |
| Cover synthetic cũ | VERIFIED | 2.200 `LEGACY_SYNTHETIC`, 2.200 `NOT_VERIFIED`, 0 Git-tracked | File đang có cục bộ nhưng không bảo đảm tồn tại ở clone/deploy khác |
| Artwork fallback V2 | VERIFIED | 8 WebP `320x480`, manifest `GENERATED_DEMO_ASSET` | Không phải bìa của sách phát hành thật |
| Bìa thật có giấy phép | NOT_AVAILABLE | Manifest approved có 0 entry | Cần NXB/tác giả/nguồn hợp pháp cung cấp |
| Bìa curated khớp sách demo nhỏ | PARTIAL | 20/20 ISBN + title/author, HTTP image, JPEG, checksum, min `200x300`, ratio `0.55–0.85`; visual inspection 20/20 | `EXTERNAL_PROVIDER_ASSET`, rights `NOT_VERIFIED`, chưa nằm trong database Next.js hiện hành |
| Open Library catalog G2.2 | PARTIAL | Policy v4 audit 3.046/3.046: 687 `HTTP_VERIFIED`, 2.335 `INVALID_CONTENT` do final host ngoài allowlist, 24 `INVALID_DIMENSION`; report có host/chain/fallback reason | Chỉ HTTPS `covers.openlibrary.org`; rights `NOT_VERIFIED`, HTTP 200 không phải license |
| Database demo read-only | VERIFIED | G1 query được count/schema/migration; không dùng demo cho browser test ghi | Docker Desktop đã auto-start container demo khi daemon được mở; G1 không deploy/recreate |
| Browser smoke source hiện tại | VERIFIED | `audit_cover_ui.cjs` exit 0: 72 surface trên 6 viewport; `audit_real_catalog_ui.cjs` exit 0: 5 viewport × 8 surface, 404 fallback 24/24 | Local test trên `bookverse_ai_test`, chưa deploy |

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
- Cùng `bookId` tạo cùng fallback ở mọi surface; artwork chọn theo category/title keyword hoặc seed `bookId`.
- Title tối đa 3 dòng; author tối đa 2 dòng.
- Loại `#xxxx` khỏi title hiển thị trong fallback và số synthetic cuối author; không sửa dữ liệu nguồn.
- Không có giá, edition, ID hoặc category badge bên trong ảnh.
- Kích thước asset `320x480`, tỷ lệ component `2:3`, remote cover dùng `object-contain` để không crop ảnh lệch tỷ lệ, có alt/aria label và vùng kích thước cố định.

## Policy G2.2

- Nguồn policy duy nhất: `config/cover-policy.json`.
- Auditor ghi `originalHost`, `finalHost`, `redirectChain`, `redirectCount`, `technicalStatus`, `rightsStatus`, `lastCheckedAt` tương đương `checkedAt`, dimension và `fallbackReason`.
- Redirect tới `archive.org` hoặc `*.us.archive.org` hiện bị giữ `INVALID_CONTENT`; không tự thêm host chỉ vì redirect trả HTTP 200.
- Review 24 anomaly: 23 `LANDSCAPE_INVALID`, 1 `TOO_SMALL`; tất cả dùng fallback deterministic.

## Surface đã nối component

Home, Catalog, Recommendation, Book Detail, Marketplace, Cart, Seller, Community, Library, Order Detail, Profile, Admin và nhánh Assistant legacy đều dùng `components/shared/BookCover.tsx`. G1 browser-smoke dùng database test riêng. Assistant UI hiện hành không render card `BookCover` khi chưa có kết quả; không được suy visual PASS cho trạng thái chưa quan sát.

## Bổ sung bìa thật đúng cách

1. Nhận URL/file và bằng chứng sử dụng từ NXB, tác giả hoặc nguồn có giấy phép.
2. Không ghi đè dataset gốc.
3. Thêm entry vào `config/real-cover-sources.json` gồm `bookId`, URL và `licenseReference`.
4. Lưu file 2:3 tối ưu WebP nếu giấy phép cho phép self-host.
5. Chạy `npm run covers:audit` và browser-smoke mọi surface.
6. Chỉ phân loại `REAL_VALID` khi HTTP/image hợp lệ **và** có bằng chứng nguồn trong manifest.

Danh sách ưu tiên nằm tại `docs/REAL_COVER_CANDIDATES.csv`. Các rating dùng để xếp ưu tiên là `SYNTHETIC_DATA`, không phải rating người dùng thật.

### Bộ 20 cover curated

- Nguồn dữ liệu: `data/demo/books.csv` (20 sách thật, không phải ultra-2200).
- File gốc trong `data/demo` không bị sửa hoặc ghi đè.
- Ảnh: `public/covers/curated-real`.
- Manifest nguồn/checksum: `config/curated-demo-cover-sources.json`.
- Dữ liệu dẫn xuất trỏ local cover: `data/derived/demo-books-with-local-covers.csv`.
- Hai ISBN được đổi ở lớp derived vì ảnh gốc không đạt quality gate; lý do được ghi theo từng entry trong manifest.
- Bộ này chưa được import vào database `bookverse_ai`; database hiện hành 1.200 sách synthetic vẫn dùng fallback V2.

## Lệnh tái lập

```powershell
npm run covers:build-art
npm run covers:candidates
npm run covers:audit
npm run covers:download-curated
npx tsx --test tests/curated-cover-assets.test.ts
npx tsx --test tests/book-cover.test.ts
npm run typecheck
npm run build
```
