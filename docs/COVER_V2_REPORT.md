# Báo cáo triển khai Book Cover V2

> **Historical checkpoint snapshot — không phản ánh toàn bộ trạng thái hiện tại.** Xem [`CURRENT_STATUS.md`](CURRENT_STATUS.md) trước khi dùng bất kỳ kết luận nào.

Ngày: 16/07/2026.

## 1. Kết luận

Hệ thống fallback cũ đã được thay bằng `BookCover` V2 và đã qua unit test, typecheck, production build và browser DOM audit trên trang thiết kế. Đồ án **chưa có bìa nhà xuất bản thật**: manifest nguồn hợp pháp hiện có 0 entry. Do đó hạng mục cover chỉ `PARTIAL` nếu Definition of Done yêu cầu 50–200 bìa thật.

## 2. Baseline

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Git đầu lượt | VERIFIED | HEAD `2ebb170e466ac57bd8d88ecb2f659cfdba601ea8`, branch `checkpoint-f1-1-telemetry-reliability`, worktree sạch | Trước thay đổi Cover V2 |
| Database demo | BLOCKED | Read-only `prisma.book.count()` exit 1, không kết nối `localhost:5432` | `BLOCKED_DB_UNAVAILABLE` |
| Dataset nguồn | VERIFIED | Đọc `data/json/bookverse_ultra_seed_2200.json`; meta tự ghi `Synthetic academic dataset` | Không phải trạng thái database demo |

## 3. Gap matrix

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| 2.200 cover cũ | VERIFIED | 2.200 `LEGACY_SYNTHETIC`, 2.200 `NOT_VERIFIED` | File có cục bộ nhưng 0 file được Git theo dõi |
| Null/malformed/load error/timeout | VERIFIED | Reducer + 13 test cover | HTTP status cụ thể chỉ audit server mới phân biệt được 404 |
| Fallback deterministic | VERIFIED | FNV-1a theo `bookId`, 6 layout, test lặp lại cùng kết quả | Category fallback ưu tiên keyword title để đồng nhất surface |
| Bìa thật được phê duyệt | NOT_AVAILABLE | `approvedRealCoverCount=0` | Chưa có nguồn/giấy phép |
| HTTP audit remote dataset | NOT_AVAILABLE | `remoteHttpCounts.checked=0` | Dataset JSON không có remote URL; DB đang BLOCKED |
| Browser-smoke toàn bộ trang nghiệp vụ | BLOCKED | Database demo dừng | Trang thiết kế tĩnh đã audit được độc lập |

## 4. Thiết kế fallback

- 8 artwork 320×480: Technology, Business, Literature, History, Health, Language, Science, Travel.
- 6 layout khác nhau, deterministic theo `bookId`.
- Title tối đa 3 dòng, author tối đa 2 dòng.
- Chỉ có nhãn nhỏ `BookVerse Demo`; không có giá, edition, ID hoặc badge category trong ảnh.
- Title hiển thị trong fallback bỏ `#xxxx`, author bỏ hậu tố số synthetic; dữ liệu gốc không đổi.
- Asset gắn nhãn `GENERATED_DEMO_ASSET`, không phải bìa nhà xuất bản.

Artwork được tạo bằng công cụ image generation tích hợp từ prompt: tạo contact sheet 4×2 gồm tám artwork bìa editorial nguyên bản, không chữ/logo/badge/giá/số/watermark, mỗi ô có chủ đề riêng cho Technology, Business, Literature, History, Health, Language, Science và Travel, tránh motif hình tròn lặp lại. Script Python cắt từng ô, center-crop 2:3 và xuất WebP 320×480.

## 5. Component và surface

`components/shared/BookCover.tsx` được dùng tại Home, Catalog/Recommendation (`BookCard`), Book Detail, Marketplace, Cart, Seller, Community list/detail, Library, Order Detail, Profile, Admin và Assistant. Seller ưu tiên `Book.coverPath` khi listing liên kết Book để không đổi ảnh giữa catalog và seller.

## 6. Browser responsive

Trang `/design/cover-system` được mở trực tiếp trong in-app browser.

| Viewport | Trạng thái | Bằng chứng |
|---|---|---|
| 360×800 | VERIFIED | 8 cover, 8 artwork, 6 layout, ratio 0,667, broken=0, overflow=false, clamp=3 |
| 768×900 | VERIFIED | 8 cover, 8 artwork, 6 layout, ratio 0,667, broken=0, overflow=false, clamp=3 |
| 1366×900 | VERIFIED | Sau sửa breakpoint Navbar: overflow=false, ratio 0,667, broken=0 |
| 1920×1080 | VERIFIED | overflow=false, ratio 0,667, broken=0 |

Browser screenshot đã thử hai lần nhưng timeout, trạng thái `FAILED_SCREENSHOT_CAPTURE`. Không dùng screenshot làm bằng chứng visual composite; 8 asset riêng đã được mở kiểm tra trực tiếp.

## 7. Test và build

| Command | Exit code | Kết quả |
|---|---:|---|
| `npx prisma validate` | 0 | Schema valid |
| `npx prisma generate` | 0 | Prisma Client 6.19.3 generated |
| `npm run typecheck` | 0 | Không lỗi TypeScript |
| `npm run test:unit` | 0 | 103/103 pass |
| `npm run test:python` | 0 | 21 pass, 1 database integration skip |
| `npm run covers:build-art` | 0 | 8 asset 320×480 |
| `npm run covers:candidates` | 0 | 120 candidate |
| `npm run covers:audit` | 0 | 2.200 record audit |
| `npm run build` | 0 | Production build thành công |
| Read-only `prisma.book.count()` | 1 | `BLOCKED_DB_UNAVAILABLE` |

Lần chạy đầu `scripts/audit_book_covers.ts` exit 1 do top-level await ở CJS; đã sửa bằng `async main`, chạy lại exit 0. Lần unit đầu exit 1 do JSX test thiếu React runtime import; đã sửa và regression cuối exit 0. Không che, skip hoặc xóa test khó.

## 8. Dữ liệu sử dụng

- `SYNTHETIC_DATA`: dataset ultra-2200 và toàn bộ URL cover cũ.
- `GENERATED_DEMO_ASSET`: 8 artwork fallback V2.
- `TEST_FIXTURE`: input null, malformed, 404, timeout, title dài trong unit test.
- `REAL_USER_DATA`: NOT_AVAILABLE.
- Bìa thật có license: NOT_AVAILABLE.

## 9. Database

- Database đã ghi: không có.
- `bookverse_ai` đã ghi: không.
- Database test đã ghi: không.
- Không chạy migration, backfill, seed, deploy hoặc restart Docker.

## 10. Điều không được tuyên bố khi bảo vệ

- Không nói BookVerse đã có 2.200 bìa thật.
- Không nói 8 artwork V2 là bìa nhà xuất bản.
- Không nói HTTP cover toàn catalog PASS; HTTP remote dataset không có và database đang BLOCKED.
- Không nói toàn bộ trang nghiệp vụ đã browser-smoke trong lượt này.
- Không dùng rating synthetic trong danh sách candidate như rating người dùng thật.

## 11. Việc còn lại

1. Nhận 50–200 file/URL bìa và bằng chứng license từ nguồn hợp pháp.
2. Điền `config/real-cover-sources.json`, không ghi đè dataset nguồn.
3. Khởi động lại database theo quyết định của chủ dự án, sau đó audit read-only coverPath hiện hành.
4. Browser-smoke Home, Catalog, Detail, Recommendation, Marketplace, Cart, Seller và Community bằng dữ liệu demo thực tế.
5. Chạy HTTP audit và chỉ gắn `REAL_VALID` khi image tải được và manifest license khớp.
