# Báo cáo Gold Catalog V1 — Phase 1 Pilot

## Kết luận

**VERIFIED về artifact và import test**: build tạo đúng 300 record được chọn từ 360 ứng viên; validator schema/provenance/ISBN/duplicate/category/quality pass; build đọc cache lần hai giữ nguyên artifact checksum `202257df31f5154c0055c9e3f92457430eaba0171cf6c8d009e1aa1088cdcb5a`. Import được rehearsal trên clone và `bookverse_ai_test`, lần hai không tạo record mới.

**PARTIAL về mục tiêu dữ liệu**: 10 record có language `vie`, không đạt định hướng 100–150 bản tiếng Việt; tất cả 300 record được chọn là WORK, không có EDITION_ONLY trong pilot này. Đây là kết quả thật, không ép thêm dữ liệu.

**BLOCKED/NOT_VERIFIED**: Google Books bị `BLOCKED_MISSING_CREDENTIAL`; cover rights đều `RIGHTS_NOT_VERIFIED`; UI Gold feature/browser smoke chưa được tích hợp trong lượt này; production/deployment/CI và real-user/UAT/CTR không thuộc bằng chứng pilot.

## Số liệu

- 360 ứng viên; 300 selected.
- Quality trên 360: 222 FEATURED, 129 GOLD, 0 REVIEW, 9 REJECTED. Selected 300 gồm 222 FEATURED và 78 GOLD.
- 300 WORK, 0 EDITION_ONLY.
- Cover audit: 360 audited, 352 `TECHNICALLY_VERIFIED`, 8 `TECHNICALLY_INVALID`.
- Category mapping: 8 mapping LOW giữ `NEEDS_REVIEW`; science/economics/architecture/politics có sample evidence trong report. Không gọi đây là mapping đã được giảng viên duyệt.
- Dữ liệu nguồn catalog checksum: `79aed37578a638757216af19e80634b9b6ad925ca77fa47f3a55ccfe203bd3a3`.

## Database test

Đã backup `bookverse_ai_test` ngoài Git trước migration: `backups/gold-catalog-v1/bookverse_ai_test_pre_gold_catalog.dump`, SHA-256 `E7CD95B145A8D5E7FEB6D7264DFE83ACD7A3073628D35B97FDC772CA66315E4C`. Restore clone giữ count baseline. Bảng `gold_catalog_records` tách khỏi marketplace; import test lần đầu 300 INSERT, lần hai 300 UPDATE/0 INSERT. Book, Listing, Order, Review, Interaction không đổi. Demo `bookverse_ai` chỉ query read-only và không có bảng Gold.

## Giới hạn

Không được trình bày cover là licensed/publisher-approved, không gọi 10 bản `vie` là 100–150, không gọi score là metric AI/recommendation, không tuyên bố CTR/UAT/real-user hoặc production-ready. Muốn mở rộng 800–1.000 cần review category LOW, bổ sung nguồn Google Books hợp lệ, kiểm tra rights và chạy lại quality gate trên dữ liệu mới.
